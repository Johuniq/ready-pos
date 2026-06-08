<?php
/**
 * Inventory History Actions for POS.
 *
 * @package Readypos\Controllers\Inventory
 * @since 1.0.0
 */

namespace Readypos\Controllers\Inventory;

use Readypos\Models\POSInventoryHistory;
use Readypos\Models\POSOutlet;

defined( 'ABSPATH' ) || exit;

/**
 * Class HistoryActions
 *
 * Handles inventory history tracking and retrieval.
 *
 * @package Readypos\Controllers\Inventory
 */
class HistoryActions {

	/**
	 * Log an inventory transaction.
	 *
	 * @param int    $outlet_id Outlet ID.
	 * @param int    $product_id Product ID.
	 * @param string $transaction_type Type of transaction.
	 * @param float  $quantity_before Quantity before change.
	 * @param float  $quantity_change Change in quantity (positive or negative).
	 * @param float  $quantity_after Quantity after change.
	 * @param int    $reference_id Optional reference ID.
	 * @param string $reference_type Optional reference type.
	 * @param string $notes Optional notes.
	 * @return bool
	 */
	public static function log_transaction(
		$outlet_id,
		$product_id,
		$transaction_type,
		$quantity_before,
		$quantity_change,
		$quantity_after,
		$reference_id = null,
		$reference_type = null,
		$notes = null
	) {
		try {
			POSInventoryHistory::create(
				array(
					'outlet_id'        => $outlet_id,
					'product_id'       => $product_id,
					'transaction_type' => $transaction_type,
					'quantity_before'  => $quantity_before,
					'quantity_change'  => $quantity_change,
					'quantity_after'   => $quantity_after,
					'reference_id'     => $reference_id,
					'reference_type'   => $reference_type,
					'notes'            => $notes,
					'user_id'          => get_current_user_id(),
					'created_at'       => current_time( 'mysql' ),
					'updated_at'       => current_time( 'mysql' ),
				)
			);
			return true;
		} catch ( \Exception $e ) {
			error_log( 'Failed to log inventory history: ' . $e->getMessage() );
			return false;
		}
	}

	/**
	 * Get inventory history for a product.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_history( \WP_REST_Request $request ) {
		$product_id = intval( $request->get_param( 'productId' ) );
		$outlet_id  = $request->get_param( 'outletId' ) ? intval( $request->get_param( 'outletId' ) ) : null;
		$type       = $request->get_param( 'type' );
		$page       = intval( $request->get_param( 'page' ) ?: 1 );
		$per_page   = intval( $request->get_param( 'per_page' ) ?: 20 );

		if ( empty( $product_id ) ) {
			return new \WP_Error(
				'missing_product_id',
				__( 'Product ID is required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$query = POSInventoryHistory::where( 'product_id', $product_id );

		if ( $outlet_id ) {
			$query->where( 'outlet_id', $outlet_id );
		}

		if ( $type ) {
			$query->where( 'transaction_type', $type );
		}

		$total = $query->count();
		$history = $query->orderBy( 'created_at', 'desc' )
			->skip( ( $page - 1 ) * $per_page )
			->take( $per_page )
			->get();

		$formatted_history = array();
		foreach ( $history as $entry ) {
			$outlet = POSOutlet::find( $entry->outlet_id );
			$product = wc_get_product( $entry->product_id );
			$user = get_userdata( $entry->user_id );

			$formatted_history[] = array(
				'id'               => $entry->id,
				'outlet_id'        => $entry->outlet_id,
				'outlet_name'      => $outlet ? $outlet->name : 'Unknown',
				'product_id'       => $entry->product_id,
				'product_name'     => $product ? $product->get_name() : 'Unknown Product',
				'product_sku'      => $product ? $product->get_sku() : '',
				'transaction_type' => $entry->transaction_type,
				'quantity_before'  => floatval( $entry->quantity_before ),
				'quantity_change'  => floatval( $entry->quantity_change ),
				'quantity_after'   => floatval( $entry->quantity_after ),
				'reference_id'     => $entry->reference_id,
				'reference_type'   => $entry->reference_type,
				'notes'            => $entry->notes,
				'user_id'          => $entry->user_id,
				'user_name'        => $user ? $user->display_name : 'Unknown User',
				'created_at'       => $entry->created_at,
			);
		}

		return new \WP_REST_Response(
			array(
				'history' => $formatted_history,
				'total'   => $total,
				'pages'   => ceil( $total / $per_page ),
				'page'    => $page,
			),
			200
		);
	}

	/**
	 * Get inventory summary for a product.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_summary( \WP_REST_Request $request ) {
		$product_id = intval( $request->get_param( 'productId' ) );
		$outlet_id  = $request->get_param( 'outletId' ) ? intval( $request->get_param( 'outletId' ) ) : null;

		if ( empty( $product_id ) ) {
			return new \WP_Error(
				'missing_product_id',
				__( 'Product ID is required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$query = POSInventoryHistory::where( 'product_id', $product_id );

		if ( $outlet_id ) {
			$query->where( 'outlet_id', $outlet_id );
		}

		$all_history = $query->get();

		$summary = array(
			'purchase_orders' => 0,
			'sales'           => 0,
			'transfers_in'    => 0,
			'transfers_out'   => 0,
			'adjustments'     => 0,
			'counts'          => 0,
			'total_in'        => 0,
			'total_out'       => 0,
		);

		foreach ( $all_history as $entry ) {
			$change = floatval( $entry->quantity_change );

			switch ( $entry->transaction_type ) {
				case 'purchase_order':
					$summary['purchase_orders'] += $change;
					$summary['total_in'] += $change;
					break;
				case 'sale':
					$summary['sales'] += abs( $change );
					$summary['total_out'] += abs( $change );
					break;
				case 'transfer_in':
					$summary['transfers_in'] += $change;
					$summary['total_in'] += $change;
					break;
				case 'transfer_out':
					$summary['transfers_out'] += abs( $change );
					$summary['total_out'] += abs( $change );
					break;
				case 'adjustment':
					if ( $change > 0 ) {
						$summary['total_in'] += $change;
					} else {
						$summary['total_out'] += abs( $change );
					}
					$summary['adjustments'] += $change;
					break;
				case 'count':
					if ( $change > 0 ) {
						$summary['total_in'] += $change;
					} else {
						$summary['total_out'] += abs( $change );
					}
					$summary['counts'] += $change;
					break;
			}
		}

		return new \WP_REST_Response( $summary, 200 );
	}
}
