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
 * Handles the dashboard analytics endpoints for the POS admin dashboard.
 *
 * @package Readypos\Controllers\Reports
 */
class Actions {

	/**
	 * Fetch all POS-flagged WooCommerce orders within a date range.
	 *
	 * Strategy:
	 *  1. Primary: query WC orders by the `_readypos_is_pos_order` meta marker.
	 *     This is the most reliable path on fresh installs.
	 *  2. Fallback: if that returns nothing, build the same set from the
	 *     custom `readypos_order_meta` table (which is also written on every
	 *     terminal order). This rescues installations where the WC meta
	 *     marker was not persisted (e.g. older plugins, partial migrations,
	 *     or HPOS stores where the legacy `_readypos_is_pos_order` row never
	 *     made it into the wc_orders_meta table).
	 *
	 * @param string $start ISO datetime (Y-m-d H:i:s).
	 * @param string $end   ISO datetime (Y-m-d H:i:s).
	 * @return \WC_Order[]
	 */
	private function fetch_pos_orders( $start, $end ) {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return array();
		}

		// Accept both internal ("wc-completed") and slug ("completed") statuses
		// so reports work regardless of HPOS vs legacy storage.
		$statuses = array( 'completed', 'processing', 'on-hold', 'refunded', 'wc-completed', 'wc-processing', 'wc-on-hold', 'wc-refunded' );

		$args = array(
			'limit'        => -1,
			'status'       => $statuses,
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

		if ( is_array( $orders ) && ! empty( $orders ) ) {
			return $orders;
		}

		// Fallback: derive order IDs from the custom POS meta table.
		$fallback_ids = $this->fetch_pos_order_ids_from_meta_table( $start, $end );
		if ( empty( $fallback_ids ) ) {
			return is_array( $orders ) ? $orders : array();
		}

		$loaded = array();
		foreach ( $fallback_ids as $order_id ) {
			$order = wc_get_order( intval( $order_id ) );
			if ( $order ) {
				$loaded[] = $order;
			}
		}

		// Preserve newest-first ordering for the daily chart loop.
		usort(
			$loaded,
			function ( $a, $b ) {
				$ad = $a->get_date_created();
				$bd = $b->get_date_created();
				$at = $ad ? $ad->getTimestamp() : 0;
				$bt = $bd ? $bd->getTimestamp() : 0;
				return $bt <=> $at;
			}
		);

		return $loaded;
	}

