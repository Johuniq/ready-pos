<?php
/**
 * Cache Utility Class
 *
 * Provides caching functionality for REST API responses using WordPress transients.
 *
 * @package Readypos\Utils
 */

namespace Readypos\Utils;

/**
 * Cache class for managing API response caching.
 */
class Cache {

	/**
	 * Cache prefix to avoid conflicts
	 *
	 * @var string
	 */
	const PREFIX = 'readypos_cache_';

	/**
	 * Default cache expiration time (15 minutes)
	 *
	 * @var int
	 */
	const DEFAULT_EXPIRATION = 900; // 15 minutes

	/**
	 * Cache group definitions with different TTLs
	 *
	 * @var array
	 */
	const CACHE_GROUPS = array(
		'products'       => 300,    // 5 minutes - products change frequently
		'outlets'        => 1800,   // 30 minutes - outlets rarely change
		'settings'       => 1800,   // 30 minutes - settings rarely change
		'customers'      => 600,    // 10 minutes - customer data moderate changes
		'inventory'      => 300,    // 5 minutes - inventory changes frequently
		'reports'        => 900,    // 15 minutes - reports can be cached longer
		'sessions'       => 60,     // 1 minute - sessions change frequently
		'orders'         => 180,    // 3 minutes - orders change frequently in POS
		'returns'        => 180,    // 3 minutes - returns change frequently
		'suppliers'      => 1800,   // 30 minutes - suppliers rarely change
		'registers'      => 1800,   // 30 minutes - registers rarely change
		'payment_methods' => 3600,  // 1 hour - payment methods very stable
		'categories'     => 1800,   // 30 minutes - categories rarely change
		'taxes'          => 3600,   // 1 hour - tax rates very stable
	);

	/**
	 * Get cached data
	 *
	 * @param string $key Cache key.
	 * @param string $group Cache group (optional).
	 * @return mixed|false Cached data or false if not found.
	 */
	public static function get( $key, $group = 'default' ) {
		$cache_key = self::generate_key( $key, $group );
		$cached    = get_transient( $cache_key );

		if ( false !== $cached ) {
			// Check if cached data has metadata
			if ( is_array( $cached ) && isset( $cached['data'] ) && isset( $cached['timestamp'] ) ) {
				return $cached['data'];
			}
			return $cached;
		}

		return false;
	}

	/**
	 * Set cached data
	 *
	 * @param string $key Cache key.
	 * @param mixed  $data Data to cache.
	 * @param string $group Cache group (optional).
	 * @param int    $expiration Expiration time in seconds (optional).
	 * @return bool True on success, false on failure.
	 */
	public static function set( $key, $data, $group = 'default', $expiration = null ) {
		$cache_key = self::generate_key( $key, $group );

		// Use group-specific expiration or provided expiration or default
		if ( null === $expiration ) {
			$expiration = self::get_group_expiration( $group );
		}

		// Wrap data with metadata
		$cached_data = array(
			'data'      => $data,
			'timestamp' => time(),
			'group'     => $group,
		);

		return set_transient( $cache_key, $cached_data, $expiration );
	}

	/**
	 * Delete cached data
	 *
	 * @param string $key Cache key.
	 * @param string $group Cache group (optional).
	 * @return bool True on success, false on failure.
	 */
	public static function delete( $key, $group = 'default' ) {
		$cache_key = self::generate_key( $key, $group );
		return delete_transient( $cache_key );
	}

	/**
	 * Clear all cache for a specific group
	 *
	 * @param string $group Cache group.
	 * @return int Number of cache entries deleted.
	 */
	public static function clear_group( $group ) {
		global $wpdb;

		$pattern = self::PREFIX . $group . '_%';
		$deleted = $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_' . $pattern ) . '%'
			)
		);

		// Also clear transient timeouts
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_timeout_' . $pattern ) . '%'
			)
		);

		return $deleted;
	}

	/**
	 * Clear all plugin cache
	 *
	 * @return int Number of cache entries deleted.
	 */
	public static function clear_all() {
		global $wpdb;

		$pattern = self::PREFIX . '%';
		$deleted = $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_' . $pattern ) . '%'
			)
		);

		// Also clear transient timeouts
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_timeout_' . $pattern ) . '%'
			)
		);

		return $deleted;
	}

	/**
	 * Get or set cached data (cache-aside pattern)
	 *
	 * @param string   $key Cache key.
	 * @param callable $callback Callback function to generate data if not cached.
	 * @param string   $group Cache group (optional).
	 * @param int      $expiration Expiration time in seconds (optional).
	 * @return mixed Cached or newly generated data.
	 */
	public static function remember( $key, $callback, $group = 'default', $expiration = null ) {
		$cached = self::get( $key, $group );

		if ( false !== $cached ) {
			return $cached;
		}

		$data = call_user_func( $callback );
		self::set( $key, $data, $group, $expiration );

		return $data;
	}

	/**
	 * Generate cache key
	 *
	 * @param string $key Base key.
	 * @param string $group Cache group.
	 * @return string Generated cache key.
	 */
	private static function generate_key( $key, $group ) {
		// Include user ID for user-specific caches
		$user_id = get_current_user_id();
		return self::PREFIX . $group . '_' . md5( $key . '_' . $user_id );
	}

	/**
	 * Get expiration time for a cache group
	 *
	 * @param string $group Cache group.
	 * @return int Expiration time in seconds.
	 */
	private static function get_group_expiration( $group ) {
		return isset( self::CACHE_GROUPS[ $group ] ) ? self::CACHE_GROUPS[ $group ] : self::DEFAULT_EXPIRATION;
	}

	/**
	 * Invalidate cache on data changes
	 *
	 * @param string $entity Entity type (product, order, customer, etc.).
	 * @param int    $entity_id Entity ID (optional).
	 * @return void
	 */
	public static function invalidate( $entity, $entity_id = null ) {
		// Map entity types to cache groups
		$entity_group_map = array(
			'product'   => array( 'products', 'inventory', 'reports' ),
			'order'     => array( 'orders', 'reports', 'sessions', 'returns' ),
			'customer'  => array( 'customers', 'reports' ),
			'outlet'    => array( 'outlets', 'inventory', 'reports', 'registers' ),
			'supplier'  => array( 'suppliers' ),
			'register'  => array( 'registers', 'outlets', 'sessions' ),
			'setting'   => array( 'settings', 'payment_methods', 'taxes' ),
			'inventory' => array( 'inventory', 'products', 'reports' ),
			'session'   => array( 'sessions', 'reports' ),
			'return'    => array( 'returns', 'orders', 'reports' ),
		);

		if ( isset( $entity_group_map[ $entity ] ) ) {
			foreach ( $entity_group_map[ $entity ] as $group ) {
				self::clear_group( $group );
			}
		}
	}

	/**
	 * Get cache statistics
	 *
	 * @return array Cache statistics.
	 */
	public static function get_stats() {
		global $wpdb;

		$pattern      = self::PREFIX . '%';
		$total_cached = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_' . $pattern ) . '%'
			)
		);

		$stats = array(
			'total_entries' => (int) $total_cached,
			'groups'        => array(),
		);

		// Count entries per group
		foreach ( array_keys( self::CACHE_GROUPS ) as $group ) {
			$group_pattern             = self::PREFIX . $group . '_%';
			$count                     = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s",
					$wpdb->esc_like( '_transient_' . $group_pattern ) . '%'
				)
			);
			$stats['groups'][ $group ] = (int) $count;
		}

		return $stats;
	}
}
