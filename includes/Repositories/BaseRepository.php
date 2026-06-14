<?php
/**
 * Base Repository Class
 *
 * @package Readypos\Repositories
 */

namespace Readypos\Repositories;

defined( 'ABSPATH' ) || exit;

/**
 * Class BaseRepository
 *
 * Abstract base class for handling repository logic and caching.
 */
abstract class BaseRepository {

	/**
	 * Invalidate cache key
	 *
	 * @param string $entity Entity key.
	 * @param int    $id Entity ID.
	 * @return void
	 */
	protected function invalidate_cache( $entity, $id = null ) {
		\Readypos\Utils\Cache::invalidate( $entity, $id );
	}
}
