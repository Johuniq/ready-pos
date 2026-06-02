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
 */
final class Readypos {

	use Base;

	/**
	 * Constructor setup constants.
	 */
	public function __construct() {
		define( 'READYPOS_VERSION', '1.0.0' );
		define( 'READYPOS_PLUGIN_FILE', dirname( __FILE__ ) . '/ready-pos.php' );
		define( 'READYPOS_DIR', plugin_dir_path( __FILE__ ) );
		define( 'READYPOS_URL', plugin_dir_url( __FILE__ ) );
		define( 'READYPOS_ASSETS_URL', READYPOS_URL . '/assets' );
		define( 'READYPOS_ROUTE_PREFIX', 'ready-pos/v1' );
	}

	/**
	 * Fire up the plugin.
	 *
	 * @return void
	 */
	public function init() {
		// Initialize dependency checker.
		WooCommerceChecker::get_instance()->init();

		if ( is_admin() ) {
			Menu::get_instance()->init();
			Admin::get_instance()->bootstrap();
			PluginMeta::get_instance()->init();
		}

		// Initialize core modules.
		Frontend::get_instance()->bootstrap();
		API::get_instance()->init();
		Template::get_instance()->init();
		License::get_instance()->init();
		Roles::get_instance()->init();

		add_action( 'init', array( $this, 'i18n' ) );
	}

	/**
	 * Initialize text domain for translation.
	 *
	 * @return void
	 */
	public function i18n() {
		load_plugin_textdomain( 'ready-pos', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
	}
}
