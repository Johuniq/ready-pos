<?php
/**
 * License server adapter interface.
 *
 * Different license backends (Lemon Squeezy, EDD, custom) can be plugged in
 * by implementing this interface. Switch between them via the
 * `readypos_license_server` filter or the `READYPOS_LICENSE_SERVER` constant.
 *
 * @package Readypos\Core\License
 * @since 1.1.0
 */

namespace Readypos\Core\License;

defined( 'ABSPATH' ) || exit;

/**
 * Interface Server
 */
interface Server {

	/**
	 * Server name for display.
	 */
	public function name();

	/**
	 * Activate a license key on this site.
	 *
	 * @param string $key       License key.
	 * @param string $site_url  Domain to bind to (home_url()).
	 * @return array|\WP_Error
	 *   On success: [
	 *     'plan'        => 'pro',
	 *     'expires_at'  => 'YYYY-MM-DD HH:MM:SS' or null (lifetime),
	 *     'license_type'=> 'single-site' | 'multi-site' | 'unlimited',
	 *     'sites_used'  => int,
	 *     'sites_max'   => int (-1 unlimited),
	 *     'usage_count' => int,
	 *     'usage_limit' => int (-1 unlimited),
	 *     'validations' => int,
	 *     'billing_interval' => 'monthly' | 'yearly' | 'lifetime' | '',
	 *     'renews_at' => 'YYYY-MM-DD HH:MM:SS' or null,
	 *     'renewal_status' => string,
	 *     'is_trial' => bool,
	 *     'trial_start' => 'YYYY-MM-DD HH:MM:SS' or null,
	 *     'trial_end' => 'YYYY-MM-DD HH:MM:SS' or null,
	 *     'customer'    => ['email' => '', 'name' => ''],
	 *     'portal_url'  => '' (optional customer billing portal),
	 *   ]
	 */
	public function activate( $key, $site_url );

	/**
	 * Deactivate a license on this site.
	 *
	 * @param string $key
	 * @param string $site_url
	 * @return bool|\WP_Error
	 */
	public function deactivate( $key, $site_url );

	/**
	 * Validate a license is still active and current. Used for periodic checks.
	 *
	 * @param string $key
	 * @param string $site_url
	 * @return array|\WP_Error  Same shape as activate().
	 */
	public function validate( $key, $site_url );
}
