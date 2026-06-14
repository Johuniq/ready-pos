<?php
/**
 * Checkout Service Implementation
 *
 * @package Readypos\Services
 */

namespace Readypos\Services;

use Readypos\Interfaces\Services\CheckoutServiceInterface;
use Readypos\Interfaces\Repositories\ProductRepositoryInterface;
use Readypos\Interfaces\Services\InventoryServiceInterface;
use Readypos\Core\Architecture\Transaction\Manager as TransactionManager;
use Readypos\Core\Architecture\EventDispatcher;
use Readypos\Models\POSOrderMeta;
use Readypos\Models\POSSession;
use Readypos\Models\POSCustomer;
use Exception;

defined( 'ABSPATH' ) || exit;

/**
 * Class CheckoutService
 */
class CheckoutService implements CheckoutServiceInterface {

	/**
	 * Product repository
	 *
	 * @var ProductRepositoryInterface
	 */
	protected $product_repo;

	/**
	 * Inventory service
	 *
	 * @var InventoryServiceInterface
	 */
	protected $inventory_service;

	/**
	 * Transaction manager
	 *
	 * @var TransactionManager
	 */
	protected $transaction;

	/**
	 * Event dispatcher
	 *
	 * @var EventDispatcher
	 */
	protected $event;

	/**
	 * CheckoutService Constructor (Dependency Injection resolved)
	 */
	public function __construct(
		ProductRepositoryInterface $product_repo,
		InventoryServiceInterface $inventory_service,
		TransactionManager $transaction,
		EventDispatcher $event
	) {
		$this->product_repo      = $product_repo;
		$this->inventory_service = $inventory_service;
		$this->transaction       = $transaction;
		$this->event             = $event;
	}

