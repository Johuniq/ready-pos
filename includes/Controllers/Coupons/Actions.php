<?php
/**
 * Coupon-related POS actions.
 *
 * @package Readypos\Controllers\Coupons
 * @since 1.0.0
 */

namespace Readypos\Controllers\Coupons;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles API actions for validating WooCommerce coupons at POS.
 *
 * @package Readypos\Controllers\Coupons
 */
class Actions {

	/**
	 * Validate a coupon code against WooCommerce.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function validate( \WP_REST_Request $request ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		$code = $request->get_param( 'code' ) ? sanitize_text_field( $request->get_param( 'code' ) ) : '';

		if ( empty( $code ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Coupon code cannot be empty.', 'ready-pos' ),
				),
				200
			);
		}

		// WooCommerce coupons are case-insensitive, so we normalize to lowercase
		$code = strtolower( $code );
		$coupon = new \WC_Coupon( $code );

		if ( ! $coupon->get_id() ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Coupon does not exist.', 'ready-pos' ),
				),
				200
			);
		}

		// Check if coupon is published/active
		$post_status = get_post_status( $coupon->get_id() );
		if ( 'publish' !== $post_status ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'This coupon is not active.', 'ready-pos' ),
				),
				200
			);
		}

		// Perform basic validations (expiry, active states)
		$now = current_time( 'timestamp', true );

		// Check expiry
		$expiry = $coupon->get_date_expires();
		if ( $expiry && $expiry->getTimestamp() < $now ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'This coupon has expired.', 'ready-pos' ),
				),
				200
			);
		}

		// Check usage limit
		$usage_limit = $coupon->get_usage_limit();
		$usage_count = $coupon->get_usage_count();
		if ( $usage_limit > 0 && $usage_count >= $usage_limit ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Coupon usage limit has been reached.', 'ready-pos' ),
				),
				200
			);
		}

		// Check per-user usage limit (if customer is logged in)
		$user_id = get_current_user_id();
		if ( $user_id ) {
			$usage_limit_per_user = $coupon->get_usage_limit_per_user();
			if ( $usage_limit_per_user > 0 ) {
				$used_by = $coupon->get_used_by();
				$user_usage_count = is_array( $used_by ) ? count( array_filter( $used_by, function( $id ) use ( $user_id ) {
					return intval( $id ) === $user_id;
				} ) ) : 0;
				
				if ( $user_usage_count >= $usage_limit_per_user ) {
					return new \WP_REST_Response(
						array(
							'success' => false,
							'message' => __( 'You have reached the usage limit for this coupon.', 'ready-pos' ),
						),
						200
					);
				}
			}
		}

		// Return coupon parameters for terminal checkout cart validation
		return new \WP_REST_Response(
			array(
				'success'                     => true,
				'code'                        => strtoupper( $coupon->get_code() ), // Return uppercase for display
				'amount'                      => floatval( $coupon->get_amount() ),
				'discount_type'               => $coupon->get_discount_type(),
				'description'                 => $coupon->get_description(),
				'minimum_amount'              => floatval( $coupon->get_minimum_amount() ),
				'maximum_amount'              => floatval( $coupon->get_maximum_amount() ),
				'individual_use'              => $coupon->get_individual_use(),
				'product_ids'                 => $coupon->get_product_ids(),
				'excluded_product_ids'        => $coupon->get_excluded_product_ids(),
				'product_categories'          => $coupon->get_product_categories(),
				'excluded_product_categories' => $coupon->get_excluded_product_categories(),
				'free_shipping'               => $coupon->get_free_shipping(),
				'exclude_sale_items'          => $coupon->get_exclude_sale_items(),
			),
			200
		);
	}
}
