<?php
/**
 * Settings and Outlet management actions for POS.
 *
 * @package Readypos\Controllers\Settings
 * @since 1.0.0
 */

namespace Readypos\Controllers\Settings;

use Readypos\Models\POSOutlet;
use Readypos\Models\POSRegister;
use Readypos\Traits\Cacheable;
use Readypos\Utils\Validator;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles CRUD operations for POS settings, store outlets, and registers.
 *
 * @package Readypos\Controllers\Settings
 */
class Actions {

	use Cacheable;

	/**
	 * Normalise a value into the canonical "yes" | "no" vocabulary
	 * used by every payment-method option. Centralising the
	 * transformation here means the admin UI, the onboarding
	 * wizard, and the POS terminal all agree on what "enabled" means
	 * and the database never ends up with junk like "YES" / "true" / "1".
	 *
	 * @param mixed  $value    Raw value from the request or option.
	 * @param string $fallback Returned when the value is null/empty.
	 * @return string
	 */
	protected function normalize_yes_no( $value, $fallback = 'yes' ) {
		if ( null === $value ) {
			return $fallback;
		}
		if ( is_bool( $value ) ) {
			return $value ? 'yes' : 'no';
		}
		$str = strtolower( trim( (string) $value ) );
		if ( in_array( $str, array( 'yes', 'true', '1', 'on' ), true ) ) {
			return 'yes';
		}
		if ( in_array( $str, array( 'no', 'false', '0', 'off', '' ), true ) ) {
			return 'no';
		}
		return $fallback;
	}

	/**
	 * Persist an option, but only when the request actually carried the
	 * field. This is the fix for the payment-method desync: a partial
	 * update (e.g. onboarding's second call that only sets site_name
	 * + onboarding_complete) can no longer wipe out the previously
	 * saved payment_cash / payment_card value with an empty string.
	 *
	 * @param \WP_REST_Request $request
	 * @param string           $param   Request parameter name.
	 * @param string           $option  WordPress option key.
	 * @param callable|null    $normaliser Optional value transformer.
	 * @return bool True when an update was performed.
	 */
	protected function persist_option_if_present( $request, $param, $option, $normaliser = null ) {
		if ( ! $request->has_param( $param ) ) {
			return false;
		}
		$value = $request->get_param( $param );
		if ( null !== $normaliser ) {
			$value = call_user_func( $normaliser, $value );
		}
		update_option( $option, $value );
		return true;
	}

	/**
	 * Get POS general, receipt, and payment settings.
	 *
	 * @return \WP_REST_Response
	 */
	public function get() {
		return $this->cache_response(
			'settings_main',
			function() {
				$default_settings = array(
					// Site Identity
					'site_name'       => get_option( 'readypos_site_name', get_bloginfo( 'name' ) ),
					'site_tagline'    => get_option( 'readypos_site_tagline', get_bloginfo( 'description' ) ),
					'site_logo'       => get_option( 'readypos_site_logo', '' ),
					'site_address'    => get_option( 'readypos_site_address', '' ),
					'site_phone'      => get_option( 'readypos_site_phone', '' ),
					'site_email'      => get_option( 'readypos_site_email', get_option( 'admin_email' ) ),
					// Currency
					'currency_symbol' => class_exists( 'WooCommerce' ) ? get_woocommerce_currency_symbol() : '$',
					'currency_code'   => class_exists( 'WooCommerce' ) ? get_woocommerce_currency() : 'USD',
					'tax_rates'       => $this->get_wc_tax_rates(),
					// Receipt Settings
					'receipt_logo'    => get_option( 'readypos_receipt_logo', '' ),
					'receipt_show_logo' => get_option( 'readypos_receipt_show_logo', 'no' ),
					'receipt_show_barcode' => get_option( 'readypos_receipt_show_barcode', 'yes' ),
					'receipt_header'  => get_option( 'readypos_receipt_header', get_bloginfo( 'name' ) ),
					'receipt_footer'  => get_option( 'readypos_receipt_footer', 'Thank you for shopping with us!' ),
					'receipt_paper_width' => get_option( 'readypos_receipt_paper_width', '80mm' ),
					'receipt_blocks'  => json_decode( get_option( 'readypos_receipt_blocks', '[]' ), true ),
					// Payment Settings
					'payment_cash'    => get_option( 'readypos_payment_cash', 'yes' ),
					'payment_card'    => get_option( 'readypos_payment_card', 'yes' ),
					'pos_cash_gateway' => get_option( 'readypos_pos_cash_gateway', 'cod' ),
					'pos_card_gateway' => get_option( 'readypos_pos_card_gateway', 'stripe' ),
					// Terminal Settings
					'keyboard_status' => get_option( 'readypos_keyboard_status', 'yes' ),
					'customer_display_enabled' => get_option( 'readypos_customer_display_enabled', 'yes' ),
					'customer_display_idle_timeout' => intval( get_option( 'readypos_customer_display_idle_timeout', 30 ) ),
					'customer_display_message' => get_option( 'readypos_customer_display_message', 'Welcome to our store!' ),
					'customer_display_promo_1' => get_option( 'readypos_customer_display_promo_1', 'Special offers available - Ask our staff!' ),
					'customer_display_promo_2' => get_option( 'readypos_customer_display_promo_2', 'Join our loyalty program and save more' ),
					'customer_display_promo_3' => get_option( 'readypos_customer_display_promo_3', 'Now open every day until 9 PM' ),
					'customer_display_promo_4' => get_option( 'readypos_customer_display_promo_4', 'Shop online and pick up in store' ),
					'max_discount_limit' => intval( get_option( 'readypos_max_discount_limit', '100' ) ),
					'pos_order_prefix' => get_option( 'readypos_pos_order_prefix', '' ),
					// Return/Exchange Settings
					'enable_returns'          => get_option( 'readypos_enable_returns', 'yes' ),
					'enable_exchanges'        => get_option( 'readypos_enable_exchanges', 'yes' ),
					'enable_store_credit'     => get_option( 'readypos_enable_store_credit', 'yes' ),
					'return_time_limit_days'  => intval( get_option( 'readypos_return_time_limit_days', 30 ) ),
					'require_receipt'         => get_option( 'readypos_require_receipt', 'no' ),
					'restocking_fee_enabled'  => get_option( 'readypos_restocking_fee_enabled', 'no' ),
					'restocking_fee_type'     => get_option( 'readypos_restocking_fee_type', 'percentage' ),
					'restocking_fee_value'    => floatval( get_option( 'readypos_restocking_fee_value', 10 ) ),
					'auto_restock_inventory'  => get_option( 'readypos_auto_restock_inventory', 'yes' ),
					// Onboarding
					'onboarding_complete' => get_option( 'readypos_onboarding_complete', 'no' ),
				);

				return new \WP_REST_Response( $default_settings, 200 );
			},
			'settings',
			1800 // 30 minutes
		);
	}

