<?php
/**
 * Polar.sh license server adapter.
 *
 * Talks to the Polar.sh License Keys API:
 *   - POST /v1/license-keys/validate    (server-side validation)
 *   - POST /v1/license-keys/activate    (creates an activation per site)
 *   - POST /v1/license-keys/deactivate  (removes an activation when site is unbound)
 *
 * Configuration (one-time, in wp-config.php or environment):
 *   define( 'READYPOS_POLAR_TOKEN', 'polar_oat_xxxxxxxx' );
 *   define( 'READYPOS_POLAR_ORG_ID', 'org-uuid-from-polar-dashboard' );
 *
 * Both values can also be set via the `readypos_polar_token` and
 * `readypos_polar_organization_id` filters.
 *
 * The Polar token must have the `license_keys:write` scope.
 *
 * @link https://polar.sh/docs/api-reference/license-keys/validate
 * @link https://polar.sh/docs/api-reference/license-keys/activate
 * @link https://polar.sh/docs/api-reference/license-keys/deactivate
 *
 * @package Readypos\Core\License
 * @since 1.1.0
 */

namespace Readypos\Core\License;

defined( 'ABSPATH' ) || exit;

class PolarServer implements Server {

	const API_BASE = 'https://api.polar.sh/v1';

	const OPT_ACTIVATION_ID = 'readypos_polar_activation_id';
	const OPT_USAGE_RECORDED = 'readypos_polar_usage_recorded';

	private $token;
	private $organization_id;

	public function __construct( $token, $organization_id ) {
		$this->token           = $token;
		$this->organization_id = $organization_id;
	}

	public function name() {
		return 'polar.sh';
	}

	/**
	 * Activate a license key — creates a Polar activation tied to this site.
	 *
	 * @inheritDoc
	 */
	public function activate( $key, $site_url ) {
		$conditions = $this->site_conditions( $site_url );
		$body = array(
			'key'             => $key,
			'organization_id' => $this->organization_id,
			'label'           => $site_url,
			'conditions'      => $conditions,
			'meta'            => array(
				'site_url' => $site_url,
				'site_host' => $conditions['site_host'],
				'plugin'   => 'ready-pos-for-woocommerce',
				'version'  => defined( 'READYPOS_VERSION' ) ? READYPOS_VERSION : '1.0.0',
			),
		);

		$response = $this->call( '/license-keys/activate', $body );
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$activation_id = $response['id'] ?? '';
		if ( empty( $activation_id ) ) {
			return new \WP_Error( 'invalid_response', __( 'Polar did not return an activation ID.', 'ready-pos-for-woocommerce' ) );
		}

		// Persist the Polar activation ID before validation. Polar validation
		// with increment_usage=1 is the source-of-truth usage event for this site.
		update_option( self::OPT_ACTIVATION_ID, $activation_id );

		$validation = $this->validate_with_options(
			$key,
			$site_url,
			array(
				'activation_id'   => $activation_id,
				'increment_usage' => 1,
			)
		);

		if ( is_wp_error( $validation ) ) {
			$this->rollback_activation( $key, $site_url, $activation_id, false );
			return $validation;
		}

		$usage_limit = (int) ( $validation['usage_limit'] ?? -1 );
		$usage_count = (int) ( $validation['usage_count'] ?? 0 );
		if ( $usage_limit > -1 && $usage_count > $usage_limit ) {
			$this->rollback_activation( $key, $site_url, $activation_id, true );
			return new \WP_Error(
				'license_site_limit_exceeded',
				sprintf(
					/* translators: 1: usage count, 2: allowed site limit */
					__( 'This license is already active on the maximum number of sites (%1$d/%2$d). Deactivate it on another site first.', 'ready-pos-for-woocommerce' ),
					$usage_count,
					$usage_limit
				)
			);
		}

		update_option( self::OPT_USAGE_RECORDED, 'yes' );

		return $validation;
	}

