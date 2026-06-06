<?php
/**
 * Migration: POSSavedCarts
 *
 * Creates the table for saved carts (unlimited carts feature).
 *
 * @package Readypos\Database\Migrations
 * @since 1.0.0
 */

namespace Readypos\Database\Migrations;

use Readypos\Libs\Migration;

defined( 'ABSPATH' ) || exit;

/**
 * Class POSSavedCarts
 *
 * Creates the wp_readypos_saved_carts table for storing unlimited carts
 * with cart naming and transfer between cashiers support.
 *
 * @package Readypos\Database\Migrations
 */
class POSSavedCarts extends Migration {

	/**
	 * Run the migration.
	 *
	 * @return void
	 */
	public function up() {
		global $wpdb;

		$table_name      = $wpdb->prefix . 'readypos_saved_carts';
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT(20) UNSIGNED NOT NULL,
			cashier_id BIGINT(20) UNSIGNED NOT NULL,
			label VARCHAR(255) NOT NULL DEFAULT 'Cart',
			cart_content LONGTEXT NOT NULL,
			item_count INT(11) NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY (id),
			KEY user_id (user_id),
			KEY cashier_id (cashier_id),
			KEY created_at (created_at),
			KEY updated_at (updated_at)
		) $charset_collate;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	/**
	 * Reverse the migration.
	 *
	 * @return void
	 */
	public function down() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'readypos_saved_carts';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Required for migration rollback
		$wpdb->query( "DROP TABLE IF EXISTS {$table_name}" );
	}
}
