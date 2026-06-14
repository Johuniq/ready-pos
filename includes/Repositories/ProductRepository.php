<?php
/**
 * Product Repository Implementation
 *
 * @package Readypos\Repositories
 */

namespace Readypos\Repositories;

use Readypos\Interfaces\Repositories\ProductRepositoryInterface;
use Readypos\Models\POSOutletStock;
use Readypos\Models\POSSession;
use Readypos\Utils\Cache;

defined( 'ABSPATH' ) || exit;

/**
 * Class ProductRepository
 */
class ProductRepository extends BaseRepository implements ProductRepositoryInterface {

	/**
	 * Find product by ID
	 *
	 * @param int $id Product ID.
	 * @return \WC_Product|null
	 */
	public function find( $id ) {
		return wc_get_product( $id ) ?: null;
	}

	/**
	 * Find product or variation by barcode or SKU
	 *
	 * @param string $code Barcode or SKU.
	 * @return \WC_Product|null
	 */
	public function find_by_code( $code ) {
		if ( empty( $code ) ) {
			return null;
		}

		// Try to find product by SKU
		$product_id = wc_get_product_id_by_sku( $code );

		// Check if it's a barcode custom field search if SKU is not found
		if ( ! $product_id ) {
			// Using direct meta query or custom barcode index cache to prevent slow slow_db_query_meta_query
			$cache_key = 'barcode_map_' . md5( $code );
			$product_id = Cache::get( $cache_key, 'products' );

			if ( false === $product_id ) {
				$posts = get_posts(
					array(
						'post_type'  => array( 'product', 'product_variation' ),
						'meta_query' => array(
							'relation' => 'OR',
							array(
								'key'     => '_barcode',
								'value'   => $code,
								'compare' => '=',
							),
							array(
								'key'     => 'barcode',
								'value'   => $code,
								'compare' => '=',
							),
						),
						'fields'     => 'ids',
						'limit'      => 1,
					)
				);

				if ( ! empty( $posts ) ) {
					$product_id = $posts[0];
					Cache::set( $cache_key, $product_id, 'products', DAY_IN_SECONDS );
				}
			}
		}

		return $product_id ? $this->find( $product_id ) : null;
	}

	/**
	 * Get paginated products list with filters and pre-loaded multi-outlet stock (N+1 Prevention)
	 *
	 * @param array $filters Limit, page, category, search.
	 * @return array
	 */
	public function get_paginated( array $filters ) {
		$limit    = isset( $filters['limit'] ) ? intval( $filters['limit'] ) : 20;
		$page     = isset( $filters['page'] ) ? intval( $filters['page'] ) : 1;
		$search   = isset( $filters['search'] ) ? sanitize_text_field( $filters['search'] ) : '';
		$category = isset( $filters['category'] ) ? sanitize_text_field( $filters['category'] ) : '';

		$query_args = array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => $limit,
			'paged'          => $page,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		$tax_query = array();

		if ( ! empty( $search ) ) {
			$sku_product_id = wc_get_product_id_by_sku( $search );
			if ( $sku_product_id ) {
				$query_args['p'] = $sku_product_id;
			} else {
				$query_args['s'] = $search;

				if ( ! empty( $category ) && 'all' !== $category ) {
					$tax_query[] = array(
						'taxonomy' => 'product_cat',
						'field'    => 'slug',
						'terms'    => array( $category ),
					);
				}
			}
		} else {
			if ( ! empty( $category ) && 'all' !== $category ) {
				$tax_query[] = array(
					'taxonomy' => 'product_cat',
					'field'    => 'slug',
					'terms'    => array( $category ),
				);
			}
		}

		if ( ! empty( $tax_query ) ) {
			$query_args['tax_query'] = $tax_query;
		}

		$outlet_id = $this->resolve_outlet_id();
		$wp_query  = new \WP_Query( $query_args );
		$products  = array();

		if ( $wp_query->have_posts() ) {
			$product_ids = wp_list_pluck( $wp_query->posts, 'ID' );

			// Prime term cache in 1 query for all products to prevent N+1 queries
			update_object_term_cache( $product_ids, 'product' );

			// Collect all product and variation IDs to batch fetch outlet stock (N+1 Prevention)
			$all_stock_ids = array();
			foreach ( $wp_query->posts as $post ) {
				$all_stock_ids[] = $post->ID;
				$product = wc_get_product( $post->ID );
				if ( $product && $product->is_type( 'variable' ) ) {
					$children = $product->get_children();
					if ( ! empty( $children ) ) {
						foreach ( $children as $child_id ) {
							$all_stock_ids[] = $child_id;
						}
					}
				}
			}

			// Pre-fetch all relevant outlet stock records in a single query
			$outlet_stocks = array();
			if ( $outlet_id && ! empty( $all_stock_ids ) ) {
				$stocks = POSOutletStock::where( 'outlet_id', $outlet_id )
					->whereIn( 'product_id', $all_stock_ids )
					->get();
				foreach ( $stocks as $stock ) {
					$outlet_stocks[ $stock->product_id ] = $stock;
				}
			}

			foreach ( $wp_query->posts as $post ) {
				$product = wc_get_product( $post->ID );
				if ( ! $product ) {
					continue;
				}

				$type = $product->get_type();
				if ( ! in_array( $type, array( 'simple', 'variable' ), true ) ) {
					continue;
				}

				$products[] = $this->format_product( $product, $outlet_id, $outlet_stocks );
			}
		}

		$total_pages = $limit > 0 ? (int) ceil( (int) $wp_query->found_posts / $limit ) : 1;

		return array(
			'products'     => $products,
			'total'        => (int) $wp_query->found_posts,
			'total_pages'  => max( 1, $total_pages ),
			'current_page' => $page,
		);
	}

