<?php
/**
 * Order-related POS actions.
 *
 * @package Readypos\Controllers\Orders
 * @since 1.0.0
 */

namespace Readypos\Controllers\Orders;

use Readypos\Models\POSOrderMeta;
use Readypos\Models\POSSession;
use Readypos\Models\POSOutletStock;
use Readypos\Models\POSCustomer;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles API requests for creating POS orders, processing checkout, refunding, and parking carts.
 *
 * @package Readypos\Controllers\Orders
 */
class Actions {

	/**
	 * Create a new WooCommerce order from POS cart data.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create( \WP_REST_Request $request ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		$items           = $request->get_param( 'items' ); // Cart items array
		$customer_id     = $request->get_param( 'customerId' ); // WP User ID or null
		$payment_method  = $request->get_param( 'paymentMethod' ); // 'cash', 'card', 'split', 'gift_card'
		$cash_received   = $request->get_param( 'cashReceived' );
		$change_given    = $request->get_param( 'changeGiven' );
		$discount_type   = $request->get_param( 'discountType' ); // 'fixed' or 'percent' or null
		$discount_value  = $request->get_param( 'discountValue' );
		$session_id      = $request->get_param( 'sessionId' );
		$notes           = $request->get_param( 'notes' );
		$split_payments  = $request->get_param( 'splitPayments' ); // Array of breakdowns when paymentMethod === 'split'
		$shipping        = $request->get_param( 'shipping' ); // Shipping details: { method_id, method_title, cost, address }

		if ( empty( $items ) || ! is_array( $items ) ) {
			return new \WP_Error( 'empty_cart', __( 'Cart is empty.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		try {
			// Initialize WooCommerce order
			$order = wc_create_order();

			// Validate and add products to order
			// SECURITY FIX: Always use server-side product prices, never trust client data
			$validated_items = array();
			foreach ( $items as $item ) {
				$product_id = intval( $item['id'] );
				$quantity   = intval( $item['quantity'] );
				
				if ( $quantity <= 0 ) {
					continue; // Skip invalid quantities
				}

				$product = wc_get_product( $product_id );

				if ( ! $product || ! $product->is_purchasable() ) {
					// Log warning for invalid product
					error_log( sprintf( 
						'ReadyPOS: Attempted to add invalid/non-purchasable product ID %d to order', 
						$product_id 
					) );
					continue;
				}

				// Get actual server-side price (prevents price manipulation)
				$server_price = floatval( $product->get_price() );
				
				// Check stock availability
				if ( $product->managing_stock() && ! $product->has_enough_stock( $quantity ) ) {
					return new \WP_Error(
						'insufficient_stock',
						sprintf(
							/* translators: %s: product name */
							__( 'Insufficient stock for product: %s', 'ready-pos' ),
							$product->get_name()
						),
						array( 'status' => 400 )
					);
				}

				// Store validated item data for later use
				$validated_items[] = array(
					'id'           => $product_id,
					'quantity'     => $quantity,
					'server_price' => $server_price,
				);

				// Add product to order with server-validated pricing
				if ( $product->is_type( 'variation' ) ) {
					$order->add_product( $product, $quantity, array(
						'variation' => $product->get_variation_attributes(),
						'subtotal'  => $server_price * $quantity,
						'total'     => $server_price * $quantity,
					) );
				} else {
					$order->add_product( $product, $quantity, array(
						'subtotal' => $server_price * $quantity,
						'total'    => $server_price * $quantity,
					) );
				}
			}

			// Ensure at least one valid product was added
			if ( empty( $validated_items ) ) {
				return new \WP_Error(
					'no_valid_products',
					__( 'No valid products to process.', 'ready-pos' ),
					array( 'status' => 400 )
				);
			}

			// Assign customer if provided
			if ( ! empty( $customer_id ) ) {
				$order->set_customer_id( intval( $customer_id ) );

				// Fetch customer billing info to auto-fill
				$user = get_userdata( $customer_id );
				if ( $user ) {
					$order->set_billing_first_name( $user->first_name ?: $user->display_name );
					$order->set_billing_last_name( $user->last_name );
					$order->set_billing_email( $user->user_email );
				}
			} else {
				// Default to Guest Customer
				$order->set_billing_first_name( 'POS' );
				$order->set_billing_last_name( 'Guest' );
			}

			// Handle shipping if provided
			if ( ! empty( $shipping ) && is_array( $shipping ) ) {
				$shipping_address = $shipping['address'] ?? array();
				
				// Set shipping address
				if ( ! empty( $shipping_address ) ) {
					$order->set_shipping_first_name( $shipping_address['first_name'] ?? '' );
					$order->set_shipping_last_name( $shipping_address['last_name'] ?? '' );
					$order->set_shipping_address_1( $shipping_address['address_1'] ?? '' );
					$order->set_shipping_address_2( $shipping_address['address_2'] ?? '' );
					$order->set_shipping_city( $shipping_address['city'] ?? '' );
					$order->set_shipping_state( $shipping_address['state'] ?? '' );
					$order->set_shipping_postcode( $shipping_address['postcode'] ?? '' );
					$order->set_shipping_country( $shipping_address['country'] ?? 'US' );
					$order->set_shipping_phone( $shipping_address['phone'] ?? '' );
				}

				// Add shipping line item
				$shipping_cost = floatval( $shipping['cost'] ?? 0 );
				$shipping_method_id = sanitize_text_field( $shipping['method_id'] ?? 'flat_rate' );
				$shipping_method_title = sanitize_text_field( $shipping['method_title'] ?? 'Shipping' );

				if ( $shipping_cost > 0 || $shipping_method_id === 'free_shipping' ) {
					$shipping_item = new \WC_Order_Item_Shipping();
					$shipping_item->set_method_title( $shipping_method_title );
					$shipping_item->set_method_id( $shipping_method_id );
					$shipping_item->set_total( $shipping_cost );
					$order->add_item( $shipping_item );
				}

				// Store shipping metadata
				$order->add_meta_data( '_readypos_has_shipping', 'yes' );
				$order->add_meta_data( '_readypos_shipping_method', $shipping_method_id );
			}

			// Handle discount if applied to cart
			if ( ! empty( $discount_value ) && floatval( $discount_value ) > 0 ) {
				// SECURITY FIX: Validate discount against configured limits
				$max_discount_percent = floatval( get_option( 'readypos_max_discount_percent', 100 ) );
				$max_discount_fixed = floatval( get_option( 'readypos_max_discount_fixed', 0 ) );
				
				if ( 'percent' === $discount_type ) {
					$discount_percent = floatval( $discount_value );
					
					// Validate against maximum allowed percentage
					if ( $max_discount_percent > 0 && $discount_percent > $max_discount_percent ) {
						return new \WP_Error(
							'discount_exceeded',
							sprintf(
								/* translators: %s: maximum discount percentage */
								__( 'Discount cannot exceed %s%%.', 'ready-pos' ),
								$max_discount_percent
							),
							array( 'status' => 400 )
						);
					}
					
					$discount_amount = ( $order->get_subtotal() * $discount_percent ) / 100;
				} else {
					$discount_amount = floatval( $discount_value );
					
					// Validate against maximum allowed fixed discount
					if ( $max_discount_fixed > 0 && $discount_amount > $max_discount_fixed ) {
						return new \WP_Error(
							'discount_exceeded',
							sprintf(
								/* translators: %s: maximum discount amount */
								__( 'Discount cannot exceed %s.', 'ready-pos' ),
								wc_price( $max_discount_fixed )
							),
							array( 'status' => 400 )
						);
					}
				}

				// Ensure discount doesn't exceed subtotal
				$discount_amount = min( $discount_amount, $order->get_subtotal() );

				// Add discount as negative fee
				$item = new \WC_Order_Item_Fee();
				$item->set_name( __( 'POS Discount', 'ready-pos' ) );
				$item->set_amount( -1 * $discount_amount );
				$item->set_total( -1 * $discount_amount );
				$order->add_item( $item );
			}

			// Set Payment Method details mapping to WooCommerce Gateways
			$mapped_method = $payment_method;
			$mapped_title  = ucfirst( $payment_method ) . ' (POS)';

			if ( 'cash' === $payment_method ) {
				$mapped_method = get_option( 'readypos_pos_cash_gateway', 'cod' );
			} elseif ( 'card' === $payment_method || 'card_emv' === $payment_method ) {
				$mapped_method = get_option( 'readypos_pos_card_gateway', 'stripe' );
			}

			if ( class_exists( 'WooCommerce' ) && ! empty( $mapped_method ) ) {
				$gateways = \WC()->payment_gateways->payment_gateways();
				if ( isset( $gateways[ $mapped_method ] ) ) {
					$mapped_title = $gateways[ $mapped_method ]->get_title();
				}
			}

			$order->set_payment_method( $mapped_method );
			$order->set_payment_method_title( $mapped_title );

			// Add cashier info
			$current_user_id = get_current_user_id();
			$order->add_meta_data( '_readypos_cashier_id', $current_user_id );
			$order->add_meta_data( '_readypos_is_pos_order', 'yes' );

			// Store split payment breakdown when applicable.
			if ( 'split' === $payment_method && is_array( $split_payments ) && ! empty( $split_payments ) ) {
				$sanitized_breakdown = array();
				$split_total = 0;
				
				foreach ( $split_payments as $sp ) {
					$amount = floatval( $sp['amount'] ?? 0 );
					$split_total += $amount;
					
					$sanitized_breakdown[] = array(
						'method' => sanitize_text_field( $sp['method'] ?? '' ),
						'amount' => $amount,
						'ref'    => sanitize_text_field( $sp['ref'] ?? '' ),
					);
				}
				
				// SECURITY FIX: Validate that split payment sum equals order total
				// Allow 1 cent tolerance for rounding differences
				$order_total_before_calc = $order->get_total();
				if ( abs( $split_total - $order_total_before_calc ) > 0.01 ) {
					return new \WP_Error(
						'split_payment_mismatch',
						sprintf(
							/* translators: 1: split payment sum, 2: order total */
							__( 'Split payment amounts (%1$s) do not match order total (%2$s).', 'ready-pos' ),
							wc_price( $split_total ),
							wc_price( $order_total_before_calc )
						),
						array( 'status' => 400 )
					);
				}
				
				$order->add_meta_data( '_readypos_split_payments', wp_json_encode( $sanitized_breakdown ) );

				// Also append a human-readable breakdown to the order note.
				$breakdown_lines = array();
				foreach ( $sanitized_breakdown as $sp ) {
					$breakdown_lines[] = sprintf(
						'%s: %s%s',
						ucfirst( str_replace( '_', ' ', $sp['method'] ) ),
						wc_price( $sp['amount'] ),
						! empty( $sp['ref'] ) ? ' (' . $sp['ref'] . ')' : ''
					);
				}
				$order->add_order_note(
					__( 'Split Payment Breakdown:', 'ready-pos' ) . "\n" . implode( "\n", $breakdown_lines )
				);
			}

			if ( ! empty( $notes ) ) {
				// SECURITY FIX: Limit notes length to prevent DoS
				$max_notes_length = 2000;
				$truncated_notes = mb_substr( sanitize_textarea_field( $notes ), 0, $max_notes_length );
				
				$order->add_order_note( $truncated_notes );
				$order->set_customer_note( $truncated_notes );
			}

			// Calculate totals server-side (never trust client calculations)
			$order->calculate_totals();
			$order->update_status( 'completed', __( 'Order completed via POS terminal.', 'ready-pos' ) );
			$order->save();

			$order_id = $order->get_id();

			// Store POS Order Metadata in our custom table
			POSOrderMeta::create(
				array(
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
				)
			);

			// Update session sales metrics if session is active
			// SECURITY FIX #6: Use atomic SQL updates to prevent race condition
			if ( $session_id ) {
				global $wpdb;
				
				$sessions_table = $wpdb->prefix . 'readypos_sessions';
				
				// Check session exists and is open
				$session = $wpdb->get_row(
					$wpdb->prepare(
						"SELECT id, status, outlet_id FROM {$sessions_table} WHERE id = %d AND status = 'open'",
						$session_id
					)
				);
				
				if ( $session ) {
					// Calculate payment method totals
					$cash_amount = 0;
					$card_amount = 0;
					
					if ( 'cash' === $payment_method ) {
						$cash_amount = $order->get_total();
					} elseif ( 'card' === $payment_method ) {
						$card_amount = $order->get_total();
					} elseif ( 'split' === $payment_method && is_array( $split_payments ) ) {
						foreach ( $split_payments as $sp ) {
							$amt = floatval( $sp['amount'] ?? 0 );
							if ( 'cash' === ( $sp['method'] ?? '' ) ) {
								$cash_amount += $amt;
							} elseif ( 'card' === ( $sp['method'] ?? '' ) ) {
								$card_amount += $amt;
							}
						}
					}
					
					// Atomic update - prevents race condition on concurrent orders
					$wpdb->query(
						$wpdb->prepare(
							"UPDATE {$sessions_table} 
							SET total_sales = total_sales + %f,
								total_orders = total_orders + 1,
								cash_total = cash_total + %f,
								card_total = card_total + %f
							WHERE id = %d",
							$order->get_total(),
							$cash_amount,
							$card_amount,
							$session_id
						)
					);

					// SECURITY FIX #7: Use atomic SQL updates for inventory to prevent overselling
					if ( $session->outlet_id ) {
						$stock_table = $wpdb->prefix . 'readypos_outlet_stock';
						
						foreach ( $validated_items as $validated_item ) {
							$product_id = intval( $validated_item['id'] );
							$quantity   = intval( $validated_item['quantity'] );

							// Atomic decrement with lower bound protection
							$wpdb->query(
								$wpdb->prepare(
									"UPDATE {$stock_table} 
									SET stock_quantity = GREATEST(0, stock_quantity - %d)
									WHERE outlet_id = %d 
									AND product_id = %d",
									$quantity,
									$session->outlet_id,
									$product_id
								)
							);
						}
					}
				}
			}

			// Award loyalty points to customer (1 point per $1 spent).
			if ( ! empty( $customer_id ) ) {
				$pos_customer = POSCustomer::where( 'wc_customer_id', intval( $customer_id ) )->first();
				if ( $pos_customer ) {
					$points_earned = (int) floor( floatval( $order->get_total() ) );
					$pos_customer->loyalty_points += $points_earned;
					$pos_customer->total_spent    += floatval( $order->get_total() );
					$pos_customer->visit_count    += 1;
					$pos_customer->save();
				}
			}

			return new \WP_REST_Response(
				array(
					'success'  => true,
					'order_id' => $order_id,
					'total'    => floatval( $order->get_total() ),
				),
				200
			);

		} catch ( \Exception $e ) {
			return new \WP_Error( 'checkout_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
	}

	/**
	 * Get POS order history.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public function get( \WP_REST_Request $request ) {
		$limit = $request->get_param( 'limit' ) ? intval( $request->get_param( 'limit' ) ) : 20;
		$page  = $request->get_param( 'page' ) ? intval( $request->get_param( 'page' ) ) : 1;
		$limit = max( 1, min( 100, $limit ) );
		$page  = max( 1, $page );

		// Primary source: query WooCommerce orders flagged as POS orders.
		// This is more reliable than the custom POSOrderMeta table, which
		// can become out-of-sync if the table insert failed or migrations
		// haven't run yet on a particular environment.
		$args = array(
			'limit'      => $limit,
			'page'       => $page,
			'status'     => array_keys( wc_get_order_statuses() ),
			'paginate'   => true,
			'orderby'    => 'date',
			'order'      => 'DESC',
			'meta_query' => array(
				array(
					'key'     => '_readypos_is_pos_order',
					'value'   => 'yes',
					'compare' => '=',
				),
			),
		);

		$results = wc_get_orders( $args );

		$orders = array();
		if ( $results && isset( $results->orders ) ) {
			foreach ( $results->orders as $wc_order ) {
				$pos_meta    = POSOrderMeta::where( 'wc_order_id', $wc_order->get_id() )->first();
				$cashier_id  = $pos_meta ? $pos_meta->cashier_id : intval( $wc_order->get_meta( '_readypos_cashier_id' ) );
				$cashier     = $cashier_id ? get_userdata( $cashier_id ) : null;
				$payment     = $pos_meta ? $pos_meta->payment_method : ( $wc_order->get_payment_method() ?: 'unknown' );
				$order_date  = $wc_order->get_date_created();

				$orders[] = array(
					'id'             => $wc_order->get_id(),
					'order_number'   => $wc_order->get_order_number(),
					'total'          => floatval( $wc_order->get_total() ),
					'payment_method' => $payment,
					'cashier_name'   => $cashier ? $cashier->display_name : __( 'Unknown', 'ready-pos' ),
					'date'           => $order_date ? $order_date->date( 'Y-m-d H:i:s' ) : '',
					'status'         => $wc_order->get_status(),
				);
			}
		}

		$total       = $results ? (int) $results->total : 0;
		$total_pages = $results ? (int) $results->max_num_pages : 1;

		return new \WP_REST_Response(
			array(
				'orders'      => $orders,
				'total'       => $total,
				'total_pages' => max( 1, $total_pages ),
			),
			200
		);
	}

	/**
	 * Get details of a single order.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_detail( \WP_REST_Request $request ) {
		$order_id = intval( $request->get_param( 'id' ) );
		$wc_order = wc_get_order( $order_id );

		if ( ! $wc_order ) {
			return new \WP_Error( 'not_found', __( 'Order not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$pos_meta = POSOrderMeta::where( 'wc_order_id', $order_id )->first();
		$items    = array();

		foreach ( $wc_order->get_items() as $item_id => $item ) {
			$items[] = array(
				'name'     => $item->get_name(),
				'quantity' => $item->get_quantity(),
				'total'    => floatval( $item->get_total() ),
			);
		}

		$details = array(
			'id'             => $order_id,
			'order_number'   => $wc_order->get_order_number(),
			'items'          => $items,
			'subtotal'       => floatval( $wc_order->get_subtotal() ),
			'total'          => floatval( $wc_order->get_total() ),
			'discount'       => floatval( $wc_order->get_discount_total() ),
			'tax'            => floatval( $wc_order->get_total_tax() ),
			'payment_method' => $pos_meta ? $pos_meta->payment_method : $wc_order->get_payment_method(),
			'cash_received'  => $pos_meta ? floatval( $pos_meta->cash_received ) : 0,
			'change_given'   => $pos_meta ? floatval( $pos_meta->change_given ) : 0,
			'date'           => $wc_order->get_date_created()->date( 'Y-m-d H:i:s' ),
			'status'         => $wc_order->get_status(),
			'notes'          => $wc_order->get_customer_note(),
		);

		return new \WP_REST_Response( $details, 200 );
	}

	/**
	 * Process partial/full refund.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function refund( \WP_REST_Request $request ) {
		// SECURITY FIX: Add permission check for refund operations
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error(
				'insufficient_permissions',
				__( 'You do not have permission to process refunds.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		$order_id = intval( $request->get_param( 'orderId' ) );
		$amount   = floatval( $request->get_param( 'amount' ) );
		$reason   = $request->get_param( 'reason' ) ? sanitize_text_field( $request->get_param( 'reason' ) ) : '';

		if ( $amount <= 0 ) {
			return new \WP_Error(
				'invalid_amount',
				__( 'Refund amount must be greater than zero.', 'ready-pos' ),
				array( 'status' => 400 )
			);
		}

		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return new \WP_Error( 'not_found', __( 'Order not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		// Validate refund amount doesn't exceed order total
		if ( $amount > $order->get_total() ) {
			return new \WP_Error(
				'amount_exceeds_total',
				__( 'Refund amount cannot exceed order total.', 'ready-pos' ),
				array( 'status' => 400 )
			);
		}

		// Check if already fully refunded
		$refunded_amount = $order->get_total_refunded();
		if ( $refunded_amount + $amount > $order->get_total() ) {
			return new \WP_Error(
				'refund_exceeds_remaining',
				sprintf(
					/* translators: %s: remaining refundable amount */
					__( 'Refund amount exceeds remaining refundable amount of %s.', 'ready-pos' ),
					wc_price( $order->get_total() - $refunded_amount )
				),
				array( 'status' => 400 )
			);
		}

		try {
			$refund = wc_create_refund( array(
				'amount'         => $amount,
				'reason'         => $reason,
				'order_id'       => $order_id,
				'refund_payment' => false, // Manual POS refund
			) );

			if ( is_wp_error( $refund ) ) {
				return $refund;
			}

			// Log refund for audit trail
			$current_user = wp_get_current_user();
			$order->add_order_note(
				sprintf(
					/* translators: 1: refund amount, 2: user name */
					__( 'POS Refund of %1$s processed by %2$s', 'ready-pos' ),
					wc_price( $amount ),
					$current_user->display_name
				)
			);

			// Adjust POS session refunds if session metadata exists
			$pos_meta = POSOrderMeta::where( 'wc_order_id', $order_id )->first();
			if ( $pos_meta && $pos_meta->session_id ) {
				$session = POSSession::find( $pos_meta->session_id );
				if ( $session && 'open' === $session->status ) {
					$session->total_refunds += $amount;
					$session->save();
				}
			}

			return new \WP_REST_Response( array( 'success' => true ), 200 );

		} catch ( \Exception $e ) {
			return new \WP_Error( 'refund_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
	}

	/**
	 * Park/Hold a cart session.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function hold( \WP_REST_Request $request ) {
		$cashier_id = get_current_user_id();
		$cart_data  = $request->get_param( 'cart' ); // JSON/Array of cart items + customer
		$hold_id    = $request->get_param( 'holdId' ) ?: uniqid( 'hold_' );

		$held_orders = get_transient( 'readypos_held_orders_' . $cashier_id ) ?: array();
		$held_orders[ $hold_id ] = array(
			'id'        => $hold_id,
			'cart'      => $cart_data,
			'parked_at' => current_time( 'mysql' ),
		);

		set_transient( 'readypos_held_orders_' . $cashier_id, $held_orders, DAY_IN_SECONDS * 7 );

		return new \WP_REST_Response( array( 'success' => true, 'holdId' => $hold_id ), 200 );
	}

	/**
	 * Get all parked/held orders for the current cashier.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_held() {
		$cashier_id  = get_current_user_id();
		$held_orders = get_transient( 'readypos_held_orders_' . $cashier_id ) ?: array();

		return new \WP_REST_Response( array_values( $held_orders ), 200 );
	}

	/**
	 * Resume or delete a parked order.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function resume( \WP_REST_Request $request ) {
		$cashier_id  = get_current_user_id();
		$hold_id     = $request->get_param( 'holdId' );
		$held_orders = get_transient( 'readypos_held_orders_' . $cashier_id ) ?: array();

		if ( isset( $held_orders[ $hold_id ] ) ) {
			$order = $held_orders[ $hold_id ];
			unset( $held_orders[ $hold_id ] );
			set_transient( 'readypos_held_orders_' . $cashier_id, $held_orders, DAY_IN_SECONDS * 7 );
			return new \WP_REST_Response( $order, 200 );
		}

		return new \WP_REST_Response( null, 404 );
	}
}
