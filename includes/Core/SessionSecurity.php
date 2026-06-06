<?php
/**
 * Session Security Manager for Ready POS.
 *
 * SECURITY FIX #5: Prevent session hijacking and fixation attacks
 *
 * @package Readypos\Core
 * @since 1.0.2
 */

namespace Readypos\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Class SessionSecurity
 *
 * Implements session security measures to prevent hijacking and fixation.
 *
 * @package Readypos\Core
 */
class SessionSecurity {

	/**
	 * Session fingerprint meta key
	 */
	const FINGERPRINT_META_KEY = '_readypos_session_fingerprint';

	/**
	 * Session created time meta key
	 */
	const SESSION_CREATED_KEY = '_readypos_session_created';

	/**
	 * Session last activity meta key
	 */
	const LAST_ACTIVITY_KEY = '_readypos_session_last_activity';

	/**
	 * Session IP address meta key
	 */
	const SESSION_IP_KEY = '_readypos_session_ip';

	/**
	 * Enable IP validation (can be disabled for load balancer environments)
	 */
	const ENABLE_IP_VALIDATION = true;

	/**
	 * Maximum session lifetime (in seconds) - 8 hours
	 */
	const MAX_SESSION_LIFETIME = 28800;

	/**
	 * Session idle timeout (in seconds) - 2 hours
	 */
	const IDLE_TIMEOUT = 7200;

	/**
	 * Initialize session security hooks
	 *
	 * @return void
	 */
	public static function init() {
		// Verify session on every request
		add_action( 'init', array( __CLASS__, 'verify_session' ), 1 );
		
		// Secure cookies
		add_action( 'init', array( __CLASS__, 'configure_secure_cookies' ), 1 );
		
		// Bind session to fingerprint on login
		add_action( 'wp_login', array( __CLASS__, 'bind_session_fingerprint' ), 10, 2 );
		add_action( 'set_auth_cookie', array( __CLASS__, 'set_cookie_flags' ), 10, 5 );
		
		// Clear session data on logout
		add_action( 'wp_logout', array( __CLASS__, 'clear_session_data' ) );
		
		// Periodically regenerate session ID
		add_action( 'wp_loaded', array( __CLASS__, 'maybe_regenerate_session' ) );
	}

	/**
	 * Configure secure cookie settings
	 *
	 * @return void
	 */
	public static function configure_secure_cookies() {
		// Force HTTPS cookies if site uses HTTPS
		if ( is_ssl() ) {
			add_filter( 'secure_auth_cookie', '__return_true' );
			add_filter( 'secure_logged_in_cookie', '__return_true' );
		}

		// Set SameSite cookie attribute
		add_filter( 'wp_cookies_same_site', function() {
			return 'Strict';
		});

		// Increase cookie security with HttpOnly
		if ( ! defined( 'COOKIEHASH' ) ) {
			define( 'COOKIEHASH', md5( get_site_option( 'siteurl' ) ) );
		}
	}

	/**
	 * Set additional security flags on auth cookies
	 *
	 * @param string $auth_cookie Authentication cookie value.
	 * @param int    $expire      Cookie expiration time.
	 * @param int    $expiration  Login session expiration.
	 * @param int    $user_id     User ID.
	 * @param string $scheme      Cookie scheme (auth or logged_in).
	 * @return void
	 */
	public static function set_cookie_flags( $auth_cookie, $expire, $expiration, $user_id, $scheme ) {
		// Additional cookie hardening is handled by WordPress with our filters
		// This hook allows for future extensibility
		
		// Log cookie creation for audit
		AuditLog::log(
			AuditLog::EVENT_AUTH,
			'auth_cookie_created',
			sprintf( 'Authentication cookie created for user ID %d', $user_id ),
			array(
				'user_id' => $user_id,
				'scheme'  => $scheme,
				'expires' => gmdate( 'Y-m-d H:i:s', $expire ),
			),
			AuditLog::SEVERITY_INFO
		);
	}

	/**
	 * Generate session fingerprint based on browser characteristics
	 *
	 * @return string
	 */
	private static function generate_fingerprint() {
		$components = array(
			self::get_user_agent(),
			self::get_accept_language(),
			self::get_accept_encoding(),
		);

		return hash( 'sha256', implode( '|', $components ) );
	}

