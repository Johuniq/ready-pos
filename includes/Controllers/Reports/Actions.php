<?php
/**
 * POS Reports and Analytics actions.
 *
 * @package Readypos\Controllers\Reports
 * @since 1.0.0
 */

namespace Readypos\Controllers\Reports;

use Readypos\Models\POSOrderMeta;
use Readypos\Models\POSSession;
use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles analytics and reporting details for the POS admin dashboard.
 *
 * @package Readypos\Controllers\Reports
 */
class Actions {

	/**
	 * Fetch all POS-flagged WooCommerce orders within a date range.
	 *
	 * Uses the `_readypos_is_pos_order` order meta marker so it works even
	 * when the custom POSOrderMeta table is empty / out of sync.
	 *
	 * @param string $start ISO datetime (Y-m-d H:i:s).
	 * @param string $end   ISO datetime (Y-m-d H:i:s).
	 * @return \WC_Order[]
	 */
	private function fetch_pos_orders( $start, $end ) {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return array();
		}

		$args = array(
			'limit'        => -1,
			'status'       => array( 'completed', 'processing', 'on-hold', 'refunded' ),
			'date_created' => $start . '...' . $end,
			'meta_query'   => array(
				array(
					'key'     => '_readypos_is_pos_order',
					'value'   => 'yes',
					'compare' => '=',
				),
			),
		);

