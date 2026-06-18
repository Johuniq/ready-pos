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
 * Grants the `readypos_use_pos` / `readypos_manage_pos` capabilities to the built-in
 * WordPress roles that are allowed to operate the POS (Administrator
 * and Shop Manager). POS access is governed entirely by these
 * capabilities on the default WP roles.
 *
 * @package Readypos\Core
 */
class Roles {

	use Base;

	/**
	 * Capability granted to roles that can use the POS UI.
	 *
	 * @var string
	 */
	const CAP_USE_POS = 'readypos_use_pos';

	/**
	 * Capability granted to roles that can manage POS configuration.
	 *
	 * @var string
	 */
	const CAP_MANAGE_POS = 'readypos_manage_pos';

	/**
	 * Initialize role-related hooks.
	 *
	 * @return void
	 */
	public function init() {
		// Grant the POS caps to default WP roles on plugin init.
		// Safe to call repeatedly — $role->add_cap() is idempotent.
		add_action( 'init', array( $this, 'grant_pos_caps' ), 20 );
	}

	/**
	 * Grant the `readypos_use_pos` and `readypos_manage_pos` capabilities to the default
	 * WordPress roles that are allowed to operate the POS.
	 *
	 * @return void
	 */
	public function grant_pos_caps() {
		$wp_roles = wp_roles();

		if ( ! $wp_roles ) {
			return;
		}

		foreach ( array( 'administrator', 'shop_manager' ) as $role_name ) {
			$role = $wp_roles->get_role( $role_name );
			if ( $role ) {
				$role->add_cap( self::CAP_USE_POS );
				$role->add_cap( self::CAP_MANAGE_POS );
			}
		}
	}

	/**
	 * Remove the `readypos_use_pos` and `readypos_manage_pos` capabilities from the
	 * default WordPress roles. Called on plugin uninstall.
	 *
	 * @return void
	 */
	public function revoke_pos_caps() {
		$wp_roles = wp_roles();

		if ( ! $wp_roles ) {
			return;
		}

		foreach ( array( 'administrator', 'shop_manager' ) as $role_name ) {
			$role = $wp_roles->get_role( $role_name );
			if ( $role ) {
				$role->remove_cap( self::CAP_USE_POS );
				$role->remove_cap( self::CAP_MANAGE_POS );
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

		if ( current_user_can( self::CAP_USE_POS )
			|| current_user_can( self::CAP_MANAGE_POS )
			|| current_user_can( 'manage_options' )
		) {
			return true;
		}

		return new \WP_Error(
			'rest_forbidden',
			__( 'You do not have permission to access the POS API.', 'ready-pos-for-woocommerce' ),
			array( 'status' => 403 )
		);
	}
}
