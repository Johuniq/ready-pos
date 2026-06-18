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
use Readypos\Traits\Cacheable;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles API actions for searching and retrieving products from WooCommerce.
 *
 * @package Readypos\Controllers\Products
 */
class Actions {

	use Cacheable;

	/**
	 * Retrieve a list of WooCommerce products (paginated, with search & category filtering).
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get( \WP_REST_Request $request ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos-for-woocommerce' ), array( 'status' => 500 ) );
		}

		$limit    = $request->get_param( 'limit' ) ? intval( $request->get_param( 'limit' ) ) : 20;
		$page     = $request->get_param( 'page' ) ? intval( $request->get_param( 'page' ) ) : 1;
		$search   = $request->get_param( 'search' ) ? sanitize_text_field( $request->get_param( 'search' ) ) : '';
		$category = $request->get_param( 'category' ) ? sanitize_text_field( $request->get_param( 'category' ) ) : '';

		// Cache key includes all request parameters for accurate cache hits
		$cache_key = "products_list_{$limit}_{$page}_{$search}_{$category}";

		return $this->cache_response(
			$cache_key,
			function() use ( $limit, $page, $search, $category ) {
				return $this->get_products_internal( $limit, $page, $search, $category );
			},
			'products',
			0 // use Cache::CACHE_GROUPS['products'] default (30s)
		);
	}

	/**
	 * Internal method to fetch products (used for caching).
	 *
	 * @param int    $limit Products per page.
	 * @param int    $page Page number.
	 * @param string $search Search term.
	 * @param string $category Category slug.
	 * @return \WP_REST_Response
	 */
	private function get_products_internal( $limit, $page, $search, $category ) {
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
			if ( ! $sku_product_id ) {
				global $wpdb;
				$sku_product_id = $wpdb->get_var( $wpdb->prepare(
					"SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key IN ('_barcode', 'barcode') AND meta_value = %s LIMIT 1",
					$search
				) );
			}

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
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Product category filtering is an intentional POS catalog filter.
			$query_args['tax_query'] = $tax_query;
		}

		$query_args = apply_filters( 'readypos_get_products_args', $query_args, $request );

		$outlet_id = $this->resolve_outlet_id();

		$wp_query = new \WP_Query( $query_args );
		$products = array();