	/**
	 * Deactivate this site's activation.
	 *
	 * @inheritDoc
	 */
	public function deactivate( $key, $site_url ) {
		$activation_id = get_option( self::OPT_ACTIVATION_ID, '' );
		if ( empty( $activation_id ) ) {
			// No activation recorded — nothing to do remotely.
			return true;
		}

		$this->release_usage( $key, $site_url, $activation_id );

		$body = array(
			'key'             => $key,
			'organization_id' => $this->organization_id,
			'activation_id'   => $activation_id,
		);

		$response = $this->call( '/license-keys/deactivate', $body );
		// Always clear local activation ID — we don't want it to linger if remote
		// deactivation fails (admin can re-activate cleanly later).
		delete_option( self::OPT_ACTIVATION_ID );
		delete_option( self::OPT_USAGE_RECORDED );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		return true;
	}

	/**
	 * Validate the license. Increments the validation counter on Polar's side.
	 *
	 * @inheritDoc
	 */
	public function validate( $key, $site_url ) {
		return $this->validate_with_options( $key, $site_url );
	}

	private function validate_with_options( $key, $site_url, $options = array() ) {
		$body = array(
			'key'             => $key,
			'organization_id' => $this->organization_id,
			'conditions'      => $this->site_conditions( $site_url ),
		);

		$activation_id = $options['activation_id'] ?? get_option( self::OPT_ACTIVATION_ID, '' );
		if ( ! empty( $activation_id ) ) {
			$body['activation_id'] = $activation_id;
		}
		if ( array_key_exists( 'increment_usage', $options ) ) {
			$body['increment_usage'] = (int) $options['increment_usage'];
		} elseif ( ! empty( $activation_id ) && get_option( self::OPT_USAGE_RECORDED, '' ) !== 'yes' ) {
			$body['increment_usage'] = 1;
		}

		$response = $this->call( '/license-keys/validate', $body );
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$license_key = $response;
		if ( ! empty( $response['id'] ) ) {
			$fresh = $this->fetch_license_key( $response['id'] );
			if ( ! is_wp_error( $fresh ) ) {
				$license_key = $fresh;
			}
		}

		$normalized = $this->normalize_license( $license_key, $response );
		if ( is_wp_error( $normalized ) ) {
			return $normalized;
		}

		if ( isset( $body['increment_usage'] ) && (int) $body['increment_usage'] > 0 ) {
			update_option( self::OPT_USAGE_RECORDED, 'yes' );
		}

		$usage_limit = (int) ( $normalized['usage_limit'] ?? -1 );
		$usage_count = (int) ( $normalized['usage_count'] ?? 0 );
		if ( $usage_limit > -1 && $usage_count > $usage_limit ) {
			return new \WP_Error(
				'license_site_limit_exceeded',
				sprintf(
					/* translators: 1: usage count, 2: allowed site limit */
					__( 'This license is already active on the maximum number of sites (%1$d/%2$d). Deactivate it on another site first.', 'ready-pos-for-woocommerce' ),
					$usage_count,
					$usage_limit
				)
			);
		}

		return $normalized;
	}

	private function rollback_activation( $key, $site_url, $activation_id, $release_usage = false ) {
		if ( $release_usage ) {
			$this->release_usage( $key, $site_url, $activation_id );
		}

		$body = array(
			'key'             => $key,
			'organization_id' => $this->organization_id,
			'activation_id'   => $activation_id,
		);
		$this->call( '/license-keys/deactivate', $body );
		delete_option( self::OPT_ACTIVATION_ID );
		delete_option( self::OPT_USAGE_RECORDED );
	}

	private function release_usage( $key, $site_url, $activation_id ) {
		// Polar's validation endpoint owns usage counters. Use a negative usage
		// increment when a site is deactivated so "usage" remains active-site
		// count for installations that configured usage limits as site limits.
		$this->validate_with_options(
			$key,
			$site_url,
			array(
				'activation_id'   => $activation_id,
				'increment_usage' => -1,
			)
		);
	}