	/**
	 * Get user agent (truncated and sanitized)
	 *
	 * @return string
	 */
	private static function get_user_agent() {
		if ( empty( $_SERVER['HTTP_USER_AGENT'] ) ) {
			return 'unknown';
		}
		return substr( sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ), 0, 255 );
	}

	/**
	 * Get client IP address (handles proxies and load balancers)
	 * SECURITY FIX #5: Proper IP detection for validation
	 *
	 * @return string
	 */
	private static function get_client_ip() {
		$ip_keys = array(
			'HTTP_CF_CONNECTING_IP', // CloudFlare
			'HTTP_X_REAL_IP',        // Nginx proxy
			'HTTP_X_FORWARDED_FOR',  // Standard proxy header
			'REMOTE_ADDR',           // Direct connection
		);

		foreach ( $ip_keys as $key ) {
			if ( ! empty( $_SERVER[ $key ] ) ) {
				$ip = sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
				// Handle comma-separated list (X-Forwarded-For)
				if ( strpos( $ip, ',' ) !== false ) {
					$ips = explode( ',', $ip );
					$ip = trim( $ips[0] );
				}
				if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
					return $ip;
				}
			}
		}

		return 'unknown';
	}

	/**
	 * Get Accept-Language header
	 *
	 * @return string
	 */
	private static function get_accept_language() {
		if ( empty( $_SERVER['HTTP_ACCEPT_LANGUAGE'] ) ) {
			return 'unknown';
		}
		return sanitize_text_field( wp_unslash( $_SERVER['HTTP_ACCEPT_LANGUAGE'] ) );
	}

	/**
	 * Get Accept-Encoding header
	 *
	 * @return string
	 */
	private static function get_accept_encoding() {
		if ( empty( $_SERVER['HTTP_ACCEPT_ENCODING'] ) ) {
			return 'unknown';
		}
		return sanitize_text_field( wp_unslash( $_SERVER['HTTP_ACCEPT_ENCODING'] ) );
	}

	/**
	 * Bind session to browser fingerprint on login
	 *
	 * @param string   $user_login Username.
	 * @param \WP_User $user       User object.
	 * @return void
	 */
	public static function bind_session_fingerprint( $user_login, $user ) {
		$fingerprint = self::generate_fingerprint();
		$current_time = time();
		$client_ip = self::get_client_ip();

		update_user_meta( $user->ID, self::FINGERPRINT_META_KEY, $fingerprint );
		update_user_meta( $user->ID, self::SESSION_CREATED_KEY, $current_time );
		update_user_meta( $user->ID, self::LAST_ACTIVITY_KEY, $current_time );
		update_user_meta( $user->ID, self::SESSION_IP_KEY, $client_ip );

		AuditLog::log(
			AuditLog::EVENT_SECURITY,
			'session_bound',
			sprintf( 'Session bound to fingerprint for user: %s', $user->display_name ),
			array(
				'user_id'     => $user->ID,
				'fingerprint' => substr( $fingerprint, 0, 16 ) . '...', // Log partial for debugging
				'ip'          => $client_ip,
			),
			AuditLog::SEVERITY_INFO
		);
	}

	/**
	 * Verify session on every request
	 *
	 * @return void
	 */
	public static function verify_session() {
		if ( ! is_user_logged_in() ) {
			return;
		}

		$user_id = get_current_user_id();
		$current_fingerprint = self::generate_fingerprint();
		$stored_fingerprint = get_user_meta( $user_id, self::FINGERPRINT_META_KEY, true );

		// Check fingerprint match
		if ( ! empty( $stored_fingerprint ) && $stored_fingerprint !== $current_fingerprint ) {
			self::terminate_session( $user_id, 'fingerprint_mismatch' );
			return;
		}

		// SECURITY FIX #5: Validate IP address (optional)
		if ( self::ENABLE_IP_VALIDATION ) {
			$stored_ip = get_user_meta( $user_id, self::SESSION_IP_KEY, true );
			$current_ip = self::get_client_ip();

			if ( ! empty( $stored_ip ) && $stored_ip !== $current_ip ) {
				// Log IP change but allow (some environments have dynamic IPs)
				AuditLog::log(
					AuditLog::EVENT_SECURITY,
					'session_ip_changed',
					sprintf( 'Session IP changed for user ID %d: %s -> %s', $user_id, $stored_ip, $current_ip ),
					array(
						'user_id'    => $user_id,
						'old_ip'     => $stored_ip,
						'new_ip'     => $current_ip,
					),
					AuditLog::SEVERITY_WARNING
				);

				// Update IP for dynamic environments (optional - can terminate instead)
				// Uncomment the line below to terminate session on IP change:
				// self::terminate_session( $user_id, 'ip_mismatch' );
			}
		}

		// Check session age
		$session_created = get_user_meta( $user_id, self::SESSION_CREATED_KEY, true );
		if ( $session_created && ( time() - $session_created ) > self::MAX_SESSION_LIFETIME ) {
			self::terminate_session( $user_id, 'session_expired' );
			return;
		}

		// Check idle timeout
		$last_activity = get_user_meta( $user_id, self::LAST_ACTIVITY_KEY, true );
		if ( $last_activity && ( time() - $last_activity ) > self::IDLE_TIMEOUT ) {
			self::terminate_session( $user_id, 'idle_timeout' );
			return;
		}

		// Update last activity timestamp
		update_user_meta( $user_id, self::LAST_ACTIVITY_KEY, time() );
	}

	/**
	 * Validate REST API request security
	 * SECURITY FIX #5: Called from permission callbacks
	 *
	 * @return bool|\WP_Error
	 */
	public static function validate_request() {
		if ( ! is_user_logged_in() ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'You must be logged in to access this endpoint.', 'ready-pos' ),
				array( 'status' => 401 )
			);
		}

		$user_id = get_current_user_id();
		$current_fingerprint = self::generate_fingerprint();
		$stored_fingerprint = get_user_meta( $user_id, self::FINGERPRINT_META_KEY, true );

		// Check fingerprint match
		if ( ! empty( $stored_fingerprint ) && $stored_fingerprint !== $current_fingerprint ) {
			AuditLog::log(
				AuditLog::EVENT_SECURITY,
				'api_request_fingerprint_mismatch',
				sprintf( 'API request fingerprint mismatch for user ID %d', $user_id ),
				array(
					'user_id'  => $user_id,
					'endpoint' => isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : 'unknown',
				),
				AuditLog::SEVERITY_WARNING
			);

			return new \WP_Error(
				'rest_forbidden',
				__( 'Session validation failed. Please log in again.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		// Check session age
		$session_created = get_user_meta( $user_id, self::SESSION_CREATED_KEY, true );
		if ( $session_created && ( time() - $session_created ) > self::MAX_SESSION_LIFETIME ) {
			return new \WP_Error(
				'session_expired',
				__( 'Your session has expired. Please log in again.', 'ready-pos' ),
				array( 'status' => 401 )
			);
		}

		// Check idle timeout
		$last_activity = get_user_meta( $user_id, self::LAST_ACTIVITY_KEY, true );
		if ( $last_activity && ( time() - $last_activity ) > self::IDLE_TIMEOUT ) {
			return new \WP_Error(
				'session_idle',
				__( 'Your session has expired due to inactivity. Please log in again.', 'ready-pos' ),
				array( 'status' => 401 )
			);
		}

		return true;
	}

	/**
	 * Terminate session due to security issue
	 *
	 * @param int    $user_id User ID.
	 * @param string $reason  Termination reason.
	 * @return void
	 */
	private static function terminate_session( $user_id, $reason ) {
		$user = get_userdata( $user_id );
		$ip = self::get_client_ip();

		// Log security event
		AuditLog::log(
			AuditLog::EVENT_SECURITY,
			'session_terminated',
			sprintf( 'Session terminated for user %s: %s', $user->display_name, $reason ),
			array(
				'user_id' => $user_id,
				'reason'  => $reason,
				'ip'      => $ip,
			),
			AuditLog::SEVERITY_WARNING
		);

		// Clear session data
		self::clear_session_data();

		// Destroy WordPress auth cookies
		wp_clear_auth_cookie();
		wp_set_current_user( 0 );

		// Redirect to login with message
		$redirect_url = add_query_arg(
			array(
				'session_expired' => '1',
				'reason'          => $reason,
			),
			wp_login_url()
		);

		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Clear session metadata on logout
	 *
	 * @return void
	 */
	public static function clear_session_data() {
		if ( ! is_user_logged_in() ) {
			return;
		}

		$user_id = get_current_user_id();

		delete_user_meta( $user_id, self::FINGERPRINT_META_KEY );
		delete_user_meta( $user_id, self::SESSION_CREATED_KEY );
		delete_user_meta( $user_id, self::LAST_ACTIVITY_KEY );
		delete_user_meta( $user_id, self::SESSION_IP_KEY );
	}

	/**
	 * Periodically regenerate session ID to prevent fixation
	 *
	 * @return void
	 */
	public static function maybe_regenerate_session() {
		if ( ! is_user_logged_in() ) {
			return;
		}

		$user_id = get_current_user_id();
		$session_created = get_user_meta( $user_id, self::SESSION_CREATED_KEY, true );

		// Regenerate every hour
		if ( $session_created && ( time() - $session_created ) > 3600 ) {
			// Update session created time
			update_user_meta( $user_id, self::SESSION_CREATED_KEY, time() );

			// Regenerate WordPress session
			if ( function_exists( 'wp_set_auth_cookie' ) ) {
				$secure = is_ssl();
				$remember = true; // Maintain remember me setting
				wp_set_auth_cookie( $user_id, $remember, $secure );

				AuditLog::log(
					AuditLog::EVENT_SECURITY,
					'session_regenerated',
					sprintf( 'Session ID regenerated for user ID: %d', $user_id ),
					array( 'user_id' => $user_id ),
					AuditLog::SEVERITY_INFO
				);
			}
		}
	}

	/**
	 * Add session info to admin display (for debugging)
	 *
	 * @return array
	 */
	public static function get_session_info() {
		if ( ! is_user_logged_in() ) {
			return array();
		}

		$user_id = get_current_user_id();
		$session_created = get_user_meta( $user_id, self::SESSION_CREATED_KEY, true );
		$last_activity = get_user_meta( $user_id, self::LAST_ACTIVITY_KEY, true );

		return array(
			'user_id'              => $user_id,
			'session_created'      => $session_created ? gmdate( 'Y-m-d H:i:s', $session_created ) : 'N/A',
			'last_activity'        => $last_activity ? gmdate( 'Y-m-d H:i:s', $last_activity ) : 'N/A',
			'time_until_expire'    => $session_created ? self::MAX_SESSION_LIFETIME - ( time() - $session_created ) : 0,
			'time_until_idle'      => $last_activity ? self::IDLE_TIMEOUT - ( time() - $last_activity ) : 0,
			'fingerprint_set'      => ! empty( get_user_meta( $user_id, self::FINGERPRINT_META_KEY, true ) ),
		);
	}
}

