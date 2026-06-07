<?php
/**
 * Cacheable Trait
 *
 * Provides caching functionality to controllers.
 *
 * @package Readypos\Traits
 */

namespace Readypos\Traits;

use Readypos\Utils\Cache;

/**
 * Cacheable trait for adding caching to controller methods.
 */
trait Cacheable {

	/**
	 * Cache a REST API response
	 *
	 * @param string   $key Cache key.
	 * @param callable $callback Callback to generate response if not cached.
	 * @param string   $group Cache group.
	 * @param int      $expiration Cache expiration in seconds (optional).
	 * @return \WP_REST_Response Cached or fresh response.
	 */
	protected function cache_response( $key, $callback, $group = 'default', $expiration = null ) {
		// Check if caching is disabled
		if ( defined( 'READYPOS_DISABLE_CACHE' ) && READYPOS_DISABLE_CACHE ) {
			return call_user_func( $callback );
		}

		// Include request parameters in cache key for GET requests
		if ( isset( $_SERVER['REQUEST_METHOD'] ) && 'GET' === $_SERVER['REQUEST_METHOD'] ) {
			$params = isset( $_GET ) ? $_GET : array();
			unset( $params['_wpnonce'] ); // Remove nonce from cache key
			$key .= '_' . md5( wp_json_encode( $params ) );
		}

		$cached = Cache::get( $key, $group );

		if ( false !== $cached ) {
			// Return cached response with cache header
			if ( $cached instanceof \WP_REST_Response ) {
				$cached->header( 'X-ReadyPOS-Cache', 'HIT' );
				return $cached;
			}
			// If cached data is not a WP_REST_Response, wrap it
			$response = new \WP_REST_Response( $cached, 200 );
			$response->header( 'X-ReadyPOS-Cache', 'HIT' );
			return $response;
		}

		// Generate fresh response
		$response = call_user_func( $callback );

		// Cache the response
		if ( $response instanceof \WP_REST_Response && 200 === $response->get_status() ) {
			Cache::set( $key, $response->get_data(), $group, $expiration );
			$response->header( 'X-ReadyPOS-Cache', 'MISS' );
		}

		return $response;
	}

	/**
	 * Clear cache for specific group
	 *
	 * @param string $group Cache group.
	 * @return void
	 */
	protected function clear_cache( $group ) {
		Cache::clear_group( $group );
	}

	/**
	 * Invalidate related caches when data changes
	 *
	 * @param string $entity Entity type.
	 * @param int    $entity_id Entity ID (optional).
	 * @return void
	 */
	protected function invalidate_cache( $entity, $entity_id = null ) {
		Cache::invalidate( $entity, $entity_id );
	}
}
