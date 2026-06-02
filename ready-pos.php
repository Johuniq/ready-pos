<?php
/**
 * Plugin Name: Ready Pos
 * Description: A professional, feature-rich Point of Sale (POS) system for WooCommerce. Manage outlets, registers, cash sessions, barcode scanning, print receipts, and track retail sales.
 * Author: Johuniq
 * Author URI: https://johuniq.tech
 * License: GPLv2
 * Version: 1.0.0
 * Text Domain: ready-pos
 * Domain Path: /languages
 *
 * @package Ready Pos
 */

use Readypos\Core\Install;
use Readypos\Core\License\Manager;

defined( 'ABSPATH' ) || exit;

require_once plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';
require_once plugin_dir_path( __FILE__ ) . 'plugin.php';

/**
 * Initializes the Readypos plugin when plugins are loaded.
 *
 * @since 1.0.0
 * @return void
 */
function ready_pos_init() {
	Readypos::get_instance()->init();
}

// Hook for plugin initialization.
add_action( 'plugins_loaded', 'ready_pos_init' );

// Hook for plugin activation — install tables, schedule license cron.
register_activation_hook(
	__FILE__,
	function () {
		Install::get_instance()->init();
		Manager::ensure_cron();
	}
);

// Hook for plugin deactivation — clear license cron (keys remain stored).
register_deactivation_hook(
	__FILE__,
	function () {
		Manager::clear_cron();
	}
);
