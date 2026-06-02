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
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$indexes = $wpdb->get_results(
			$wpdb->prepare(
				'SHOW INDEX FROM %i WHERE Key_name IN (%s, %s)',
				$table_name,
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
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
			$wpdb->query(
				$wpdb->prepare(
					'ALTER TABLE %i ADD INDEX status (status)',
					$table_name
				)
			);
		}

		// Add register_id index if it doesn't exist
		if ( ! $has_register_index ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
			$wpdb->query(
				$wpdb->prepare(
					'ALTER TABLE %i ADD INDEX register_id (register_id)',
					$table_name
				)
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
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
		$wpdb->query(
			$wpdb->prepare(
				'ALTER TABLE %i DROP INDEX IF EXISTS status',
				$table_name
			)
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
		$wpdb->query(
			$wpdb->prepare(
				'ALTER TABLE %i DROP INDEX IF EXISTS register_id',
				$table_name
			)
		);
	}
}
