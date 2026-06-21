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
use Readypos\Traits\Cacheable;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles API requests for creating POS orders, processing checkout, and refunding.
 *
 * @package Readypos\Controllers\Orders
 */
class Actions {

	use Cacheable;

	/**
	 * Create a new WooCommerce order from POS cart data.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create( \WP_REST_Request $request ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos-for-woocommerce' ), array( 'status' => 500 ) );
		}

		$items           = $request->get_param( 'items' ); // Cart items array
		$customer_id     = $request->get_param( 'customerId' ); // WP User ID or null
		$payment_method  = $request->get_param( 'paymentMethod' ); // 'cash' or 'card'
		$cash_received   = $request->get_param( 'cashReceived' );
		$change_given    = $request->get_param( 'changeGiven' );
		$discount_type   = $request->get_param( 'discountType' ); // 'fixed' or 'percent' or null
		$discount_value  = $request->get_param( 'discountValue' );
		$session_id      = $request->get_param( 'sessionId' );
		$notes           = $request->get_param( 'notes' );
		$shipping        = $request->get_param( 'shipping' ); // Shipping details: { method_id, method_title, cost, address }

		if ( empty( $items ) || ! is_array( $items ) ) {
			return new \WP_Error( 'empty_cart', __( 'Cart is empty.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		try {
			// Initialize WooCommerce order
			$order = wc_create_order();

			// Resolve active session's outlet
			$outlet_id = null;
			$outlet    = null;
			if ( $session_id ) {
				$session = \Readypos\Models\POSSession::find( $session_id );
				if ( $session && 'open' === $session->status ) {
					$outlet_id = intval( $session->outlet_id );
					$outlet    = \Readypos\Models\POSOutlet::find( $outlet_id );
				}
			}

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
					// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Intentional security logging for invalid product attempts
					error_log( sprintf( 
						'ReadyPOS: Attempted to add invalid/non-purchasable product ID %d to order', 
						$product_id 
					) );
					continue;
				}

				// Get actual server-side price (prevents price manipulation)
				$server_price = floatval( $product->get_price() );
				if ( $outlet ) {
					$custom_price = $outlet->get_product_price( $product_id );
					if ( null !== $custom_price ) {
						$server_price = floatval( $custom_price );
					}
				}
				
				// Check stock availability
				if ( $product->managing_stock() && ! $product->has_enough_stock( $quantity ) ) {
					return new \WP_Error(
						'insufficient_stock',
						sprintf(
							/* translators: %s: product name */
							__( 'Insufficient stock for product: %s', 'ready-pos-for-woocommerce' ),
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
					__( 'No valid products to process.', 'ready-pos-for-woocommerce' ),
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
								__( 'Discount cannot exceed %s%%.', 'ready-pos-for-woocommerce' ),
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
								__( 'Discount cannot exceed %s.', 'ready-pos-for-woocommerce' ),
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
				$item->set_name( __( 'POS Discount', 'ready-pos-for-woocommerce' ) );
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

			// Add cashier info (GPL: cashier is the logged-in user).
			$current_user_id = get_current_user_id();
			$order->add_meta_data( '_readypos_is_pos_order', 'yes' );

