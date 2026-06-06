<?php
/**
 * Migration for adding performance indexes to sessions table.
 *
 * PERFORMANCE FIX #6: Add indexes for faster session queries
 * and improved concurrent update performance.
 *
 * @package Readypos
 * @subpackage Database
 * @since 1.0.1
 */

namespace Readypos\Database\Migrations;

use Readypos\Interfaces\Migration;

/**
 * Class AddSessionIndexes
 *
 * Adds indexes to readypos_sessions table for better performance.
 *
 * @package Readypos\Database\Migrations
 */
class AddSessionIndexes implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_sessions';

	/**
	 * Run the migrations.
	 */
	public static function up() {
		global $wpdb;
		$table_name = $wpdb->prefix . self::$table;

		// Check if indexes already exist
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table name is escaped with esc_sql() before use
		$indexes = $wpdb->get_results(
			$wpdb->prepare(
				"SHOW INDEX FROM `" . esc_sql( $table_name ) . "` WHERE Key_name IN (%s, %s)",
				'status',
				'register_id'
			),
			ARRAY_A
		);

		$has_status_index = false;
		$has_register_index = false;

		foreach ( $indexes as $index ) {
			if ( 'status' === $index['Key_name'] ) {
				$has_status_index = true;
			}
			if ( 'register_id' === $index['Key_name'] ) {
				$has_register_index = true;
			}
		}

		// Add status index if it doesn't exist
		if ( ! $has_status_index ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Required migration for database schema setup, table name escaped with esc_sql()
			$wpdb->query(
				"ALTER TABLE `" . esc_sql( $table_name ) . "` ADD INDEX status (status)"
			);
		}

		// Add register_id index if it doesn't exist
		if ( ! $has_register_index ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Required migration for database schema setup, table name escaped with esc_sql()
			$wpdb->query(
				"ALTER TABLE `" . esc_sql( $table_name ) . "` ADD INDEX register_id (register_id)"
			);
		}
	}

	/**
	 * Reverse the migrations.
	 */
	public static function down() {
		global $wpdb;
		$table_name = $wpdb->prefix . self::$table;

		// Drop indexes if they exist
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Required migration rollback for database schema, table name escaped with esc_sql()
		$wpdb->query(
			"ALTER TABLE `" . esc_sql( $table_name ) . "` DROP INDEX IF EXISTS status"
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Required migration rollback for database schema, table name escaped with esc_sql()
		$wpdb->query(
			"ALTER TABLE `" . esc_sql( $table_name ) . "` DROP INDEX IF EXISTS register_id"
		);
	}
}
