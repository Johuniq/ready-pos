<?php
/**
 * Plugin Name: Ready POS for WooCommerce
 * Plugin URI: https://readypos.johuniq.tech/
 * Description: Transform your WooCommerce store into a professional Point of Sale system. Fast checkout, inventory sync, and customer management for retail stores.
 * Version: 1.0.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Author: Johuniq
 * Author URI: https://johuniq.tech
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ready-pos-for-woocommerce
 * Domain Path: /languages
 * WC requires at least: 6.0
 * WC tested up to: 9.0
 *
 * @package Ready_POS
 * @author Johuniq
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

// Define constants FIRST, before any autoloading
if ( ! defined( 'READYPOS_VERSION' ) ) {
	define( 'READYPOS_VERSION', '1.0.1' );
}
if ( ! defined( 'READYPOS_PLUGIN_FILE' ) ) {
	define( 'READYPOS_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( 'READYPOS_DIR' ) ) {
	define( 'READYPOS_DIR', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'READYPOS_URL' ) ) {
	define( 'READYPOS_URL', plugin_dir_url( __FILE__ ) );
}
if ( ! defined( 'READYPOS_ASSETS_URL' ) ) {
	define( 'READYPOS_ASSETS_URL', READYPOS_URL . 'assets' );
}
if ( ! defined( 'READYPOS_ROUTE_PREFIX' ) ) {
	define( 'READYPOS_ROUTE_PREFIX', 'ready-pos/v1' );
}

// Load dependencies AFTER constants are defined
$readypos_autoload_file = plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';
if ( ! file_exists( $readypos_autoload_file ) ) {
	add_action(
		'admin_notices',
		function () {
			echo '<div class="notice notice-error"><p><strong>Ready POS:</strong> Composer dependencies are missing. Please run <code>composer install --no-dev</code> in the plugin directory.</p></div>';
		}
	);
	return;
}
require_once $readypos_autoload_file;
require_once plugin_dir_path( __FILE__ ) . 'plugin.php';

/**
 * Initializes the Readypos plugin when plugins are loaded.
 *
 * @since 1.0.0
 * @return void
 */
function ready_pos_init() {
	if ( class_exists( 'Readypos' ) ) {
		Readypos::get_instance()->init();
	}
}

// Hook for plugin initialization.
add_action( 'plugins_loaded', 'ready_pos_init' );

/**
 * Declare compatibility with WooCommerce HPOS.
 *
 * @since 1.0.0
 * @return void
 */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

// Hook for plugin activation — install tables, schedule license cron, clear caches.
register_activation_hook(
	__FILE__,
	function () {
		// Ensure Eloquent is booted before running migrations
		if ( function_exists( 'Readypos\Libs\DatabaseConnection\boot_eloquent' ) ) {
			\Readypos\Libs\DatabaseConnection\boot_eloquent();
		}
		
		// Use fully qualified class names to avoid use statement issues
		if ( class_exists( 'Readypos\Core\Install' ) ) {
			\Readypos\Core\Install::get_instance()->init();
		}
		
		if ( class_exists( 'Readypos\Core\License\Manager' ) ) {
			\Readypos\Core\License\Manager::ensure_cron();
		}
		
		// Force REST API routes registration before flushing
		if ( class_exists( 'Readypos\Core\Api' ) ) {
			\Readypos\Core\Api::get_instance()->init();
		}
		
		// Trigger rest_api_init to register routes
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- This is a WordPress core hook, not a custom hook
		do_action( 'rest_api_init' );
		
		// Flush rewrite rules to ensure REST API routes are registered
		flush_rewrite_rules();
		
		// Clear all caches to ensure fresh start
		if ( class_exists( 'Readypos\Core\Uninstall' ) ) {
			\Readypos\Core\Uninstall::clear_caches();
		}
		
		// Set default data retention option (keep data on uninstall by default)
		if ( false === get_option( 'readypos_keep_data_on_uninstall' ) ) {
			add_option( 'readypos_keep_data_on_uninstall', 'yes', '', false );
		}
		
		// Set activation timestamp and transient for notice
		update_option( 'readypos_activated_at', time(), false );
		set_transient( 'readypos_activated', true, 60 );
	}
);

// Hook for plugin deactivation — clear license cron, clear caches.
register_deactivation_hook(
	__FILE__,
	function () {
		if ( class_exists( 'Readypos\Core\License\Manager' ) ) {
			\Readypos\Core\License\Manager::clear_cron();
		}
		
		// Clear all caches on deactivation
		if ( class_exists( 'Readypos\Core\Uninstall' ) ) {
			\Readypos\Core\Uninstall::clear_caches();
		}
		
		// Flush rewrite rules
		flush_rewrite_rules();
		
		// Set deactivation timestamp
		update_option( 'readypos_deactivated_at', time(), false );
	}
);
