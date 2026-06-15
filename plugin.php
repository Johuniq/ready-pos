<?php
/**
 * Main plugin class.
 *
 * @package Readypos
 * @since 1.0.0
 */

use Readypos\Core\Api;
use Readypos\Admin\Menu;
use Readypos\Admin\PluginMeta;
use Readypos\Core\Template;
use Readypos\Assets\Frontend;
use Readypos\Assets\Admin;
use Readypos\Core\WooCommerceChecker;
use Readypos\Core\License;
use Readypos\Core\Roles;
use Readypos\Traits\Base;

defined( 'ABSPATH' ) || exit;

/**
 * Class Readypos
 *
 * Handles initialization and core hooks setup.
 *
 * NOTE: When the wp.org Free build of this plugin is also active on the
 * same site, it declares an identically-named `Readypos` class which
 * would fatal PHP on duplicate declaration. `ready-pos.php` detects that
 * case at boot time and sets the `READYPOS_PRO_LOADED` constant to false
 * before including this file; in that case we skip the class body and
 * hand off user-facing messaging to `Readypos\Core\License\DuplicateGuard`.
 */
if ( ! defined( 'READYPOS_PRO_LOADED' ) || true === READYPOS_PRO_LOADED ) {

final class Readypos {

	use Base;

	/**
	 * Fire up the plugin.
	 *
	 * @return void
	 */
	public function init() {
		// Boot Eloquent ORM FIRST before anything else
		if ( function_exists( 'Readypos\Libs\DatabaseConnection\boot_eloquent' ) ) {
			\Readypos\Libs\DatabaseConnection\boot_eloquent();
		}

		// Initialize dependency checker.
		WooCommerceChecker::get_instance()->init();

		// Initialize REST API routes early
		Api::get_instance()->init();

		if ( is_admin() ) {
			Menu::get_instance()->init();
			Admin::get_instance()->bootstrap();
			PluginMeta::get_instance()->init();
			\Readypos\Admin\Tools::get_instance()->init();
		}

		// Initialize core modules.
		Frontend::get_instance()->bootstrap();
		Template::get_instance()->init();
		License::get_instance()->init();
		Roles::get_instance()->init();

		// Boot the duplicate-installation guard. This is a no-op unless a
		// sibling Free install is also active on the site, in which case
		// it shows an admin notice + offers one-click deactivation.
		if ( class_exists( '\Readypos\Core\License\DuplicateGuard' ) ) {
			\Readypos\Core\License\DuplicateGuard::boot();
		}

		add_action( 'init', array( $this, 'i18n' ) );

		// Initialize real-time sync system (if class exists)
		if ( class_exists( '\Readypos\Realtime\WebSocketServer' ) ) {
			\Readypos\Realtime\WebSocketServer::init();
		}

		// Register hooks to clear reports transients on order changes
		add_action( 'woocommerce_new_order', array( '\Readypos\Controllers\Reports\Actions', 'clear_reports_cache' ) );
		add_action( 'woocommerce_update_order', array( '\Readypos\Controllers\Reports\Actions', 'clear_reports_cache' ) );
		add_action( 'woocommerce_trash_order', array( '\Readypos\Controllers\Reports\Actions', 'clear_reports_cache' ) );
		add_action( 'woocommerce_delete_order', array( '\Readypos\Controllers\Reports\Actions', 'clear_reports_cache' ) );
	}

	/**
	 * Initialize text domain for translation.
	 *
	 * Note: As of WordPress 4.6+, translations are automatically loaded from
	 * WordPress.org for plugins hosted there. This call is kept for backwards
	 * compatibility and for local development/testing with custom translations.
	 *
	 * @return void
	 */
	public function i18n() {
		// phpcs:ignore PluginCheck.CodeAnalysis.DiscouragedFunctions.load_plugin_textdomain -- Kept for backwards compatibility with WP < 4.6 and local development with custom translations
		load_plugin_textdomain( 'ready-pos-for-woocommerce', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
	}
}

} else {

/**
 * The Pro build could not load its own class body because a Free build
 * of the same plugin is already active on the site. Bootstrap a minimal
 * shim that exposes the singleton expected by the entry-point in
 * `ready-pos.php` (`Readypos::get_instance()->init()`), then let the
 * DuplicateGuard handle user-facing messaging.
 *
 * This shim is intentionally tiny — it must NOT bring in any other
 * Readypos classes (they would re-fatal the site).
 */
if ( ! class_exists( 'Readypos', false ) ) {
	class Readypos {
		public function init() {
			if ( class_exists( '\Readypos\Core\License\DuplicateGuard' ) ) {
				\Readypos\Core\License\DuplicateGuard::boot();
			}
		}
		public static function get_instance() {
			static $instance = null;
			if ( null === $instance ) {
				$instance = new self();
			}
			return $instance;
		}
	}
}

} // end !READYPOS_PRO_LOADED guard
