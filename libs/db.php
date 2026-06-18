<?php
/**
 * Database configuration using Eloquent ORM.
 *
 * @package Readypos
 * @subpackage Database
 * @since 1.0.0
 */

namespace Readypos\Libs\DatabaseConnection;

defined( 'ABSPATH' ) || exit;

use Prappo\WpEloquent\Application;

/**
 * Boot Eloquent ORM for WordPress.
 * Can be called manually or will auto-boot on plugins_loaded.
 * 
 * @return bool True if booted successfully, false otherwise
 */
function boot_eloquent() {
	static $booted = false;
	
	if ( $booted ) {
		return true;
	}
	
	try {
		// Check if WordPress database is available
		global $wpdb;
		if ( ! isset( $wpdb ) ) {
			return false;
		}
		
		Application::bootWp();
		$booted = true;
		return true;
	} catch ( \Exception $e ) {
		// Log error for debugging
		if ( function_exists( 'error_log' ) && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Intentional debug logging for database boot failures
			error_log( 'ReadyPOS: Failed to boot Eloquent - ' . $e->getMessage() );
		}
		return false;
	}
}

// Auto-boot only if WordPress is fully loaded
// This ensures database is ready when autoload.php is included
if ( function_exists( 'did_action' ) && did_action( 'plugins_loaded' ) ) {
	boot_eloquent();
}
