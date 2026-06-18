<?php
/**
 * Rate Limiter for Ready POS REST API.
 *
 * SECURITY FIX #5: Prevent brute force and DDoS attacks on API endpoints
 *
 * @package Readypos\Core
 * @since 1.0.2
 */

namespace Readypos\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Class RateLimiter
 *
 * Implements rate limiting for REST API endpoints
 *
 * @package Readypos\Core
 */
class RateLimiter {

	/**
	 * Rate limit window (in seconds)
	 */
	const WINDOW_SIZE = 60; // 1 minute

	/**
	 * Maximum requests per window for authenticated users
	 */
	const MAX_REQUESTS_AUTH = 120; // 2 requests per second average

	/**
	 * Maximum requests per window for unauthenticated users
	 */
	const MAX_REQUESTS_UNAUTH = 30; // More restrictive for non-authenticated

	/**
	 * Maximum requests for sensitive endpoints (login, financial operations)
	 */
	const MAX_REQUESTS_SENSITIVE = 10;

	/**
	 * Lockout duration after exceeding limits (in seconds)
	 */
	const LOCKOUT_DURATION = 300; // 5 minutes

	/**
	 * Check rate limit for current request
	 *
	 * @param string $endpoint_type Type of endpoint (normal, sensitive, auth).
	 * @return bool|\WP_Error True if allowed, WP_Error if rate limited
	 */
	public static function check_limit( $endpoint_type = 'normal' ) {
		$identifier = self::get_identifier();
		$cache_key = 'readypos_ratelimit_' . md5( $identifier . '_' . $endpoint_type );
		$lockout_key = 'readypos_lockout_' . md5( $identifier );

		// Check if currently locked out
		$lockout_until = get_transient( $lockout_key );
		if ( $lockout_until ) {
			$remaining = $lockout_until - time();

			AuditLog::log(
				AuditLog::EVENT_SECURITY,
				'rate_limit_lockout_active',
				sprintf( 'Rate limit lockout active for %s', $identifier ),
				array(
					'identifier'       => $identifier,
					'endpoint_type'    => $endpoint_type,
					'remaining_seconds' => $remaining,
				),
				AuditLog::SEVERITY_WARNING
			);

			return new \WP_Error(
				'rate_limit_exceeded',
				sprintf(
					/* translators: %d: minutes remaining */
					__( 'Too many requests. Please try again in %d minutes.', 'ready-pos-for-woocommerce' ),
					ceil( $remaining / 60 )
				),
				array(
					'status'          => 429,
					'retry_after'     => $remaining,
				)
			);
		}

		// Get current request count
		$request_data = get_transient( $cache_key );
		if ( false === $request_data ) {
			$request_data = array(
				'count'      => 0,
				'window_start' => time(),
			);
		}

		// Reset window if expired
		if ( ( time() - $request_data['window_start'] ) >= self::WINDOW_SIZE ) {
			$request_data = array(
				'count'      => 0,
				'window_start' => time(),
			);
		}

		// Increment request count
		$request_data['count']++;

		// Determine limit based on endpoint type and authentication status
		$limit = self::get_limit( $endpoint_type );

		// Check if limit exceeded
		if ( $request_data['count'] > $limit ) {
			// Set lockout
			set_transient( $lockout_key, time() + self::LOCKOUT_DURATION, self::LOCKOUT_DURATION );

			AuditLog::log(
				AuditLog::EVENT_SECURITY,
				'rate_limit_exceeded',
				sprintf( 'Rate limit exceeded for %s on %s endpoints', $identifier, $endpoint_type ),
				array(
					'identifier'    => $identifier,
					'endpoint_type' => $endpoint_type,
					'request_count' => $request_data['count'],
					'limit'         => $limit,
					'ip'            => self::get_client_ip(),
				),
				AuditLog::SEVERITY_WARNING
			);

			return new \WP_Error(
				'rate_limit_exceeded',
				sprintf(
					/* translators: %d: minutes */
					__( 'Too many requests. Your access has been temporarily restricted for %d minutes.', 'ready-pos-for-woocommerce' ),
					ceil( self::LOCKOUT_DURATION / 60 )
				),
				array(
					'status'      => 429,
					'retry_after' => self::LOCKOUT_DURATION,
				)
			);
		}

		// Update request count
		set_transient( $cache_key, $request_data, self::WINDOW_SIZE );

		return true;
	}

