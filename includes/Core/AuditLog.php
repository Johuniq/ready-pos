<?php
/**
 * Audit Logging System for Ready POS.
 *
 * SECURITY FIX #17: Comprehensive audit trail for security-critical events
 *
 * @package Readypos\Core
 * @since 1.0.2
 */

namespace Readypos\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Class AuditLog
 *
 * Provides centralized audit logging for security events.
 *
 * @package Readypos\Core
 */
class AuditLog {

	/**
	 * Event types for categorization
	 */
	const EVENT_AUTH = 'authentication';
	const EVENT_ACCESS = 'access';
	const EVENT_DATA = 'data_change';
	const EVENT_SECURITY = 'security';
	const EVENT_FINANCIAL = 'financial';
	const EVENT_SYSTEM = 'system';

	/**
	 * Severity levels
	 */
	const SEVERITY_INFO = 'info';
	const SEVERITY_WARNING = 'warning';
	const SEVERITY_ERROR = 'error';
	const SEVERITY_CRITICAL = 'critical';

	/**
	 * Initialize audit logging hooks
	 *
	 * @return void
	 */
	public static function init() {
		// Authentication events
		add_action( 'wp_login', array( __CLASS__, 'log_wp_login' ), 10, 2 );
		add_action( 'wp_logout', array( __CLASS__, 'log_wp_logout' ) );
		add_action( 'wp_login_failed', array( __CLASS__, 'log_failed_login' ) );
		
		// User management
		add_action( 'user_register', array( __CLASS__, 'log_user_created' ) );
		add_action( 'deleted_user', array( __CLASS__, 'log_user_deleted' ) );
		add_action( 'set_user_role', array( __CLASS__, 'log_role_change' ), 10, 3 );
		
		// Settings changes
		add_action( 'updated_option', array( __CLASS__, 'log_option_update' ), 10, 3 );
		
		// Plugin activation/deactivation
		add_action( 'activated_plugin', array( __CLASS__, 'log_plugin_activated' ) );
		add_action( 'deactivated_plugin', array( __CLASS__, 'log_plugin_deactivated' ) );
	}

	/**
	 * Log a security event
	 *
	 * @param string $event_type Event type (use class constants).
	 * @param string $action Action performed.
	 * @param string $description Human-readable description.
	 * @param array  $metadata Additional metadata.
	 * @param string $severity Severity level.
	 * @return bool Whether the log was created successfully.
	 */
	public static function log( $event_type, $action, $description, $metadata = array(), $severity = self::SEVERITY_INFO ) {
		global $wpdb;

		$user_id = get_current_user_id();
		$user = $user_id ? get_userdata( $user_id ) : null;
		
		$log_entry = array(
			'event_type'    => sanitize_text_field( $event_type ),
			'action'        => sanitize_text_field( $action ),
			'description'   => sanitize_textarea_field( $description ),
			'severity'      => sanitize_text_field( $severity ),
			'user_id'       => $user_id,
			'user_name'     => $user ? $user->display_name : 'System',
			'user_role'     => $user ? implode( ', ', $user->roles ) : 'none',
			'ip_address'    => self::get_client_ip(),
			'user_agent'    => self::get_user_agent(),
			'url'           => self::get_current_url(),
			'metadata'      => wp_json_encode( $metadata ),
			'created_at'    => current_time( 'mysql' ),
		);

		$table_name = $wpdb->prefix . 'readypos_audit_log';
		
		// Insert into custom audit log table
		$result = $wpdb->insert( $table_name, $log_entry );

		// Also log to WordPress error log for critical events
		if ( in_array( $severity, array( self::SEVERITY_ERROR, self::SEVERITY_CRITICAL ), true ) ) {
			error_log( sprintf(
				'[ReadyPOS Audit] %s | %s | %s | User: %s (ID: %d) | IP: %s',
				strtoupper( $severity ),
				$event_type,
				$action,
				$log_entry['user_name'],
				$user_id,
				$log_entry['ip_address']
			) );
		}

		// Trigger action for external logging systems (e.g., Syslog, Splunk)
		do_action( 'readypos_audit_log_created', $log_entry, $severity );

		return false !== $result;
	}

	/**
	 * Get client IP address (handles proxies and load balancers)
	 *
	 * @return string
	 */
	private static function get_client_ip() {
		$ip_keys = array(
			'HTTP_CF_CONNECTING_IP', // Cloudflare
			'HTTP_X_REAL_IP',        // Nginx proxy
			'HTTP_X_FORWARDED_FOR',  // Most proxies
			'REMOTE_ADDR',           // Direct connection
		);

		foreach ( $ip_keys as $key ) {
			if ( ! empty( $_SERVER[ $key ] ) ) {
				$ip = sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
				
				// X-Forwarded-For may contain multiple IPs
				if ( strpos( $ip, ',' ) !== false ) {
					$ips = explode( ',', $ip );
					$ip = trim( $ips[0] );
				}
				
				// Validate IP address
				if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
					return $ip;
				}
			}
		}

