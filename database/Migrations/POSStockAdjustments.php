<?php
/**
 * POS Stock Adjustments Migration
 *
 * Creates table for stock adjustment tracking with reasons
 *
 * @package Readypos
 */

namespace Readypos\Database\Migrations;

use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;

/**
 * POSStockAdjustments Migration Class
 */
class POSStockAdjustments {

	/**
	 * Table name
	 *
	 * @var string
	 */
	private static $table = 'readypos_stock_adjustments';

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
				$table->string( 'adjustment_number', 50 )->unique();
				$table->unsignedBigInteger( 'outlet_id' );
				$table->unsignedBigInteger( 'product_id' );
				$table->unsignedBigInteger( 'adjusted_by' ); // User ID
				$table->string( 'adjustment_type', 20 ); // increase, decrease, set
				$table->decimal( 'previous_quantity', 10, 2 );
				$table->decimal( 'adjustment_quantity', 10, 2 );
				$table->decimal( 'new_quantity', 10, 2 );
				$table->string( 'reason', 100 ); // damaged, lost, found, expired, theft, recount, etc.
				$table->text( 'notes' )->nullable();
				$table->decimal( 'cost_impact', 10, 2 )->default( 0 ); // Financial impact
				$table->dateTime( 'created_at' )->nullable();

				// Indexes
				$table->index( 'adjustment_number' );
				$table->index( 'outlet_id' );
				$table->index( 'product_id' );
				$table->index( 'reason' );
				$table->index( 'created_at' );
			}
		);
	}

	/**
	 * Reverse the migrations.
	 */
	public static function down() {
		Capsule::schema()->dropIfExists( self::$table );
	}
}
