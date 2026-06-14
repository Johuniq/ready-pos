<?php
/**
 * POS Reports and Analytics actions.
 *
 * @package Readypos\Controllers\Reports
 * @since 1.0.0
 */

namespace Readypos\Controllers\Reports;

use Readypos\Models\POSOrderMeta;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles the free dashboard analytics endpoints for the POS admin dashboard.
 * The advanced Pro-only Reports page has been removed in the GPL release.
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
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Required to filter POS orders, indexed by WooCommerce HPOS
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
			// Net out any refunds so the aggregated total does not double-count
			// refunded amounts as if they were fresh sales.
			$refunded = floatval( $order->get_total_refunded() );
			$gross   += max( 0, floatval( $order->get_total() ) - $refunded );
			$tax     += max( 0, floatval( $order->get_total_tax() ) - floatval( $order->get_total_tax_refunded() ) );
			$disc    += floatval( $order->get_discount_total() );
			$count   += 1;
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
	 * ============================================================================
	 * DASHBOARD-ONLY FREE ENDPOINTS (No Pro License Required)
	 * ============================================================================
	 * These endpoints provide basic metrics for the dashboard overview page.
	 * The advanced Pro-only Reports page has been removed in the GPL release.
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

		$cache_key = 'readypos_report_sales_summary_free_' . $days;
		$cached = get_transient( $cache_key );
		if ( false !== $cached ) {
			return new \WP_REST_Response( $cached, 200 );
		}

		$now = current_time( 'timestamp' );

		// Current period
		$current_start = wp_date( 'Y-m-d 00:00:00', strtotime( "-{$days} days", $now ) );
		$current_end   = wp_date( 'Y-m-d 23:59:59', $now );

		// Previous equivalent period
		$prev_days     = $days * 2;
		$previous_start = wp_date( 'Y-m-d 00:00:00', strtotime( "-{$prev_days} days", $now ) );
		$previous_end   = wp_date( 'Y-m-d 23:59:59', strtotime( "-{$days} days -1 day", $now ) );

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
			$date                    = wp_date( 'Y-m-d', strtotime( "-{$i} days", $now ) );
			$daily_chart[ $date ]    = 0;
		}

		foreach ( $current_orders as $order ) {
			$created_at = $order->get_date_created();
			if ( ! $created_at ) {
				continue;
			}
			$date_key = $created_at->date( 'Y-m-d' );
			if ( isset( $daily_chart[ $date_key ] ) ) {
				// Net out refunds so the daily chart reflects actual sales, not gross pre-refund.
				$refunded    = floatval( $order->get_total_refunded() );
				$daily_chart[ $date_key ] += max( 0, floatval( $order->get_total() ) - $refunded );
			}
		}

		$chart_data = array();
		foreach ( $daily_chart as $date => $amount ) {
			$chart_data[] = array(
				'date'  => wp_date( 'M d', strtotime( $date ) ),
				'sales' => round( $amount, 2 ),
			);
		}

		$response_data = array(
			'summary'  => $current_summary,
			'previous' => $previous_summary,
			'growth'   => $growth,
			'chart'    => $chart_data,
		);

		set_transient( $cache_key, $response_data, HOUR_IN_SECONDS );

		return new \WP_REST_Response( $response_data, 200 );
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

		$cache_key = 'readypos_report_product_perf_free_' . $days;
		$cached = get_transient( $cache_key );
		if ( false !== $cached ) {
			return new \WP_REST_Response( $cached, 200 );
		}

		$start = wp_date( 'Y-m-d 00:00:00', strtotime( "-{$days} days" ) );
		$end   = wp_date( 'Y-m-d 23:59:59' );

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

		set_transient( $cache_key, $products, HOUR_IN_SECONDS );

		return new \WP_REST_Response( $products, 200 );
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

		$cache_key = 'readypos_report_payment_methods_free_' . $days;
		$cached = get_transient( $cache_key );
		if ( false !== $cached ) {
			return new \WP_REST_Response( $cached, 200 );
		}

		$start = wp_date( 'Y-m-d 00:00:00', strtotime( "-{$days} days" ) );
		$end   = wp_date( 'Y-m-d 23:59:59' );

		$orders  = $this->fetch_pos_orders( $start, $end );
		$methods = array();

		// Pre-fetch all relevant POSOrderMeta records to avoid N+1 queries
		$order_ids = array();
		foreach ( $orders as $order ) {
			if ( $order ) {
				$order_ids[] = $order->get_id();
			}
		}

		$pos_metas = array();
		if ( ! empty( $order_ids ) ) {
			$metas = POSOrderMeta::whereIn( 'wc_order_id', $order_ids )->get();
			foreach ( $metas as $meta ) {
				$pos_metas[ $meta->wc_order_id ] = $meta;
			}
		}

		foreach ( $orders as $order ) {
			$order_id = $order->get_id();
			$pos_meta = isset( $pos_metas[ $order_id ] ) ? $pos_metas[ $order_id ] : null;
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
			// Net out refunds so payment-method sales reflect actual collected amount.
			$refunded                = floatval( $order->get_total_refunded() );
			$methods[ $method ]['sales'] += max( 0, floatval( $order->get_total() ) - $refunded );
		}

		$methods = array_values( $methods );

		foreach ( $methods as &$m ) {
			$m['sales'] = round( $m['sales'], 2 );
		}

		set_transient( $cache_key, $methods, HOUR_IN_SECONDS );

		return new \WP_REST_Response( $methods, 200 );
	}
}
