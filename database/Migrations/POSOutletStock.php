<?php
/**
 * Migration for creating the POS outlet stock table.
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
 * Class POSOutletStock
 *
 * Creates the readypos_outlet_stock table.
 *
 * @package Readypos\Database\Migrations
 */
class POSOutletStock implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_outlet_stock';

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
				$table->unsignedBigInteger( 'product_id' ); // WooCommerce product or variation ID
				$table->decimal( 'stock_quantity', 10, 2 )->default( 0 );
				$table->integer( 'low_stock_threshold' )->default( 5 );
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Add indices
				$table->index( array( 'outlet_id', 'product_id' ) );
				// SECURITY FIX #7: Add unique constraint for atomic INSERT...ON DUPLICATE KEY UPDATE
				$table->unique( array( 'outlet_id', 'product_id' ), 'outlet_product_unique' );
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
