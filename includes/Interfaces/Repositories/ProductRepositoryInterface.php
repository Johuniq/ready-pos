<?php
/**
 * Product Repository Interface
 *
 * @package Readypos\Interfaces\Repositories
 */

namespace Readypos\Interfaces\Repositories;

defined( 'ABSPATH' ) || exit;

/**
 * Interface ProductRepositoryInterface
 */
interface ProductRepositoryInterface {

	/**
	 * Find product by ID
	 *
	 * @param int $id Product ID.
	 * @return \WC_Product|null
	 */
	public function find( $id );

	/**
	 * Find product or variation by barcode or SKU
	 *
	 * @param string $code Barcode or SKU string.
	 * @return \WC_Product|null
	 */
	public function find_by_code( $code );

	/**
	 * Get paginated products list with filters
	 *
	 * @param array $filters Limit, page, category, search etc.
	 * @return array Array of formatted products and page metadata.
	 */
	public function get_paginated( array $filters );
}
