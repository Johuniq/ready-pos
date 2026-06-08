<?php
/**
 * Cashier PIN login and management actions.
 *
 * Provides a secure PIN-based authentication system for POS terminals.
 * Cashiers set a 4-6 digit PIN from their profile. At the terminal, they
 * enter their PIN to "clock in" without going through WordPress login.
 *
 * The PIN is stored as a bcrypt hash in user meta — never in plain text.
 *
 * @package Readypos\Controllers\Cashier
 * @since 1.1.0
 */

namespace Readypos\Controllers\Cashier;

defined( 'ABSPATH' ) || exit;

class Actions {

	const PIN_META_KEY = '_readypos_cashier_pin';

	/**
	 * Initialize session if needed.
	 *
	 * @return void
	 */
	private static function init_session() {
		if ( session_status() === PHP_SESSION_NONE ) {
			session_start();
		}
	}

	/**
	 * Get the active cashier ID from the current session.
	 *
	 * Returns the cashier ID if a cashier has logged in via PIN,
	 * or the current WordPress user ID as a fallback.
	 *
	 * @return int User ID of the active cashier.
	 */
	public static function get_active_cashier_id() {
		self::init_session();

		// If a cashier has logged in via PIN, use that ID
		if ( ! empty( $_SESSION['readypos_active_cashier_id'] ) ) {
			return intval( $_SESSION['readypos_active_cashier_id'] );
		}

		// Otherwise, use the WordPress authenticated user
		return get_current_user_id();
	}

	/**
	 * Get information about the active cashier session.
	 *
	 * @return array|null Session info or null if no cashier session.
	 */
	public static function get_cashier_session_info() {
		self::init_session();

		if ( empty( $_SESSION['readypos_active_cashier_id'] ) ) {
			return null;
		}

		return array(
			'cashier_id'       => intval( $_SESSION['readypos_active_cashier_id'] ),
			'authenticated_by' => intval( $_SESSION['readypos_authenticated_by'] ?? 0 ),
			'login_time'       => intval( $_SESSION['readypos_cashier_login_time'] ?? 0 ),
		);
	}

	/**
	 * Clear the active cashier session.
	 *
	 * @return void
	 */
	public static function clear_cashier_session() {
		self::init_session();

		$cashier_id = self::get_active_cashier_id();

		unset( $_SESSION['readypos_active_cashier_id'] );
		unset( $_SESSION['readypos_cashier_login_time'] );
		unset( $_SESSION['readypos_authenticated_by'] );

		do_action( 'readypos_cashier_logout', $cashier_id );
	}

	/**
	 * Logout endpoint for cashier PIN session.
	 *
	 * Clears the active cashier from the session without logging out
	 * the WordPress user.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public function logout( \WP_REST_Request $request ) {
		self::clear_cashier_session();

		return new \WP_REST_Response(
			array( 'success' => true ),
			200
		);
	}

	/**
	 * Get all POS staff members (cashiers and POS managers only).
	 *
	 * Used by the Staff & Roles management page. Does NOT include
	 * administrators or shop managers — those are WordPress-level roles
	 * managed via the standard WP Users screen.
	 *
	 * @return \WP_REST_Response
	 */
	public function list_cashiers() {
		$users = get_users(
			array(
				'role__in' => array( 'pos_cashier', 'pos_manager' ),
				'orderby'  => 'display_name',
				'order'    => 'ASC',
			)
		);

		$cashiers = array();
		foreach ( $users as $user ) {
			$has_pin = ! empty( get_user_meta( $user->ID, self::PIN_META_KEY, true ) );

			$cashiers[] = array(
				'id'         => $user->ID,
				'name'       => $user->display_name,
				'email'      => $user->user_email,
				'avatar'     => get_avatar_url( $user->ID, array( 'size' => 96 ) ),
				'role'       => implode( ', ', $user->roles ),
				'has_pin'    => $has_pin,
			);
		}

		return new \WP_REST_Response( $cashiers, 200 );
	}

