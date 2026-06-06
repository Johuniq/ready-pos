<?php
/**
 * Migration for adding unique constraint to outlet_stock table.
 *
 * SECURITY FIX #7: Add unique constraint to enable atomic
 * INSERT...ON DUPLICATE KEY UPDATE operations.
 *
 * @package Readypos
 * @subpackage Database
 * @since 1.0.1
 */

namespace Readypos\Database\Migrations;

use Readypos\Interfaces\Migration;

/**
 * Class AddOutletStockUniqueConstraint
 *
 * Adds unique constraint to readypos_outlet_stock table for race condition prevention.
 *
 * @package Readypos\Database\Migrations
 */
class AddOutletStockUniqueConstraint implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_outlet_stock';

	/**
	 * Run the migrations.
	 */
	public static function up() {
		global $wpdb;
		$table_name = $wpdb->prefix . self::$table;

		// Check if unique constraint already exists
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$indexes = $wpdb->get_results(
			$wpdb->prepare(
				"SHOW INDEX FROM `" . esc_sql( $table_name ) . "` WHERE Key_name = %s",
				'outlet_product_unique'
			),
			ARRAY_A
		);

		if ( empty( $indexes ) ) {
			// First, remove any duplicate records (keep the most recent)
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->query(
				"DELETE t1 FROM `" . esc_sql( $table_name ) . "` t1
				INNER JOIN `" . esc_sql( $table_name ) . "` t2 
				WHERE t1.id < t2.id 
				AND t1.outlet_id = t2.outlet_id 
				AND t1.product_id = t2.product_id"
			);

			// Add unique constraint
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Required migration for database schema setup
			$wpdb->query(
				"ALTER TABLE `" . esc_sql( $table_name ) . "` ADD UNIQUE KEY outlet_product_unique (outlet_id, product_id)"
			);
		}
	}

	/**
	 * Reverse the migrations.
	 */
	public static function down() {
		global $wpdb;
		$table_name = $wpdb->prefix . self::$table;

		// Drop unique constraint if it exists
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Required migration rollback for database schema
		$wpdb->query(
			"ALTER TABLE `" . esc_sql( $table_name ) . "` DROP INDEX IF EXISTS outlet_product_unique"
		);
	}
}
