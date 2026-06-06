<?php
/**
 * Migration for creating the POS inventory count items table.
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
 * Class POSInventoryCountItems
 *
 * Creates the readypos_inventory_count_items table for tracking individual product counts.
 *
 * @package Readypos\Database\Migrations
 */
class POSInventoryCountItems implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_inventory_count_items';

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
				$table->unsignedBigInteger( 'count_id' );
				$table->unsignedBigInteger( 'product_id' );
				$table->decimal( 'expected_quantity', 10, 2 )->default( 0 ); // System stock
				$table->decimal( 'counted_quantity', 10, 2 )->nullable(); // Actual count
				$table->decimal( 'variance', 10, 2 )->default( 0 ); // Difference
				$table->string( 'variance_reason', 255 )->nullable();
				$table->boolean( 'is_counted' )->default( false );
				$table->string( 'scanner_id', 100 )->nullable(); // Scanner/barcode ID used
				$table->unsignedBigInteger( 'counted_by' )->nullable();
				$table->dateTime( 'counted_at' )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Add indices
				$table->index( array( 'count_id', 'product_id' ) );
				$table->index( 'is_counted' );
				$table->unique( array( 'count_id', 'product_id' ), 'count_product_unique' );
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
