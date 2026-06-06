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
use Readypos\Core\License;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles CRUD operations for POS settings, store outlets, and registers.
 *
 * @package Readypos\Controllers\Settings
 */
class Actions {

	/**
	 * Get POS general, receipt, and payment settings.
	 *
	 * @return \WP_REST_Response
	 */
	public function get() {
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
			'receipt_header'  => get_option( 'readypos_receipt_header', get_bloginfo( 'name' ) ),
			'receipt_footer'  => get_option( 'readypos_receipt_footer', 'Thank you for shopping with us!' ),
			'receipt_paper_width' => get_option( 'readypos_receipt_paper_width', '80mm' ),
			'print_barcode'   => get_option( 'readypos_print_barcode', 'yes' ),
			'receipt_blocks'  => json_decode( get_option( 'readypos_receipt_blocks', '[]' ), true ),
			'receipt_printing_method' => get_option( 'readypos_receipt_printing_method', 'auto' ),
			'printer_connection_type' => get_option( 'readypos_printer_connection_type', 'serial' ),
			'printer_auto_reconnect' => get_option( 'readypos_printer_auto_reconnect', 'yes' ),
			'printer_network_address' => get_option( 'readypos_printer_network_address', '' ),
			'star_webprnt_url' => get_option( 'readypos_star_webprnt_url', '' ),
			// Payment Settings
			'payment_cash'    => get_option( 'readypos_payment_cash', 'yes' ),
			'payment_card'    => get_option( 'readypos_payment_card', 'yes' ),
			'pos_cash_gateway' => get_option( 'readypos_pos_cash_gateway', 'cod' ),
			'pos_card_gateway' => get_option( 'readypos_pos_card_gateway', 'stripe' ),
			// Terminal Settings
			'keyboard_status' => get_option( 'readypos_keyboard_status', 'yes' ),
			'cash_drawer_pulse' => get_option( 'readypos_cash_drawer_pulse', 'none' ),
			'customer_display_message' => get_option( 'readypos_customer_display_message', 'Welcome to our store!' ),
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
		$receipt_header  = sanitize_text_field( $request->get_param( 'receipt_header' ) );
		$receipt_footer  = sanitize_text_field( $request->get_param( 'receipt_footer' ) );
		$receipt_paper_width = sanitize_text_field( $request->get_param( 'receipt_paper_width' ) );
		$print_barcode   = sanitize_text_field( $request->get_param( 'print_barcode' ) );
		$receipt_blocks  = $request->get_param( 'receipt_blocks' );
		$receipt_printing_method = sanitize_text_field( $request->get_param( 'receipt_printing_method' ) );
		$printer_connection_type = sanitize_text_field( $request->get_param( 'printer_connection_type' ) );
		$printer_auto_reconnect = sanitize_text_field( $request->get_param( 'printer_auto_reconnect' ) );
		$printer_network_address = sanitize_text_field( $request->get_param( 'printer_network_address' ) );
		$star_webprnt_url = esc_url_raw( $request->get_param( 'star_webprnt_url' ) );

		// Payment Settings
		$payment_cash    = sanitize_text_field( $request->get_param( 'payment_cash' ) );
		$payment_card    = sanitize_text_field( $request->get_param( 'payment_card' ) );
		$pos_cash_gateway = sanitize_text_field( $request->get_param( 'pos_cash_gateway' ) );
		$pos_card_gateway = sanitize_text_field( $request->get_param( 'pos_card_gateway' ) );

		// Terminal Settings
		$keyboard_status = sanitize_text_field( $request->get_param( 'keyboard_status' ) );
		$cash_drawer_pulse = sanitize_text_field( $request->get_param( 'cash_drawer_pulse' ) );
		$customer_display_message = sanitize_text_field( $request->get_param( 'customer_display_message' ) );
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
		update_option( 'readypos_receipt_header', $receipt_header );
		update_option( 'readypos_receipt_footer', $receipt_footer );
		update_option( 'readypos_receipt_paper_width', $receipt_paper_width ?: '80mm' );
		update_option( 'readypos_print_barcode', $print_barcode );
		if ( is_array( $receipt_blocks ) ) {
			update_option( 'readypos_receipt_blocks', wp_json_encode( $receipt_blocks ) );
		}
		update_option( 'readypos_receipt_printing_method', $receipt_printing_method ?: 'auto' );
		update_option( 'readypos_printer_connection_type', $printer_connection_type ?: 'serial' );
		update_option( 'readypos_printer_auto_reconnect', $printer_auto_reconnect ?: 'yes' );
		update_option( 'readypos_printer_network_address', $printer_network_address );
		update_option( 'readypos_star_webprnt_url', $star_webprnt_url );

		// Update Payment Settings
		update_option( 'readypos_payment_cash', $payment_cash );
		update_option( 'readypos_payment_card', $payment_card );
		update_option( 'readypos_pos_cash_gateway', $pos_cash_gateway ?: 'cod' );
		update_option( 'readypos_pos_card_gateway', $pos_card_gateway ?: 'stripe' );

		// Update Terminal Settings
		update_option( 'readypos_keyboard_status', $keyboard_status );
		update_option( 'readypos_cash_drawer_pulse', $cash_drawer_pulse );
		update_option( 'readypos_customer_display_message', $customer_display_message ?: 'Welcome to our store!' );
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

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Get WooCommerce active payment gateways.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_payment_methods() {
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
	}

	/**
	 * Get outlets with registers.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_outlets() {
		$outlets = POSOutlet::all();
		$data    = array();

		foreach ( $outlets as $outlet ) {
			$registers = POSRegister::where( 'outlet_id', $outlet->id )->get();
			$regs      = array();

			foreach ( $registers as $reg ) {
				$regs[] = array(
					'id'     => $reg->id,
					'name'   => $reg->name,
					'status' => $reg->status,
				);
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
	}

	/**
	 * Create an outlet.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function create_outlet( \WP_REST_Request $request ) {
		// Enforce outlet quota for Free plan.
		$current_outlets = POSOutlet::count();
		$quota_check     = License::require_quota( 'outlets', $current_outlets );
		if ( $quota_check ) {
			return $quota_check;
		}

		$name           = sanitize_text_field( $request->get_param( 'name' ) );
		$address        = sanitize_text_field( $request->get_param( 'address' ) );
		$phone          = sanitize_text_field( $request->get_param( 'phone' ) );
		$email          = sanitize_email( $request->get_param( 'email' ) );
		$receipt_header = sanitize_text_field( $request->get_param( 'receipt_header' ) );
		$receipt_footer = sanitize_text_field( $request->get_param( 'receipt_footer' ) );

		$outlet = POSOutlet::create(
			array(
				'name'           => $name,
				'address'        => $address,
				'phone'          => $phone,
				'email'          => $email,
				'receipt_header' => $receipt_header,
				'receipt_footer' => $receipt_footer,
				'status'         => 'active',
			)
		);

		// Also create a default register for it
		POSRegister::create(
			array(
				'outlet_id' => $outlet->id,
				'name'      => __( 'Register 1', 'ready-pos' ),
				'status'    => 'closed',
			)
		);

		return new \WP_REST_Response( array( 'success' => true, 'id' => $outlet->id ), 200 );
	}

	/**
	 * Update an outlet.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_outlet( \WP_REST_Request $request ) {
		$id             = intval( $request->get_param( 'id' ) );
		$name           = sanitize_text_field( $request->get_param( 'name' ) );
		$address        = sanitize_text_field( $request->get_param( 'address' ) );
		$phone          = sanitize_text_field( $request->get_param( 'phone' ) );
		$email          = sanitize_email( $request->get_param( 'email' ) );
		$receipt_header = sanitize_text_field( $request->get_param( 'receipt_header' ) );
		$receipt_footer = sanitize_text_field( $request->get_param( 'receipt_footer' ) );

		$outlet = POSOutlet::find( $id );
		if ( ! $outlet ) {
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$outlet->name           = $name;
		$outlet->address        = $address;
		$outlet->phone          = $phone;
		$outlet->email          = $email;
		$outlet->receipt_header = $receipt_header;
		$outlet->receipt_footer = $receipt_footer;
		$outlet->save();

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Create a register.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_register( \WP_REST_Request $request ) {
		// Enforce registers quota for Free plan.
		$current_registers = POSRegister::count();
		$quota_check       = License::require_quota( 'registers', $current_registers );
		if ( $quota_check ) {
			return $quota_check;
		}

		$outlet_id = intval( $request->get_param( 'outlet_id' ) );
		$name      = sanitize_text_field( $request->get_param( 'name' ) );

		if ( ! $outlet_id ) {
			return new \WP_Error( 'bad_request', __( 'Outlet ID is required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		if ( empty( $name ) ) {
			return new \WP_Error( 'bad_request', __( 'Register name is required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$register = POSRegister::create(
			array(
				'outlet_id' => $outlet_id,
				'name'      => $name,
				'status'    => 'closed',
			)
		);

		return new \WP_REST_Response( array( 'success' => true, 'id' => $register->id ), 200 );
	}

	/**
	 * Update a register.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_register( \WP_REST_Request $request ) {
		$id   = intval( $request->get_param( 'id' ) );
		$name = sanitize_text_field( $request->get_param( 'name' ) );

		if ( empty( $name ) ) {
			return new \WP_Error( 'bad_request', __( 'Register name is required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$register = POSRegister::find( $id );
		if ( ! $register ) {
			return new \WP_Error( 'not_found', __( 'Register not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$register->name = $name;
		$register->save();

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Delete a register.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_register( \WP_REST_Request $request ) {
		$id = intval( $request->get_param( 'id' ) );

		$register = POSRegister::find( $id );
		if ( ! $register ) {
			return new \WP_Error( 'not_found', __( 'Register not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		// Ensure we don't delete the only register or a default register in an outlet easily if it's the last one
		$outlet_id = $register->outlet_id;
		$sibling_count = POSRegister::where( 'outlet_id', $outlet_id )->count();
		if ( $sibling_count <= 1 ) {
			return new \WP_Error( 'cannot_delete', __( 'You cannot delete the only register of an outlet.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$register->delete();

		return new \WP_REST_Response( array( 'success' => true ), 200 );
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
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos' ), array( 'status' => 404 ) );
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
			return new \WP_Error( 'not_found', __( 'Outlet not found.', 'ready-pos' ), array( 'status' => 404 ) );
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
				'message' => __( 'Outlet configuration updated successfully.', 'ready-pos' ),
			),
			200
		);
	}
}
