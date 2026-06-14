<?php
/**
 * Inventory Service Interface
 *
 * @package Readypos\Interfaces\Services
 */

namespace Readypos\Interfaces\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Interface InventoryServiceInterface
 */
interface InventoryServiceInterface {

	/**
	 * Decrement multi-outlet stock atomically to prevent race conditions
	 *
	 * @param int $outlet_id Active POS Outlet ID.
	 * @param int $product_id Simple or variation product ID.
	 * @param int $quantity Qty to decrement.
	 * @return boolean True on success.
	 */
	public function decrement_stock( $outlet_id, $product_id, $quantity );
}
