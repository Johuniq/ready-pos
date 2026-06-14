<?php
/**
 * Order Repository Interface
 *
 * @package Readypos\Interfaces\Repositories
 */

namespace Readypos\Interfaces\Repositories;

defined( 'ABSPATH' ) || exit;

/**
 * Interface OrderRepositoryInterface
 */
interface OrderRepositoryInterface {

	/**
	 * Find order by ID
	 *
	 * @param int $id Order ID.
	 * @return \WC_Order|null
	 */
	public function find( $id );

	/**
	 * Find custom POSOrderMeta record
	 *
	 * @param int $wc_order_id WC Order ID.
	 * @return \Readypos\Models\POSOrderMeta|null
	 */
	public function find_pos_meta( $wc_order_id );

	/**
	 * Get paginated orders list with N+1 query prevention
	 *
	 * @param array $args Limit, page arguments.
	 * @return array
	 */
	public function get_paginated( array $args );
}
