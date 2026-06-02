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
 * Handles creation and removal of custom POS roles (Cashier, POS Manager).
 *
 * @package Readypos\Core
 */
class Roles {

	use Base;

	/**
	 * Initialize role-related hooks.
	 *
	 * @return void
	 */
	public function init() {
		add_filter( 'login_redirect', array( $this, 'pos_login_redirect' ), 10, 3 );
		
		// Allow POS users to access admin without edit_posts capability
		add_filter( 'user_has_cap', array( $this, 'allow_pos_user_admin_access' ), 10, 3 );
	}

	/**
	 * Add admin access capability for POS roles.
	 *
	 * @param array $all_caps All capabilities for the user.
	 * @param string $cap Capability being checked.
	 * @param array $args Capability arguments.
	 * @return array Modified capabilities.
	 */
	public function allow_pos_user_admin_access( $all_caps, $cap, $args ) {
		// Only modify for POS users
		if ( ! isset( $all_caps['use_pos'] ) || ! $all_caps['use_pos'] ) {
			return $all_caps;
		}
		
		// Add the required capability for admin access
		$all_caps['edit_posts'] = true;
		
		return $all_caps;
	}

	/**
	 * Redirect POS users to appropriate pages after login.
	 *
	 * @param string $redirect_to URL to redirect to.
	 * @param string $request Requested redirect URL.
	 * @param object $user WP_User object.
	 * @return string Modified redirect URL.
	 */
	public function pos_login_redirect( $redirect_to, $request, $user ) {
		// Check if user has POS roles
		if ( isset( $user->roles ) && is_array( $user->roles ) ) {
			// POS Cashier - redirect to terminal (locked view)
			if ( in_array( 'pos_cashier', $user->roles, true ) ) {
				return admin_url( 'admin.php?page=ready-pos#/terminal' );
			}
			
			// POS Manager - redirect to dashboard (full access)
			if ( in_array( 'pos_manager', $user->roles, true ) ) {
				return admin_url( 'admin.php?page=ready-pos#/dashboard' );
			}
		}
		return $redirect_to;
	}

	/**
	 * Register custom POS roles.
	 *
	 * @return void
	 */
	public function register_roles() {
		// POS Cashier Role
		add_role(
			'pos_cashier',
			__( 'POS Cashier', 'ready-pos' ),
			array(
				'read'               => true,
				'edit_dashboard'     => true,
				'upload_files'       => true,
				'level_0'            => true,
				'use_pos'            => true,
				'edit_posts'         => false,
				'delete_posts'       => false,
				'publish_posts'      => false,
				'manage_options'     => false,
				'read_private_posts' => false,
			)
		);

		// Ensure POS cashier can access admin pages (wp-admin)
		$cashier = get_role( 'pos_cashier' );
		if ( $cashier ) {
			$cashier->add_cap( 'exist' ); // Required for accessing admin
		}

		// POS Manager Role
		add_role(
			'pos_manager',
			__( 'POS Manager', 'ready-pos' ),
			array(
				'read'               => true,
				'use_pos'            => true,
				'manage_pos'         => true,
				'view_pos_reports'   => true,
				'edit_posts'         => false,
				'delete_posts'       => false,
				'publish_posts'      => false,
				'manage_options'     => false,
			)
		);

		// Add POS capabilities to Administrator & Shop Manager
		$admin = get_role( 'administrator' );
		if ( $admin ) {
			$admin->add_cap( 'use_pos' );
			$admin->add_cap( 'manage_pos' );
			$admin->add_cap( 'view_pos_reports' );
		}

		$shop_manager = get_role( 'shop_manager' );
		if ( $shop_manager ) {
			$shop_manager->add_cap( 'use_pos' );
			$shop_manager->add_cap( 'manage_pos' );
			$shop_manager->add_cap( 'view_pos_reports' );
		}
	}

	/**
	 * Ensure POS cashier has proper admin access capabilities.
	 * Called during activation and when refreshing roles.
	 *
	 * @return void
	 */
	public function refresh_pos_cashier_caps() {
		$cashier = get_role( 'pos_cashier' );
		if ( $cashier ) {
			// Ensure all admin access capabilities are present
			$cashier->add_cap( 'read' );
			$cashier->add_cap( 'edit_dashboard' );
			$cashier->add_cap( 'upload_files' );
			$cashier->add_cap( 'edit_posts' );
			$cashier->add_cap( 'use_pos' );
		}
	}

	/**
	 * Remove POS roles.
	 *
	 * @return void
	 */
	public function remove_roles() {
		remove_role( 'pos_cashier' );
		remove_role( 'pos_manager' );

		// Remove POS capabilities from Administrator & Shop Manager
		$admin = get_role( 'administrator' );
		if ( $admin ) {
			$admin->remove_cap( 'use_pos' );
			$admin->remove_cap( 'manage_pos' );
			$admin->remove_cap( 'view_pos_reports' );
		}

		$shop_manager = get_role( 'shop_manager' );
		if ( $shop_manager ) {
			$shop_manager->remove_cap( 'use_pos' );
			$shop_manager->remove_cap( 'manage_pos' );
			$shop_manager->remove_cap( 'view_pos_reports' );
		}
	}
}