	/**
	 * Update settings.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function update( \WP_REST_Request $request ) {
		// Site Identity
		$site_name    = sanitize_text_field( $request->get_param( 'site_name' ) );
		$site_tagline = sanitize_text_field( $request->get_param( 'site_tagline' ) );
		$site_logo    = sanitize_text_field( $request->get_param( 'site_logo' ) );
		$site_address = sanitize_textarea_field( $request->get_param( 'site_address' ) );
		$site_phone   = sanitize_text_field( $request->get_param( 'site_phone' ) );
		$site_email   = sanitize_email( $request->get_param( 'site_email' ) );

		// Receipt Settings
		$receipt_logo    = sanitize_text_field( $request->get_param( 'receipt_logo' ) );
		$receipt_show_logo = sanitize_text_field( $request->get_param( 'receipt_show_logo' ) );
		$receipt_show_barcode = sanitize_text_field( $request->get_param( 'receipt_show_barcode' ) );
		$receipt_header  = sanitize_text_field( $request->get_param( 'receipt_header' ) );
		$receipt_footer  = sanitize_text_field( $request->get_param( 'receipt_footer' ) );
		$receipt_paper_width = sanitize_text_field( $request->get_param( 'receipt_paper_width' ) );
		$receipt_blocks  = $request->get_param( 'receipt_blocks' );

		// Payment Settings — only the gateway mappings still need
		// pre-processing here. The payment_cash / payment_card values
		// are read inside persist_option_if_present() so a missing
		// field never reaches update_option().
		$pos_cash_gateway = sanitize_text_field( $request->get_param( 'pos_cash_gateway' ) );
		$pos_card_gateway = sanitize_text_field( $request->get_param( 'pos_card_gateway' ) );

		// Terminal Settings
		$keyboard_status = sanitize_text_field( $request->get_param( 'keyboard_status' ) );
		$customer_display_enabled = sanitize_text_field( $request->get_param( 'customer_display_enabled' ) );
		$customer_display_idle_timeout = intval( $request->get_param( 'customer_display_idle_timeout' ) );
		$customer_display_message = sanitize_text_field( $request->get_param( 'customer_display_message' ) );
		$customer_display_promo_1 = sanitize_text_field( $request->get_param( 'customer_display_promo_1' ) );
		$customer_display_promo_2 = sanitize_text_field( $request->get_param( 'customer_display_promo_2' ) );
		$customer_display_promo_3 = sanitize_text_field( $request->get_param( 'customer_display_promo_3' ) );
		$customer_display_promo_4 = sanitize_text_field( $request->get_param( 'customer_display_promo_4' ) );
		$max_discount_limit = intval( $request->get_param( 'max_discount_limit' ) );
		$pos_order_prefix = sanitize_text_field( $request->get_param( 'pos_order_prefix' ) );

		// Return/Exchange Settings
		$enable_returns = sanitize_text_field( $request->get_param( 'enable_returns' ) );
		$enable_exchanges = sanitize_text_field( $request->get_param( 'enable_exchanges' ) );
		$enable_store_credit = sanitize_text_field( $request->get_param( 'enable_store_credit' ) );
		$return_time_limit_days = intval( $request->get_param( 'return_time_limit_days' ) );
		$require_receipt = sanitize_text_field( $request->get_param( 'require_receipt' ) );
		$restocking_fee_enabled = sanitize_text_field( $request->get_param( 'restocking_fee_enabled' ) );
		$restocking_fee_type = sanitize_text_field( $request->get_param( 'restocking_fee_type' ) );
		$restocking_fee_value = floatval( $request->get_param( 'restocking_fee_value' ) );
		$auto_restock_inventory = sanitize_text_field( $request->get_param( 'auto_restock_inventory' ) );

		// Update Site Identity
		if ( ! empty( $site_name ) ) {
			update_option( 'readypos_site_name', $site_name );
		}
		if ( ! empty( $site_tagline ) ) {
			update_option( 'readypos_site_tagline', $site_tagline );
		}
		update_option( 'readypos_site_logo', $site_logo );
		update_option( 'readypos_site_address', $site_address );
		update_option( 'readypos_site_phone', $site_phone );
		if ( ! empty( $site_email ) ) {
			update_option( 'readypos_site_email', $site_email );
		}

		// Update Receipt Settings
		update_option( 'readypos_receipt_logo', $receipt_logo );
		update_option( 'readypos_receipt_show_logo', $receipt_show_logo ?: 'no' );
		update_option( 'readypos_receipt_show_barcode', $receipt_show_barcode ?: 'yes' );
		update_option( 'readypos_receipt_header', $receipt_header );
		update_option( 'readypos_receipt_footer', $receipt_footer );
		update_option( 'readypos_receipt_paper_width', $receipt_paper_width ?: '80mm' );
		if ( is_array( $receipt_blocks ) ) {
			update_option( 'readypos_receipt_blocks', wp_json_encode( $receipt_blocks ) );
		}

		// Update Payment Settings.
		// Use the guarded helper so a request that omits payment_cash
		// or payment_card (e.g. onboarding's final step) cannot blank
		// out the value the user chose earlier. Every payment write
		// routes through the shared normaliser — the single source of
		// truth that keeps the wizard, the Settings page, and the POS
		// terminal in sync.
		$this->persist_option_if_present( $request, 'payment_cash', 'readypos_payment_cash', array( $this, 'normalize_yes_no' ) );
		$this->persist_option_if_present( $request, 'payment_card', 'readypos_payment_card', array( $this, 'normalize_yes_no' ) );
		update_option( 'readypos_pos_cash_gateway', $pos_cash_gateway ?: 'cod' );
		update_option( 'readypos_pos_card_gateway', $pos_card_gateway ?: 'stripe' );

		// Update Terminal Settings
		update_option( 'readypos_keyboard_status', $keyboard_status );
		update_option( 'readypos_customer_display_enabled', $customer_display_enabled ?: 'yes' );
		update_option( 'readypos_customer_display_idle_timeout', $customer_display_idle_timeout ?: 30 );
		update_option( 'readypos_customer_display_message', $customer_display_message ?: 'Welcome to our store!' );
		update_option( 'readypos_customer_display_promo_1', $customer_display_promo_1 ?: 'Special offers available - Ask our staff!' );
		update_option( 'readypos_customer_display_promo_2', $customer_display_promo_2 ?: 'Join our loyalty program and save more' );
		update_option( 'readypos_customer_display_promo_3', $customer_display_promo_3 ?: 'Now open every day until 9 PM' );
		update_option( 'readypos_customer_display_promo_4', $customer_display_promo_4 ?: 'Shop online and pick up in store' );
		update_option( 'readypos_max_discount_limit', $max_discount_limit ?: 100 );
		update_option( 'readypos_pos_order_prefix', $pos_order_prefix );

		// Update Return/Exchange Settings
		update_option( 'readypos_enable_returns', $enable_returns ?: 'yes' );
		update_option( 'readypos_enable_exchanges', $enable_exchanges ?: 'yes' );
		update_option( 'readypos_enable_store_credit', $enable_store_credit ?: 'yes' );
		update_option( 'readypos_return_time_limit_days', $return_time_limit_days ?: 30 );
		update_option( 'readypos_require_receipt', $require_receipt ?: 'no' );
		update_option( 'readypos_restocking_fee_enabled', $restocking_fee_enabled ?: 'no' );
		update_option( 'readypos_restocking_fee_type', $restocking_fee_type ?: 'percentage' );
		update_option( 'readypos_restocking_fee_value', $restocking_fee_value ?: 10 );
		update_option( 'readypos_auto_restock_inventory', $auto_restock_inventory ?: 'yes' );

		// Onboarding flag.
		$onboarding_complete = sanitize_text_field( $request->get_param( 'onboarding_complete' ) );
		if ( ! empty( $onboarding_complete ) ) {
			update_option( 'readypos_onboarding_complete', $onboarding_complete );
		}

		// Invalidate settings caches
		$this->invalidate_cache( 'setting' );

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Get WooCommerce active payment gateways.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_payment_methods() {
		return $this->cache_response(
			'payment_methods_list',
			function() {
				if ( ! class_exists( 'WooCommerce' ) ) {
					return new \WP_REST_Response( array(), 200 );
				}

				$gateways = \WC()->payment_gateways->payment_gateways();
				$data     = array();

				foreach ( $gateways as $id => $gateway ) {
					if ( 'yes' === $gateway->enabled ) {
						$data[] = array(
							'id'          => $id,
							'title'       => $gateway->get_title(),
							'description' => $gateway->get_description(),
						);
					}
				}

				return new \WP_REST_Response( $data, 200 );
			},
			'payment_methods',
			3600 // 1 hour
		);
	}

	/**
	 * Get outlets with registers.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_outlets() {
		return $this->cache_response(
			'outlets_list',
			function() {
				$outlets = POSOutlet::with( 'registers' )->get();
				$data    = array();

				foreach ( $outlets as $outlet ) {
					$regs = array();

					if ( isset( $outlet->registers ) ) {
						foreach ( $outlet->registers as $reg ) {
							$regs[] = array(
								'id'     => $reg->id,
								'name'   => $reg->name,
								'status' => $reg->status,
							);
						}
					}

					$data[] = array(
						'id'             => $outlet->id,
						'name'           => $outlet->name,
						'address'        => $outlet->address,
						'phone'          => $outlet->phone,
						'email'          => $outlet->email,
						'receipt_header' => $outlet->receipt_header,
						'receipt_footer' => $outlet->receipt_footer,
						'status'         => $outlet->status,
						'registers'      => $regs,
					);
				}

				return new \WP_REST_Response( $data, 200 );
			},
			'outlets',
			1800 // 30 minutes
		);
	}

	/**
	 * Create an outlet.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_outlet( \WP_REST_Request $request ) {
		$user_id_check = Validator::require_authenticated();
		if ( is_wp_error( $user_id_check ) ) {
			return $user_id_check;
		}

		// GPL version limit: only 1 outlet allowed.
		if ( (int) POSOutlet::count() >= 1 ) {
			return new \WP_Error(
				'outlet_limit_reached',
				__( 'The free version of Ready POS allows only 1 outlet. Upgrade to Pro to create additional outlets.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$name = Validator::required_string( $request->get_param( 'name' ), __( 'Outlet name', 'ready-pos-for-woocommerce' ), 191 );
		if ( is_wp_error( $name ) ) {
			return $name;
		}

		// Duplicate name check
		if ( POSOutlet::name_exists( $name ) ) {
			return new \WP_Error(
				'duplicate_outlet_name',
				__( 'An outlet with this name already exists.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'name' )
			);
		}

		$code           = Validator::optional_slug( $request->get_param( 'code' ), 32 );
		$address        = Validator::optional_string( $request->get_param( 'address' ), 500 );
		$city           = Validator::optional_string( $request->get_param( 'city' ), 100 );
		$state          = Validator::optional_string( $request->get_param( 'state' ), 100 );
		$zip_code       = Validator::optional_string( $request->get_param( 'zip_code' ), 32 );
		$country        = Validator::optional_string( $request->get_param( 'country' ), 100 );
		$phone          = Validator::optional_string( $request->get_param( 'phone' ), 32 );
		$email          = Validator::optional_email( $request->get_param( 'email' ) );
		if ( is_wp_error( $email ) ) {
			return $email;
		}
		$receipt_header = Validator::optional_string( $request->get_param( 'receipt_header' ), 255 );
		$receipt_footer = Validator::optional_string( $request->get_param( 'receipt_footer' ), 255 );
		$manager_id     = Validator::optional_int( $request->get_param( 'manager_id' ) );

		// Duplicate code check
		if ( '' !== $code && POSOutlet::code_exists( $code ) ) {
			return new \WP_Error(
				'duplicate_outlet_code',
				__( 'An outlet with this code already exists.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'code' )
			);
		}

		$outlet = POSOutlet::create(
			$this->filter_outlet_columns(
				array(
					'name'           => $name,
					'code'           => $code,
					'address'        => $address,
					'city'           => $city,
					'state'          => $state,
					'zip_code'       => $zip_code,
					'country'        => $country,
					'phone'          => $phone,
					'email'          => $email,
					'manager_id'     => $manager_id,
					'receipt_header' => $receipt_header,
					'receipt_footer' => $receipt_footer,
					'status'         => POSOutlet::STATUS_ACTIVE,
				)
			)
		);

		// Also create a default register for it
		POSRegister::create(
			array(
				'outlet_id' => $outlet->id,
				'name'      => __( 'Register 1', 'ready-pos-for-woocommerce' ),
				'code'      => 'REG-1',
				'status'    => POSRegister::STATUS_CLOSED,
			)
		);

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'outlet_created',
			sprintf( 'Outlet #%d (%s) created', $outlet->id, $name ),
			array(
				'outlet_id'   => $outlet->id,
				'outlet_name' => $name,
				'outlet_code' => $code,
				'user_id'     => $user_id_check,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		// Invalidate outlet and register caches
		$this->invalidate_cache( 'outlet', $outlet->id );
		$this->invalidate_cache( 'register' );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'id'      => $outlet->id,
				'data'    => $this->format_outlet( $outlet ),
			),
			201
		);
	}

	/**
	 * Update an outlet.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_outlet( \WP_REST_Request $request ) {
		$user_id_check = Validator::require_authenticated();
		if ( is_wp_error( $user_id_check ) ) {
			return $user_id_check;
		}

		$id = Validator::required_int( $request->get_param( 'id' ), __( 'Outlet ID', 'ready-pos-for-woocommerce' ) );
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$outlet = POSOutlet::find( $id );
		if ( ! $outlet ) {
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		$name = Validator::required_string( $request->get_param( 'name' ), __( 'Outlet name', 'ready-pos-for-woocommerce' ), 191 );
		if ( is_wp_error( $name ) ) {
			return $name;
		}

		// Duplicate name check (excluding self)
		if ( POSOutlet::name_exists( $name, $id ) ) {
			return new \WP_Error(
				'duplicate_outlet_name',
				__( 'An outlet with this name already exists.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'name' )
			);
		}

		$code = Validator::optional_slug( $request->get_param( 'code' ), 32 );
		if ( '' !== $code && POSOutlet::code_exists( $code, $id ) ) {
			return new \WP_Error(
				'duplicate_outlet_code',
				__( 'An outlet with this code already exists.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'code' )
			);
		}

		$email = Validator::optional_email( $request->get_param( 'email' ) );
		if ( is_wp_error( $email ) ) {
			return $email;
		}

		// Capture before-state for audit
		$changes = array();
		$fields  = array(
			'name'           => $name,
			'code'           => $code,
			'address'        => Validator::optional_string( $request->get_param( 'address' ), 500 ),
			'city'           => Validator::optional_string( $request->get_param( 'city' ), 100 ),
			'state'          => Validator::optional_string( $request->get_param( 'state' ), 100 ),
			'zip_code'       => Validator::optional_string( $request->get_param( 'zip_code' ), 32 ),
			'country'        => Validator::optional_string( $request->get_param( 'country' ), 100 ),
			'phone'          => Validator::optional_string( $request->get_param( 'phone' ), 32 ),
			'email'          => $email,
			'manager_id'     => Validator::optional_int( $request->get_param( 'manager_id' ) ),
			'receipt_header' => Validator::optional_string( $request->get_param( 'receipt_header' ), 255 ),
			'receipt_footer' => Validator::optional_string( $request->get_param( 'receipt_footer' ), 255 ),
		);
		foreach ( $fields as $field => $new_value ) {
			$old_value = isset( $outlet->{$field} ) ? (string) $outlet->{$field} : '';
			if ( $old_value !== (string) $new_value ) {
				$changes[ $field ] = array( 'from' => $old_value, 'to' => (string) $new_value );
			}
			$outlet->{$field} = $new_value;
		}

		$outlet->save();

		if ( ! empty( $changes ) ) {
			\Readypos\Core\AuditLog::log(
				\Readypos\Core\AuditLog::EVENT_DATA,
				'outlet_updated',
				sprintf( 'Outlet #%d updated', $id ),
				array(
					'outlet_id' => $id,
					'changes'   => $changes,
					'user_id'   => $user_id_check,
				),
				\Readypos\Core\AuditLog::SEVERITY_INFO
			);
		}

		// Invalidate outlet caches
		$this->invalidate_cache( 'outlet', $id );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $this->format_outlet( $outlet ),
			),
			200
		);
	}

	/**
	 * Delete an outlet. Refuses if outlet still has registers or sessions.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_outlet( \WP_REST_Request $request ) {
		$user_id_check = Validator::require_authenticated();
		if ( is_wp_error( $user_id_check ) ) {
			return $user_id_check;
		}

		$id = Validator::required_int( $request->get_param( 'id' ), __( 'Outlet ID', 'ready-pos-for-woocommerce' ) );
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$outlet = POSOutlet::find( $id );
		if ( ! $outlet ) {
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		// Refuse to delete if outlet has any registers — safer than cascade.
		$register_count = POSRegister::where( 'outlet_id', $id )->count();
		if ( $register_count > 0 ) {
			return new \WP_Error(
				'cannot_delete_outlet_with_registers',
				sprintf(
					/* translators: %d: number of registers */
					_n(
						'Cannot delete outlet: %d register still exists. Delete or move registers first.',
						'Cannot delete outlet: %d registers still exist. Delete or move registers first.',
						$register_count,
						'ready-pos-for-woocommerce'
					),
					$register_count
				),
				array( 'status' => 409, 'register_count' => $register_count )
			);
		}

		$name = $outlet->name;
		$outlet->delete();

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'outlet_deleted',
			sprintf( 'Outlet #%d (%s) deleted', $id, $name ),
			array(
				'outlet_id'   => $id,
				'outlet_name' => $name,
				'user_id'     => $user_id_check,
			),
			\Readypos\Core\AuditLog::SEVERITY_WARNING
		);

		$this->invalidate_cache( 'outlet', $id );
		$this->invalidate_cache( 'register' );

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Create a register.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_register( \WP_REST_Request $request ) {
		$user_id_check = Validator::require_authenticated();
		if ( is_wp_error( $user_id_check ) ) {
			return $user_id_check;
		}

		$outlet_id = Validator::required_int( $request->get_param( 'outlet_id' ), __( 'Outlet', 'ready-pos-for-woocommerce' ) );
		if ( is_wp_error( $outlet_id ) ) {
			return $outlet_id;
		}

		$name = Validator::required_string( $request->get_param( 'name' ), __( 'Register name', 'ready-pos-for-woocommerce' ), 191 );
		if ( is_wp_error( $name ) ) {
			return $name;
		}

		$code = Validator::optional_slug( $request->get_param( 'code' ), 32 );

		// Validate outlet exists
		if ( ! POSOutlet::find( $outlet_id ) ) {
			return new \WP_Error( 'outlet_not_found', __( 'Outlet not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404, 'field' => 'outlet_id' ) );
		}

		// GPL version limit: only 1 register per outlet allowed.
		if ( (int) POSRegister::where( 'outlet_id', (int) $outlet_id )->count() >= 1 ) {
			return new \WP_Error(
				'register_limit_reached',
				__( 'The free version of Ready POS allows only 1 register per outlet. Upgrade to Pro to add more registers.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		// Duplicate name check per outlet
		if ( POSRegister::name_exists_in_outlet( $name, $outlet_id ) ) {
			return new \WP_Error(
				'duplicate_register_name',
				__( 'A register with this name already exists in this outlet.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'name' )
			);
		}

		if ( '' !== $code && POSRegister::code_exists_in_outlet( $code, $outlet_id ) ) {
			return new \WP_Error(
				'duplicate_register_code',
				__( 'A register with this code already exists in this outlet.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'code' )
			);
		}

		$register = POSRegister::create(
			array(
				'outlet_id' => $outlet_id,
				'name'      => $name,
				'code'      => $code,
				'status'    => POSRegister::STATUS_CLOSED,
			)
		);

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'register_created',
			sprintf( 'Register #%d (%s) created in outlet #%d', $register->id, $name, $outlet_id ),
			array(
				'register_id' => $register->id,
				'outlet_id'   => $outlet_id,
				'name'        => $name,
				'code'        => $code,
				'user_id'     => $user_id_check,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		// Invalidate register caches
		$this->invalidate_cache( 'register' );
		$this->invalidate_cache( 'outlet', $outlet_id );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'id'      => $register->id,
				'data'    => $this->format_register( $register ),
			),
			201
		);
	}

	/**
	 * Update a register.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_register( \WP_REST_Request $request ) {
		$user_id_check = Validator::require_authenticated();
		if ( is_wp_error( $user_id_check ) ) {
			return $user_id_check;
		}

		$id = Validator::required_int( $request->get_param( 'id' ), __( 'Register ID', 'ready-pos-for-woocommerce' ) );
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$name = Validator::required_string( $request->get_param( 'name' ), __( 'Register name', 'ready-pos-for-woocommerce' ), 191 );
		if ( is_wp_error( $name ) ) {
			return $name;
		}

		$register = POSRegister::find( $id );
		if ( ! $register ) {
			return new \WP_Error( 'not_found', __( 'Register not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		// Duplicate check excluding self
		if ( POSRegister::name_exists_in_outlet( $name, (int) $register->outlet_id, $id ) ) {
			return new \WP_Error(
				'duplicate_register_name',
				__( 'A register with this name already exists in this outlet.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'name' )
			);
		}

		$code = Validator::optional_slug( $request->get_param( 'code' ), 32 );
		if ( '' !== $code && POSRegister::code_exists_in_outlet( $code, (int) $register->outlet_id, $id ) ) {
			return new \WP_Error(
				'duplicate_register_code',
				__( 'A register with this code already exists in this outlet.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'code' )
			);
		}

		$changes = array();
		if ( (string) $register->name !== $name ) {
			$changes['name'] = array( 'from' => (string) $register->name, 'to' => $name );
		}
		if ( (string) $register->code !== $code ) {
			$changes['code'] = array( 'from' => (string) $register->code, 'to' => $code );
		}

		$register->name = $name;
		$register->code = $code;
		$register->save();

		if ( ! empty( $changes ) ) {
			\Readypos\Core\AuditLog::log(
				\Readypos\Core\AuditLog::EVENT_DATA,
				'register_updated',
				sprintf( 'Register #%d updated', $id ),
				array(
					'register_id' => $id,
					'outlet_id'   => (int) $register->outlet_id,
					'changes'     => $changes,
					'user_id'     => $user_id_check,
				),
				\Readypos\Core\AuditLog::SEVERITY_INFO
			);
		}

		// Invalidate register caches
		$this->invalidate_cache( 'register' );
		$this->invalidate_cache( 'outlet', $register->outlet_id );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $this->format_register( $register ),
			),
			200
		);
	}

	/**
	 * Delete a register.
	 *
	 * Refuses if:
	 *  - the register is the only one in its outlet, OR
	 *  - the register is the outlet's default_register_id, OR
	 *  - the register has an open session
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_register( \WP_REST_Request $request ) {
		$user_id_check = Validator::require_authenticated();
		if ( is_wp_error( $user_id_check ) ) {
			return $user_id_check;
		}

		$id = Validator::required_int( $request->get_param( 'id' ), __( 'Register ID', 'ready-pos-for-woocommerce' ) );
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$register = POSRegister::find( $id );
		if ( ! $register ) {
			return new \WP_Error( 'not_found', __( 'Register not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		$outlet_id     = (int) $register->outlet_id;
		$sibling_count = POSRegister::where( 'outlet_id', $outlet_id )->count();
		if ( $sibling_count <= 1 ) {
			return new \WP_Error( 'cannot_delete', __( 'You cannot delete the only register of an outlet.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		// Refuse if this is the outlet's default register
		$outlet = POSOutlet::find( $outlet_id );
		if ( $outlet && (int) $outlet->default_register_id === $id ) {
			return new \WP_Error(
				'cannot_delete_default_register',
				__( 'This is the default register for its outlet. Change the default register first.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'default_register_id' )
			);
		}

		// Refuse if the register is currently open
		if ( POSRegister::STATUS_OPEN === $register->status ) {
			return new \WP_Error(
				'cannot_delete_open_register',
				__( 'Cannot delete a register that is currently open. Close the session first.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'field' => 'status' )
			);
		}

		$register_name = $register->name;
		$register->delete();

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'register_deleted',
			sprintf( 'Register #%d (%s) deleted from outlet #%d', $id, $register_name, $outlet_id ),
			array(
				'register_id'   => $id,
				'register_name' => $register_name,
				'outlet_id'     => $outlet_id,
				'user_id'       => $user_id_check,
			),
			\Readypos\Core\AuditLog::SEVERITY_WARNING
		);

		// Invalidate register caches
		$this->invalidate_cache( 'register' );
		$this->invalidate_cache( 'outlet', $outlet_id );

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Toggle a register's status (active/inactive). Does not affect open/closed
	 * state of a session — that is managed via /sessions/open and /sessions/close.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_register_status( \WP_REST_Request $request ) {
		$user_id_check = Validator::require_authenticated();
		if ( is_wp_error( $user_id_check ) ) {
			return $user_id_check;
		}

		$id = Validator::required_int( $request->get_param( 'id' ), __( 'Register ID', 'ready-pos-for-woocommerce' ) );
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$status = Validator::enum(
			$request->get_param( 'status' ),
			array( POSRegister::STATUS_ACTIVE, POSRegister::STATUS_INACTIVE, POSRegister::STATUS_OPEN, POSRegister::STATUS_CLOSED ),
			__( 'Status', 'ready-pos-for-woocommerce' ),
			true
		);
		if ( is_wp_error( $status ) ) {
			return $status;
		}

		$register = POSRegister::find( $id );
		if ( ! $register ) {
			return new \WP_Error( 'not_found', __( 'Register not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		$previous = (string) $register->status;
		$register->status = $status;
		$register->save();

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'register_status_changed',
			sprintf( 'Register #%d status changed from %s to %s', $id, $previous, $status ),
			array(
				'register_id' => $id,
				'outlet_id'   => (int) $register->outlet_id,
				'from'        => $previous,
				'to'          => $status,
				'user_id'     => $user_id_check,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		$this->invalidate_cache( 'register' );
		$this->invalidate_cache( 'outlet', (int) $register->outlet_id );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $this->format_register( $register ),
			),
			200
		);
	}

	/**
	 * List all registers for an outlet.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function list_registers( \WP_REST_Request $request ) {
		$id = Validator::required_int( $request->get_param( 'id' ), __( 'Outlet ID', 'ready-pos-for-woocommerce' ) );
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$outlet = POSOutlet::find( $id );
		if ( ! $outlet ) {
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		$registers = POSRegister::where( 'outlet_id', $id )->orderBy( 'name' )->get();
		$data      = array();
		foreach ( $registers as $register ) {
			$data[] = $this->format_register( $register );
		}

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $data,
				'total'   => count( $data ),
			),
			200
		);
	}

	/**
	 * Get aggregate stats for a single outlet.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_outlet_stats( \WP_REST_Request $request ) {
		global $wpdb;

		$id = Validator::required_int( $request->get_param( 'id' ), __( 'Outlet ID', 'ready-pos-for-woocommerce' ) );
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$outlet = POSOutlet::find( $id );
		if ( ! $outlet ) {
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		$register_table = $wpdb->prefix . 'readypos_registers';
		$reg_stats = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*) AS total,
					SUM(CASE WHEN status = %s THEN 1 ELSE 0 END) AS active,
					SUM(CASE WHEN status = %s THEN 1 ELSE 0 END) AS open
				FROM {$register_table}
				WHERE outlet_id = %d",
				POSRegister::STATUS_ACTIVE,
				POSRegister::STATUS_OPEN,
				$id
			),
			ARRAY_A
		);
		$register_count   = (int) ( $reg_stats['total'] ?? 0 );
		$active_registers = (int) ( $reg_stats['active'] ?? 0 );
		$open_registers   = (int) ( $reg_stats['open'] ?? 0 );

		// Session stats
		$session_table = $wpdb->prefix . 'readypos_sessions';
		$session_stats = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*) AS total_sessions,
					SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_sessions,
					COALESCE(SUM(total_sales), 0) AS total_sales,
					COALESCE(SUM(total_orders), 0) AS total_orders
				FROM {$session_table}
				WHERE outlet_id = %d",
				$id
			),
			ARRAY_A
		);

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => array(
					'outlet_id'        => $id,
					'outlet_name'      => $outlet->name,
					'status'           => (string) $outlet->status,
					'register_count'   => (int) $register_count,
					'active_registers' => (int) $active_registers,
					'open_registers'   => (int) $open_registers,
					'total_sessions'   => isset( $session_stats['total_sessions'] ) ? (int) $session_stats['total_sessions'] : 0,
					'open_sessions'    => isset( $session_stats['open_sessions'] ) ? (int) $session_stats['open_sessions'] : 0,
					'total_sales'      => isset( $session_stats['total_sales'] ) ? (float) $session_stats['total_sales'] : 0.0,
					'total_orders'     => isset( $session_stats['total_orders'] ) ? (int) $session_stats['total_orders'] : 0,
				),
			),
			200
		);
	}

	/**
	 * Format an outlet model for API output.
	 *
	 * @param POSOutlet $outlet Outlet model.
	 * @return array
	 */
	private function format_outlet( POSOutlet $outlet ) {
		return array(
			'id'                 => (int) $outlet->id,
			'name'               => (string) $outlet->name,
			'code'               => (string) $outlet->code,
			'address'            => (string) $outlet->address,
			'city'               => (string) $outlet->city,
			'state'              => (string) $outlet->state,
			'zip_code'           => (string) $outlet->zip_code,
			'country'            => (string) $outlet->country,
			'phone'              => (string) $outlet->phone,
			'email'              => (string) $outlet->email,
			'manager_id'         => (int) $outlet->manager_id,
			'default_register_id' => (int) $outlet->default_register_id,
			'status'             => (string) $outlet->status,
			'receipt_header'     => (string) $outlet->receipt_header,
			'receipt_footer'     => (string) $outlet->receipt_footer,
		);
	}

	/**
	 * Filter the outlet attributes to only columns that actually exist in the
	 * readypos_outlets table. Protects against "Column not found" 500s when
	 * an installation is missing the AddOutletConfiguration migration.
	 *
	 * @param array $data Raw attribute array.
	 * @return array
	 */
	private function filter_outlet_columns( array $data ) {
		global $wpdb;

		$existing = $wpdb->get_col(
			$wpdb->prepare( 'SHOW COLUMNS FROM %i', $wpdb->prefix . 'readypos_outlets' )
		);
		if ( ! is_array( $existing ) || empty( $existing ) ) {
			// If the table doesn't exist yet, only set the truly minimal fields.
			return array_intersect_key( $data, array_flip( array( 'name', 'status' ) ) );
		}

		return array_intersect_key( $data, array_flip( $existing ) );
	}

	/**
	 * Format a register model for API output.
	 *
	 * @param POSRegister $register Register model.
	 * @return array
	 */
	private function format_register( POSRegister $register ) {
		return array(
			'id'        => (int) $register->id,
			'outlet_id' => (int) $register->outlet_id,
			'name'      => (string) $register->name,
			'code'      => (string) $register->code,
			'status'    => (string) $register->status,
		);
	}

	/**
	 * Get WooCommerce tax rates.
	 *
	 * @return array
	 */
	private function get_wc_tax_rates() {
		if ( ! class_exists( 'WC_Tax' ) ) {
			return array();
		}

		$tax_classes   = \WC_Tax::get_tax_classes();
		$classes       = array_merge( array( '' ), $tax_classes );
		$formatted_rates = array();

		foreach ( $classes as $class ) {
			$rates = \WC_Tax::get_rates_for_tax_class( $class );
			foreach ( $rates as $rate ) {
				$formatted_rates[] = array(
					'id'    => $rate->tax_rate_id,
					'name'  => $rate->tax_rate_name,
					'rate'  => floatval( $rate->tax_rate ),
					'class' => $class ?: 'standard',
				);
			}
		}

		return $formatted_rates;
	}

	/**
	 * Get outlet-specific configuration.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_outlet_config( \WP_REST_Request $request ) {
		$id = intval( $request->get_param( 'id' ) );

		$outlet = POSOutlet::find( $id );
		if ( ! $outlet ) {
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		$config = array(
			'id'              => $outlet->id,
			'name'            => $outlet->name,
			'pricing_config'  => $outlet->get_pricing_config(),
			'tax_config'      => $outlet->get_tax_config(),
			'payment_methods' => $outlet->get_payment_methods(),
		);

		return new \WP_REST_Response( $config, 200 );
	}

	/**
	 * Update outlet-specific configuration.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_outlet_config( \WP_REST_Request $request ) {
		$id = intval( $request->get_param( 'id' ) );

		$outlet = POSOutlet::find( $id );
		if ( ! $outlet ) {
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		// Update pricing configuration
		$pricing_config = $request->get_param( 'pricing_config' );
		if ( is_array( $pricing_config ) ) {
			$outlet->set_pricing_config( $pricing_config );
		}

		// Update tax configuration
		$tax_config = $request->get_param( 'tax_config' );
		if ( is_array( $tax_config ) ) {
			$outlet->set_tax_config( $tax_config );
		}

		// Update payment methods
		$payment_methods = $request->get_param( 'payment_methods' );
		if ( is_array( $payment_methods ) ) {
			$outlet->set_payment_methods( $payment_methods );
		}

		$outlet->updated_at = current_time( 'mysql' );
		$outlet->save();

		// Audit log
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'outlet_config_updated',
			sprintf( 'Configuration updated for outlet: %s', $outlet->name ),
			array(
				'outlet_id'       => $outlet->id,
				'outlet_name'     => $outlet->name,
				'has_pricing'     => ! empty( $pricing_config ),
				'has_tax_config'  => ! empty( $tax_config ),
				'payment_methods' => $payment_methods,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Outlet configuration updated successfully.', 'ready-pos-for-woocommerce' ),
			),
			200
		);
	}
}