	/**
	 * Send an authenticated POST to a Polar endpoint.
	 *
	 * @param string $path
	 * @param array  $body
	 * @return array|\WP_Error
	 */
	private function call( $path, $body ) {
		if ( empty( $this->token ) ) {
			return new \WP_Error( 'no_token', __( 'Polar API token is not configured.', 'ready-pos-for-woocommerce' ) );
		}
		if ( empty( $this->organization_id ) ) {
			return new \WP_Error( 'no_org', __( 'Polar organization ID is not configured.', 'ready-pos-for-woocommerce' ) );
		}

		$response = wp_remote_post(
			self::API_BASE . $path,
			array(
				'timeout' => 15,
				'headers' => array(
					'Authorization' => 'Bearer ' . $this->token,
					'Content-Type'  => 'application/json',
					'Accept'        => 'application/json',
					'User-Agent'    => 'ReadyPOS/' . ( defined( 'READYPOS_VERSION' ) ? READYPOS_VERSION : '1.0.0' ),
				),
				'body'    => wp_json_encode( $body ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_Error( 'http_error', $response->get_error_message() );
		}

		$status   = wp_remote_retrieve_response_code( $response );
		$raw_body = wp_remote_retrieve_body( $response );
		$decoded  = json_decode( $raw_body, true );

		if ( $status >= 400 ) {
			$msg = $this->extract_error_message( $decoded, $status );
			$code = $status === 404 ? 'license_failed' : 'license_error';
			return new \WP_Error( $code, $msg );
		}

		if ( ! is_array( $decoded ) ) {
			return new \WP_Error( 'invalid_response', __( 'Unexpected response from license server.', 'ready-pos-for-woocommerce' ) );
		}

		return $decoded;
	}

	private function call_get( $path ) {
		if ( empty( $this->token ) ) {
			return new \WP_Error( 'no_token', __( 'Polar API token is not configured.', 'ready-pos-for-woocommerce' ) );
		}

		$response = wp_remote_get(
			self::API_BASE . $path,
			array(
				'timeout' => 15,
				'headers' => array(
					'Authorization' => 'Bearer ' . $this->token,
					'Accept'        => 'application/json',
					'User-Agent'    => 'ReadyPOS/' . ( defined( 'READYPOS_VERSION' ) ? READYPOS_VERSION : '1.0.0' ),
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_Error( 'http_error', $response->get_error_message() );
		}

		$status   = wp_remote_retrieve_response_code( $response );
		$raw_body = wp_remote_retrieve_body( $response );
		$decoded  = json_decode( $raw_body, true );

		if ( $status >= 400 ) {
			return new \WP_Error( 'polar_get_failed', $this->extract_error_message( $decoded, $status ) );
		}

		return is_array( $decoded ) ? $decoded : new \WP_Error( 'invalid_response', __( 'Unexpected response from license server.', 'ready-pos-for-woocommerce' ) );
	}

	private function fetch_license_key( $license_key_id ) {
		return $this->call_get( '/license-keys/' . rawurlencode( $license_key_id ) );
	}

	/**
	 * Pull a meaningful error message out of Polar's standardized error
	 * response: { detail: [ { msg: '...' } ] } or { detail: 'string' }.
	 */
	private function extract_error_message( $decoded, $status ) {
		if ( is_array( $decoded ) && isset( $decoded['detail'] ) ) {
			$detail = $decoded['detail'];
			if ( is_string( $detail ) ) {
				return $detail;
			}
			if ( is_array( $detail ) && ! empty( $detail[0]['msg'] ) ) {
				return $detail[0]['msg'];
			}
		}
		switch ( $status ) {
			case 401:
				return __( 'Polar API token is invalid or expired.', 'ready-pos-for-woocommerce' );
			case 403:
				return __( 'Polar API token does not have permission to manage license keys.', 'ready-pos-for-woocommerce' );
			case 404:
				return __( 'License key not found. Check that the key is correct.', 'ready-pos-for-woocommerce' );
			case 422:
				return __( 'License key was rejected by the server.', 'ready-pos-for-woocommerce' );
			default:
				/* translators: %d: HTTP status code */
				return sprintf( __( 'License server returned status %d', 'ready-pos-for-woocommerce' ), $status );
		}
	}

	/**
	 * Normalize a Polar `license_key` object to the shape Manager expects.
	 *
	 * @param array $lk Polar license_key object.
	 * @param array $context Optional parent response context from activation / validation.
	 * @return array|\WP_Error
	 */
	private function normalize_license( $lk, $context = array() ) {
		if ( ! is_array( $lk ) || empty( $lk['id'] ) ) {
			return new \WP_Error( 'invalid_response', __( 'Polar response did not include license details.', 'ready-pos-for-woocommerce' ) );
		}

		$subscription = $this->fetch_subscription_for_license( $lk, $context );
		if ( is_array( $subscription ) ) {
			$context['subscription'] = $subscription;
		}

		// Reject revoked / disabled keys.
		$polar_status = $lk['status'] ?? 'granted';
		if ( $polar_status !== 'granted' ) {
			return new \WP_Error(
				'license_failed',
				sprintf(
					/* translators: %s: status from Polar (revoked, disabled, etc.) */
					__( 'License is not active on Polar (status: %s).', 'ready-pos-for-woocommerce' ),
					$polar_status
				)
			);
		}

		$limit_activations = isset( $lk['limit_activations'] ) ? (int) $lk['limit_activations'] : 0;
		$usage_limit       = isset( $lk['limit_usage'] ) && $lk['limit_usage'] !== null ? (int) $lk['limit_usage'] : -1;
		$usage_count       = isset( $lk['usage'] ) ? (int) $lk['usage'] : 0;
		$validations       = isset( $lk['validations'] ) ? (int) $lk['validations'] : 0;

		// Ready POS treats Polar usage quota as site usage when present. If no
		// usage quota is configured, fall back to activation limits.
		$sites_max  = $usage_limit > -1 ? $usage_limit : ( $limit_activations > 0 ? $limit_activations : -1 );
		$sites_used = $usage_limit > -1 ? $usage_count : $this->count_activations( $lk );

		// Polar returns ISO timestamps; normalize to MySQL datetime.
		// License-key benefits expose `expires_at` directly. Recurring plans can
		// also carry the active term on subscription/benefit-grant fields, so keep
		// those fallbacks before treating the key as lifetime.
		$expires_at = $this->extract_expiry( $lk, $context );
		$renews_at  = $this->extract_renewal_date( $lk, $context );
		$interval   = $this->extract_billing_interval( $lk, $context, $expires_at );
		$renewal_status = $this->extract_renewal_status( $lk, $context, $expires_at, $renews_at );
		$trial_start = $this->extract_date( $lk, $context, array(
			array( 'subscription', 'trial_start' ),
			array( 'subscription', 'trialStart' ),
			array( 'trial_start' ),
			array( 'trialStart' ),
		) );
		$trial_end = $this->extract_date( $lk, $context, array(
			array( 'subscription', 'trial_end' ),
			array( 'subscription', 'trialEnd' ),
			array( 'trial_end' ),
			array( 'trialEnd' ),
		) );
		$is_trial = $this->is_trialing( $lk, $context, $trial_end );

		// License type label based on activation limits.
		$license_type = 'unlimited';
		if ( $sites_max === 1 ) {
			$license_type = 'single-site';
		} elseif ( $sites_max > 1 ) {
			$license_type = 'multi-site';
		}

		// Customer info.
		$customer = $lk['customer'] ?? array();

		return array(
			'plan'         => 'pro',
			'expires_at'   => $expires_at,
			'license_type' => $license_type,
			'sites_used'   => $sites_used,
			'sites_max'    => $sites_max,
			'usage_count'  => $usage_count,
			'usage_limit'  => $usage_limit,
			'validations'  => $validations,
			'billing_interval' => $interval,
			'renews_at'    => $renews_at,
			'renewal_status' => $renewal_status,
			'is_trial'     => $is_trial,
			'trial_start'  => $trial_start,
			'trial_end'    => $trial_end,
			'customer'     => array(
				'email' => $customer['email'] ?? '',
				'name'  => $customer['name'] ?? '',
			),
			'portal_url'   => '', // Polar customer portal URLs are generated per-session, not stable.
		);
	}

	private function site_conditions( $site_url ) {
		$host = wp_parse_url( $site_url, PHP_URL_HOST );
		if ( empty( $host ) ) {
			$host = wp_parse_url( home_url(), PHP_URL_HOST );
		}

		return array(
			'site_host' => strtolower( (string) $host ),
		);
	}

	private function count_activations( $license_key ) {
		$activations = $license_key['activations'] ?? array();
		if ( is_array( $activations ) ) {
			return count( $activations );
		}
		if ( ! empty( $license_key['activation'] ) ) {
			return 1;
		}
		return get_option( self::OPT_ACTIVATION_ID, '' ) ? 1 : 0;
	}

	private function fetch_subscription_for_license( $license_key, $context = array() ) {
		$subscription_id = $this->extract_subscription_id( $license_key, $context );
		if ( empty( $subscription_id ) ) {
			$grant = $this->fetch_benefit_grant( $license_key );
			if ( is_array( $grant ) ) {
				$subscription_id = $grant['subscription_id'] ?? '';
			}
		}

		if ( empty( $subscription_id ) ) {
			return null;
		}

		$subscription = $this->call_get( '/subscriptions/' . rawurlencode( $subscription_id ) );
		return is_wp_error( $subscription ) ? null : $subscription;
	}

	private function extract_subscription_id( $license_key, $context = array() ) {
		$candidates = array(
			$this->array_get( $license_key, array( 'subscription_id' ) ),
			$this->array_get( $license_key, array( 'subscription', 'id' ) ),
			$this->array_get( $license_key, array( 'benefit_grant', 'subscription_id' ) ),
			$this->array_get( $license_key, array( 'benefitGrant', 'subscriptionId' ) ),
			$this->array_get( $license_key, array( 'metadata', 'subscription_id' ) ),
			$this->array_get( $license_key, array( 'meta', 'subscription_id' ) ),
			$this->array_get( $context, array( 'subscription_id' ) ),
			$this->array_get( $context, array( 'subscription', 'id' ) ),
			$this->array_get( $context, array( 'benefit_grant', 'subscription_id' ) ),
			$this->array_get( $context, array( 'benefitGrant', 'subscriptionId' ) ),
			$this->array_get( $context, array( 'metadata', 'subscription_id' ) ),
			$this->array_get( $context, array( 'meta', 'subscription_id' ) ),
		);

		foreach ( $candidates as $candidate ) {
			if ( is_string( $candidate ) && $candidate !== '' ) {
				return $candidate;
			}
		}

		return null;
	}

	private function fetch_benefit_grant( $license_key ) {
		$benefit_id  = $license_key['benefit_id'] ?? '';
		$customer_id = $license_key['customer_id'] ?? '';

		if ( empty( $benefit_id ) || empty( $customer_id ) ) {
			return null;
		}

		$query = http_build_query(
			array(
				'customer_id' => $customer_id,
				'is_granted'  => 'true',
				'limit'       => 100,
			)
		);
		$response = $this->call_get( '/benefits/' . rawurlencode( $benefit_id ) . '/grants?' . $query );
		if ( is_wp_error( $response ) || empty( $response['items'] ) || ! is_array( $response['items'] ) ) {
			return null;
		}

		foreach ( $response['items'] as $grant ) {
			if (
				is_array( $grant )
				&& ( $grant['benefit_id'] ?? '' ) === $benefit_id
				&& ( $grant['customer_id'] ?? '' ) === $customer_id
				&& ! empty( $grant['subscription_id'] )
			) {
				return $grant;
			}
		}

		return null;
	}

	/**
	 * Extract the best available expiry timestamp from Polar license responses.
	 *
	 * @param array $license_key License key payload.
	 * @param array $context Parent activation or validation payload.
	 * @return string|null MySQL UTC datetime or null for true lifetime keys.
	 */
	private function extract_expiry( $license_key, $context = array() ) {
		$candidates = array(
			$this->array_get( $license_key, array( 'expires_at' ) ),
			$this->array_get( $license_key, array( 'expiresAt' ) ),
			$this->array_get( $license_key, array( 'benefit_grant', 'expires_at' ) ),
			$this->array_get( $license_key, array( 'benefitGrant', 'expiresAt' ) ),
			$this->array_get( $license_key, array( 'subscription', 'current_period_end' ) ),
			$this->array_get( $license_key, array( 'subscription', 'currentPeriodEnd' ) ),
			$this->array_get( $license_key, array( 'subscription', 'ends_at' ) ),
			$this->array_get( $license_key, array( 'subscription', 'endsAt' ) ),
			$this->array_get( $license_key, array( 'metadata', 'expires_at' ) ),
			$this->array_get( $license_key, array( 'meta', 'expires_at' ) ),
			$this->array_get( $context, array( 'expires_at' ) ),
			$this->array_get( $context, array( 'expiresAt' ) ),
			$this->array_get( $context, array( 'license_key', 'expires_at' ) ),
			$this->array_get( $context, array( 'license_key', 'expiresAt' ) ),
			$this->array_get( $context, array( 'benefit_grant', 'expires_at' ) ),
			$this->array_get( $context, array( 'benefitGrant', 'expiresAt' ) ),
			$this->array_get( $context, array( 'subscription', 'current_period_end' ) ),
			$this->array_get( $context, array( 'subscription', 'currentPeriodEnd' ) ),
			$this->array_get( $context, array( 'subscription', 'ends_at' ) ),
			$this->array_get( $context, array( 'subscription', 'endsAt' ) ),
			$this->array_get( $context, array( 'order', 'subscription', 'current_period_end' ) ),
			$this->array_get( $context, array( 'order', 'subscription', 'currentPeriodEnd' ) ),
			$this->array_get( $context, array( 'metadata', 'expires_at' ) ),
			$this->array_get( $context, array( 'meta', 'expires_at' ) ),
		);

		foreach ( $candidates as $candidate ) {
			if ( empty( $candidate ) || ! is_scalar( $candidate ) ) {
				continue;
			}

			$ts = strtotime( (string) $candidate );
			if ( $ts ) {
				return gmdate( 'Y-m-d H:i:s', $ts );
			}
		}

		return null;
	}

	private function extract_date( $license_key, $context, $paths ) {
		$candidates = array();
		foreach ( $paths as $path ) {
			$candidates[] = $this->array_get( $context, $path );
			$candidates[] = $this->array_get( $license_key, $path );
		}

		foreach ( $candidates as $candidate ) {
			if ( empty( $candidate ) || ! is_scalar( $candidate ) ) {
				continue;
			}

			$ts = strtotime( (string) $candidate );
			if ( $ts ) {
				return gmdate( 'Y-m-d H:i:s', $ts );
			}
		}

		return null;
	}

	private function is_trialing( $license_key, $context = array(), $trial_end = null ) {
		$status = $this->array_get( $context, array( 'subscription', 'status' ) );
		if ( $status === 'trialing' ) {
			return true;
		}

		$license_status = $this->array_get( $license_key, array( 'subscription', 'status' ) );
		if ( $license_status === 'trialing' ) {
			return true;
		}

		if ( ! empty( $trial_end ) ) {
			$trial_end_ts = strtotime( $trial_end );
			return $trial_end_ts && $trial_end_ts > time();
		}

		return false;
	}

	private function extract_renewal_date( $license_key, $context = array() ) {
		$candidates = array(
			$this->array_get( $context, array( 'subscription', 'current_period_end' ) ),
			$this->array_get( $context, array( 'subscription', 'currentPeriodEnd' ) ),
			$this->array_get( $license_key, array( 'subscription', 'current_period_end' ) ),
			$this->array_get( $license_key, array( 'subscription', 'currentPeriodEnd' ) ),
		);

		foreach ( $candidates as $candidate ) {
			if ( empty( $candidate ) || ! is_scalar( $candidate ) ) {
				continue;
			}
			$ts = strtotime( (string) $candidate );
			if ( $ts ) {
				return gmdate( 'Y-m-d H:i:s', $ts );
			}
		}

		return null;
	}

	private function extract_billing_interval( $license_key, $context = array(), $expires_at = null ) {
		$candidates = array(
			$this->array_get( $context, array( 'subscription', 'recurring_interval' ) ),
			$this->array_get( $context, array( 'subscription', 'recurringInterval' ) ),
			$this->array_get( $context, array( 'product', 'recurring_interval' ) ),
			$this->array_get( $context, array( 'product', 'recurringInterval' ) ),
			$this->array_get( $context, array( 'metadata', 'billing_interval' ) ),
			$this->array_get( $context, array( 'metadata', 'recurring_interval' ) ),
			$this->array_get( $context, array( 'meta', 'billing_interval' ) ),
			$this->array_get( $context, array( 'meta', 'recurring_interval' ) ),
			$this->array_get( $license_key, array( 'subscription', 'recurring_interval' ) ),
			$this->array_get( $license_key, array( 'subscription', 'recurringInterval' ) ),
			$this->array_get( $license_key, array( 'metadata', 'billing_interval' ) ),
			$this->array_get( $license_key, array( 'metadata', 'recurring_interval' ) ),
			$this->array_get( $license_key, array( 'meta', 'billing_interval' ) ),
			$this->array_get( $license_key, array( 'meta', 'recurring_interval' ) ),
		);

		foreach ( $candidates as $candidate ) {
			if ( ! is_scalar( $candidate ) || $candidate === '' ) {
				continue;
			}

			$normalized = strtolower( (string) $candidate );
			if ( in_array( $normalized, array( 'month', 'monthly' ), true ) ) {
				return 'monthly';
			}
			if ( in_array( $normalized, array( 'year', 'yearly', 'annual', 'annually' ), true ) ) {
				return 'yearly';
			}
			if ( in_array( $normalized, array( 'lifetime', 'one_time', 'one-time' ), true ) ) {
				return 'lifetime';
			}
		}

		return empty( $expires_at ) ? 'lifetime' : '';
	}

	private function extract_renewal_status( $license_key, $context = array(), $expires_at = null, $renews_at = null ) {
		$cancel_at_period_end = $this->array_get( $context, array( 'subscription', 'cancel_at_period_end' ) );
		$status = $this->array_get( $context, array( 'subscription', 'status' ) );

		if ( $cancel_at_period_end === true ) {
			return 'cancels_at_period_end';
		}
		if ( is_string( $status ) && $status !== '' ) {
			return $status;
		}
		if ( ! empty( $renews_at ) ) {
			return 'renews';
		}
		if ( ! empty( $expires_at ) ) {
			return 'expires';
		}

		return 'lifetime';
	}

	/**
	 * Safely fetch a nested array value.
	 *
	 * @param array $array Source array.
	 * @param array $path List of keys.
	 * @return mixed|null
	 */
	private function array_get( $array, $path ) {
		$value = $array;
		foreach ( $path as $key ) {
			if ( ! is_array( $value ) || ! array_key_exists( $key, $value ) ) {
				return null;
			}
			$value = $value[ $key ];
		}
		return $value;
	}
}
