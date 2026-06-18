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
		// POS-critical groups: very short TTLs so the terminal always reflects
		// the latest state (cash totals, open orders, drawer balance, etc.)
		// without waiting for a full minute. These groups are invalidated
		// aggressively on every write, so the short TTL is mostly a
		// defense-in-depth safety net against missed cache busts.
		'sessions'        => 5,      // 5s  - open session, cash drawer, current user
		'orders'          => 5,      // 5s  - order list, today sales, report aggregations
		'customers'       => 10,     // 10s - customer list, search, loyalty totals
		'products'        => 30,     // 30s - product grid (heaviest endpoint)
		'payment_methods' => 60,     // 60s - payment methods used in checkout
		// Slower-changing groups: short enough to feel "instant" if a write
		// is missed, but long enough to avoid hammering the DB on data that
		// is essentially static at the terminal.
		'categories'      => 60,     // 60s - product categories
		'settings'        => 60,     // 60s - POS settings, display prefs
		'taxes'           => 60,     // 60s - tax rate lookups
		'outlets'         => 60,     // 60s - outlet metadata
		'registers'       => 60,     // 60s - register list, current register
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

		// Use group-specific expiration or provided expiration or default.
		// `0` and `null` are both treated as "use the group default" so that
		// controllers can opt into the central CACHE_GROUPS TTL by passing
		// either value. (Previously only `null` worked; the previous
		// behavior made the new shorter TTLs unreachable.)
		if ( null === $expiration || 0 === $expiration ) {
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

		$pattern = self::PREFIX . $group . '_';
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

		$pattern = self::PREFIX;
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
// Map entity types to cache groups. Each entry lists every group
			// whose cached entries could be affected by a write to that
			// entity. The rule of thumb for a POS: when in doubt, invalidate
			// the whole group, because stale data is more costly than a few
			// extra DB reads.
			$entity_group_map = array(
				'product'         => array( 'products', 'categories' ),
				'product_stock'   => array( 'products', 'orders' ),
				'category'        => array( 'categories', 'products' ),
				// Orders also affect customer loyalty totals and the open
				// session's sale count / cash totals, so the customers +
				// sessions + orders groups must be cleared when an order is
				// created, refunded, or updated.
				'order'           => array( 'orders', 'sessions', 'customers', 'payment_methods' ),
				'refund'          => array( 'orders', 'sessions', 'customers' ),
				'customer'        => array( 'customers', 'orders' ),
				'outlet'          => array( 'outlets', 'registers' ),
				'register'        => array( 'registers', 'outlets', 'sessions' ),
				'register_session' => array( 'registers', 'sessions' ),
				// Pay In / Pay Out / cash adjustments update session cash_total
				// and are reflected in today's report aggregations, so we
				// must cascade to both groups.
				'cash_adjustment' => array( 'sessions', 'orders' ),
				'session'         => array( 'sessions' ),
				'setting'         => array( 'settings', 'payment_methods', 'taxes' ),
				'payment_method'  => array( 'payment_methods', 'settings' ),
				'tax'             => array( 'taxes', 'settings' ),
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