	/**
	 * Get all users available for PIN login on the terminal.
	 *
	 * Includes ALL users with `use_pos` capability who have a PIN set.
	 * This is used by the CashierLoginPanel (not the Staff management page).
	 *
	 * @return \WP_REST_Response
	 */
	public function login_list() {
		$users = get_users(
			array(
				'role__in' => array( 'pos_cashier', 'pos_manager', 'administrator', 'shop_manager' ),
				'orderby'  => 'display_name',
				'order'    => 'ASC',
			)
		);

		$result = array();
		foreach ( $users as $user ) {
			if ( ! user_can( $user, 'use_pos' ) ) {
				continue;
			}

			$has_pin = ! empty( get_user_meta( $user->ID, self::PIN_META_KEY, true ) );

			$result[] = array(
				'id'      => $user->ID,
				'name'    => $user->display_name,
				'avatar'  => get_avatar_url( $user->ID, array( 'size' => 96 ) ),
				'role'    => implode( ', ', $user->roles ),
				'has_pin' => $has_pin,
			);
		}

		return new \WP_REST_Response( $result, 200 );
	}

	/**
	 * Authenticate a cashier by PIN.
	 *
	 * SECURITY NOTE: This does NOT switch the WordPress user session.
	 * Instead, it validates the PIN and stores the cashier ID in the
	 * WordPress session for audit logging purposes only.
	 *
	 * The original logged-in user (admin/manager) remains authenticated
	 * at the WordPress level. The cashier identity is used solely for:
	 * - Audit trails (who processed the transaction)
	 * - Register session tracking
	 * - UI display purposes
	 *
	 * This approach is required by WordPress.org security guidelines.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function login( \WP_REST_Request $request ) {
		// SECURITY FIX #WP.ORG-3: Verify the requesting user is already authenticated
		// and has permission to access the POS terminal.
		if ( ! is_user_logged_in() ) {
			return new \WP_Error(
				'not_authenticated',
				__( 'You must be logged in to access the POS terminal.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 401 )
			);
		}

		// Only users with POS access can use the cashier login feature
		if ( ! current_user_can( 'use_pos' ) && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error(
				'insufficient_permissions',
				__( 'You do not have permission to access the POS terminal.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		// Verify nonce for CSRF protection
		$nonce = $request->get_header( 'X-WP-Nonce' );
		if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'invalid_nonce',
				__( 'Security check failed. Please refresh the page.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$user_id = intval( $request->get_param( 'userId' ) );
		$pin     = sanitize_text_field( $request->get_param( 'pin' ) );

		if ( ! $user_id || empty( $pin ) ) {
			return new \WP_Error(
				'invalid_input',
				__( 'User ID and PIN are required.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$user = get_userdata( $user_id );
		if ( ! $user || ! user_can( $user, 'use_pos' ) ) {
			return new \WP_Error(
				'invalid_user',
				__( 'User not found or does not have POS access.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		$stored_hash = get_user_meta( $user_id, self::PIN_META_KEY, true );
		if ( empty( $stored_hash ) ) {
			return new \WP_Error(
				'no_pin',
				__( 'This user has not set a PIN. Please set one from the user profile.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		// Verify PIN against stored bcrypt hash.
		if ( ! wp_check_password( $pin, $stored_hash ) ) {
			// Rate limiting: track failed attempts.
			$attempts_key = 'readypos_pin_attempts_' . $user_id;
			$attempts     = (int) get_transient( $attempts_key );
			$attempts++;
			set_transient( $attempts_key, $attempts, 15 * MINUTE_IN_SECONDS );

			if ( $attempts >= 5 ) {
				return new \WP_Error(
					'too_many_attempts',
					__( 'Too many failed attempts. Please wait 15 minutes.', 'ready-pos-for-woocommerce' ),
					array( 'status' => 429 )
				);
			}

			return new \WP_Error(
				'invalid_pin',
				__( 'Incorrect PIN. Please try again.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 401 )
			);
		}

		// Clear failed attempts on success.
		delete_transient( 'readypos_pin_attempts_' . $user_id );

		// SECURITY FIX #WP.ORG-3: Store active cashier ID in session (NOT wp_set_current_user)
		// The WordPress user remains unchanged. We only track who's using the terminal
		// for audit logging and UI display purposes.
		self::init_session();
		$_SESSION['readypos_active_cashier_id'] = $user_id;
		$_SESSION['readypos_cashier_login_time'] = time();
		$_SESSION['readypos_authenticated_by'] = get_current_user_id(); // Who authenticated this terminal

		// Log the cashier login for audit trail
		do_action( 'readypos_cashier_login', $user_id, get_current_user_id() );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'user'    => array(
					'id'       => $user->ID,
					'name'     => $user->display_name,
					'email'    => $user->user_email,
					'avatar'   => get_avatar_url( $user->ID, array( 'size' => 96 ) ),
					'roles'    => (array) $user->roles,
				),
				'license' => \Readypos\Core\License::frontend_data(),
			),
			200
		);
	}

	/**
	 * Set or update a cashier's PIN.
	 *
	 * Can be called by the user themselves or by an admin/manager.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function set_pin( \WP_REST_Request $request ) {
		$user_id = intval( $request->get_param( 'userId' ) );
		$pin     = sanitize_text_field( $request->get_param( 'pin' ) );

		if ( ! $user_id || empty( $pin ) ) {
			return new \WP_Error( 'invalid_input', __( 'User ID and PIN are required.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		// Validate PIN format: 4-6 digits only.
		if ( ! preg_match( '/^\d{4,6}$/', $pin ) ) {
			return new \WP_Error(
				'invalid_pin_format',
				__( 'PIN must be 4-6 digits.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		// Permission check: user can set their own PIN, or admin/manager can set anyone's.
		$current_user_id = get_current_user_id();
		if ( $current_user_id !== $user_id && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error( 'forbidden', __( 'You can only set your own PIN.', 'ready-pos-for-woocommerce' ), array( 'status' => 403 ) );
		}

		// Hash the PIN with bcrypt (same as WordPress passwords).
		$hash = wp_hash_password( $pin );
		update_user_meta( $user_id, self::PIN_META_KEY, $hash );

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Create a new staff member (WordPress user with POS role + optional PIN).
	 *
	 * Only admins and POS managers can create staff.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create( \WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error( 'forbidden', __( 'Permission denied.', 'ready-pos-for-woocommerce' ), array( 'status' => 403 ) );
		}

		$name     = sanitize_text_field( $request->get_param( 'name' ) );
		$email    = sanitize_email( $request->get_param( 'email' ) );
		$role     = sanitize_text_field( $request->get_param( 'role' ) ?: 'pos_cashier' );
		$password = $request->get_param( 'password' );
		$pin      = sanitize_text_field( $request->get_param( 'pin' ) );

		if ( empty( $name ) || empty( $email ) ) {
			return new \WP_Error( 'missing_fields', __( 'Name and email are required.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		if ( ! in_array( $role, array( 'pos_cashier', 'pos_manager' ), true ) ) {
			return new \WP_Error( 'invalid_role', __( 'Role must be pos_cashier or pos_manager.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		if ( email_exists( $email ) ) {
			return new \WP_Error( 'email_exists', __( 'A user with this email already exists.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		// Generate username from name.
		$username = sanitize_user( strtolower( str_replace( ' ', '_', $name ) ) );
		if ( username_exists( $username ) ) {
			$username .= wp_rand( 10, 99 );
		}

		// Create the WP user.
		$user_id = wp_create_user(
			$username,
			! empty( $password ) ? $password : wp_generate_password(),
			$email
		);

		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}

		wp_update_user(
			array(
				'ID'           => $user_id,
				'display_name' => $name,
				'first_name'   => explode( ' ', $name )[0],
				'last_name'    => implode( ' ', array_slice( explode( ' ', $name ), 1 ) ),
				'role'         => $role,
			)
		);

		// Set PIN if provided.
		if ( ! empty( $pin ) && preg_match( '/^\d{4,6}$/', $pin ) ) {
			$hash = wp_hash_password( $pin );
			update_user_meta( $user_id, self::PIN_META_KEY, $hash );
		}

		return new \WP_REST_Response(
			array(
				'success' => true,
				'user_id' => $user_id,
			),
			200
		);
	}

	/**
	 * Remove a cashier's PIN.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function remove_pin( \WP_REST_Request $request ) {
		$user_id = intval( $request->get_param( 'userId' ) );

		if ( ! $user_id ) {
			return new \WP_Error( 'invalid_input', __( 'User ID is required.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		$current_user_id = get_current_user_id();
		if ( $current_user_id !== $user_id && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error( 'forbidden', __( 'Permission denied.', 'ready-pos-for-woocommerce' ), array( 'status' => 403 ) );
		}

		delete_user_meta( $user_id, self::PIN_META_KEY );

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}
}
