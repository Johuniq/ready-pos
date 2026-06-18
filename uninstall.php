<?php
/**
 * Uninstall Ready POS
 *
 * This file is executed when the plugin is deleted via the WordPress admin.
 * It handles complete cleanup of all plugin data.
 *
 * @package Ready_POS
 * @since 1.0.0
 */

// Exit if accessed directly or not uninstalling
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Load plugin constants
if ( ! defined( 'READYPOS_VERSION' ) ) {
	define( 'READYPOS_VERSION', '1.0.0' );
}
if ( ! defined( 'READYPOS_DIR' ) ) {
	define( 'READYPOS_DIR', plugin_dir_path( __FILE__ ) );
}

// Load dependencies
$autoload_file = READYPOS_DIR . 'vendor/autoload.php';
if ( file_exists( $autoload_file ) ) {
	require_once $autoload_file;
}

// Run uninstall
if ( class_exists( 'Readypos\Core\Uninstall' ) ) {
	\Readypos\Core\Uninstall::uninstall();
}

