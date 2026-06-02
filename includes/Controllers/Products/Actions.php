<?php
/**
 * Product-related POS actions.
 *
 * @package Readypos\Controllers\Products
 * @since 1.0.0
 */

namespace Readypos\Controllers\Products;

use Readypos\Models\POSOutletStock;
use Readypos\Models\POSSession;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles API actions for searching and retrieving products from WooCommerce.
 *
 * @package Readypos\Controllers\Products
 */
class Actions {

	/**
	 * Retrieve a list of WooCommerce products (paginated, with search & category filtering).
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get( \WP_REST_Request $request ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		$limit    = $request->get_param( 'limit' ) ? intval( $request->get_param( 'limit' ) ) : 20;
		$page     = $request->get_param( 'page' ) ? intval( $request->get_param( 'page' ) ) : 1;
		$search   = $request->get_param( 'search' ) ? sanitize_text_field( $request->get_param( 'search' ) ) : '';
		$category = $request->get_param( 'category' ) ? sanitize_text_field( $request->get_param( 'category' ) ) : '';

		// Use WP_Query directly for maximum compatibility across WooCommerce versions.
		// We deliberately do NOT filter by product_type taxonomy because newer WC
		// versions (with HPOS) sometimes leave that term unassigned. Instead we
		// filter unsupported types in PHP after fetching the WC_Product object.
		$query_args = array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => $limit,
			'paged'          => $page,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		$tax_query = array();

		// Search by name / content
		if ( ! empty( $search ) ) {
			// Check SKU/barcode first
			$sku_product_id = wc_get_product_id_by_sku( $search );
			if ( $sku_product_id ) {
				// SKU match found — return this product directly, ignore category filter.
				$query_args['p'] = $sku_product_id;
			} else {
				$query_args['s'] = $search;

				// Only apply category filter when doing a text search (not SKU match).
				if ( ! empty( $category ) && 'all' !== $category ) {
					$tax_query[] = array(
						'taxonomy' => 'product_cat',
						'field'    => 'slug',
						'terms'    => array( $category ),
					);
				}
			}
		} else {
			// No search — apply category filter normally.
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

		// Allow filtering query parameters
		$query_args = apply_filters( 'readypos_get_products_args', $query_args, $request );

		// Resolve active outlet for multi-outlet stock overlay
		$outlet_id = $this->resolve_outlet_id();

		$wp_query = new \WP_Query( $query_args );
		$products = array();

		if ( $wp_query->have_posts() ) {
			foreach ( $wp_query->posts as $post ) {
				$product = wc_get_product( $post->ID );
				if ( ! $product ) {
					continue;
				}

				// Skip product types we can't sell on a POS terminal.
				$type = $product->get_type();
				if ( ! in_array( $type, array( 'simple', 'variable' ), true ) ) {
					continue;
				}

				$products[] = $this->format_product( $product, $outlet_id );
			}
		}

		$total = count( $products );
		$total_pages = $limit > 0 ? (int) ceil( (int) $wp_query->found_posts / $limit ) : 1;

		return new \WP_REST_Response(
			array(
				'products'     => $products,
				'total'        => (int) $wp_query->found_posts,
				'total_pages'  => max( 1, $total_pages ),
				'current_page' => $page,
			),
			200
		);
	}

	/**
	 * Retrieve product categories.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function categories() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		$terms = get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'hide_empty' => false,
			)
		);

		$categories = array();
		if ( ! is_wp_error( $terms ) ) {
			foreach ( $terms as $term ) {
				$categories[] = array(
					'id'    => $term->term_id,
					'name'  => $term->name,
					'slug'  => $term->slug,
					'count' => $term->count,
				);
			}
		}

		return new \WP_REST_Response( $categories, 200 );
	}

	/**
	 * Search products by barcode or SKU directly.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function search( \WP_REST_Request $request ) {
		$code = $request->get_param( 'code' ) ? sanitize_text_field( $request->get_param( 'code' ) ) : '';

		if ( empty( $code ) ) {
			return new \WP_REST_Response( array(), 200 );
		}

		// Try to find product by SKU
		$product_id = wc_get_product_id_by_sku( $code );

		// Check if it's a barcode custom field search if SKU is not found
		if ( ! $product_id ) {
			$meta_queries = array(
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
			);

			$posts = get_posts(
				array(
					'post_type'  => array( 'product', 'product_variation' ),
					'meta_query' => $meta_queries,
					'fields'     => 'ids',
					'limit'      => 1,
				)
			);

			if ( ! empty( $posts ) ) {
				$product_id = $posts[0];
			}
		}

		if ( $product_id ) {
			$product = wc_get_product( $product_id );
			if ( $product ) {
				$outlet_id = $this->resolve_outlet_id();
				return new \WP_REST_Response( $this->format_product( $product, $outlet_id ), 200 );
			}
		}

		return new \WP_REST_Response( null, 404 );
	}

	/**
	 * Format product details for POS response.
	 *
	 * @param \WC_Product $product  WooCommerce product object.
	 * @param int|null    $outlet_id Active outlet ID for stock overlay.
	 * @return array
	 */
	private function format_product( $product, $outlet_id = null ) {
		$image_id  = $product->get_image_id();
		$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : wc_placeholder_img_src();

		// Get stock quantity — override with outlet-specific stock if available
		$stock_quantity      = $product->get_stock_quantity();
		$low_stock_threshold = null;
		if ( $outlet_id ) {
			$outlet_stock = POSOutletStock::where( 'outlet_id', $outlet_id )
				->where( 'product_id', $product->get_id() )
				->first();
			if ( $outlet_stock ) {
				$stock_quantity      = floatval( $outlet_stock->stock_quantity );
				$low_stock_threshold = intval( $outlet_stock->low_stock_threshold );
			}
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
			'categories'           => $this->get_product_categories( $product->get_id() ),
			'barcode'              => $product->get_meta( '_barcode' ) ?: $product->get_meta( 'barcode' ) ?: '',
			'low_stock_threshold'  => $low_stock_threshold,
			'variations'           => array(),
		);

		// Include variation IDs if variable product
		if ( $product->is_type( 'variable' ) ) {
			$children = $product->get_children();
			$variations = array();
			foreach ( $children as $child_id ) {
				$variation = wc_get_product( $child_id );
				if ( $variation ) {
					$var_image_id = $variation->get_image_id();
					$var_image_url = $var_image_id ? wp_get_attachment_image_url( $var_image_id, 'medium' ) : $image_url;

					// Override variation stock with outlet-specific stock
					$var_stock_quantity      = $variation->get_stock_quantity();
					$var_low_stock_threshold = null;
					if ( $outlet_id ) {
						$var_outlet_stock = POSOutletStock::where( 'outlet_id', $outlet_id )
							->where( 'product_id', $variation->get_id() )
							->first();
						if ( $var_outlet_stock ) {
							$var_stock_quantity      = floatval( $var_outlet_stock->stock_quantity );
							$var_low_stock_threshold = intval( $var_outlet_stock->low_stock_threshold );
						}
					}

					$variations[] = array(
						'id'                  => $variation->get_id(),
						'name'                => $variation->get_name(),
						'sku'                 => $variation->get_sku(),
						'price'               => floatval( $variation->get_price() ),
						'regular_price'       => floatval( $variation->get_regular_price() ),
						'sale_price'          => floatval( $variation->get_sale_price() ),
						'stock_quantity'      => $var_stock_quantity,
						'manage_stock'        => $variation->get_manage_stock(),
						'stock_status'        => $variation->get_stock_status(),
						'attributes'          => $variation->get_variation_attributes(),
						'image'               => $var_image_url,
						'low_stock_threshold' => $var_low_stock_threshold,
					);
				}
			}
			$formatted['variations'] = $variations;
		}

		return $formatted;
	}

	/**
	 * Resolve the active outlet ID from the current user's open session.
	 *
	 * @return int|null
	 */
	private function resolve_outlet_id() {
		$user_id = get_current_user_id();
		if ( ! $user_id ) {
			return null;
		}

		$session = POSSession::where( 'user_id', $user_id )
			->where( 'status', 'open' )
			->first();

		if ( $session && $session->outlet_id ) {
			return intval( $session->outlet_id );
		}

		return null;
	}

	/**
	 * Get product categories as an array of objects with id, name, and slug.
	 *
	 * @param int $product_id Product ID.
	 * @return array
	 */
	private function get_product_categories( $product_id ) {
		$terms = wp_get_post_terms( $product_id, 'product_cat' );
		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return array();
		}

		$cats = array();
		foreach ( $terms as $term ) {
			$cats[] = array(
				'id'   => $term->term_id,
				'name' => $term->name,
				'slug' => $term->slug,
			);
		}
		return $cats;
	}
}
