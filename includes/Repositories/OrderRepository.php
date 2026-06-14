<?php
/**
 * Order Repository Implementation
 *
 * @package Readypos\Repositories
 */

namespace Readypos\Repositories;

use Readypos\Interfaces\Repositories\OrderRepositoryInterface;
use Readypos\Models\POSOrderMeta;

defined( 'ABSPATH' ) || exit;

/**
 * Class OrderRepository
 */
class OrderRepository extends BaseRepository implements OrderRepositoryInterface {

	/**
	 * Find order by ID
	 *
	 * @param int $id Order ID.
	 * @return \WC_Order|null
	 */
	public function find( $id ) {
		return wc_get_order( $id ) ?: null;
	}

	/**
	 * Find POS metadata for an order
	 *
	 * @param int $wc_order_id WC Order ID.
	 * @return POSOrderMeta|null
	 */
	public function find_pos_meta( $wc_order_id ) {
		return POSOrderMeta::where( 'wc_order_id', $wc_order_id )->first();
	}

	/**
	 * Get paginated orders list with N+1 query prevention (Eager-loads cashier profiles in batch)
	 *
	 * @param array $args Limit and Page filters.
	 * @return array
	 */
	public function get_paginated( array $args ) {
		$limit = isset( $args['limit'] ) ? intval( $args['args'] ) : 20;
		$page  = isset( $args['page'] ) ? intval( $args['page'] ) : 1;

		$query_args = array(
			'limit'      => $limit,
			'page'       => $page,
			'status'     => array_keys( wc_get_order_statuses() ),
			'paginate'   => true,
			'orderby'    => 'date',
			'order'      => 'DESC',
			'meta_query' => array(
				array(
					'key'     => '_readypos_is_pos_order',
					'value'   => 'yes',
					'compare' => '=',
				),
			),
		);

		$results = wc_get_orders( $query_args );
		$orders  = array();

		if ( $results && isset( $results->orders ) && ! empty( $results->orders ) ) {
			// Extract all order IDs to fetch custom metadata in batch to prevent N+1 Queries
			$order_ids = array();
			foreach ( $results->orders as $wc_order ) {
				$order_ids[] = $wc_order->get_id();
			}

			// Pre-fetch all POSOrderMeta in a single DB query
			$pos_metas = array();
			$metas     = POSOrderMeta::whereIn( 'wc_order_id', $order_ids )->get();
			foreach ( $metas as $meta ) {
				$pos_metas[ $meta->wc_order_id ] = $meta;
			}

			// Batch resolution of users/cashiers to avoid repeating get_userdata() queries
			$cashier_ids = array();
			foreach ( $pos_metas as $meta ) {
				if ( $meta->cashier_id ) {
					$cashier_ids[] = $meta->cashier_id;
				}
			}
			$cashiers = array();
			if ( ! empty( $cashier_ids ) ) {
				$users = get_users( array( 'include' => array_unique( $cashier_ids ) ) );
				foreach ( $users as $u ) {
					$cashiers[ $u->ID ] = $u->display_name;
				}
			}

			foreach ( $results->orders as $wc_order ) {
				$order_id   = $wc_order->get_id();
				$pos_meta   = isset( $pos_metas[ $order_id ] ) ? $pos_metas[ $order_id ] : null;
				$cashier_id = $pos_meta ? $pos_meta->cashier_id : null;
				$cashier_nm = ( $cashier_id && isset( $cashiers[ $cashier_id ] ) ) ? $cashiers[ $cashier_id ] : __( 'Unknown', 'ready-pos-for-woocommerce' );
				$order_date = $wc_order->get_date_created();

				$orders[] = array(
					'id'             => $wc_order->get_id(),
					'order_number'   => $wc_order->get_order_number(),
					'total'          => floatval( $wc_order->get_total() ),
					'payment_method' => $pos_meta ? $pos_meta->payment_method : $wc_order->get_payment_method(),
					'cashier_name'   => $cashier_nm,
					'date'           => $order_date ? $order_date->date( 'Y-m-d H:i:s' ) : '',
					'status'         => $wc_order->get_status(),
				);
			}
		}

		$total       = $results ? (int) $results->total : 0;
		$total_pages = $results ? (int) $results->max_num_pages : 1;

		return array(
			'orders'      => $orders,
			'total'       => $total,
			'total_pages' => max( 1, $total_pages ),
		);
	}
}
