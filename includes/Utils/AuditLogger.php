<?php
/**
 * Audit Logging Utility
 *
 * @package Readypos\Utils
 */

namespace Readypos\Utils;

defined( 'ABSPATH' ) || exit;

/**
 * Class AuditLogger
 *
 * Central logging service to monitor cashier operations, drawer balance adjustments, and database security events.
 */
class AuditLogger {

	/**
	 * Log a POS audit entry
	 *
	 * @param string $action Action name (e.g. 'drawer_open', 'price_override', 'refund').
	 * @param string $details JSON or text details of the action.
	 * @param int    $cashier_id WP User ID.
	 * @return void
	 */
	public static function log( $action, $details = '', $cashier_id = null ) {
		global $wpdb;

		if ( null === $cashier_id ) {
			$cashier_id = get_current_user_id();
		}

		$table_name = $wpdb->prefix . 'readypos_audit_logs';

		// Create table if not exists during logging fallback
		if ( $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" ) !== $table_name ) {
			$charset_collate = $wpdb->get_charset_collate();
			$sql = "CREATE TABLE `{$table_name}` (
				`id` bigint(20) NOT NULL AUTO_INCREMENT,
				`cashier_id` bigint(20) NOT NULL,
				`action` varchar(100) NOT NULL,
				`details` text,
				`created_at` datetime NOT NULL,
				PRIMARY KEY (`id`),
				KEY `action_idx` (`action`),
				KEY `cashier_idx` (`cashier_id`)
			) {$charset_collate};";
			require_once ABSPATH . 'wp-admin/includes/upgrade.php';
			dbDelta( $sql );
		}

		$wpdb->insert(
			$table_name,
			array(
				'cashier_id' => $cashier_id,
				'action'     => sanitize_text_field( $action ),
				'details'    => is_array( $details ) || is_object( $details ) ? wp_json_encode( $details ) : sanitize_textarea_field( $details ),
				'created_at' => current_time( 'mysql' ),
			),
			array(
				'%d',
				'%s',
				'%s',
				'%s',
			)
		);
	}
}
