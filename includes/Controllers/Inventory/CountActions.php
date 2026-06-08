<?php
/**
 * Inventory Count Actions for POS.
 *
 * @package Readypos\Controllers\Inventory
 * @since 1.0.0
 */

namespace Readypos\Controllers\Inventory;

use Readypos\Models\POSInventoryCount;
use Readypos\Models\POSInventoryCountItem;
use Readypos\Models\POSOutletStock;
use Readypos\Models\POSOutlet;

defined( 'ABSPATH' ) || exit;

/**
 * Class CountActions
 *
 * Handles inventory counting operations: cycle counts, full counts, scanner counts, and variance reports.
 *
 * @package Readypos\Controllers\Inventory
 */
class CountActions {

	/**
	 * Start a new inventory count session.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function start( \WP_REST_Request $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'unauthorized',
				__( 'You do not have permission to start inventory counts.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$outlet_id   = intval( $request->get_param( 'outletId' ) );
		$count_type  = sanitize_text_field( $request->get_param( 'countType' ) ); // 'cycle', 'full', 'spot'
		$name        = sanitize_text_field( $request->get_param( 'name' ) );
		$notes       = sanitize_textarea_field( $request->get_param( 'notes' ) );
		$product_ids = $request->get_param( 'productIds' ); // For cycle counts

		if ( empty( $outlet_id ) || empty( $count_type ) || empty( $name ) ) {
			return new \WP_Error(
				'missing_fields',
				__( 'Outlet ID, count type, and name are required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		// Validate count type
		if ( ! in_array( $count_type, array( 'cycle', 'full', 'spot' ), true ) ) {
			return new \WP_Error(
				'invalid_count_type',
				__( 'Invalid count type. Must be cycle, full, or spot.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		// Verify outlet exists
		$outlet = POSOutlet::find( $outlet_id );
		if ( ! $outlet ) {
			return new \WP_Error(
				'invalid_outlet',
				__( 'The outlet does not exist.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		// Create count session
		$count = POSInventoryCount::create(
			array(
				'outlet_id'   => $outlet_id,
				'count_type'  => $count_type,
				'status'      => 'in_progress',
				'name'        => $name,
				'notes'       => $notes,
				'created_by'  => get_current_user_id(),
				'started_at'  => current_time( 'mysql' ),
				'created_at'  => current_time( 'mysql' ),
				'updated_at'  => current_time( 'mysql' ),
			)
		);

		// Initialize count items based on count type
		if ( 'full' === $count_type ) {
			// Full count - get all products with stock in this outlet
			$outlet_stocks = POSOutletStock::where( 'outlet_id', $outlet_id )->get();

			foreach ( $outlet_stocks as $stock ) {
				POSInventoryCountItem::create(
					array(
						'count_id'          => $count->id,
						'product_id'        => $stock->product_id,
						'expected_quantity' => $stock->stock_quantity,
						'variance'          => 0,
						'is_counted'        => false,
						'created_at'        => current_time( 'mysql' ),
						'updated_at'        => current_time( 'mysql' ),
					)
				);
			}
		} elseif ( 'cycle' === $count_type && ! empty( $product_ids ) ) {
			// Cycle count - specific products
			foreach ( $product_ids as $product_id ) {
				$stock = POSOutletStock::where( 'outlet_id', $outlet_id )
					->where( 'product_id', $product_id )
					->first();

				$expected_qty = $stock ? $stock->stock_quantity : 0;

				POSInventoryCountItem::create(
					array(
						'count_id'          => $count->id,
						'product_id'        => intval( $product_id ),
						'expected_quantity' => $expected_qty,
						'variance'          => 0,
						'is_counted'        => false,
						'created_at'        => current_time( 'mysql' ),
						'updated_at'        => current_time( 'mysql' ),
					)
				);
			}
		}

		// Fetch complete count with items
		$count_with_items = $this->format_count_response( $count );

		do_action( 'readypos_inventory_count_started', $count->id, $outlet_id, $count_type );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'count'   => $count_with_items,
			),
			201
		);
	}

	/**
	 * Update a count item (record physical count).
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( \WP_REST_Request $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'unauthorized',
				__( 'You do not have permission to update inventory counts.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$item_id          = intval( $request->get_param( 'itemId' ) );
		$counted_quantity = floatval( $request->get_param( 'countedQuantity' ) );
		$variance_reason  = sanitize_text_field( $request->get_param( 'varianceReason' ) );
		$scanner_id       = sanitize_text_field( $request->get_param( 'scannerId' ) );

		if ( empty( $item_id ) ) {
			return new \WP_Error(
				'missing_fields',
				__( 'Item ID is required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$item = POSInventoryCountItem::find( $item_id );
		if ( ! $item ) {
			return new \WP_Error(
				'invalid_item',
				__( 'Count item not found.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		// Check if count is still in progress
		$count = POSInventoryCount::find( $item->count_id );
		if ( ! $count || 'in_progress' !== $count->status ) {
			return new \WP_Error(
				'invalid_status',
				__( 'This count is not in progress.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		// Calculate variance
		$variance = $counted_quantity - $item->expected_quantity;

		// Update item
		$item->update(
			array(
				'counted_quantity' => $counted_quantity,
				'variance'         => $variance,
				'variance_reason'  => $variance_reason,
				'is_counted'       => true,
				'scanner_id'       => $scanner_id,
				'counted_by'       => get_current_user_id(),
				'counted_at'       => current_time( 'mysql' ),
				'updated_at'       => current_time( 'mysql' ),
			)
		);

		return new \WP_REST_Response(
			array(
				'success' => true,
				'item'    => array(
					'id'                => $item->id,
					'count_id'          => $item->count_id,
					'product_id'        => $item->product_id,
					'expected_quantity' => floatval( $item->expected_quantity ),
					'counted_quantity'  => floatval( $item->counted_quantity ),
					'variance'          => floatval( $item->variance ),
					'variance_reason'   => $item->variance_reason,
					'is_counted'        => $item->is_counted,
					'scanner_id'        => $item->scanner_id,
				),
			),
			200
		);
	}

	/**
	 * Scan and update count (barcode scanner support).
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function scan( \WP_REST_Request $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'unauthorized',
				__( 'You do not have permission to update inventory counts.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$count_id   = intval( $request->get_param( 'countId' ) );
		$barcode    = sanitize_text_field( $request->get_param( 'barcode' ) );
		$scanner_id = sanitize_text_field( $request->get_param( 'scannerId' ) );

		if ( empty( $count_id ) || empty( $barcode ) ) {
			return new \WP_Error(
				'missing_fields',
				__( 'Count ID and barcode are required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		// Find product by SKU or barcode
		$product_id = wc_get_product_id_by_sku( $barcode );
		if ( ! $product_id ) {
			// Try to find by ID
			$product = wc_get_product( $barcode );
			$product_id = $product ? $product->get_id() : null;
		}

		if ( ! $product_id ) {
			return new \WP_Error(
				'product_not_found',
				__( 'Product not found with this barcode.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		// Find or create count item
		$item = POSInventoryCountItem::where( 'count_id', $count_id )
			->where( 'product_id', $product_id )
			->first();

		if ( ! $item ) {
			// For spot counts, create item on the fly
			$count = POSInventoryCount::find( $count_id );
			if ( ! $count ) {
				return new \WP_Error(
					'invalid_count',
					__( 'Count session not found.', 'ready-pos-for-woocommerce' ),
					array( 'status' => 404 )
				);
			}

			$stock = POSOutletStock::where( 'outlet_id', $count->outlet_id )
				->where( 'product_id', $product_id )
				->first();

			$expected_qty = $stock ? $stock->stock_quantity : 0;

			$item = POSInventoryCountItem::create(
				array(
					'count_id'          => $count_id,
					'product_id'        => $product_id,
					'expected_quantity' => $expected_qty,
					'counted_quantity'  => 1,
					'variance'          => 1 - $expected_qty,
					'is_counted'        => true,
					'scanner_id'        => $scanner_id,
					'counted_by'        => get_current_user_id(),
					'counted_at'        => current_time( 'mysql' ),
					'created_at'        => current_time( 'mysql' ),
					'updated_at'        => current_time( 'mysql' ),
				)
			);
		} else {
			// Increment counted quantity
			$new_quantity = ( $item->counted_quantity ?? 0 ) + 1;
			$variance = $new_quantity - $item->expected_quantity;

			$item->update(
				array(
					'counted_quantity' => $new_quantity,
					'variance'         => $variance,
					'is_counted'       => true,
					'scanner_id'       => $scanner_id,
					'counted_by'       => get_current_user_id(),
					'counted_at'       => current_time( 'mysql' ),
					'updated_at'       => current_time( 'mysql' ),
				)
			);
		}

		$product = wc_get_product( $product_id );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'item'    => array(
					'id'                => $item->id,
					'count_id'          => $item->count_id,
					'product_id'        => $item->product_id,
					'product_name'      => $product ? $product->get_name() : '',
					'sku'               => $product ? $product->get_sku() : '',
					'expected_quantity' => floatval( $item->expected_quantity ),
					'counted_quantity'  => floatval( $item->counted_quantity ),
					'variance'          => floatval( $item->variance ),
					'is_counted'        => $item->is_counted,
					'scanner_id'        => $item->scanner_id,
				),
			),
			200
		);
	}

	/**
	 * Complete an inventory count session.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function complete( \WP_REST_Request $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'unauthorized',
				__( 'You do not have permission to complete inventory counts.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$count_id      = intval( $request->get_param( 'countId' ) );
		$apply_changes = $request->get_param( 'applyChanges' ) ?? false;

		if ( empty( $count_id ) ) {
			return new \WP_Error(
				'missing_fields',
				__( 'Count ID is required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$count = POSInventoryCount::find( $count_id );
		if ( ! $count ) {
			return new \WP_Error(
				'invalid_count',
				__( 'Count session not found.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		if ( 'in_progress' !== $count->status ) {
			return new \WP_Error(
				'invalid_status',
				__( 'This count is not in progress.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		// Update count status
		$count->update(
			array(
				'status'       => 'completed',
				'completed_by' => get_current_user_id(),
				'completed_at' => current_time( 'mysql' ),
				'updated_at'   => current_time( 'mysql' ),
			)
		);

		// If apply_changes is true, update outlet stock with counted quantities
		if ( $apply_changes ) {
			$items = POSInventoryCountItem::where( 'count_id', $count_id )
				->where( 'is_counted', true )
				->get();

			global $wpdb;
			$stock_table = $wpdb->prefix . 'readypos_outlet_stock';

			foreach ( $items as $item ) {
				if ( null !== $item->counted_quantity ) {
					$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
						$wpdb->prepare(
							"INSERT INTO `" . esc_sql( $stock_table ) . "`
							(outlet_id, product_id, stock_quantity, low_stock_threshold, created_at, updated_at)
							VALUES (%d, %d, %f, 5, NOW(), NOW())
							ON DUPLICATE KEY UPDATE 
							stock_quantity = %f,
							updated_at = NOW()",
							$count->outlet_id,
							$item->product_id,
							$item->counted_quantity,
							$item->counted_quantity
						)
					);

					// Clear cache
					wp_cache_delete( 'readypos_outlet_stock_' . absint( $count->outlet_id ) . '_' . absint( $item->product_id ), 'readypos_inventory' );
				}
			}

			// Audit log
			$user = wp_get_current_user();
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( sprintf(
				'ReadyPOS Inventory Count Completed and Applied: Count ID %d, Outlet ID %d, User: %s (ID: %d)',
				$count_id,
				$count->outlet_id,
				$user->display_name,
				$user->ID
			) );
		}

		do_action( 'readypos_inventory_count_completed', $count_id, $count->outlet_id, $apply_changes );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'count'   => $this->format_count_response( $count ),
			),
			200
		);
	}

	/**
	 * Get all inventory counts.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_counts( \WP_REST_Request $request ) {
		$outlet_id = $request->get_param( 'outletId' ) ? intval( $request->get_param( 'outletId' ) ) : null;
		$status    = $request->get_param( 'status' );

		$query = POSInventoryCount::query();

		if ( $outlet_id ) {
			$query->where( 'outlet_id', $outlet_id );
		}

		if ( $status ) {
			$query->where( 'status', $status );
		}

		$counts = $query->orderBy( 'created_at', 'desc' )->get();

		$formatted_counts = array();
		foreach ( $counts as $count ) {
			$formatted_counts[] = $this->format_count_response( $count );
		}

		return new \WP_REST_Response( $formatted_counts, 200 );
	}

	/**
	 * Get a single inventory count with items.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_count( \WP_REST_Request $request ) {
		$count_id = intval( $request->get_param( 'id' ) );

		if ( empty( $count_id ) ) {
			return new \WP_Error(
				'missing_fields',
				__( 'Count ID is required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$count = POSInventoryCount::find( $count_id );
		if ( ! $count ) {
			return new \WP_Error(
				'invalid_count',
				__( 'Count session not found.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		return new \WP_REST_Response( $this->format_count_response( $count ), 200 );
	}

	/**
	 * Get variance report for a completed count.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function variance_report( \WP_REST_Request $request ) {
		$count_id = intval( $request->get_param( 'countId' ) );

		if ( empty( $count_id ) ) {
			return new \WP_Error(
				'missing_fields',
				__( 'Count ID is required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$count = POSInventoryCount::find( $count_id );
		if ( ! $count ) {
			return new \WP_Error(
				'invalid_count',
				__( 'Count session not found.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		// Get all counted items with variances
		$items = POSInventoryCountItem::where( 'count_id', $count_id )
			->where( 'is_counted', true )
			->get();

		$variance_items = array();
		$total_variance_value = 0;
		$total_positive_variance = 0;
		$total_negative_variance = 0;

		foreach ( $items as $item ) {
			if ( 0 === floatval( $item->variance ) ) {
				continue; // Skip items with no variance
			}

			$product = wc_get_product( $item->product_id );
			if ( ! $product ) {
				continue;
			}

			$price = floatval( $product->get_price() );
			$variance_value = floatval( $item->variance ) * $price;

			if ( $item->variance > 0 ) {
				$total_positive_variance += $variance_value;
			} else {
				$total_negative_variance += abs( $variance_value );
			}

			$total_variance_value += $variance_value;

			$image_id  = $product->get_image_id();
			$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'thumbnail' ) : wc_placeholder_img_src();

			$variance_items[] = array(
				'product_id'        => $item->product_id,
				'product_name'      => $product->get_name(),
				'sku'               => $product->get_sku() ?: 'N/A',
				'image'             => $image_url,
				'expected_quantity' => floatval( $item->expected_quantity ),
				'counted_quantity'  => floatval( $item->counted_quantity ),
				'variance'          => floatval( $item->variance ),
				'variance_reason'   => $item->variance_reason,
				'unit_price'        => $price,
				'variance_value'    => $variance_value,
			);
		}

		return new \WP_REST_Response(
			array(
				'count_id'                  => $count->id,
				'count_name'                => $count->name,
				'count_type'                => $count->count_type,
				'status'                    => $count->status,
				'completed_at'              => $count->completed_at,
				'total_variance_value'      => $total_variance_value,
				'total_positive_variance'   => $total_positive_variance,
				'total_negative_variance'   => $total_negative_variance,
				'variance_items'            => $variance_items,
				'total_items_with_variance' => count( $variance_items ),
			),
			200
		);
	}

	/**
	 * Cancel an inventory count session.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function cancel( \WP_REST_Request $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'unauthorized',
				__( 'You do not have permission to cancel inventory counts.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$count_id = intval( $request->get_param( 'countId' ) );

		if ( empty( $count_id ) ) {
			return new \WP_Error(
				'missing_fields',
				__( 'Count ID is required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$count = POSInventoryCount::find( $count_id );
		if ( ! $count ) {
			return new \WP_Error(
				'invalid_count',
				__( 'Count session not found.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		$count->update(
			array(
				'status'     => 'cancelled',
				'updated_at' => current_time( 'mysql' ),
			)
		);

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Count cancelled successfully.', 'ready-pos-for-woocommerce' ),
			),
			200
		);
	}

	/**
	 * Format count response with items and statistics.
	 *
	 * @param POSInventoryCount $count Count model.
	 * @return array
	 */
	private function format_count_response( $count ) {
		$items = POSInventoryCountItem::where( 'count_id', $count->id )->get();

		$formatted_items = array();
		$total_items = count( $items );
		$counted_items = 0;
		$items_with_variance = 0;

		foreach ( $items as $item ) {
			$product = wc_get_product( $item->product_id );
			if ( ! $product ) {
				continue;
			}

			if ( $item->is_counted ) {
				$counted_items++;
			}

			if ( 0 !== floatval( $item->variance ) ) {
				$items_with_variance++;
			}

			$image_id  = $product->get_image_id();
			$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'thumbnail' ) : wc_placeholder_img_src();

			$formatted_items[] = array(
				'id'                => $item->id,
				'product_id'        => $item->product_id,
				'product_name'      => $product->get_name(),
				'sku'               => $product->get_sku() ?: 'N/A',
				'image'             => $image_url,
				'expected_quantity' => floatval( $item->expected_quantity ),
				'counted_quantity'  => $item->counted_quantity ? floatval( $item->counted_quantity ) : null,
				'variance'          => floatval( $item->variance ),
				'variance_reason'   => $item->variance_reason,
				'is_counted'        => $item->is_counted,
				'scanner_id'        => $item->scanner_id,
				'counted_at'        => $item->counted_at,
			);
		}

		$outlet = POSOutlet::find( $count->outlet_id );
		$creator = get_userdata( $count->created_by );

		return array(
			'id'             => $count->id,
			'outlet_id'      => $count->outlet_id,
			'outlet_name'    => $outlet ? $outlet->name : '',
			'count_type'         => $count->count_type,
			'status'             => $count->status,
			'name'               => $count->name,
			'notes'              => $count->notes,
			'created_by'         => $count->created_by,
			'creator_name'       => $creator ? $creator->display_name : '',
			'started_at'         => $count->started_at,
			'completed_at'       => $count->completed_at,
			'total_items'        => $total_items,
			'counted_items'      => $counted_items,
			'items_with_variance' => $items_with_variance,
			'progress_percentage' => $total_items > 0 ? round( ( $counted_items / $total_items ) * 100 ) : 0,
			'items'              => $formatted_items,
		);
	}
}