		return 'unknown';
	}

	/**
	 * Get user agent string (truncated for database storage)
	 *
	 * @return string
	 */
	private static function get_user_agent() {
		if ( empty( $_SERVER['HTTP_USER_AGENT'] ) ) {
			return 'unknown';
		}
		
		$user_agent = sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) );
		return substr( $user_agent, 0, 255 ); // Truncate to DB column length
	}

	/**
	 * Get current URL
	 *
	 * @return string
	 */
	private static function get_current_url() {
		if ( empty( $_SERVER['REQUEST_URI'] ) ) {
			return 'unknown';
		}
		
		$request_uri = sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) );
		return substr( $request_uri, 0, 500 ); // Truncate to DB column length
	}

	/**
	 * Log WordPress login event
	 *
	 * @param string   $user_login Username.
	 * @param \WP_User $user       WP_User object.
	 * @return void
	 */
	public static function log_wp_login( $user_login, $user ) {
		self::log(
			self::EVENT_AUTH,
			'user_login',
			sprintf( 'User "%s" logged in successfully', $user->display_name ),
			array(
				'user_id'    => $user->ID,
				'user_login' => $user_login,
				'roles'      => $user->roles,
			),
			self::SEVERITY_INFO
		);
	}

	/**
	 * Log WordPress logout event
	 *
	 * @return void
	 */
	public static function log_wp_logout() {
		$user = wp_get_current_user();
		
		self::log(
			self::EVENT_AUTH,
			'user_logout',
			sprintf( 'User "%s" logged out', $user->display_name ),
			array(
				'user_id' => $user->ID,
			),
			self::SEVERITY_INFO
		);
	}

	/**
	 * Log failed login attempt
	 *
	 * @param string $username Username or email used in failed attempt.
	 * @return void
	 */
	public static function log_failed_login( $username ) {
		self::log(
			self::EVENT_SECURITY,
			'login_failed',
			sprintf( 'Failed login attempt for username: %s', $username ),
			array(
				'username' => $username,
				'method'   => 'wordpress',
			),
			self::SEVERITY_WARNING
		);
	}

	/**
	 * Log user creation
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	public static function log_user_created( $user_id ) {
		$user = get_userdata( $user_id );
		$creator = wp_get_current_user();
		
		self::log(
			self::EVENT_DATA,
			'user_created',
			sprintf( 'New user "%s" created by %s', $user->display_name, $creator->display_name ),
			array(
				'new_user_id'    => $user_id,
				'new_user_login' => $user->user_login,
				'new_user_roles' => $user->roles,
				'created_by'     => $creator->ID,
			),
			self::SEVERITY_INFO
		);
	}

	/**
	 * Log user deletion
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	public static function log_user_deleted( $user_id ) {
		$deleter = wp_get_current_user();
		
		self::log(
			self::EVENT_DATA,
			'user_deleted',
			sprintf( 'User ID %d deleted by %s', $user_id, $deleter->display_name ),
			array(
				'deleted_user_id' => $user_id,
				'deleted_by'      => $deleter->ID,
			),
			self::SEVERITY_WARNING
		);
	}

	/**
	 * Log role change
	 *
	 * @param int    $user_id   User ID.
	 * @param string $new_role  New role.
	 * @param array  $old_roles Old roles.
	 * @return void
	 */
	public static function log_role_change( $user_id, $new_role, $old_roles ) {
		$user = get_userdata( $user_id );
		$changer = wp_get_current_user();
		
		self::log(
			self::EVENT_SECURITY,
			'role_changed',
			sprintf( 
				'User "%s" role changed from %s to %s by %s',
				$user->display_name,
				implode( ', ', $old_roles ),
				$new_role,
				$changer->display_name
			),
			array(
				'user_id'   => $user_id,
				'old_roles' => $old_roles,
				'new_role'  => $new_role,
				'changed_by' => $changer->ID,
			),
			self::SEVERITY_WARNING
		);
	}

	/**
	 * Log option updates (only for sensitive ReadyPOS options)
	 *
	 * @param string $option    Option name.
	 * @param mixed  $old_value Old value.
	 * @param mixed  $new_value New value.
	 * @return void
	 */
	public static function log_option_update( $option, $old_value, $new_value ) {
		// Only log ReadyPOS-related options
		if ( strpos( $option, 'readypos_' ) !== 0 ) {
			return;
		}

		// Skip non-critical options
		$skip_options = array(
			'readypos_cache_version',
			'readypos_last_check',
		);

		if ( in_array( $option, $skip_options, true ) ) {
			return;
		}

		$user = wp_get_current_user();
		
		self::log(
			self::EVENT_DATA,
			'setting_changed',
			sprintf( 'Setting "%s" changed by %s', $option, $user->display_name ),
			array(
				'option'    => $option,
				'old_value' => is_string( $old_value ) ? $old_value : wp_json_encode( $old_value ),
				'new_value' => is_string( $new_value ) ? $new_value : wp_json_encode( $new_value ),
			),
			self::SEVERITY_INFO
		);
	}

	/**
	 * Log plugin activation
	 *
	 * @param string $plugin Plugin basename.
	 * @return void
	 */
	public static function log_plugin_activated( $plugin ) {
		$user = wp_get_current_user();
		
		self::log(
			self::EVENT_SYSTEM,
			'plugin_activated',
			sprintf( 'Plugin "%s" activated by %s', $plugin, $user->display_name ),
			array(
				'plugin' => $plugin,
			),
			self::SEVERITY_INFO
		);
	}

	/**
	 * Log plugin deactivation
	 *
	 * @param string $plugin Plugin basename.
	 * @return void
	 */
	public static function log_plugin_deactivated( $plugin ) {
		$user = wp_get_current_user();
		
		self::log(
			self::EVENT_SYSTEM,
			'plugin_deactivated',
			sprintf( 'Plugin "%s" deactivated by %s', $plugin, $user->display_name ),
			array(
				'plugin' => $plugin,
			),
			self::SEVERITY_WARNING
		);
	}

	/**
	 * Retrieve audit logs with filtering
	 *
	 * @param array $args Query arguments.
	 * @return array Array of log entries.
	 */
	public static function get_logs( $args = array() ) {
		global $wpdb;

		$defaults = array(
			'event_type' => '',
			'user_id'    => 0,
			'severity'   => '',
			'start_date' => '',
			'end_date'   => '',
			'limit'      => 100,
			'offset'     => 0,
			'orderby'    => 'created_at',
			'order'      => 'DESC',
		);

		$args = wp_parse_args( $args, $defaults );
		$table_name = $wpdb->prefix . 'readypos_audit_log';

		$where = array( '1=1' );
		$prepare_values = array();

		if ( ! empty( $args['event_type'] ) ) {
			$where[] = 'event_type = %s';
			$prepare_values[] = $args['event_type'];
		}

		if ( ! empty( $args['user_id'] ) ) {
			$where[] = 'user_id = %d';
			$prepare_values[] = $args['user_id'];
		}

		if ( ! empty( $args['severity'] ) ) {
			$where[] = 'severity = %s';
			$prepare_values[] = $args['severity'];
		}

		if ( ! empty( $args['start_date'] ) ) {
			$where[] = 'created_at >= %s';
			$prepare_values[] = $args['start_date'];
		}

		if ( ! empty( $args['end_date'] ) ) {
			$where[] = 'created_at <= %s';
			$prepare_values[] = $args['end_date'];
		}

		$where_clause = implode( ' AND ', $where );
		$orderby = in_array( $args['orderby'], array( 'id', 'created_at', 'severity' ), true ) ? $args['orderby'] : 'created_at';
		$order = 'ASC' === strtoupper( $args['order'] ) ? 'ASC' : 'DESC';

		$prepare_values[] = (int) $args['limit'];
		$prepare_values[] = (int) $args['offset'];

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$query = $wpdb->prepare(
			"SELECT * FROM {$table_name} WHERE {$where_clause} ORDER BY {$orderby} {$order} LIMIT %d OFFSET %d",
			$prepare_values
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$results = $wpdb->get_results( $query, ARRAY_A );

		// Decode metadata JSON
		foreach ( $results as &$result ) {
			$result['metadata'] = json_decode( $result['metadata'], true );
		}

		return $results;
	}

	/**
	 * Delete old audit logs (for cleanup/rotation)
	 *
	 * @param int $days Number of days to keep logs.
	 * @return int Number of rows deleted.
	 */
	public static function cleanup_old_logs( $days = 90 ) {
		global $wpdb;

		$table_name = $wpdb->prefix . 'readypos_audit_log';
		$cutoff_date = gmdate( 'Y-m-d H:i:s', strtotime( "-{$days} days" ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$deleted = $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$table_name} WHERE created_at < %s",
				$cutoff_date
			)
		);

		self::log(
			self::EVENT_SYSTEM,
			'audit_log_cleanup',
			sprintf( 'Deleted %d audit log entries older than %d days', $deleted, $days ),
			array(
				'days'    => $days,
				'deleted' => $deleted,
			),
			self::SEVERITY_INFO
		);

		return $deleted;
	}
}