	/**
	 * Get rate limit based on endpoint type and authentication
	 *
	 * @param string $endpoint_type Type of endpoint.
	 * @return int
	 */
	private static function get_limit( $endpoint_type ) {
		switch ( $endpoint_type ) {
			case 'sensitive':
				return self::MAX_REQUESTS_SENSITIVE;
			case 'auth':
				return is_user_logged_in() ? self::MAX_REQUESTS_AUTH : self::MAX_REQUESTS_UNAUTH;
			default:
				return is_user_logged_in() ? self::MAX_REQUESTS_AUTH : self::MAX_REQUESTS_UNAUTH;
		}
	}

	/**
	 * Get unique identifier for rate limiting
	 * Uses IP + User ID for authenticated, IP only for unauthenticated
	 *
	 * @return string
	 */
	private static function get_identifier() {
		$ip = self::get_client_ip();
		$user_id = is_user_logged_in() ? get_current_user_id() : 0;

		return $ip . '_' . $user_id;
	}

	/**
	 * Get client IP address.
	 *
	 * Uses only REMOTE_ADDR to prevent IP spoofing via forwarding
	 * headers (X-Forwarded-For, CF-Connecting-IP, etc.) which can
	 * be set by the client and are not trustworthy in a shared
	 * hosting environment.
	 *
	 * @return string
	 */
	private static function get_client_ip() {
		$remote_addr = isset( $_SERVER['REMOTE_ADDR'] )
			? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
			: '';

		if ( '' === $remote_addr || ! filter_var( $remote_addr, FILTER_VALIDATE_IP ) ) {
			return 'unknown';
		}

		return $remote_addr;
	}

	/**
	 * Clear rate limit for identifier (admin override)
	 *
	 * @param string $identifier Optional specific identifier to clear.
	 * @return void
	 */
	public static function clear_limit( $identifier = null ) {
		if ( null === $identifier ) {
			$identifier = self::get_identifier();
		}

		$types = array( 'normal', 'sensitive', 'auth' );
		foreach ( $types as $type ) {
			$cache_key = 'readypos_ratelimit_' . md5( $identifier . '_' . $type );
			delete_transient( $cache_key );
		}

		$lockout_key = 'readypos_lockout_' . md5( $identifier );
		delete_transient( $lockout_key );

		AuditLog::log(
			AuditLog::EVENT_SECURITY,
			'rate_limit_cleared',
			sprintf( 'Rate limit cleared for %s', $identifier ),
			array( 'identifier' => $identifier ),
			AuditLog::SEVERITY_INFO
		);
	}

	/**
	 * Get rate limit status for current identifier
	 *
	 * @return array
	 */
	public static function get_status() {
		$identifier = self::get_identifier();
		$lockout_key = 'readypos_lockout_' . md5( $identifier );
		$lockout_until = get_transient( $lockout_key );

		$status = array(
			'identifier'   => $identifier,
			'is_locked'    => (bool) $lockout_until,
			'lockout_remaining' => $lockout_until ? $lockout_until - time() : 0,
		);

		$types = array( 'normal', 'sensitive', 'auth' );
		foreach ( $types as $type ) {
			$cache_key = 'readypos_ratelimit_' . md5( $identifier . '_' . $type );
			$request_data = get_transient( $cache_key );
			$limit = self::get_limit( $type );

			$status[ $type ] = array(
				'count'     => $request_data ? $request_data['count'] : 0,
				'limit'     => $limit,
				'remaining' => $limit - ( $request_data ? $request_data['count'] : 0 ),
			);
		}

		return $status;
	}
}
