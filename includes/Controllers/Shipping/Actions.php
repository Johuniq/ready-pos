<?php
/**
 * Shipping-related POS actions.
 *
 * @package Readypos\Controllers\Shipping
 * @since 1.0.0
 */

namespace Readypos\Controllers\Shipping;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles API requests for calculating shipping rates and managing shipping methods.
 *
 * @package Readypos\Controllers\Shipping
 */
class Actions {

	/**
	 * Calculate available shipping methods for a given address.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function calculate( \WP_REST_Request $request ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		$address = $request->get_param( 'address' );

		if ( empty( $address ) || ! is_array( $address ) ) {
			return new \WP_Error( 'invalid_address', __( 'Invalid shipping address.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		try {
			// Get WooCommerce shipping zones
			$shipping_zones = \WC_Shipping_Zones::get_zones();
			$available_methods = array();

			// Get cart contents from session or create temporary cart
			$cart = WC()->cart;
			if ( ! $cart ) {
				WC()->initialize_cart();
				$cart = WC()->cart;
			}

			// Set shipping address for calculation
			$cart->get_customer()->set_shipping_country( $address['country'] ?? 'US' );
			$cart->get_customer()->set_shipping_state( $address['state'] ?? '' );
			$cart->get_customer()->set_shipping_postcode( $address['postcode'] ?? '' );
			$cart->get_customer()->set_shipping_city( $address['city'] ?? '' );
			$cart->get_customer()->set_shipping_address( $address['address_1'] ?? '' );
			$cart->get_customer()->set_shipping_address_2( $address['address_2'] ?? '' );

			// Calculate shipping
			$cart->calculate_shipping();
			$packages = $cart->get_shipping_packages();

			if ( ! empty( $packages ) ) {
				$package = $packages[0];
				
				// Get shipping methods for this package
				$shipping_methods = WC()->shipping()->calculate_shipping_for_package( $package );

				if ( ! empty( $shipping_methods['rates'] ) ) {
					foreach ( $shipping_methods['rates'] as $rate ) {
						$available_methods[] = array(
							'id'          => $rate->get_id(),
							'method_id'   => $rate->get_method_id(),
							'title'       => $rate->get_label(),
							'cost'        => $rate->get_cost(),
							'description' => $rate->get_method_id() === 'free_shipping' ? __( 'Free shipping', 'ready-pos' ) : '',
						);
					}
				}
			}

			// If no methods found, try to get default/fallback methods
			if ( empty( $available_methods ) ) {
				// Get all enabled shipping methods as fallback
				$shipping_methods = WC()->shipping()->get_shipping_methods();
				
				foreach ( $shipping_methods as $method ) {
					if ( 'yes' === $method->enabled ) {
						$available_methods[] = array(
							'id'          => $method->id,
							'method_id'   => $method->id,
							'title'       => $method->get_method_title(),
							'cost'        => 0, // Default cost, should be configured in WooCommerce
							'description' => $method->get_method_description(),
						);
					}
				}
			}

			return new \WP_REST_Response(
				array(
					'success' => true,
					'methods' => $available_methods,
				),
				200
			);

		} catch ( \Exception $e ) {
			return new \WP_Error( 'calculation_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
	}

	/**
	 * Get all available shipping methods configured in WooCommerce.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_methods() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		$shipping_methods = WC()->shipping()->get_shipping_methods();
		$methods = array();

		foreach ( $shipping_methods as $method ) {
			if ( 'yes' === $method->enabled ) {
				$methods[] = array(
					'id'          => $method->id,
					'title'       => $method->get_method_title(),
					'description' => $method->get_method_description(),
					'enabled'     => true,
				);
			}
		}

		return new \WP_REST_Response(
			array(
				'methods' => $methods,
			),
			200
		);
	}
}