			if ( ! empty( $notes ) ) {
				// SECURITY FIX: Limit notes length to prevent DoS
				$max_notes_length = 2000;
				$truncated_notes = mb_substr( sanitize_textarea_field( $notes ), 0, $max_notes_length );
				
				$order->add_order_note( $truncated_notes );
				$order->set_customer_note( $truncated_notes );
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

			// Calculate totals server-side (never trust client calculations)
			$order->calculate_totals();
			$order->update_status( 'completed', __( 'Order completed via POS terminal.', 'ready-pos-for-woocommerce' ) );
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

			// Invalidate order caches
			$this->invalidate_cache( 'order', $order_id );

			// Invalidate dashboard report caches so the next /reports/*
			// request reflects this newly created order instead of serving
			// a stale 2-minute transient (which is why terminals completing
			// sales would not appear in the dashboard).
			$this->invalidate_report_caches();

			// Update session sales metrics if session is active
			// SECURITY FIX #6: Use atomic SQL updates to prevent race condition
			if ( $session_id ) {
				global $wpdb;
				
				$sessions_table = $wpdb->prefix . 'readypos_sessions';
				
				// Check session exists and is open.
				$session_cache_key = 'readypos_open_session_' . absint( $session_id );
				$session           = wp_cache_get( $session_cache_key, 'readypos_sessions' );

				if ( false === $session ) {
					$session = $wpdb->get_row( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						$wpdb->prepare(
							"SELECT id, status, outlet_id FROM `" . esc_sql( $sessions_table ) . "` WHERE id = %d AND status = 'open'",
							$session_id
						)
					);
					wp_cache_set( $session_cache_key, $session, 'readypos_sessions', MINUTE_IN_SECONDS );
				}
				
				if ( $session ) {
					// Calculate payment method totals
					$cash_amount = 0;
					$card_amount = 0;

				if ( 'cash' === $payment_method ) {
					$cash_amount = $order->get_total();
				} elseif ( 'card' === $payment_method ) {
					$card_amount = $order->get_total();
				}
				
				// Atomic update - prevents race condition on concurrent orders.
					$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						$wpdb->prepare(
							"UPDATE `" . esc_sql( $sessions_table ) . "`
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
					wp_cache_delete( $session_cache_key, 'readypos_sessions' );

					// SECURITY FIX #7: Use atomic SQL updates for inventory to prevent overselling
					if ( $session->outlet_id ) {
						$stock_table = $wpdb->prefix . 'readypos_outlet_stock';
						
						foreach ( $validated_items as $validated_item ) {
							$product_id = intval( $validated_item['id'] );
							$quantity   = intval( $validated_item['quantity'] );

							// Atomic decrement with lower bound protection.
							$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
								$wpdb->prepare(
									"UPDATE `" . esc_sql( $stock_table ) . "`
									SET stock_quantity = GREATEST(0, stock_quantity - %d)
									WHERE outlet_id = %d 
									AND product_id = %d",
									$quantity,
									$session->outlet_id,
									$product_id
								)
							);
							wp_cache_delete( 'readypos_outlet_stock_' . absint( $session->outlet_id ) . '_' . absint( $product_id ), 'readypos_inventory' );
						}
					}
				}
			}

			// Award loyalty points to customer (1 point per $1 spent).
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
					// No POS profile exists yet for this WP user (e.g. customer
					// was added via the POS picker as a WP user only). Create
					// the row seeded with this order's contribution so future
					// reads stay in sync instead of always recomputing.
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
		
		return $this->cache_response(
			"orders_list_{$page}_{$limit}",
			function() use ( $limit, $page ) {
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
					// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Required WooCommerce order flag lookup for POS history.
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
					// Pre-fetch all relevant POSOrderMeta records to avoid N+1 queries
					$order_ids = array();
					foreach ( $results->orders as $wc_order ) {
						$order_ids[] = $wc_order->get_id();
					}

					$pos_metas = array();
					if ( ! empty( $order_ids ) ) {
						$metas = POSOrderMeta::whereIn( 'wc_order_id', $order_ids )->get();
						foreach ( $metas as $meta ) {
							$pos_metas[ $meta->wc_order_id ] = $meta;
						}
					}

					$cashier_ids = array();
					foreach ( $results->orders as $wc_order ) {
						$order_id   = $wc_order->get_id();
						$pos_meta   = isset( $pos_metas[ $order_id ] ) ? $pos_metas[ $order_id ] : null;
						$cashier_id = $pos_meta ? $pos_meta->cashier_id : get_current_user_id();
						if ( $cashier_id ) {
							$cashier_ids[] = $cashier_id;
						}
					}

					$cashiers = array();
					if ( ! empty( $cashier_ids ) ) {
						$user_query = new \WP_User_Query( array(
							'include' => array_unique( $cashier_ids ),
						) );
						foreach ( $user_query->get_results() as $user ) {
							$cashiers[ $user->ID ] = $user;
						}
					}

					foreach ( $results->orders as $wc_order ) {
						$order_id    = $wc_order->get_id();
						$pos_meta    = isset( $pos_metas[ $order_id ] ) ? $pos_metas[ $order_id ] : null;
						$cashier_id  = $pos_meta ? $pos_meta->cashier_id : get_current_user_id();
						$cashier     = isset( $cashiers[ $cashier_id ] ) ? $cashiers[ $cashier_id ] : null;
						$payment     = $pos_meta ? $pos_meta->payment_method : ( $wc_order->get_payment_method() ?: 'unknown' );
						$order_date  = $wc_order->get_date_created();

						$orders[] = array(
							'id'             => $wc_order->get_id(),
							'order_number'   => $wc_order->get_order_number(),
							'total'          => floatval( $wc_order->get_total() ),
							'payment_method' => $payment,
							'cashier_name'   => $cashier ? $cashier->display_name : __( 'Unknown', 'ready-pos-for-woocommerce' ),
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
			},
			'orders',
						0 // use Cache::CACHE_GROUPS['orders'] default (5s)
		);
	}

	/**
	 * Invalidate all dashboard report transients.
	 *
	 * The reports controller caches each response for 2 minutes. After a new
	 * POS order is created, those transients must be flushed so the freshly
	 * completed sale shows up in totals, charts, payment-method and product
	 * performance widgets without the user having to wait for the cache to
	 * expire.
	 */
	private function invalidate_report_caches() {
		$keys = array(
			// Sales summary is cached per `$days` window (1, 7, 30, 90, ...).
			// The most common default and the value the dashboard requests.
			'readypos_report_sales_summary_1',
			'readypos_report_sales_summary_7',
			'readypos_report_sales_summary_30',
			'readypos_report_sales_summary_90',
			'readypos_report_product_perf_1',
			'readypos_report_product_perf_7',
			'readypos_report_product_perf_30',
			'readypos_report_product_perf_90',
			'readypos_report_payment_methods_1',
			'readypos_report_payment_methods_7',
			'readypos_report_payment_methods_30',
			'readypos_report_payment_methods_90',
			'readypos_report_low_stock_5',
			'readypos_report_low_stock_8',
			'readypos_report_low_stock_10',
			'readypos_report_low_stock_20',
			'readypos_report_low_stock_50',
		);

		foreach ( $keys as $key ) {
			delete_transient( $key );
		}
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
			return new \WP_Error( 'not_found', __( 'Order not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
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

		// Gather refund information
		$refunded_amount = floatval( $wc_order->get_total_refunded() );
		$refund_items    = $wc_order->get_refunds();
		$refund_history  = array();
		foreach ( $refund_items as $refund ) {
			$refund_history[] = array(
				'id'        => $refund->get_id(),
				'amount'    => floatval( abs( $refund->get_amount() ) ),
				'reason'    => $refund->get_reason(),
				'date'      => $refund->get_date_created() ? $refund->get_date_created()->date( 'Y-m-d H:i:s' ) : '',
			);
		}

		if ( empty( $refund_history ) ) {
			global $wpdb;
			$refund_rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT p.ID, p.post_date,
							(SELECT meta_value FROM {$wpdb->postmeta}
							  WHERE post_id = p.ID AND meta_key = '_refund_amount' LIMIT 1) AS refund_amount,
							(SELECT meta_value FROM {$wpdb->postmeta}
							  WHERE post_id = p.ID AND meta_key = '_refund_reason' LIMIT 1) AS refund_reason
					 FROM {$wpdb->posts} p
					 WHERE p.post_type = 'shop_order_refund'
					   AND p.post_parent = %d
					 ORDER BY p.post_date DESC, p.ID DESC",
					$order_id
				)
			);
			foreach ( (array) $refund_rows as $row ) {
				$refund_history[] = array(
					'id'     => intval( $row->ID ),
					'amount' => floatval( $row->refund_amount ),
					'reason' => $row->refund_reason,
					'date'   => $row->post_date ? mysql2date( 'Y-m-d H:i:s', $row->post_date ) : '',
				);
			}
		}

		$details = array(
			'id'               => $order_id,
			'order_number'     => $wc_order->get_order_number(),
			'items'            => $items,
			'subtotal'         => floatval( $wc_order->get_subtotal() ),
			'total'            => floatval( $wc_order->get_total() ),
			'discount'         => floatval( $wc_order->get_discount_total() ),
			'tax'              => floatval( $wc_order->get_total_tax() ),
			'payment_method'   => $pos_meta ? $pos_meta->payment_method : $wc_order->get_payment_method(),
			'cash_received'    => $pos_meta ? floatval( $pos_meta->cash_received ) : 0,
			'change_given'     => $pos_meta ? floatval( $pos_meta->change_given ) : 0,
			'date'             => $wc_order->get_date_created()->date( 'Y-m-d H:i:s' ),
			'status'           => $wc_order->get_status(),
			'notes'            => $wc_order->get_customer_note(),
			'customer_id'      => $wc_order->get_customer_id() ? intval( $wc_order->get_customer_id() ) : null,
			'customer_name'    => trim( $wc_order->get_billing_first_name() . ' ' . $wc_order->get_billing_last_name() ),
			'customer_email'   => $wc_order->get_billing_email(),
			'customer_phone'   => $wc_order->get_billing_phone(),
			'refunded_amount'  => $refunded_amount,
			'refundable_amount'=> max( 0, floatval( $wc_order->get_total() ) - $refunded_amount ),
			'refund_history'   => $refund_history,
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
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'readypos_manage_pos' ) ) {
			return new \WP_Error(
				'insufficient_permissions',
				__( 'You do not have permission to process refunds.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$order_id = intval( $request->get_param( 'orderId' ) );
		$amount   = floatval( $request->get_param( 'amount' ) );
		$reason   = $request->get_param( 'reason' ) ? sanitize_text_field( $request->get_param( 'reason' ) ) : '';

		if ( $amount <= 0 ) {
			return new \WP_Error(
				'invalid_amount',
				__( 'Refund amount must be greater than zero.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return new \WP_Error( 'not_found', __( 'Order not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		// Validate refund amount doesn't exceed order total
		if ( $amount > $order->get_total() ) {
			return new \WP_Error(
				'amount_exceeds_total',
				__( 'Refund amount cannot exceed order total.', 'ready-pos-for-woocommerce' ),
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
					__( 'Refund amount exceeds remaining refundable amount of %s.', 'ready-pos-for-woocommerce' ),
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
					__( 'POS Refund of %1$s processed by %2$s', 'ready-pos-for-woocommerce' ),
					wc_price( $amount ),
					$current_user->display_name
				)
			);

			// Clear the WP object cache for this order so wc_get_order()
			// reads fresh totals/status from the database instead of
			// returning stale in-memory values that cause the UI to show
			// the pre-refund amount and wrong status.
			clean_post_cache( $order_id );
			wp_cache_delete( $order_id, 'orders' );

			$order = wc_get_order( $order_id );
			if ( ! $order ) {
				return new \WP_Error( 'not_found', __( 'Order not found after refund.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
			}

			// Ensure correct order status after refund.
			// wc_create_refund() handles status internally but may not always
			// set partially-refunded for manual POS refunds (refund_payment=false
			// skips the gateway path that normally triggers the transition).
			$new_refunded_total = $order->get_total_refunded();
			$desired_status     = ( $new_refunded_total >= $order->get_total() ) ? 'refunded' : 'partially-refunded';

			// Normalize the desired status to the WC prefixed form used by
			// wp_posts.post_status. The `get_status()` return value uses the
			// un-prefixed slug (e.g. 'partially-refunded'), but the actual
			// database value is 'wc-partially-refunded'.
			$desired_post_status = 'wc-' . $desired_status;

			// Read the authoritative status directly from the database so we
			// can detect a silently-rejected transition (a known WC quirk
			// where update_status() returns without throwing even though the
			// post_status term wasn't updated). This matters most for
			// partial refunds where the transition from non-`completed`
			// states can be blocked.
			global $wpdb;
			$db_post_status = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT post_status FROM {$wpdb->posts} WHERE ID = %d",
					$order_id
				)
			);

			if ( $db_post_status !== $desired_post_status ) {
				// Try the high-level WC API first.
				if ( $order->get_status() !== $desired_status ) {
					$order->update_status(
						$desired_status,
						__( 'Status updated by POS refund.', 'ready-pos-for-woocommerce' )
					);
				}

				// Forcefully clear every cache layer that could mask the
				// post_status change: object cache, post meta, and the
				// taxonomy term cache for shop_order_status.
				clean_post_cache( $order_id );
				wp_cache_delete( $order_id, 'orders' );
				wp_cache_delete( $order_id, 'post_meta' );
				clean_term_cache( array( $order_id ), 'shop_order_status' );

				// Verify the transition actually persisted. If WC's
				// internal validator silently rejected it (which happens
				// for some installs when the source status isn't in the
				// WC `valid_order_statuses` allow-list for the target
				// status), fall back to a direct wp_update_post() so the
				// post_status is guaranteed to land on the right value.
				$db_post_status = $wpdb->get_var(
					$wpdb->prepare(
						"SELECT post_status FROM {$wpdb->posts} WHERE ID = %d",
						$order_id
					)
				);
				if ( $db_post_status !== $desired_post_status ) {
					wp_update_post(
						array(
							'ID'          => $order_id,
							'post_status' => $desired_post_status,
						)
					);
					clean_post_cache( $order_id );
					wp_cache_delete( $order_id, 'orders' );
					wp_cache_delete( $order_id, 'post_meta' );
					clean_term_cache( array( $order_id ), 'shop_order_status' );
					// Also record an order note so the audit trail reflects
					// the manual fix (helps with debugging POS deployments
					// where WC's transition validator is overly strict).
					$order->add_order_note(
						sprintf(
							/* translators: %s: order status slug */
							__( 'POS refund: forced order status to %s via direct DB update.', 'ready-pos-for-woocommerce' ),
							$desired_status
						)
					);
				}

				// Always re-fetch the order from a clean cache so the
				// response below reflects the final, persisted state.
				$order = wc_get_order( $order_id );
			}

			// Adjust POS session refunds if session metadata exists.
			// We must also reverse the matching payment-method bucket
			// (cash_total / card_total) so the terminal header's
			// "Drawer Cash Float" badge and the petty-cash ledger reflect
			// the money actually leaving the drawer. Without this, a
			// cash refund would bump `total_refunds` but the drawer total
			// would stay inflated until the register is closed.
			$pos_meta = POSOrderMeta::where( 'wc_order_id', $order_id )->first();
			if ( $pos_meta && $pos_meta->session_id ) {
				$session = POSSession::find( $pos_meta->session_id );
				if ( $session && 'open' === $session->status ) {
					// Determine which payment-method bucket to credit.
					// POSOrderMeta stores the original payment_method set
					// at order creation ('cash' | 'card'). Refunds always
					// go back to the same bucket the customer paid with.
					$cash_delta = 0.0;
					$card_delta = 0.0;
					if ( 'cash' === $pos_meta->payment_method ) {
						$cash_delta = -1.0 * floatval( $amount );
					} elseif ( 'card' === $pos_meta->payment_method ) {
						$card_delta = -1.0 * floatval( $amount );
					}

					// Atomic update so we don't race with concurrent sales
					// and never push cash_total/card_total below zero from
					// a partial drift. Mirrors the create() flow in shape.
					global $wpdb;
					$sessions_table = $wpdb->prefix . 'readypos_sessions';

					$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						$wpdb->prepare(
							"UPDATE `" . esc_sql( $sessions_table ) . "`
							SET total_refunds = total_refunds + %f,
								cash_total = GREATEST(0, cash_total + %f),
								card_total = GREATEST(0, card_total + %f)
							WHERE id = %d AND status = 'open'",
							floatval( $amount ),
							$cash_delta,
							$card_delta,
							intval( $pos_meta->session_id )
						)
					);

					// Bust the cached session row so the next /sessions/current
					// call recomputes from the DB rather than reading the
					// pre-refund cash_total.
					$session_cache_key = 'readypos_open_session_' . absint( $pos_meta->session_id );
					wp_cache_delete( $session_cache_key, 'readypos_sessions' );
					$this->clear_cache( 'sessions' );
				}
			}

			// Reverse loyalty points + total_spent for the customer.
			// Points are awarded at order creation (1 point per $1 spent) and
			// visit_count is incremented, so a refund must remove the
			// proportional amount otherwise the customer keeps points for
			// money they no longer spent. We only reverse when the order was
			// originally tied to a customer (matches the create() guard) and
			// clamp at zero so a manual drift between POSCustomer and the
			// order can never push the balance negative.
			$wc_customer_id = $order->get_customer_id();
			if ( ! empty( $wc_customer_id ) ) {
				$wc_customer_id_int = intval( $wc_customer_id );
				$pos_customer       = POSCustomer::where( 'wc_customer_id', $wc_customer_id_int )->first();

				if ( $pos_customer ) {
					$points_to_revoke = (int) floor( $amount );
					$new_points       = max( 0, intval( $pos_customer->loyalty_points ) - $points_to_revoke );
					$new_total_spent  = max( 0, floatval( $pos_customer->total_spent ) - floatval( $amount ) );

					if ( $new_points !== intval( $pos_customer->loyalty_points )
						|| abs( $new_total_spent - floatval( $pos_customer->total_spent ) ) > 0.0001
					) {
						$pos_customer->loyalty_points = $new_points;
						$pos_customer->total_spent    = $new_total_spent;
						$pos_customer->save();
					}
				}
			}

			// Invalidate order + orders-list + customer caches so subsequent
			// reads see the refunded status, updated totals, and post-refund
			// loyalty balance instead of stale data.
			$this->invalidate_cache( 'order', $order_id );
			$this->clear_cache( 'orders' );
			if ( ! empty( $wc_customer_id ) ) {
				$this->invalidate_cache( 'customer', intval( $wc_customer_id ) );
				$this->clear_cache( 'customers' );
			}
			$this->invalidate_report_caches();

			// Build refund history for the response so the modal can update
					// immediately without a second round-trip. We first try
					// WC's get_refunds(), then fall back to a direct DB query
					// against shop_order_refund posts so we always return the
					// correct list even if WC's in-memory cache returns an
					// empty array right after creation (which happens on
					// partial refunds in some WC versions).
					$refund_history = array();
					foreach ( $order->get_refunds() as $r ) {
						$refund_history[] = array(
							'id'     => $r->get_id(),
							'amount' => floatval( abs( $r->get_amount() ) ),
							'reason' => $r->get_reason(),
							'date'   => $r->get_date_created() ? $r->get_date_created()->date( 'Y-m-d H:i:s' ) : '',
						);
					}

					if ( empty( $refund_history ) ) {
						// Defensive DB-direct fallback so the modal always
						// shows the partial-refund record immediately after
						// the cashier hits "Process Refund".
						$refund_rows = $wpdb->get_results(
							$wpdb->prepare(
								"SELECT p.ID, p.post_date,
										(SELECT meta_value FROM {$wpdb->postmeta}
										  WHERE post_id = p.ID AND meta_key = '_refund_amount' LIMIT 1) AS refund_amount,
										(SELECT meta_value FROM {$wpdb->postmeta}
										  WHERE post_id = p.ID AND meta_key = '_refund_reason' LIMIT 1) AS refund_reason
								 FROM {$wpdb->posts} p
								 WHERE p.post_type = 'shop_order_refund'
								   AND p.post_parent = %d
								 ORDER BY p.post_date DESC, p.ID DESC",
								$order_id
							)
						);
						foreach ( (array) $refund_rows as $row ) {
							$refund_history[] = array(
								'id'     => intval( $row->ID ),
								'amount' => floatval( $row->refund_amount ),
								'reason' => $row->refund_reason,
								'date'   => $row->post_date ? mysql2date( 'Y-m-d H:i:s', $row->post_date ) : '',
							);
						}
					}

			return new \WP_REST_Response(
				array(
					'success'           => true,
					'status'            => $order->get_status(),
					'refunded_amount'   => floatval( $order->get_total_refunded() ),
					'refundable_amount' => max( 0, floatval( $order->get_total() ) - floatval( $order->get_total_refunded() ) ),
					'refund_history'    => $refund_history,
					'loyalty'           => array(
						'points_redeemed'  => isset( $points_to_revoke ) ? $points_to_revoke : 0,
						'remaining_points' => isset( $new_points ) ? $new_points : null,
					),
				),
				200
			);

		} catch ( \Exception $e ) {
			return new \WP_Error( 'refund_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
	}
}
