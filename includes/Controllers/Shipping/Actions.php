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
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos-for-woocommerce' ), array( 'status' => 500 ) );
		}

		$address = $request->get_param( 'address' );

		if ( empty( $address ) || ! is_array( $address ) ) {
			return new \WP_Error( 'invalid_address', __( 'Invalid shipping address.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		try {
			$country  = isset( $address['country'] ) ? (string) $address['country'] : '';
			$state    = isset( $address['state'] ) ? (string) $address['state'] : '';
			$postcode = isset( $address['postcode'] ) ? (string) $address['postcode'] : '';
			$city     = isset( $address['city'] ) ? (string) $address['city'] : '';

			// Make sure session + cart are available so the WC shipping
			// engine can build a proper package for the destination.
			if ( ! WC()->session ) {
				WC()->initialize_session();
			}
			if ( ! WC()->cart ) {
				WC()->initialize_cart();
			}

			// Bootstrap a real WC_Customer in REST context.
			$customer = WC()->customer;
			if ( ! $customer ) {
				$customer_id = WC()->session ? WC()->session->get_customer_id() : 0;
				$customer    = $customer_id ? new \WC_Customer( $customer_id ) : new \WC_Customer( 0 );
				WC()->customer = $customer;
			}

			if ( $customer ) {
				if ( '' !== $country ) {
					$customer->set_shipping_country( $country );
				}
				if ( '' !== $state ) {
					$customer->set_shipping_state( $state );
				}
				if ( '' !== $postcode ) {
					$customer->set_shipping_postcode( $postcode );
				}
				if ( '' !== $city ) {
					$customer->set_shipping_city( $city );
				}
				if ( isset( $address['address_1'] ) ) {
					$customer->set_shipping_address( (string) $address['address_1'] );
				}
				if ( isset( $address['address_2'] ) ) {
					$customer->set_shipping_address_2( (string) $address['address_2'] );
				}
				if ( method_exists( $customer, 'set_calculated_shipping' ) ) {
					$customer->set_calculated_shipping( true );
				}
				if ( method_exists( $customer, 'save' ) ) {
					$customer->save();
				}
			}

			$cart = WC()->cart;

			// Pick the zone that matches the destination, falling back to
			// the "Rest of the world" zone (zone id 0).
			$zone      = $this->find_matching_zone( $country, $state, $postcode, $city );
			$zone_data = $zone instanceof \WC_Shipping_Zone ? $zone->get_data() : array();
			$zone_id   = $zone_data['id'] ?? ( $zone ? (int) $zone : 0 );

			// Read the actual shipping methods configured in
			// WooCommerce → Settings → Shipping for this zone.
			$zone_methods = $zone instanceof \WC_Shipping_Zone ? $zone->get_shipping_methods( true ) : array();
			$zone_methods = is_array( $zone_methods ) ? $zone_methods : array();

			$available_methods = array();

			if ( ! empty( $zone_methods ) ) {
				// Build a proper package so configured methods can compute
				// a real rate (flat_rate, free_shipping, local_pickup, etc.).
				$contents = ( $cart && method_exists( $cart, 'get_cart' ) ) ? $cart->get_cart() : array();

				$package = array(
					'contents'        => $contents,
					'contents_cost'   => $cart && method_exists( $cart, 'get_cart_contents_total' ) ? (float) $cart->get_cart_contents_total() : 0.0,
					'applied_coupons' => $cart && method_exists( $cart, 'get_applied_coupons' ) ? $cart->get_applied_coupons() : array(),
					'destination'     => array(
						'country'   => $country,
						'state'     => $state,
						'postcode'  => $postcode,
						'city'      => $city,
						'address'   => isset( $address['address_1'] ) ? (string) $address['address_1'] : '',
						'address_2' => isset( $address['address_2'] ) ? (string) $address['address_2'] : '',
					),
					'user' => array( 'ID' => get_current_user_id() ),
				);

				$rates_result = WC()->shipping()->calculate_shipping_for_package( $package );
				$rates        = ( is_array( $rates_result ) && ! empty( $rates_result['rates'] ) ) ? $rates_result['rates'] : array();

				// First, surface rates that the engine actually computed.
				foreach ( $rates as $rate ) {
					if ( ! method_exists( $rate, 'get_method_id' ) ) {
						continue;
					}
					$available_methods[] = array(
						'id'          => method_exists( $rate, 'get_id' ) ? $rate->get_id() : $rate->get_method_id(),
						'method_id'   => $rate->get_method_id(),
						'instance_id' => method_exists( $rate, 'get_instance_id' ) ? (int) $rate->get_instance_id() : 0,
						'title'       => method_exists( $rate, 'get_label' ) ? $rate->get_label() : (string) ( $zone_methods[ $rate->get_method_id() ]->title ?? $rate->get_method_id() ),
						'cost'        => method_exists( $rate, 'get_cost' ) ? (float) $rate->get_cost() : 0.0,
						'tax_status'  => method_exists( $rate, 'get_tax_status' ) ? $rate->get_tax_status() : '',
						'description' => 'free_shipping' === $rate->get_method_id() ? __( 'Free shipping', 'ready-pos-for-woocommerce' ) : '',
					);
				}

				// Then append the remaining enabled methods in the zone
				// (no computed rate — e.g. methods that need manual quotes).
				$rated_ids = array();
				foreach ( $available_methods as $m ) {
					$rated_ids[] = $m['method_id'] . ':' . ( $m['instance_id'] ?? 0 );
				}
				foreach ( $zone_methods as $instance_id => $method ) {
					$key = $method->id . ':' . (int) $instance_id;
					if ( in_array( $key, $rated_ids, true ) ) {
						continue;
					}
					$available_methods[] = array(
						'id'          => $method->id . ':' . $instance_id,
						'method_id'   => $method->id,
						'instance_id' => (int) $instance_id,
						'title'       => $method->get_title() ?: $method->get_method_title(),
						'cost'        => 0.0,
						'tax_status'  => method_exists( $method, 'get_tax_status' ) ? $method->get_tax_status() : '',
						'description' => $method->get_method_description(),
					);
				}
			}

			if ( empty( $available_methods ) ) {
				return new \WP_REST_Response(
					array(
						'success'        => false,
						'code'           => 'not_configured',
						'message'        => __( 'No shipping methods are configured for this destination. Please configure shipping zones and methods in WooCommerce → Settings → Shipping.', 'ready-pos-for-woocommerce' ),
						'methods'        => array(),
						'zone'           => $zone_data,
						'zone_id'        => $zone_id,
						'configure_url'  => admin_url( 'admin.php?page=wc-settings&tab=shipping' ),
					),
					200
				);
			}

			return new \WP_REST_Response(
				array(
					'success' => true,
					'methods' => $available_methods,
					'zone'    => $zone_data,
					'zone_id' => $zone_id,
				),
				200
			);

		} catch ( \Throwable $e ) {
			return new \WP_Error( 'calculation_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
	}

	/**
	 * Find the WC_Shipping_Zone that matches the given destination.
	 *
	 * @param string $country
	 * @param string $state
	 * @param string $postcode
	 * @param string $city
	 * @return \WC_Shipping_Zone|null
	 */
	protected function find_matching_zone( $country, $state, $postcode, $city ) {
		if ( ! class_exists( '\\WC_Shipping_Zones' ) ) {
			return null;
		}

		$package = array(
			'destination' => array(
				'country'  => $country,
				'state'    => $state,
				'postcode' => $postcode,
				'city'     => $city,
			),
		);

		$zone = \WC_Shipping_Zones::get_zone_matching_package( $package );

		return $zone instanceof \WC_Shipping_Zone ? $zone : null;
	}

	/**
	 * Get all available shipping methods configured in WooCommerce.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_methods() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_missing', __( 'WooCommerce is not active.', 'ready-pos-for-woocommerce' ), array( 'status' => 500 ) );
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

