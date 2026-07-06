<?php
/**
 * POS Roles and Capabilities management.
 *
 * @package Readypos\Core
 * @since 1.0.0
 */

namespace Readypos\Core;

use Readypos\Traits\Base;

/**
 * Class Roles
 *
 * Permission helper for the POS REST API. The plugin deliberately does
 * not introduce custom roles or custom capabilities anymore — access is
 * gated exclusively by the standard WordPress `manage_options`
 * capability, which only the built-in `administrator` role has.
 *
 * @package Readypos\Core
 */
class Roles {

	use Base;

	/**
	 * Capability required for any POS operation.
	 *
	 * Kept as a class constant so route registrations and menu
	 * registrations can reference a single source of truth without
	 * re-introducing plugin-specific capabilities.
	 *
	 * @var string
	 */
	const REQUIRED_CAP = 'manage_options';

	/**
	 * Strip any legacy POS capabilities from all roles.
	 *
	 * Called on uninstall as a safety net for sites that may have
	 * previously had the plugin's custom caps installed. Safe to call
	 * when the caps were never granted.
	 *
	 * @return void
	 */
	public function revoke_pos_caps() {
		$wp_roles = wp_roles();

		if ( ! $wp_roles ) {
			return;
		}

		foreach ( array( 'readypos_use_pos', 'readypos_manage_pos' ) as $legacy_cap ) {
			foreach ( $wp_roles->role_objects as $role ) {
				if ( $role && isset( $role->capabilities[ $legacy_cap ] ) ) {
					$role->remove_cap( $legacy_cap );
				}
			}
		}
	}

	/**
	 * Check if the current user has permission to access POS REST API.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return bool|\WP_Error True if user has access, WP_Error otherwise.
	 */
	public function check_pos_access( \WP_REST_Request $request ) {
		// Run SessionSecurity validation (fingerprint, expiration, idle timeout).
		if ( class_exists( '\Readypos\Core\SessionSecurity' ) ) {
			$validation = \Readypos\Core\SessionSecurity::validate_request();
			if ( is_wp_error( $validation ) ) {
				return $validation;
			}
		} elseif ( ! is_user_logged_in() ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'You must be logged in to access the POS API.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 401 )
			);
		}

		if ( current_user_can( self::REQUIRED_CAP ) ) {
			return true;
		}

		return new \WP_Error(
			'rest_forbidden',
			__( 'You do not have permission to access the POS API.', 'ready-pos-for-woocommerce' ),
			array( 'status' => 403 )
		);
	}
}