	/**
	 * Resolve POS order IDs from the custom `readypos_order_meta` table.
	 *
	 * Joins the custom table against WC's orders storage (HPOS `wc_orders`
	 * when present, otherwise `wp_posts`) and filters by the same date window
	 * the primary query uses, so the result set is interchangeable.
	 *
	 * @param string $start ISO datetime (Y-m-d H:i:s).
	 * @param string $end   ISO datetime (Y-m-d H:i:s).
	 * @return int[]
	 */
	private function fetch_pos_order_ids_from_meta_table( $start, $end ) {
		global $wpdb;

		$table = $wpdb->prefix . 'readypos_order_meta';
		$exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
		if ( $exists !== $table ) {
			return array();
		}

		// Build a date range in UTC. WC's HPOS column `date_created_gmt` is
		// stored in GMT, and the legacy post_date_gmt is also GMT, so we
		// convert the (site-local) incoming $start/$end to GMT for the join.
		$start_gmt = get_gmt_from_date( $start, 'Y-m-d H:i:s' );
		$end_gmt   = get_gmt_from_date( $end, 'Y-m-d H:i:s' );

		$hpos_orders = $wpdb->prefix . 'wc_orders';
		$has_hpos    = ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $hpos_orders ) ) === $hpos_orders );

		if ( $has_hpos ) {
			$sql = $wpdb->prepare(
				"SELECT m.wc_order_id
				FROM `{$table}` m
				INNER JOIN `{$hpos_orders}` o ON o.id = m.wc_order_id
				WHERE o.date_created_gmt >= %s
				  AND o.date_created_gmt <= %s
				  AND o.status IN ('wc-completed','wc-processing','wc-on-hold','wc-refunded','wc-pending','wc-cancelled','wc-failed')",
				$start_gmt,
				$end_gmt
			);
		} else {
			$posts = $wpdb->posts;
			$sql   = $wpdb->prepare(
				"SELECT m.wc_order_id
				FROM `{$table}` m
				INNER JOIN `{$posts}` p ON p.ID = m.wc_order_id
				WHERE p.post_date_gmt >= %s
				  AND p.post_date_gmt <= %s
				  AND p.post_type = 'shop_order'
				  AND p.post_status IN ('wc-completed','wc-processing','wc-on-hold','wc-refunded','wc-pending','wc-cancelled','wc-failed')",
				$start_gmt,
				$end_gmt
			);
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared -- Query is built from validated table names and prepared values.
		$ids = $wpdb->get_col( $sql );
		return is_array( $ids ) ? array_map( 'intval', $ids ) : array();
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
	 * DASHBOARD ENDPOINTS
	 * ============================================================================
	 * These endpoints provide metrics for the dashboard overview page.
	 */

	/**
	 * Dashboard sales summary.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function dashboard_sales_summary( \WP_REST_Request $request ) {
		return $this->sales_summary_internal( $request );
	}

	/**
	 * Dashboard product performance.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function dashboard_product_performance( \WP_REST_Request $request ) {
		return $this->product_performance_internal( $request );
	}

	/**
	 * Dashboard payment methods.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function dashboard_payment_methods( \WP_REST_Request $request ) {
		return $this->payment_methods_internal( $request );
	}

	/**
	 * Dashboard low stock products.
	 *
	 * Returns products where stock quantity is at or below the low stock threshold.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function dashboard_low_stock( \WP_REST_Request $request ) {
		global $wpdb;

		$limit = $request->get_param( 'limit' ) ? intval( $request->get_param( 'limit' ) ) : 10;
		$limit = max( 1, min( $limit, 50 ) );

		$cache_key = 'readypos_report_low_stock_' . $limit;
		$cached    = get_transient( $cache_key );
		if ( false !== $cached ) {
			return new \WP_REST_Response( $cached, 200 );
		}

		$stock_table  = $wpdb->prefix . 'readypos_outlet_stock';
		$stock_exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $stock_table ) );

		$low_stock_items = array();

		if ( $stock_exists === $stock_table ) {
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT os.product_id, os.quantity, os.low_stock_threshold,
					        pm.post_title AS product_name
					FROM {$stock_table} os
					LEFT JOIN {$wpdb->posts} pm ON pm.ID = os.product_id
					WHERE os.quantity <= os.low_stock_threshold
					  AND os.quantity >= 0
					  AND pm.post_status = 'publish'
					ORDER BY (os.quantity - os.low_stock_threshold) ASC
					LIMIT %d",
					$limit
				),
				ARRAY_A
			);

			if ( $rows ) {
				foreach ( $rows as $row ) {
					$low_stock_items[] = array(
						'product_id'  => intval( $row['product_id'] ),
						'name'        => $row['product_name'] ?: __( 'Unknown Product', 'ready-pos-for-woocommerce' ),
						'stock'       => intval( $row['quantity'] ),
						'threshold'   => intval( $row['low_stock_threshold'] ),
						'deficit'     => max( 0, intval( $row['low_stock_threshold'] ) - intval( $row['quantity'] ) ),
					);
				}
			}
		}

		set_transient( $cache_key, $low_stock_items, 2 * MINUTE_IN_SECONDS );

		return new \WP_REST_Response( $low_stock_items, 200 );
	}

	/**
	 * Internal sales summary logic.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	private function sales_summary_internal( \WP_REST_Request $request ) {
		$days = $request->get_param( 'days' ) ? intval( $request->get_param( 'days' ) ) : 30;
		$days = max( 1, $days );

		$cache_key = 'readypos_report_sales_summary_' . $days;
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

		set_transient( $cache_key, $response_data, 2 * MINUTE_IN_SECONDS );

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

		$cache_key = 'readypos_report_product_perf_' . $days;
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

		set_transient( $cache_key, $products, 2 * MINUTE_IN_SECONDS );

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

		$cache_key = 'readypos_report_payment_methods_' . $days;
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

		set_transient( $cache_key, $methods, 2 * MINUTE_IN_SECONDS );

		return new \WP_REST_Response( $methods, 200 );
	}
}
