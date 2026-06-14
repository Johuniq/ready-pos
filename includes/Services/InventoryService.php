<?php
/**
 * Inventory Service Implementation
 *
 * @package Readypos\Services
 */

namespace Readypos\Services;

use Readypos\Interfaces\Services\InventoryServiceInterface;
use Readypos\Utils\Cache;

defined( 'ABSPATH' ) || exit;

/**
 * Class InventoryService
 */
class InventoryService implements InventoryServiceInterface {

	/**
	 * Decrement stock atomically (Optimistic/Atomic DB updates to prevent overselling at high concurrency)
	 *
	 * @param int $outlet_id Outlet ID.
	 * @param int $product_id Product ID.
	 * @param int $quantity Quantity.
	 * @return boolean
	 * @throws \Exception
	 */
	public function decrement_stock( $outlet_id, $product_id, $quantity ) {
		global $wpdb;

		$stock_table = $wpdb->prefix . 'readypos_outlet_stock';

		// Atomic decrement query with check to prevent falling below zero
		$query = $wpdb->prepare(
			"UPDATE `" . esc_sql( $stock_table ) . "`
			SET stock_quantity = stock_quantity - %d
			WHERE outlet_id = %d 
			AND product_id = %d 
			AND stock_quantity >= %d",
			$quantity,
			$outlet_id,
			$product_id,
			$quantity
		);

		$result = $wpdb->query( $query );

		if ( false === $result ) {
			throw new \Exception( "Database error occurred during atomic stock decrement for product [{$product_id}]." );
		}

		if ( 0 === $result ) {
			throw new \Exception( "Insufficient stock or product mapping missing for product [{$product_id}] in active outlet [{$outlet_id}]." );
		}

		// Clear cached stock data
		Cache::delete( 'readypos_outlet_stock_' . absint( $outlet_id ) . '_' . absint( $product_id ), 'readypos_inventory' );

		return true;
	}
}
