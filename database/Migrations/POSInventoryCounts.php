<?php
/**
 * Migration for creating the POS inventory counts table.
 *
 * @package Readypos
 * @subpackage Database
 * @since 1.0.0
 */

namespace Readypos\Database\Migrations;

use Readypos\Interfaces\Migration;
use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;
use Prappo\WpEloquent\Support\Facades\Schema;

/**
 * Class POSInventoryCounts
 *
 * Creates the readypos_inventory_counts table for tracking inventory counting sessions.
 *
 * @package Readypos\Database\Migrations
 */
class POSInventoryCounts implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_inventory_counts';

	/**
	 * Run the migrations.
	 */
	public static function up() {
		if ( Capsule::schema()->hasTable( self::$table ) ) {
			return;
		}
		Capsule::schema()->create(
			self::$table,
			function ( Blueprint $table ) {
				$table->id();
				$table->unsignedBigInteger( 'outlet_id' );
				$table->string( 'count_type', 50 ); // 'cycle', 'full', 'spot'
				$table->string( 'status', 50 )->default( 'in_progress' ); // 'in_progress', 'completed', 'cancelled'
				$table->string( 'name', 255 );
				$table->text( 'notes' )->nullable();
				$table->unsignedBigInteger( 'created_by' );
				$table->unsignedBigInteger( 'completed_by' )->nullable();
				$table->dateTime( 'started_at' );
				$table->dateTime( 'completed_at' )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Add indices
				$table->index( array( 'outlet_id', 'status' ) );
				$table->index( 'count_type' );
				$table->index( 'created_by' );
			}
		);
	}

	/**
	 * Reverse the migrations.
	 */
	public static function down() {
		Schema::dropIfExists( self::$table );
	}
}