		$orders = wc_get_orders( $args );
		return is_array( $orders ) ? $orders : array();
	}

	/**
	 * Aggregate gross/net/orders/tax/discount totals from a list of WC orders.
	 *
	 * @param \WC_Order[] $orders
	 * @return array
	 */
	private function aggregate_totals( $orders ) {
		$gross = 0.0;
		$tax   = 0.0;
		$disc  = 0.0;
		$count = 0;

		foreach ( $orders as $order ) {
			if ( ! $order ) {
				continue;
			}
			$gross += floatval( $order->get_total() );
			$tax   += floatval( $order->get_total_tax() );
			$disc  += floatval( $order->get_discount_total() );
			$count += 1;
		}

		return array(
			'gross_sales'  => round( $gross, 2 ),
			'total_orders' => $count,
			'total_tax'    => round( $tax, 2 ),
			'total_disc'   => round( $disc, 2 ),
			'net_sales'    => round( $gross - $tax, 2 ),
		);
	}

	/**
	 * Calculate growth percentage between current and previous values.
	 *
	 * @param float $current
	 * @param float $previous
	 * @return float
	 */
	private function growth_pct( $current, $previous ) {
		if ( $previous <= 0 ) {
			return $current > 0 ? 100.0 : 0.0;
		}
		return round( ( ( $current - $previous ) / $previous ) * 100, 1 );
	}

	/**
	 * Secure integrity check to prevent license bypass.
	 *
	 * Checks the option plan, status, and recalculates the SHA-256 HMAC signature
	 * of the license data using WordPress AUTH_KEY and the current site domain host.
	 *
	 * @return bool|\WP_Error
	 */
	private function verify_gated_access() {
		$plan       = get_option( 'readypos_license_plan', 'free' );
		$status     = get_option( 'readypos_license_status', 'free' );
		$stored_sig = get_option( 'readypos_license_sig', '' );

		if ( 'pro' !== $plan || ! in_array( $status, array( 'active', 'grace' ), true ) || empty( $stored_sig ) ) {
			return new \WP_Error(
				'pro_feature_required',
				__( 'This premium feature requires a valid ReadyPOS Pro license.', 'ready-pos' ),
				array( 'status' => 402 )
			);
		}

		$auth_key = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'readypos-fallback-key';
		$host     = wp_parse_url( home_url(), PHP_URL_HOST ) ?: '';
		$key      = hash( 'sha256', $auth_key . '|readypos-license-integrity|' . $host, true );

		$fields = array(
			'plan'       => $plan,
			'status'     => $status,
			'key'        => get_option( 'readypos_license_key', '' ),
			'expires_at' => get_option( 'readypos_license_expires_at', '' ),
			'type'       => get_option( 'readypos_license_type', '' ),
		);
		ksort( $fields );
		$payload = implode( '|', $fields );
		$expected = hash_hmac( 'sha256', $payload, $key );

		if ( ! hash_equals( $expected, $stored_sig ) ) {
			return new \WP_Error(
				'license_integrity_violation',
				__( 'License integrity check failed.', 'ready-pos' ),
				array( 'status' => 402 )
			);
		}

		return true;
	}

	/**
	 * Retrieve a summary of sales for a given date range, plus the previous
	 * equivalent period for growth calculations.
	 *
	 * PRO FEATURE: This endpoint requires a Pro license.
	 * Note: Dashboard uses /reports/dashboard-summary which is free.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function sales_summary( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$now = current_time( 'timestamp' );

		// Current period
		$current_start = date( 'Y-m-d 00:00:00', strtotime( "-{$days} days", $now ) );
		$current_end   = date( 'Y-m-d 23:59:59', $now );

		// Previous equivalent period (the days before current period started)
		$prev_days     = $days * 2;
		$previous_start = date( 'Y-m-d 00:00:00', strtotime( "-{$prev_days} days", $now ) );
		$previous_end   = date( 'Y-m-d 23:59:59', strtotime( "-{$days} days -1 day", $now ) );

		$current_orders  = $this->fetch_pos_orders( $current_start, $current_end );
		$previous_orders = $this->fetch_pos_orders( $previous_start, $previous_end );

		$current_summary  = $this->aggregate_totals( $current_orders );
		$previous_summary = $this->aggregate_totals( $previous_orders );

		// Compute growth percentages
		$growth = array(
			'gross_sales'  => $this->growth_pct( $current_summary['gross_sales'], $previous_summary['gross_sales'] ),
			'total_orders' => $this->growth_pct( $current_summary['total_orders'], $previous_summary['total_orders'] ),
			'avg_order'    => $this->growth_pct(
				$current_summary['total_orders'] > 0 ? $current_summary['gross_sales'] / $current_summary['total_orders'] : 0,
				$previous_summary['total_orders'] > 0 ? $previous_summary['gross_sales'] / $previous_summary['total_orders'] : 0
			),
		);

		// Daily chart for current period
		$daily_chart = array();
		for ( $i = $days; $i >= 0; $i-- ) {
			$date                    = date( 'Y-m-d', strtotime( "-{$i} days", $now ) );
			$daily_chart[ $date ]    = 0;
		}

		foreach ( $current_orders as $order ) {
			$created_at = $order->get_date_created();
			if ( ! $created_at ) {
				continue;
			}
			$date_key = $created_at->date( 'Y-m-d' );
			if ( isset( $daily_chart[ $date_key ] ) ) {
				$daily_chart[ $date_key ] += floatval( $order->get_total() );
			}
		}

		$chart_data = array();
		foreach ( $daily_chart as $date => $amount ) {
			$chart_data[] = array(
				'date'  => date( 'M d', strtotime( $date ) ),
				'sales' => round( $amount, 2 ),
			);
		}

		return new \WP_REST_Response(
			array(
				'summary'  => $current_summary,
				'previous' => $previous_summary,
				'growth'   => $growth,
				'chart'    => $chart_data,
			),
			200
		);
	}

	/**
	 * Get top selling products.
	 *
	 * PRO FEATURE: This endpoint requires a Pro license.
	 * Note: Dashboard uses /reports/dashboard-products which is free.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function product_performance( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$start = date( 'Y-m-d 00:00:00', strtotime( "-{$days} days" ) );
		$end   = date( 'Y-m-d 23:59:59' );

		$orders   = $this->fetch_pos_orders( $start, $end );
		$products = array();

		foreach ( $orders as $order ) {
			foreach ( $order->get_items() as $item ) {
				$product_id = $item->get_product_id();
				if ( ! $product_id ) {
					continue;
				}

				if ( ! isset( $products[ $product_id ] ) ) {
					$products[ $product_id ] = array(
						'id'       => $product_id,
						'name'     => $item->get_name(),
						'quantity' => 0,
						'total'    => 0.0,
					);
				}

				$products[ $product_id ]['quantity'] += intval( $item->get_quantity() );
				$products[ $product_id ]['total']    += floatval( $item->get_total() );
			}
		}

		$products = array_values( $products );

		usort(
			$products,
			function ( $a, $b ) {
				return $b['quantity'] <=> $a['quantity'];
			}
		);

		// Round totals & cap at top 10
		$products = array_slice( $products, 0, 10 );
		foreach ( $products as &$p ) {
			$p['total'] = round( $p['total'], 2 );
		}

		return new \WP_REST_Response( $products, 200 );
	}

	/**
	 * Get breakdown by cashier.
	 *
	 * PRO FEATURE: This endpoint requires a Pro license.
	 * Note: Dashboard uses /reports/dashboard-cashiers which is free.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function cashier_performance( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$start = date( 'Y-m-d 00:00:00', strtotime( "-{$days} days" ) );
		$end   = date( 'Y-m-d 23:59:59' );

		$orders   = $this->fetch_pos_orders( $start, $end );
		$cashiers = array();

		foreach ( $orders as $order ) {
			$cashier_id = intval( $order->get_meta( '_readypos_cashier_id' ) );
			if ( ! $cashier_id ) {
				continue;
			}

			if ( ! isset( $cashiers[ $cashier_id ] ) ) {
				$user = get_userdata( $cashier_id );
				$cashiers[ $cashier_id ] = array(
					'id'     => $cashier_id,
					'name'   => $user ? $user->display_name : __( 'Unknown', 'ready-pos' ),
					'orders' => 0,
					'sales'  => 0.0,
				);
			}

			$cashiers[ $cashier_id ]['orders'] += 1;
			$cashiers[ $cashier_id ]['sales']  += floatval( $order->get_total() );
		}

		$cashiers = array_values( $cashiers );

		usort(
			$cashiers,
			function ( $a, $b ) {
				return $b['sales'] <=> $a['sales'];
			}
		);

		foreach ( $cashiers as &$c ) {
			$c['sales'] = round( $c['sales'], 2 );
		}

		return new \WP_REST_Response( $cashiers, 200 );
	}

	/**
	 * Get payment methods breakdown.
	 *
	 * PRO FEATURE: This endpoint requires a Pro license.
	 * Note: Dashboard uses /reports/dashboard-payments which is free.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function payment_methods( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$start = date( 'Y-m-d 00:00:00', strtotime( "-{$days} days" ) );
		$end   = date( 'Y-m-d 23:59:59' );

		$orders  = $this->fetch_pos_orders( $start, $end );
		$methods = array();

		foreach ( $orders as $order ) {
			// Prefer the readypos meta record for accurate method (handles split orders),
			// fallback to WC payment method.
			$pos_meta = POSOrderMeta::where( 'wc_order_id', $order->get_id() )->first();
			$method   = $pos_meta && ! empty( $pos_meta->payment_method )
				? $pos_meta->payment_method
				: ( $order->get_payment_method() ?: 'unknown' );

			if ( ! isset( $methods[ $method ] ) ) {
				$methods[ $method ] = array(
					'method' => ucfirst( str_replace( '_', ' ', $method ) ),
					'count'  => 0,
					'sales'  => 0.0,
				);
			}

			$methods[ $method ]['count'] += 1;
			$methods[ $method ]['sales'] += floatval( $order->get_total() );
		}

		$methods = array_values( $methods );

		foreach ( $methods as &$m ) {
			$m['sales'] = round( $m['sales'], 2 );
		}

		return new \WP_REST_Response( $methods, 200 );
	}

	/**
	 * ============================================================================
	 * DASHBOARD-ONLY FREE ENDPOINTS (No Pro License Required)
	 * ============================================================================
	 * These endpoints provide basic metrics for the dashboard overview page.
	 * They are separate from the advanced Reports page which requires Pro.
	 */

	/**
	 * Dashboard sales summary - FREE for all users.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function dashboard_sales_summary( \WP_REST_Request $request ) {
		// No license gate - dashboard overview is free
		return $this->sales_summary_internal( $request );
	}

	/**
	 * Dashboard product performance - FREE for all users.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function dashboard_product_performance( \WP_REST_Request $request ) {
		// No license gate - dashboard overview is free
		return $this->product_performance_internal( $request );
	}

	/**
	 * Dashboard cashier performance - FREE for all users.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function dashboard_cashier_performance( \WP_REST_Request $request ) {
		// No license gate - dashboard overview is free
		return $this->cashier_performance_internal( $request );
	}

	/**
	 * Dashboard payment methods - FREE for all users.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function dashboard_payment_methods( \WP_REST_Request $request ) {
		// No license gate - dashboard overview is free
		return $this->payment_methods_internal( $request );
	}

	/**
	 * Internal sales summary logic (shared by both Pro and Dashboard endpoints).
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	private function sales_summary_internal( \WP_REST_Request $request ) {
		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$now = current_time( 'timestamp' );

		// Current period
		$current_start = date( 'Y-m-d 00:00:00', strtotime( "-{$days} days", $now ) );
		$current_end   = date( 'Y-m-d 23:59:59', $now );

		// Previous equivalent period
		$prev_days     = $days * 2;
		$previous_start = date( 'Y-m-d 00:00:00', strtotime( "-{$prev_days} days", $now ) );
		$previous_end   = date( 'Y-m-d 23:59:59', strtotime( "-{$days} days -1 day", $now ) );

		$current_orders  = $this->fetch_pos_orders( $current_start, $current_end );
		$previous_orders = $this->fetch_pos_orders( $previous_start, $previous_end );

		$current_summary  = $this->aggregate_totals( $current_orders );
		$previous_summary = $this->aggregate_totals( $previous_orders );

		// Compute growth percentages
		$growth = array(
			'gross_sales'  => $this->growth_pct( $current_summary['gross_sales'], $previous_summary['gross_sales'] ),
			'total_orders' => $this->growth_pct( $current_summary['total_orders'], $previous_summary['total_orders'] ),
			'avg_order'    => $this->growth_pct(
				$current_summary['total_orders'] > 0 ? $current_summary['gross_sales'] / $current_summary['total_orders'] : 0,
				$previous_summary['total_orders'] > 0 ? $previous_summary['gross_sales'] / $previous_summary['total_orders'] : 0
			),
		);

		// Daily chart for current period
		$daily_chart = array();
		for ( $i = $days; $i >= 0; $i-- ) {
			$date                    = date( 'Y-m-d', strtotime( "-{$i} days", $now ) );
			$daily_chart[ $date ]    = 0;
		}

		foreach ( $current_orders as $order ) {
			$created_at = $order->get_date_created();
			if ( ! $created_at ) {
				continue;
			}
			$date_key = $created_at->date( 'Y-m-d' );
			if ( isset( $daily_chart[ $date_key ] ) ) {
				$daily_chart[ $date_key ] += floatval( $order->get_total() );
			}
		}

		$chart_data = array();
		foreach ( $daily_chart as $date => $amount ) {
			$chart_data[] = array(
				'date'  => date( 'M d', strtotime( $date ) ),
				'sales' => round( $amount, 2 ),
			);
		}

		return new \WP_REST_Response(
			array(
				'summary'  => $current_summary,
				'previous' => $previous_summary,
				'growth'   => $growth,
				'chart'    => $chart_data,
			),
			200
		);
	}

	/**
	 * Internal product performance logic.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	private function product_performance_internal( \WP_REST_Request $request ) {
		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$start = date( 'Y-m-d 00:00:00', strtotime( "-{$days} days" ) );
		$end   = date( 'Y-m-d 23:59:59' );

		$orders   = $this->fetch_pos_orders( $start, $end );
		$products = array();

		foreach ( $orders as $order ) {
			foreach ( $order->get_items() as $item ) {
				$product_id = $item->get_product_id();
				if ( ! $product_id ) {
					continue;
				}

				if ( ! isset( $products[ $product_id ] ) ) {
					$products[ $product_id ] = array(
						'id'       => $product_id,
						'name'     => $item->get_name(),
						'quantity' => 0,
						'total'    => 0.0,
					);
				}

				$products[ $product_id ]['quantity'] += intval( $item->get_quantity() );
				$products[ $product_id ]['total']    += floatval( $item->get_total() );
			}
		}

		$products = array_values( $products );

		usort(
			$products,
			function ( $a, $b ) {
				return $b['quantity'] <=> $a['quantity'];
			}
		);

		$products = array_slice( $products, 0, 10 );
		foreach ( $products as &$p ) {
			$p['total'] = round( $p['total'], 2 );
		}

		return new \WP_REST_Response( $products, 200 );
	}

	/**
	 * Internal cashier performance logic.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	private function cashier_performance_internal( \WP_REST_Request $request ) {
		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$start = date( 'Y-m-d 00:00:00', strtotime( "-{$days} days" ) );
		$end   = date( 'Y-m-d 23:59:59' );

		$orders   = $this->fetch_pos_orders( $start, $end );
		$cashiers = array();

		foreach ( $orders as $order ) {
			$cashier_id = intval( $order->get_meta( '_readypos_cashier_id' ) );
			if ( ! $cashier_id ) {
				continue;
			}

			if ( ! isset( $cashiers[ $cashier_id ] ) ) {
				$user = get_userdata( $cashier_id );
				$cashiers[ $cashier_id ] = array(
					'id'     => $cashier_id,
					'name'   => $user ? $user->display_name : __( 'Unknown', 'ready-pos' ),
					'orders' => 0,
					'sales'  => 0.0,
				);
			}

			$cashiers[ $cashier_id ]['orders'] += 1;
			$cashiers[ $cashier_id ]['sales']  += floatval( $order->get_total() );
		}

		$cashiers = array_values( $cashiers );

		usort(
			$cashiers,
			function ( $a, $b ) {
				return $b['sales'] <=> $a['sales'];
			}
		);

		foreach ( $cashiers as &$c ) {
			$c['sales'] = round( $c['sales'], 2 );
		}

		return new \WP_REST_Response( $cashiers, 200 );
	}

	/**
	 * Internal payment methods logic.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	private function payment_methods_internal( \WP_REST_Request $request ) {
		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$start = date( 'Y-m-d 00:00:00', strtotime( "-{$days} days" ) );
		$end   = date( 'Y-m-d 23:59:59' );

		$orders  = $this->fetch_pos_orders( $start, $end );
		$methods = array();

		foreach ( $orders as $order ) {
			$pos_meta = POSOrderMeta::where( 'wc_order_id', $order->get_id() )->first();
			$method   = $pos_meta && ! empty( $pos_meta->payment_method )
				? $pos_meta->payment_method
				: ( $order->get_payment_method() ?: 'unknown' );

			if ( ! isset( $methods[ $method ] ) ) {
				$methods[ $method ] = array(
					'method' => ucfirst( str_replace( '_', ' ', $method ) ),
					'count'  => 0,
					'sales'  => 0.0,
				);
			}

			$methods[ $method ]['count'] += 1;
			$methods[ $method ]['sales'] += floatval( $order->get_total() );
		}

		$methods = array_values( $methods );

		foreach ( $methods as &$m ) {
			$m['sales'] = round( $m['sales'], 2 );
		}

		return new \WP_REST_Response( $methods, 200 );
	}
}