	/**
	 * Resolve current active outlet ID
	 *
	 * @return int|null
	 */
	protected function resolve_outlet_id() {
		$user_id = get_current_user_id();
		if ( ! $user_id ) {
			return null;
		}

		$session = POSSession::where( 'user_id', $user_id )
			->where( 'status', 'open' )
			->first();

		return ( $session && $session->outlet_id ) ? intval( $session->outlet_id ) : null;
	}

	/**
	 * Format product properties for client response
	 *
	 * @param \WC_Product $product
	 * @param int|null    $outlet_id
	 * @param array       $outlet_stocks
	 * @return array
	 */
	protected function format_product( $product, $outlet_id = null, $outlet_stocks = array() ) {
		$image_id  = $product->get_image_id();
		$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : wc_placeholder_img_src();

		$stock_quantity      = $product->get_stock_quantity();
		$low_stock_threshold = null;
		
		if ( $outlet_id && isset( $outlet_stocks[ $product->get_id() ] ) ) {
			$outlet_stock = $outlet_stocks[ $product->get_id() ];
			$stock_quantity      = floatval( $outlet_stock->stock_quantity );
			$low_stock_threshold = intval( $outlet_stock->low_stock_threshold );
		}

		$formatted = array(
			'id'                   => $product->get_id(),
			'name'                 => $product->get_name(),
			'sku'                  => $product->get_sku(),
			'type'                 => $product->get_type(),
			'price'                => floatval( $product->get_price() ),
			'regular_price'        => floatval( $product->get_regular_price() ),
			'sale_price'           => floatval( $product->get_sale_price() ),
			'manage_stock'         => $product->get_manage_stock(),
			'stock_quantity'       => $stock_quantity,
			'stock_status'         => $product->get_stock_status(),
			'backorders'           => $product->get_backorders(),
			'tax_status'           => $product->get_tax_status(),
			'tax_class'            => $product->get_tax_class(),
			'image'                => $image_url,
			'categories'           => array(),
			'barcode'              => $product->get_meta( '_barcode' ) ?: $product->get_meta( 'barcode' ) ?: '',
			'low_stock_threshold'  => $low_stock_threshold,
			'variations'           => array(),
		);

		if ( $product->is_type( 'variable' ) ) {
			$children = $product->get_children();
			$variations = array();
			foreach ( $children as $child_id ) {
				$variation = wc_get_product( $child_id );
				if ( $variation ) {
					$var_stock = $variation->get_stock_quantity();
					$var_low   = null;
					if ( $outlet_id && isset( $outlet_stocks[ $variation->get_id() ] ) ) {
						$var_stock = floatval( $outlet_stocks[ $variation->get_id() ]->stock_quantity );
						$var_low   = intval( $outlet_stocks[ $variation->get_id() ]->low_stock_threshold );
					}

					$variations[] = array(
						'id'                  => $variation->get_id(),
						'name'                => $variation->get_name(),
						'sku'                 => $variation->get_sku(),
						'price'               => floatval( $variation->get_price() ),
						'regular_price'       => floatval( $variation->get_regular_price() ),
						'sale_price'          => floatval( $variation->get_sale_price() ),
						'stock_quantity'      => $var_stock,
						'manage_stock'        => $variation->get_manage_stock(),
						'stock_status'        => $variation->get_stock_status(),
						'attributes'          => $variation->get_variation_attributes(),
						'image'               => $image_url,
						'low_stock_threshold' => $var_low,
					);
				}
			}
			$formatted['variations'] = $variations;
		}

		return $formatted;
	}
}
