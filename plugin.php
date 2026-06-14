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
use Readypos\Core\Roles;
use Readypos\Traits\Base;

defined( 'ABSPATH' ) || exit;

/**
 * Class Readypos
 *
 * Handles initialization and core hooks setup.
 */
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


		// Initialize real-time sync system (if class exists)
		if ( class_exists( '\Readypos\Realtime\WebSocketServer' ) ) {
			\Readypos\Realtime\WebSocketServer::init();
		}

		// Initialize & Bootstrap DI Container bindings
		$container = \Readypos\Core\Architecture\Container::get_instance();
		$container->singleton( \Readypos\Core\Architecture\Container::class, $container );
		
		// Event Dispatcher & Transactions
		$container->singleton( \Readypos\Core\Architecture\EventDispatcher::class );
		$container->singleton( \Readypos\Core\Architecture\Transaction\Manager::class );
		$container->singleton( \Readypos\Core\Architecture\Queue\JobQueue::class );

		// Repositories
		$container->bind( \Readypos\Interfaces\Repositories\ProductRepositoryInterface::class, \Readypos\Repositories\ProductRepository::class );
		$container->bind( \Readypos\Interfaces\Repositories\OrderRepositoryInterface::class, \Readypos\Repositories\OrderRepository::class );

		// Services
		$container->bind( \Readypos\Interfaces\Services\InventoryServiceInterface::class, \Readypos\Services\InventoryService::class );
		$container->bind( \Readypos\Interfaces\Services\CheckoutServiceInterface::class, \Readypos\Services\CheckoutService::class );

		// Initialize JobQueue Background runner
		$container->get( \Readypos\Core\Architecture\Queue\JobQueue::class )->init();

		// Register hooks to clear dashboard reports transients on order changes
		add_action( 'woocommerce_new_order', array( $this, 'clear_dashboard_reports_cache' ) );
		add_action( 'woocommerce_update_order', array( $this, 'clear_dashboard_reports_cache' ) );
		add_action( 'woocommerce_trash_order', array( $this, 'clear_dashboard_reports_cache' ) );
		add_action( 'woocommerce_delete_order', array( $this, 'clear_dashboard_reports_cache' ) );
	}

	/**
	 * Clear dashboard reports transients (free cache only).
	 */
	public function clear_dashboard_reports_cache() {
		global $wpdb;
		$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_readypos_report_%_free_%' OR option_name LIKE '_transient_timeout_readypos_report_%_free_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
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
