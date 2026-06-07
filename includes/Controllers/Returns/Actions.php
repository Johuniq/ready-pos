<?php
/**
 * Returns Controller
 *
 * @package Readypos
 */

namespace Readypos\Controllers\Returns;

use Readypos\Models\POSReturn;
use Readypos\Models\POSOrderMeta;
use Readypos\Models\POSSession;
use Readypos\Models\POSCustomer;
use Readypos\Traits\Cacheable;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Returns Actions Class
 */
class Actions {

	use Cacheable;

	/**
	 * Get return settings
	 *
	 * @return \WP_REST_Response
	 */
	public function get_settings() {
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error(
				'insufficient_permissions',
				__( 'You do not have permission to view return settings.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		$settings = array(
			'enable_returns'          => get_option( 'readypos_enable_returns', 'yes' ),
			'enable_exchanges'        => get_option( 'readypos_enable_exchanges', 'yes' ),
			'enable_store_credit'     => get_option( 'readypos_enable_store_credit', 'yes' ),
			'return_time_limit_days'  => intval( get_option( 'readypos_return_time_limit_days', 30 ) ),
			'require_receipt'         => get_option( 'readypos_require_receipt', 'no' ),
			'restocking_fee_enabled'  => get_option( 'readypos_restocking_fee_enabled', 'no' ),
			'restocking_fee_type'     => get_option( 'readypos_restocking_fee_type', 'percentage' ), // percentage or fixed
			'restocking_fee_value'    => floatval( get_option( 'readypos_restocking_fee_value', 10 ) ),
			'auto_restock_inventory'  => get_option( 'readypos_auto_restock_inventory', 'yes' ),
			'return_reasons'          => $this->get_return_reasons(),
		);

		return new WP_REST_Response( $settings, 200 );
	}

	/**
	 * Get predefined return reasons
	 *
	 * @return array
	 */
	private function get_return_reasons() {
		$default_reasons = array(
			'defective'         => __( 'Defective or Damaged', 'ready-pos' ),
			'wrong_item'        => __( 'Wrong Item Received', 'ready-pos' ),
			'not_as_described'  => __( 'Not as Described', 'ready-pos' ),
			'changed_mind'      => __( 'Changed Mind', 'ready-pos' ),
			'better_price'      => __( 'Found Better Price', 'ready-pos' ),
			'no_longer_needed'  => __( 'No Longer Needed', 'ready-pos' ),
			'size_issue'        => __( 'Size/Fit Issue', 'ready-pos' ),
			'other'             => __( 'Other', 'ready-pos' ),
		);

		$custom_reasons = get_option( 'readypos_return_reasons', array() );
		if ( is_array( $custom_reasons ) && ! empty( $custom_reasons ) ) {
			return array_merge( $default_reasons, $custom_reasons );
		}

		return $default_reasons;
	}

	/**
	 * Get returns list
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get( WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error(
				'insufficient_permissions',
				__( 'You do not have permission to view returns.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		$page      = $request->get_param( 'page' ) ?: 1;
		$per_page  = $request->get_param( 'per_page' ) ?: 20;
		$status    = $request->get_param( 'status' );
		$type      = $request->get_param( 'type' );
		$search    = $request->get_param( 'search' );

		// Cache key includes all request parameters
		$cache_key = "returns_list_{$page}_{$per_page}_{$status}_{$type}_{$search}";

		return $this->cache_response(
			$cache_key,
			function() use ( $page, $per_page, $status, $type, $search ) {
				return $this->get_returns_internal( $page, $per_page, $status, $type, $search );
			},
			'orders', // Using 'orders' group since returns are related to orders
			180 // 3 minutes
		);
	}

	/**
	 * Internal method to get returns list (used for caching).
	 *
	 * @param int    $page Page number.
	 * @param int    $per_page Results per page.
	 * @param string $status Return status filter.
	 * @param string $type Return type filter.
	 * @param string $search Search term.
	 * @return \WP_REST_Response
	 */
	private function get_returns_internal( $page, $per_page, $status, $type, $search ) {		$query = POSReturn::query();

		if ( $status ) {
			$query->where( 'return_status', $status );
		}

		if ( $type ) {
			$query->where( 'return_type', $type );
		}

		if ( $search ) {
			$query->where( function ( $q ) use ( $search ) {
				$q->where( 'original_order_id', 'LIKE', '%' . $search . '%' )
				  ->orWhere( 'return_notes', 'LIKE', '%' . $search . '%' );
			});
		}

		$total   = $query->count();
		$returns = $query->orderBy( 'created_at', 'DESC' )
						 ->skip( ( $page - 1 ) * $per_page )
						 ->take( $per_page )
						 ->get();

		// Enrich with order and user data
		foreach ( $returns as $return ) {
			$order = wc_get_order( $return->original_order_id );
			if ( $order ) {
				$return->order_number = $order->get_order_number();
				$return->customer_name = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
			}

			$cashier = get_userdata( $return->cashier_id );
			if ( $cashier ) {
				$return->cashier_name = $cashier->display_name;
			}
		}

		return new WP_REST_Response(
			array(
				'returns' => $returns,
				'total'   => $total,
				'page'    => $page,
				'pages'   => ceil( $total / $per_page ),
			),
			200
		);
	}

	/**
	 * Get single return detail
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_detail( WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error(
				'insufficient_permissions',
				__( 'You do not have permission to view return details.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		$id = intval( $request->get_param( 'id' ) );
		$return = POSReturn::find( $id );

		if ( ! $return ) {
			return new \WP_Error( 'not_found', __( 'Return not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		// Get original order details
		$order = wc_get_order( $return->original_order_id );
		if ( $order ) {
			$return->order_data = array(
				'order_number' => $order->get_order_number(),
				'order_date'   => $order->get_date_created()->format( 'Y-m-d H:i:s' ),
				'order_total'  => $order->get_total(),
				'customer'     => array(
					'name'  => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
					'email' => $order->get_billing_email(),
					'phone' => $order->get_billing_phone(),
				),
				'items'        => array(),
			);

			foreach ( $order->get_items() as $item ) {
				$return->order_data['items'][] = array(
					'product_id'   => $item->get_product_id(),
					'variation_id' => $item->get_variation_id(),
					'name'         => $item->get_name(),
					'quantity'     => $item->get_quantity(),
					'price'        => $item->get_total(),
				);
			}
		}

		return new WP_REST_Response( $return, 200 );
	}

	/**
	 * Check if return is eligible
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function check_eligibility( WP_REST_Request $request ) {
		$order_id = intval( $request->get_param( 'orderId' ) );
		$order    = wc_get_order( $order_id );

		if ( ! $order ) {
			return new \WP_Error( 'not_found', __( 'Order not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$eligible = true;
		$reasons  = array();

		// Check if returns are enabled
		if ( get_option( 'readypos_enable_returns', 'yes' ) !== 'yes' ) {
			$eligible = false;
			$reasons[] = __( 'Returns are currently disabled.', 'ready-pos' );
		}

		// Check time limit
		$time_limit = intval( get_option( 'readypos_return_time_limit_days', 30 ) );
		if ( $time_limit > 0 ) {
			$order_date = $order->get_date_created();
			$days_since = ( time() - $order_date->getTimestamp() ) / DAY_IN_SECONDS;

			if ( $days_since > $time_limit ) {
				$eligible = false;
				$reasons[] = sprintf(
					/* translators: %d: number of days */
					__( 'Return window expired. Returns must be made within %d days.', 'ready-pos' ),
					$time_limit
				);
			}
		}

		// Check if already fully refunded
		if ( $order->get_total_refunded() >= $order->get_total() ) {
			$eligible = false;
			$reasons[] = __( 'Order has already been fully refunded.', 'ready-pos' );
		}

		// Check order status
		$allowed_statuses = array( 'completed', 'processing' );
		if ( ! in_array( $order->get_status(), $allowed_statuses, true ) ) {
			$eligible = false;
			$reasons[] = __( 'Order status does not allow returns.', 'ready-pos' );
		}

		return new WP_REST_Response(
			array(
				'eligible'  => $eligible,
				'reasons'   => $reasons,
				'order_date' => $order->get_date_created()->format( 'Y-m-d H:i:s' ),
				'days_since' => isset( $days_since ) ? floor( $days_since ) : 0,
				'time_limit' => $time_limit,
			),
			200
		);
	}

	/**
	 * Process return
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function process_return( WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error(
				'insufficient_permissions',
				__( 'You do not have permission to process returns.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		$order_id      = intval( $request->get_param( 'orderId' ) );
		$return_type   = sanitize_text_field( $request->get_param( 'returnType' ) ); // refund, exchange, store_credit
		$return_items  = $request->get_param( 'items' );
		$return_reason = sanitize_text_field( $request->get_param( 'reason' ) );
		$return_notes  = sanitize_textarea_field( $request->get_param( 'notes' ) );
		$restock       = $request->get_param( 'restock' ) !== false;

		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return new \WP_Error( 'not_found', __( 'Order not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		// Calculate return amount
		$return_amount = 0;
		foreach ( $return_items as $item ) {
			$return_amount += floatval( $item['quantity'] ) * floatval( $item['price'] );
		}

		// Calculate restocking fee
		$restocking_fee = 0;
		if ( get_option( 'readypos_restocking_fee_enabled', 'no' ) === 'yes' ) {
			$fee_type  = get_option( 'readypos_restocking_fee_type', 'percentage' );
			$fee_value = floatval( get_option( 'readypos_restocking_fee_value', 10 ) );

			if ( $fee_type === 'percentage' ) {
				$restocking_fee = ( $return_amount * $fee_value ) / 100;
			} else {
				$restocking_fee = $fee_value;
			}
		}

		$refund_amount = $return_amount - $restocking_fee;

		// Get current session
		$session_id = null;
		$current_user = wp_get_current_user();
		$active_session = POSSession::where( 'user_id', $current_user->ID )
									  ->where( 'status', 'open' )
									  ->first();
		if ( $active_session ) {
			$session_id = $active_session->id;
		}

		// Create return record
		$return = POSReturn::create(
			array(
				'original_order_id' => $order_id,
				'session_id'        => $session_id,
				'cashier_id'        => $current_user->ID,
				'customer_id'       => $order->get_customer_id(),
				'return_type'       => $return_type,
				'return_status'     => 'completed',
				'return_amount'     => $return_amount,
				'restocking_fee'    => $restocking_fee,
				'refund_amount'     => $refund_amount,
				'refund_method'     => $return_type === 'refund' ? 'cash' : null,
				'return_reason'     => $return_reason,
				'return_notes'      => $return_notes,
				'restock_items'     => $restock,
				'items'             => json_encode( $return_items ),
				'processed_at'      => current_time( 'mysql' ),
				'created_at'        => current_time( 'mysql' ),
				'updated_at'        => current_time( 'mysql' ),
			)
		);

		// Process based on return type
		if ( $return_type === 'refund' ) {
			// Create WooCommerce refund
			$wc_refund = wc_create_refund(
				array(
					'amount'         => $refund_amount,
					'reason'         => $return_reason,
					'order_id'       => $order_id,
					'refund_payment' => false,
					'line_items'     => $this->prepare_line_items_for_refund( $return_items, $order ),
				)
			);

			if ( is_wp_error( $wc_refund ) ) {
				$return->delete();
				return $wc_refund;
			}

		} elseif ( $return_type === 'store_credit' ) {
			// Add store credit to customer
			$this->add_store_credit( $order->get_customer_id(), $refund_amount, $order_id );

		} elseif ( $return_type === 'exchange' ) {
			// Exchange will be handled by creating a new order
			$return->return_status = 'pending';
			$return->save();
		}

		// Restock items if enabled
		if ( $restock && get_option( 'readypos_auto_restock_inventory', 'yes' ) === 'yes' ) {
			$this->restock_items( $return_items, $order );
		}

		// Update session if active
		if ( $active_session ) {
			$active_session->total_refunds += $refund_amount;
			$active_session->save();
		}

		// Add order note
		$order->add_order_note(
			sprintf(
				/* translators: 1: return type, 2: amount, 3: cashier name */
				__( 'POS %1$s of %2$s processed by %3$s. Reason: %4$s', 'ready-pos' ),
				ucfirst( $return_type ),
				wc_price( $refund_amount ),
				$current_user->display_name,
				$return_reason
			)
		);

		// Invalidate returns and order caches
		$this->invalidate_cache( 'order', $order_id );

		return new WP_REST_Response(
			array(
				'success'   => true,
				'return_id' => $return->id,
				'return'    => $return,
			),
			200
		);
	}

	/**
	 * Process exchange
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function process_exchange( WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error(
				'insufficient_permissions',
				__( 'You do not have permission to process exchanges.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		$return_id     = intval( $request->get_param( 'returnId' ) );
		$new_items     = $request->get_param( 'newItems' );
		$payment_method = sanitize_text_field( $request->get_param( 'paymentMethod' ) );

		$return = POSReturn::find( $return_id );
		if ( ! $return ) {
			return new \WP_Error( 'not_found', __( 'Return not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$original_order = wc_get_order( $return->original_order_id );
		if ( ! $original_order ) {
			return new \WP_Error( 'not_found', __( 'Original order not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		// Calculate new order total
		$new_order_total = 0;
		foreach ( $new_items as $item ) {
			$new_order_total += floatval( $item['quantity'] ) * floatval( $item['price'] );
		}

		// Calculate balance due
		$credit_amount = $return->refund_amount;
		$balance_due = $new_order_total - $credit_amount;

		// Create new order for exchange
		$new_order = wc_create_order(
			array(
				'customer_id' => $original_order->get_customer_id(),
			)
		);

		if ( is_wp_error( $new_order ) ) {
			return $new_order;
		}

		// Add new items to order
		foreach ( $new_items as $item ) {
			$product = wc_get_product( $item['product_id'] );
			if ( $product ) {
				$new_order->add_product( $product, $item['quantity'] );
			}
		}

		// Apply credit as discount if applicable
		if ( $credit_amount > 0 ) {
			$new_order->add_order_note(
				sprintf(
					/* translators: 1: credit amount, 2: return ID */
					__( 'Exchange credit of %1$s applied from return #%2$d', 'ready-pos' ),
					wc_price( $credit_amount ),
					$return_id
				)
			);
		}

		$new_order->calculate_totals();
		$new_order->set_status( 'completed' );
		$new_order->save();

		// Update return record
		$return->return_order_id = $new_order->get_id();
		$return->return_status = 'completed';
		$return->processed_at = current_time( 'mysql' );
		$return->updated_at = current_time( 'mysql' );
		$return->save();

		return new WP_REST_Response(
			array(
				'success'       => true,
				'new_order_id'  => $new_order->get_id(),
				'balance_due'   => $balance_due,
				'credit_applied' => $credit_amount,
			),
			200
		);
	}

	/**
	 * Prepare line items for WooCommerce refund
	 *
	 * @param array     $return_items Return items.
	 * @param \WC_Order $order Order object.
	 * @return array
	 */
	private function prepare_line_items_for_refund( $return_items, $order ) {
		$line_items = array();

		foreach ( $return_items as $item ) {
			foreach ( $order->get_items() as $order_item_id => $order_item ) {
				if ( $order_item->get_product_id() === intval( $item['product_id'] ) ) {
					$line_items[ $order_item_id ] = array(
						'qty'          => $item['quantity'],
						'refund_total' => $item['quantity'] * $item['price'],
					);
					break;
				}
			}
		}

		return $line_items;
	}

	/**
	 * Restock items
	 *
	 * @param array     $items Items to restock.
	 * @param \WC_Order $order Order object.
	 */
	private function restock_items( $items, $order ) {
		foreach ( $items as $item ) {
			$product = wc_get_product( $item['product_id'] );
			if ( $product && $product->managing_stock() ) {
				$new_stock = $product->get_stock_quantity() + intval( $item['quantity'] );
				$product->set_stock_quantity( $new_stock );
				$product->save();

				$order->add_order_note(
					sprintf(
						/* translators: 1: product name, 2: quantity */
						__( 'Restocked %1$s x %2$d', 'ready-pos' ),
						$product->get_name(),
						$item['quantity']
					)
				);
			}
		}
	}

	/**
	 * Add store credit to customer
	 *
	 * @param int   $customer_id Customer ID.
	 * @param float $amount Credit amount.
	 * @param int   $order_id Related order ID.
	 */
	private function add_store_credit( $customer_id, $amount, $order_id ) {
		if ( ! $customer_id ) {
			return;
		}

		$current_credit = floatval( get_user_meta( $customer_id, 'readypos_store_credit', true ) );
		$new_credit = $current_credit + $amount;

		update_user_meta( $customer_id, 'readypos_store_credit', $new_credit );

		// Log store credit transaction
		$transactions = get_user_meta( $customer_id, 'readypos_store_credit_transactions', true );
		if ( ! is_array( $transactions ) ) {
			$transactions = array();
		}

		$transactions[] = array(
			'type'      => 'credit',
			'amount'    => $amount,
			'order_id'  => $order_id,
			'date'      => current_time( 'mysql' ),
			'note'      => __( 'Return credit', 'ready-pos' ),
		);

		update_user_meta( $customer_id, 'readypos_store_credit_transactions', $transactions );
	}
}