	/**
	 * Complete checkout transactionally
	 *
	 * @param array $data Cart and configuration array.
	 * @return array Order resolution data.
	 * @throws Exception
	 */
	public function checkout( array $data ) {
		return $this->transaction->transaction( function() use ( $data ) {
			$items          = $data['items'];
			$customer_id    = $data['customerId'] ?? null;
			$payment_method = $data['paymentMethod'];
			$cash_received  = $data['cashReceived'] ?? null;
			$change_given   = $data['changeGiven'] ?? null;
			$discount_type  = $data['discountType'] ?? null;
			$discount_value = $data['discountValue'] ?? null;
			$session_id     = $data['sessionId'] ?? null;
			$notes          = $data['notes'] ?? '';
			$split_payments = $data['splitPayments'] ?? array();
			$shipping       = $data['shipping'] ?? array();

			// 1. Fetch active session and outlet details
			$outlet_id = null;
			$outlet    = null;
			if ( $session_id ) {
				$session = POSSession::find( $session_id );
				if ( $session && 'open' === $session->status ) {
					$outlet_id = intval( $session->outlet_id );
					$outlet    = POSOutlet::find( $outlet_id );
				}
			}

			// 2. Validate Items & Decrement multi-outlet stock atomically
			$validated_items = array();
			foreach ( $items as $item ) {
				$product_id = intval( $item['id'] );
				$quantity   = intval( $item['quantity'] );
				
				if ( $quantity <= 0 ) {
					continue;
				}

				$product = $this->product_repo->find( $product_id );
				if ( ! $product || ! $product->is_purchasable() ) {
					throw new Exception( "Product ID [{$product_id}] is invalid or not purchasable." );
				}

				// Check stock & perform atomic updates
				if ( $product->managing_stock() ) {
					if ( $outlet_id ) {
						// Atomically decrement outlet stock
						$this->inventory_service->decrement_stock( $outlet_id, $product_id, $quantity );
					} elseif ( ! $product->has_enough_stock( $quantity ) ) {
						throw new Exception( "Insufficient global stock for product: " . $product->get_name() );
					}
				}

				$server_price = floatval( $product->get_price() );
				if ( $outlet ) {
					$custom_price = $outlet->get_product_price( $product_id );
					if ( null !== $custom_price ) {
						$server_price = floatval( $custom_price );
					}
				}

				$validated_items[] = array(
					'product'      => $product,
					'quantity'     => $quantity,
					'server_price' => $server_price,
				);
			}

			// 3. Create WC Order
			$order = wc_create_order();

			foreach ( $validated_items as $vi ) {
				$prod = $vi['product'];
				$qty  = $vi['quantity'];
				$prc  = $vi['server_price'];

				if ( $prod->is_type( 'variation' ) ) {
					$order->add_product( $prod, $qty, array(
						'variation' => $prod->get_variation_attributes(),
						'subtotal'  => $prc * $qty,
						'total'     => $prc * $qty,
					) );
				} else {
					$order->add_product( $prod, $qty, array(
						'subtotal' => $prc * $qty,
						'total'    => $prc * $qty,
					) );
				}
			}

			// Customers billing/shipping resolution
			if ( ! empty( $customer_id ) ) {
				$order->set_customer_id( intval( $customer_id ) );
				$user = get_userdata( $customer_id );
				if ( $user ) {
					$order->set_billing_first_name( $user->first_name ?: $user->display_name );
					$order->set_billing_last_name( $user->last_name );
					$order->set_billing_email( $user->user_email );
				}
			} else {
				$order->set_billing_first_name( 'POS' );
				$order->set_billing_last_name( 'Guest' );
			}

			// Discounts
			if ( ! empty( $discount_value ) && floatval( $discount_value ) > 0 ) {
				$discount_amount = ( 'percent' === $discount_type ) 
					? ( $order->get_subtotal() * floatval( $discount_value ) ) / 100
					: floatval( $discount_value );

				$discount_amount = min( $discount_amount, $order->get_subtotal() );

				$fee_item = new \WC_Order_Item_Fee();
				$fee_item->set_name( __( 'POS Discount', 'ready-pos-for-woocommerce' ) );
				$fee_item->set_amount( -1 * $discount_amount );
				$fee_item->set_total( -1 * $discount_amount );
				$order->add_item( $fee_item );
			}

			// Setup payment gateways
			$mapped_method = $payment_method;
			$mapped_title  = ucfirst( $payment_method ) . ' (POS)';
			$order->set_payment_method( $mapped_method );
			$order->set_payment_method_title( $mapped_title );

			$current_user_id = get_current_user_id();
			$order->add_meta_data( '_readypos_is_pos_order', 'yes' );

			if ( ! empty( $notes ) ) {
				$order->add_order_note( sanitize_textarea_field( $notes ) );
				$order->set_customer_note( sanitize_textarea_field( $notes ) );
			}

			// Apply outlet custom tax rates if defined
			$tax_config = $outlet ? $outlet->get_tax_config() : array();
			$rates      = $tax_config['rates'] ?? array();
			if ( ! empty( $rates ) ) {
				$subtotal = $order->get_subtotal();
				// Calculate discount
				$discount = 0;
				if ( ! empty( $discount_value ) && floatval( $discount_value ) > 0 ) {
					$discount = ( 'percent' === $discount_type ) 
						? ( $subtotal * floatval( $discount_value ) ) / 100
						: floatval( $discount_value );
					$discount = min( $discount, $subtotal );
				}
				$taxable_amount = max( 0, $subtotal - $discount );

				$tax_total = 0;
				foreach ( $rates as $rate_info ) {
					$rate_val = floatval( $rate_info['rate'] );
					if ( $rate_info['type'] === 'percent' ) {
						if ( $tax_config['tax_included_in_prices'] ?? false ) {
							$tax_total += $taxable_amount * ( $rate_val / ( 100 + $rate_val ) );
						} else {
							$tax_total += $taxable_amount * ( $rate_val / 100 );
						}
					} else { // Fixed
						$tax_total += $rate_val;
					}
				}

				if ( $tax_total > 0 && ! ($tax_config['tax_included_in_prices'] ?? false) ) {
					$fee = new \WC_Order_Item_Fee();
					$fee->set_name( __( 'Outlet Tax', 'ready-pos-for-woocommerce' ) );
					$fee->set_total( $tax_total );
					$fee->set_taxes( array() ); // Clear WooCommerce default taxes for this item
					$order->add_item( $fee );
				}
			}

			$order->calculate_totals();
			$order->update_status( 'completed', __( 'Order completed via POS enterprise checkout service.', 'ready-pos-for-woocommerce' ) );
			$order->save();

			$order_id = $order->get_id();

			// 4. Save custom metadata
			POSOrderMeta::create( array(
				'wc_order_id'    => $order_id,
				'session_id'     => $session_id ? intval( $session_id ) : null,
				'cashier_id'     => $current_user_id,
				'customer_id'    => $customer_id ? intval( $customer_id ) : null,
				'payment_method' => $payment_method,
				'cash_received'  => $cash_received ? floatval( $cash_received ) : null,
				'change_given'   => $change_given ? floatval( $change_given ) : null,
				'discount_type'  => $discount_type,
				'discount_value' => $discount_value ? floatval( $discount_value ) : null,
				'order_status'   => 'completed',
				'notes'          => $notes,
			) );

			// 5. Update cashier metrics (atomic additions)
			if ( $session_id ) {
				global $wpdb;
				$sessions_table = $wpdb->prefix . 'readypos_sessions';
				$wpdb->query( $wpdb->prepare(
					"UPDATE `" . esc_sql( $sessions_table ) . "`
					SET total_sales = total_sales + %f,
						total_orders = total_orders + 1
					WHERE id = %d",
					$order->get_total(),
					$session_id
				) );
			}

			// 6. Loyalty program increments
			if ( ! empty( $customer_id ) ) {
				$customer_id_int = intval( $customer_id );
				$order_total     = floatval( $order->get_total() );
				$points_earned   = (int) floor( $order_total );
				$pos_customer    = POSCustomer::where( 'wc_customer_id', $customer_id_int )->first();

				if ( $pos_customer ) {
					$pos_customer->loyalty_points += $points_earned;
					$pos_customer->total_spent    += $order_total;
					$pos_customer->visit_count    += 1;
					$pos_customer->save();
				} else {
					// No POS profile yet — seed it with this order's
					// contribution so subsequent reads don't have to fall back
					// to a live WooCommerce query.
					$wp_user = get_userdata( $customer_id_int );
					POSCustomer::create(
						array(
							'wc_customer_id' => $customer_id_int,
							'first_name'     => $wp_user ? $wp_user->first_name : '',
							'last_name'      => $wp_user ? $wp_user->last_name : '',
							'email'          => $wp_user ? $wp_user->user_email : '',
							'phone'          => $wp_user ? get_user_meta( $customer_id_int, 'billing_phone', true ) : '',
							'loyalty_points' => $points_earned,
							'total_spent'    => $order_total,
							'visit_count'    => 1,
						)
					);
				}
			}

			// 7. Dispatch Event for custom actions (e.g. print queueing, remote syncing, notifications)
			$this->event->dispatch( 'checkout_completed', array(
				'order_id' => $order_id,
				'total'    => $order->get_total(),
			) );

			return array(
				'success'  => true,
				'order_id' => $order_id,
				'total'    => floatval( $order->get_total() ),
			);
		});
	}
}
