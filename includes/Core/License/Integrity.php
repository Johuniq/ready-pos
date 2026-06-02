<?php
/**
 * License integrity verification.
 *
 * Provides tamper-detection for stored license data using HMAC signatures.
 * If the stored options are modified outside of the official activation flow,
 * the integrity check fails and the license is treated as invalid.
 *
 * This makes "nulling" via direct database manipulation ineffective — the
 * attacker would need to know the signing secret (derived from the site's
 * AUTH_KEY + a plugin-specific salt) to forge a valid signature.
 *
 * @package Readypos\Core\License
 * @since 1.1.0
 */

namespace Readypos\Core\License;

defined( 'ABSPATH' ) || exit;

class Integrity {

	/**
	 * Derive the signing key. Uses WordPress AUTH_KEY (unique per site) combined
	 * with a plugin-specific salt so the key can't be reused across plugins.
	 */
	private static function signing_key() {
		$auth_key = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'readypos-fallback-key';
		$host     = wp_parse_url( home_url(), PHP_URL_HOST ) ?: '';
		return hash( 'sha256', $auth_key . '|readypos-license-integrity|' . $host, true );
	}

	/**
	 * Generate an HMAC signature for the given license data payload.
	 *
	 * @param array $data Associative array of license fields to sign.
	 * @return string Hex-encoded HMAC.
	 */
	public static function sign( $data ) {
		$payload = self::normalize( $data );
		return hash_hmac( 'sha256', $payload, self::signing_key() );
	}

	/**
	 * Verify that stored license data matches its signature.
	 *
	 * @param array  $data      License data fields.
	 * @param string $signature Stored HMAC to verify against.
	 * @return bool
	 */
	public static function verify( $data, $signature ) {
		if ( empty( $signature ) ) {
			return false;
		}

		// Try current (host-based) signing key first.
		$expected = self::sign( $data );
		if ( hash_equals( $expected, $signature ) ) {
			return true;
		}

		// Fallback to legacy (full home_url-based) signing key.
		$auth_key = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'readypos-fallback-key';
		$legacy_signing_key = hash( 'sha256', $auth_key . '|readypos-license-integrity|' . home_url(), true );
		$payload = self::normalize( $data );
		$legacy_expected = hash_hmac( 'sha256', $payload, $legacy_signing_key );

		if ( hash_equals( $legacy_expected, $signature ) ) {
			// Automatically migrate legacy signature to the new format.
			self::store_signature();
			return true;
		}

		return false;
	}

	/**
	 * Normalize data into a deterministic string for signing.
	 * Only includes the fields that matter for license validity.
	 */
	private static function normalize( $data ) {
		$fields = array(
			'plan'       => $data['plan'] ?? '',
			'status'     => $data['status'] ?? '',
			'key'        => $data['key'] ?? '',
			'expires_at' => $data['expires_at'] ?? '',
			'type'       => $data['type'] ?? '',
		);
		ksort( $fields );
		return implode( '|', $fields );
	}

	/**
	 * Build the signable payload from current stored options.
	 */
	public static function current_payload() {
		return array(
			'plan'       => get_option( Manager::OPT_PLAN, Manager::PLAN_FREE ),
			'status'     => get_option( Manager::OPT_STATUS, 'free' ),
			'key'        => get_option( Manager::OPT_KEY, '' ),
			'expires_at' => get_option( Manager::OPT_EXPIRES_AT, '' ),
			'type'       => get_option( Manager::OPT_LICENSE_TYPE, '' ),
		);
	}

	/**
	 * Store the integrity signature for the current license state.
	 */
	public static function store_signature() {
		$sig = self::sign( self::current_payload() );
		update_option( 'readypos_license_sig', $sig );
	}

	/**
	 * Verify the current stored license data hasn't been tampered with.
	 *
	 * @return bool True if integrity is intact, false if tampered.
	 */
	public static function check() {
		$stored_sig = get_option( 'readypos_license_sig', '' );
		$payload    = self::current_payload();

		// If plan is free and no key, no signature needed.
		if ( ( $payload['plan'] === Manager::PLAN_FREE || empty( $payload['plan'] ) ) && empty( $payload['key'] ) ) {
			return true;
		}

		return self::verify( $payload, $stored_sig );
	}
}