		if ( $wp_query->have_posts() ) {
			$product_ids = wp_list_pluck( $wp_query->posts, 'ID' );

			// Batch-load all WC product objects in one call (avoids N+1 wc_get_product per post)
			$wc_products = wc_get_products( array(
				'include' => $product_ids,
				'limit'   => count( $product_ids ),
				'type'    => array( 'simple', 'variable' ),
			) );

			$wc_product_map = array();
			$all_stock_ids  = array();
			foreach ( $wc_products as $wc_product ) {
				$pid = $wc_product->get_id();
				$wc_product_map[ $pid ] = $wc_product;
				$all_stock_ids[] = $pid;
				if ( $wc_product->is_type( 'variable' ) ) {
					foreach ( $wc_product->get_children() as $child_id ) {
						$all_stock_ids[] = $child_id;
					}
				}
			}

			// Batch-fetch all outlet stock records in one query
			$outlet_stocks = array();
			if ( $outlet_id && ! empty( $all_stock_ids ) ) {
				$stocks = POSOutletStock::where( 'outlet_id', $outlet_id )
					->whereIn( 'product_id', $all_stock_ids )
					->get();
				foreach ( $stocks as $stock ) {
					$outlet_stocks[ $stock->product_id ] = $stock;
				}
			}

			// Batch-fetch all product_cat terms in one query (avoids N+1 wp_get_post_terms per product)
			$all_cat_terms = wp_get_object_terms( $product_ids, 'product_cat', array( 'fields' => 'all' ) );
			$product_cats_map = array();
			if ( ! is_wp_error( $all_cat_terms ) ) {
				foreach ( $all_cat_terms as $term ) {
					if ( ! isset( $product_cats_map[ $term->object_id ] ) ) {
						$product_cats_map[ $term->object_id ] = array();
					}
					$product_cats_map[ $term->object_id ][] = array(
						'id'   => $term->term_id,
						'name' => $term->name,
						'slug' => $term->slug,
					);
				}
			}

			// Batch-load all variation products for variable parents
			$all_variation_ids = array();
			foreach ( $wc_product_map as $wc_product ) {
				if ( $wc_product->is_type( 'variable' ) ) {
					$all_variation_ids = array_merge( $all_variation_ids, $wc_product->get_children() );
				}
			}

			$variation_map = array();
			if ( ! empty( $all_variation_ids ) ) {
				$variation_products = wc_get_products( array(
					'include' => $all_variation_ids,
					'limit'   => count( $all_variation_ids ),
					'type'    => 'variation',
				) );
				foreach ( $variation_products as $vp ) {
					$variation_map[ $vp->get_id() ] = $vp;
				}
			}

			foreach ( $product_ids as $pid ) {
				if ( ! isset( $wc_product_map[ $pid ] ) ) {
					continue;
				}
				$products[] = $this->format_product(
					$wc_product_map[ $pid ],
					$outlet_id,
					$outlet_stocks,
					$product_cats_map[ $pid ] ?? array(),
					$variation_map
				);
			}
		}

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
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos-for-woocommerce' ), array( 'status' => 500 ) );
		}

		return $this->cache_response(
			'product_categories',
			function () {
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
			},
			'categories',
			0 // use Cache::CACHE_GROUPS['categories'] default (60s)
		);
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
			global $wpdb;
			$product_id = $wpdb->get_var( $wpdb->prepare(
				"SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key IN ('_barcode', 'barcode') AND meta_value = %s LIMIT 1",
				$code
			) );
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
	 * @param array       $outlet_stocks Pre-loaded outlet stocks mapping.
	 * @return array
	 */
	private function format_product( $product, $outlet_id = null, $outlet_stocks = array(), $categories = array(), $variation_map = array() ) {
		$image_id  = $product->get_image_id();
		$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : wc_placeholder_img_src();

		$stock_quantity      = $product->get_stock_quantity();
		$low_stock_threshold = null;
		if ( $outlet_id && isset( $outlet_stocks[ $product->get_id() ] ) ) {
			$outlet_stock          = $outlet_stocks[ $product->get_id() ];
			$stock_quantity        = floatval( $outlet_stock->stock_quantity );
			$low_stock_threshold   = intval( $outlet_stock->low_stock_threshold );
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
			'categories'           => $categories,
			'barcode'              => $product->get_meta( '_barcode' ) ?: $product->get_meta( 'barcode' ) ?: '',
			'low_stock_threshold'  => $low_stock_threshold,
			'variations'           => array(),
		);

		if ( $product->is_type( 'variable' ) ) {
			$children   = $product->get_children();
			$variations = array();
			foreach ( $children as $child_id ) {
				if ( ! isset( $variation_map[ $child_id ] ) ) {
					continue;
				}
				$variation = $variation_map[ $child_id ];

				$var_image_id  = $variation->get_image_id();
				$var_image_url = $var_image_id ? wp_get_attachment_image_url( $var_image_id, 'medium' ) : $image_url;

				$var_stock_quantity      = $variation->get_stock_quantity();
				$var_low_stock_threshold = null;
				if ( $outlet_id && isset( $outlet_stocks[ $child_id ] ) ) {
					$var_outlet_stock       = $outlet_stocks[ $child_id ];
					$var_stock_quantity     = floatval( $var_outlet_stock->stock_quantity );
					$var_low_stock_threshold = intval( $var_outlet_stock->low_stock_threshold );
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
					// Normalize attribute keys for the frontend: strip the
					// `attribute_pa_` / `attribute_` prefix and URL-decode
					// the slug (WooCommerce stores non-ASCII slugs like
					// Bengali "অজন" as percent-encoded form
					// `%e0%a6%93%e0%a6%9c%e0%a6%a8`, which is unreadable
					// when surfaced directly in the variation modal).
					'attributes'          => $this->normalize_variation_attributes( $variation->get_variation_attributes() ),
					'image'               => $var_image_url,
					'low_stock_threshold' => $var_low_stock_threshold,
				);
			}
			$formatted['variations'] = $variations;
		}

		return $formatted;
	}

	/**
	 * Normalize WooCommerce variation attribute keys for the POS frontend.
	 *
	 * WooCommerce stores attribute slugs as percent-encoded values when the
	 * original term name contains non-ASCII characters (e.g. Bengali
	 * "অজন" is stored as `%e0%a6%93%e0%a6%9c%e0%a6%a8`). The keys also
	 * carry an `attribute_pa_` or `attribute_` prefix that the REST API
	 * layer adds. Surfacing either of those directly in the variation
	 * selector renders a label like
	 * "ATTRIBUTE %E0%A6%93%E0%A6%9C%E0%A6%A8" which is unusable for a
	 * cashier. This helper strips the prefix and decodes the slug so the
	 * frontend receives a clean, human-readable key such as "অজন" while
	 * keeping the original term slug available as the value (which the
	 * POS already understands for matching).
	 *
	 * @param array $raw_attributes Raw attribute map from
	 *                               WC_Product_Variation::get_variation_attributes().
	 * @return array Map of normalized key => value (slug).
	 */
	private function normalize_variation_attributes( array $raw_attributes ) {
		$normalized = array();
		foreach ( $raw_attributes as $key => $value ) {
			$clean_key = $key;

			// Strip WooCommerce attribute prefixes. Order matters: the
			// `attribute_pa_` form is a subset of `attribute_`, so we
			// try the longer one first.
			if ( 0 === strpos( $clean_key, 'attribute_pa_' ) ) {
				$clean_key = substr( $clean_key, strlen( 'attribute_pa_' ) );
			} elseif ( 0 === strpos( $clean_key, 'attribute_' ) ) {
				$clean_key = substr( $clean_key, strlen( 'attribute_' ) );
			}

			// Decode percent-encoded slugs (UTF-8 / non-ASCII).
			if ( false !== strpos( $clean_key, '%' ) ) {
				$decoded = urldecode( $clean_key );
				if ( '' !== $decoded ) {
					$clean_key = $decoded;
				}
			}

			$normalized[ $clean_key ] = $value;
		}
		return $normalized;
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
