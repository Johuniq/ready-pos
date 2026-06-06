<?php
/**
 * Inventory Actions for POS.
 *
 * @package Readypos\Controllers\Inventory
 * @since 1.0.0
 */

namespace Readypos\Controllers\Inventory;

use Readypos\Models\POSOutletStock;
use Readypos\Models\POSOutlet;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles inventory recount adjustments for physical outlets.
 *
 * @package Readypos\Controllers\Inventory
 */
class Actions {

	/**
	 * Adjust physical outlet inventory (Inventory Take).
	 *
	 * SECURITY FIX #7: Use atomic SQL update to prevent race condition
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function take( \WP_REST_Request $request ) {
		// Only administrators or shop managers or authorized POS roles should adjust stock
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'unauthorized',
				__( 'You do not have permission to adjust inventory.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		$outlet_id      = intval( $request->get_param( 'outletId' ) );
		$product_id     = intval( $request->get_param( 'productId' ) );
		$stock_quantity = floatval( $request->get_param( 'stockQuantity' ) );
		$threshold      = $request->get_param( 'lowStockThreshold' ) ? intval( $request->get_param( 'lowStockThreshold' ) ) : null;
		$reason         = sanitize_text_field( $request->get_param( 'reason' ) );

		if ( empty( $outlet_id ) || empty( $product_id ) ) {
			return new \WP_Error(
				'missing_fields',
				__( 'Outlet ID and Product ID are required.', 'ready-pos' ),
				array( 'status' => 400 )
			);
		}

		// Validate stock quantity is non-negative
		if ( $stock_quantity < 0 ) {
			return new \WP_Error(
				'invalid_quantity',
				__( 'Stock quantity cannot be negative.', 'ready-pos' ),
				array( 'status' => 400 )
			);
		}

		// Verify WC Product exists
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return new \WP_Error(
				'invalid_product',
				__( 'The product does not exist in WooCommerce.', 'ready-pos' ),
				array( 'status' => 400 )
			);
		}

		global $wpdb;
		$stock_table = $wpdb->prefix . 'readypos_outlet_stock';

		// SECURITY FIX #7: Use INSERT ... ON DUPLICATE KEY UPDATE for atomic operation
		// This prevents race condition when multiple users adjust stock simultaneously
		if ( null !== $threshold ) {
			$result = $wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->prepare(
					"INSERT INTO `" . esc_sql( $stock_table ) . "`
					(outlet_id, product_id, stock_quantity, low_stock_threshold, created_at, updated_at)
					VALUES (%d, %d, %f, %d, NOW(), NOW())
					ON DUPLICATE KEY UPDATE 
					stock_quantity = %f,
					low_stock_threshold = %d,
					updated_at = NOW()",
					$outlet_id,
					$product_id,
					$stock_quantity,
					$threshold,
					$stock_quantity,
					$threshold
				)
			);
		} else {
			$result = $wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->prepare(
					"INSERT INTO `" . esc_sql( $stock_table ) . "`
					(outlet_id, product_id, stock_quantity, low_stock_threshold, created_at, updated_at)
					VALUES (%d, %d, %f, 5, NOW(), NOW())
					ON DUPLICATE KEY UPDATE 
					stock_quantity = %f,
					updated_at = NOW()",
					$outlet_id,
					$product_id,
					$stock_quantity,
					$stock_quantity
				)
			);
		}

		if ( false === $result ) {
			return new \WP_Error(
				'update_failed',
				__( 'Failed to update inventory. Please try again.', 'ready-pos' ),
				array( 'status' => 500 )
			);
		}

		wp_cache_delete( 'readypos_outlet_stock_' . absint( $outlet_id ) . '_' . absint( $product_id ), 'readypos_inventory' );

		// Fetch the updated record
		$outlet_stock = POSOutletStock::where( 'outlet_id', $outlet_id )
			->where( 'product_id', $product_id )
			->first();

		// SECURITY FIX #7: Audit logging for inventory changes
		$user = wp_get_current_user();
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Intentional audit logging for security tracking
		error_log( sprintf(
			'ReadyPOS Inventory Adjusted: Product ID %d, Outlet ID %d, New Quantity: %.2f, User: %s (ID: %d), Reason: %s',
			$product_id,
			$outlet_id,
			$stock_quantity,
			$user->display_name,
			$user->ID,
			empty( $reason ) ? 'None' : $reason
		) );

		// (Optional) Standard WooCommerce audit logging or action hook
		do_action( 'readypos_inventory_take_adjusted', $outlet_id, $product_id, $stock_quantity, $reason, get_current_user_id() );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'stock'   => array(
					'id'                  => $outlet_stock->id,
					'outlet_id'           => $outlet_stock->outlet_id,
					'product_id'          => $outlet_stock->product_id,
					'stock_quantity'      => floatval( $outlet_stock->stock_quantity ),
					'low_stock_threshold' => intval( $outlet_stock->low_stock_threshold ),
				),
			),
			200
		);
	}

	/**
	 * Get products with low stock for the active outlet or globally.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function low_stock( \WP_REST_Request $request ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		$outlet_id = $request->get_param( 'outletId' ) ? intval( $request->get_param( 'outletId' ) ) : null;

		// 1. Get standard WC products with manage stock enabled and low stock
		$args = array(
			'limit'        => -1,
			'status'       => 'publish',
			'manage_stock' => true,
		);
		$wc_products = wc_get_products( $args );
		$low_stock_products = array();

		// Default WooCommerce threshold
		$global_threshold = intval( get_option( 'woocommerce_notify_low_stock_amount', 2 ) );

		foreach ( $wc_products as $wc_prod ) {
			$stock = $wc_prod->get_stock_quantity();
			$threshold = $wc_prod->get_low_stock_amount();
			if ( empty( $threshold ) ) {
				$threshold = $global_threshold;
			}

			// If outlet stock overrides are present, check those first
			$outlet_stock = null;
			if ( $outlet_id ) {
				$outlet_stock = POSOutletStock::where( 'outlet_id', $outlet_id )
					->where( 'product_id', $wc_prod->get_id() )
					->first();
			}

			$current_stock = $stock;
			$current_threshold = $threshold;

			if ( $outlet_stock ) {
				$current_stock = floatval( $outlet_stock->stock_quantity );
				$current_threshold = intval( $outlet_stock->low_stock_threshold );
			}

			if ( $current_stock <= $current_threshold ) {
				$image_id  = $wc_prod->get_image_id();
				$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : wc_placeholder_img_src();

				$low_stock_products[] = array(
					'id'                  => $wc_prod->get_id(),
					'name'                => $wc_prod->get_name(),
					'sku'                 => $wc_prod->get_sku() ?: 'N/A',
					'stock_quantity'      => $current_stock,
					'low_stock_threshold' => $current_threshold,
					'image'               => $image_url,
					'price'               => floatval( $wc_prod->get_price() ),
				);
			}
		}

		// Also check specific outlet stock entries that might not correspond to direct simple products (e.g. variations)
		if ( $outlet_id ) {
			$outlet_stocks = POSOutletStock::where( 'outlet_id', $outlet_id )
				->get();

			foreach ( $outlet_stocks as $out_stock ) {
				if ( floatval( $out_stock->stock_quantity ) <= intval( $out_stock->low_stock_threshold ) ) {
					// Avoid duplicates if already added
					$exists = false;
					foreach ( $low_stock_products as $lp ) {
						if ( $lp['id'] === intval( $out_stock->product_id ) ) {
							$exists = true;
							break;
						}
					}

					if ( ! $exists ) {
						$wc_prod = wc_get_product( $out_stock->product_id );
						if ( $wc_prod ) {
							$image_id  = $wc_prod->get_image_id();
							$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : wc_placeholder_img_src();

							$low_stock_products[] = array(
								'id'                  => $wc_prod->get_id(),
								'name'                => $wc_prod->get_name(),
								'sku'                 => $wc_prod->get_sku() ?: 'N/A',
								'stock_quantity'      => floatval( $out_stock->stock_quantity ),
								'low_stock_threshold' => intval( $out_stock->low_stock_threshold ),
								'image'               => $image_url,
								'price'               => floatval( $wc_prod->get_price() ),
							);
						}
					}
				}
			}
		}

		return new \WP_REST_Response( $low_stock_products, 200 );
	}
}
