<?php
/**
 * Uninstall Handler
 *
 * Handles complete plugin uninstallation including:
 * - Database table cleanup
 * - Options cleanup
 * - Transients cleanup
 * - User meta cleanup
 * - Cache clearing
 *
 * @package Readypos\Core
 * @since 1.0.0
 */

declare(strict_types=1);

namespace Readypos\Core;

/**
 * Class Uninstall
 *
 * Handles plugin uninstallation and cleanup.
 */
class Uninstall {

	/**
	 * Run uninstall process
	 *
	 * @return void
	 */
	public static function uninstall() {
		// Check if user has permission
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		// Don't check nonce here - WordPress handles that before calling uninstall.php
		// The check_admin_referer() was causing deletion to fail

		// Check if we should keep data (user preference)
		// Default to 'yes' to preserve data - safer for users
		$keep_data = get_option( 'readypos_keep_data_on_uninstall', 'yes' );

		// Always strip POS capabilities / legacy custom roles from WP roles.
		// These are plugin-specific and should be cleaned up even when the
		// user opts to keep POS data on uninstall.
		self::clear_roles();

		if ( 'yes' === $keep_data ) {
			// Only clear caches, keep all data
			self::clear_caches();
			return;
		}

		// Full cleanup only if user explicitly requested it
		self::clear_caches();
		self::clear_options();
		self::clear_transients();
		self::clear_user_meta();
		self::drop_tables();
		self::clear_scheduled_events();
	}

	/**
	 * Remove POS-specific roles and strip POS capabilities from default
	 * WordPress roles. Safe to call when those roles don't exist.
	 *
	 * @return void
	 */
	public static function clear_roles() {
		// Remove legacy custom roles.
		remove_role( 'pos_cashier' );
		remove_role( 'pos_manager' );

		// Strip POS caps from default WP roles.
		if ( class_exists( '\Readypos\Core\Roles' ) ) {
			\Readypos\Core\Roles::get_instance()->revoke_pos_caps();
		}
	}

	/**
	 * Clear all plugin caches
	 *
	 * @return void
	 */
	public static function clear_caches() {
		// Clear WordPress object cache
		wp_cache_flush();

		// Clear WooCommerce cache if available
		if ( function_exists( 'wc_delete_shop_order_transients' ) ) {
			wc_delete_shop_order_transients();
		}

		// Increment cache version to bust browser/service worker caches
		$current_version = (int) get_option( 'readypos_cache_version', 1 );
		update_option( 'readypos_cache_version', $current_version + 1, false );

		// Clear service worker cache by updating timestamp
		update_option( 'readypos_sw_updated', time(), false );

		// Clear opcache if available
		if ( function_exists( 'opcache_reset' ) ) {
			@opcache_reset();
		}
	}

	/**
	 * Clear all plugin options
	 *
	 * @return void
	 */
	private static function clear_options() {
		global $wpdb;

		// Delete all options starting with 'readypos_'
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( 'readypos_' ) . '%'
			)
		);
	}

	/**
	 * Clear all plugin transients
	 *
	 * @return void
	 */
	private static function clear_transients() {
		global $wpdb;

		// Delete all transients starting with '_transient_readypos_'
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
				$wpdb->esc_like( '_transient_readypos_' ) . '%',
				$wpdb->esc_like( '_transient_timeout_readypos_' ) . '%'
			)
		);

		// Also check site transients for multisite
		if ( is_multisite() ) {
			$wpdb->query(
				$wpdb->prepare(
					"DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE %s OR meta_key LIKE %s",
					$wpdb->esc_like( '_site_transient_readypos_' ) . '%',
					$wpdb->esc_like( '_site_transient_timeout_readypos_' ) . '%'
				)
			);
		}
	}

	/**
	 * Clear all plugin user meta
	 *
	 * @return void
	 */
	private static function clear_user_meta() {
		global $wpdb;

		// Delete all user meta starting with 'readypos_'
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
				$wpdb->esc_like( 'readypos_' ) . '%'
			)
		);

		// Also clear POS-specific role capabilities
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
				$wpdb->esc_like( 'wp_pos_' ) . '%'
			)
		);
	}

	/**
	 * Drop all plugin database tables
	 *
	 * @return void
	 */
	private static function drop_tables() {
		global $wpdb;

		$tables = array(
			$wpdb->prefix . 'readypos_outlets',
			$wpdb->prefix . 'readypos_registers',
			$wpdb->prefix . 'readypos_sessions',
			$wpdb->prefix . 'readypos_customers',
			$wpdb->prefix . 'readypos_order_meta',
			$wpdb->prefix . 'readypos_outlet_stock',
			$wpdb->prefix . 'readypos_inventory_history',
			$wpdb->prefix . 'readypos_stock_adjustments',
			$wpdb->prefix . 'readypos_stock_transfers',
			$wpdb->prefix . 'readypos_inventory_counts',
			$wpdb->prefix . 'readypos_inventory_count_items',
			$wpdb->prefix . 'readypos_purchase_orders',
			$wpdb->prefix . 'readypos_suppliers',
			$wpdb->prefix . 'readypos_saved_carts',
			$wpdb->prefix . 'readypos_audit_log',
		);

		foreach ( $tables as $table ) {
			$wpdb->query( "DROP TABLE IF EXISTS {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		}
	}

	/**
	 * Clear all scheduled cron events
	 *
	 * @return void
	 */
	private static function clear_scheduled_events() {
		// Clear any other scheduled events
		wp_clear_scheduled_hook( 'readypos_daily_cleanup' );
		wp_clear_scheduled_hook( 'readypos_sync_inventory' );
	}

	/**
	 * Get uninstall data summary
	 *
	 * @return array
	 */
	public static function get_data_summary() {
		global $wpdb;

		$summary = array(
			'options'    => $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s",
					$wpdb->esc_like( 'readypos_' ) . '%'
				)
			),
			'transients' => $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
					$wpdb->esc_like( '_transient_readypos_' ) . '%',
					$wpdb->esc_like( '_transient_timeout_readypos_' ) . '%'
				)
			),
			'user_meta'  => $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
					$wpdb->esc_like( 'readypos_' ) . '%'
				)
			),
		);

		// Count records in each table
		$tables = array(
			'outlets',
			'registers',
			'sessions',
			'customers',
			'order_meta',
			'outlet_stock',
			'inventory_history',
			'stock_adjustments',
			'stock_transfers',
			'inventory_counts',
			'purchase_orders',
			'suppliers',
			'returns',
			'saved_carts',
		);

		foreach ( $tables as $table ) {
			$full_table_name = $wpdb->prefix . 'readypos_' . $table;
			$count           = $wpdb->get_var( "SELECT COUNT(*) FROM {$full_table_name}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			if ( $count !== null ) {
				$summary[ 'table_' . $table ] = (int) $count;
			}
		}

		return $summary;
	}
}

