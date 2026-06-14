<?php
/**
 * Database Transaction Manager
 *
 * @package Readypos\Core\Architecture\Transaction
 */

namespace Readypos\Core\Architecture\Transaction;

use Exception;

defined( 'ABSPATH' ) || exit;

/**
 * Class Manager
 *
 * Manages database transactions across raw WPDB queries and Eloquent ORM.
 */
class Manager {

	/**
	 * Run a closure inside a database transaction block
	 *
	 * @param callable $callback Operation to perform.
	 * @return mixed Return value of the callback.
	 * @throws Exception Re-throws exceptions after rollback.
	 */
	public function transaction( callable $callback ) {
		global $wpdb;

		// Start transaction
		$wpdb->query( 'START TRANSACTION' );

		try {
			$result = call_user_func( $callback );
			
			// Commit transaction
			$wpdb->query( 'COMMIT' );
			return $result;
		} catch ( Exception $e ) {
			// Rollback transaction on failure
			$wpdb->query( 'ROLLBACK' );
			throw $e;
		}
	}
}
