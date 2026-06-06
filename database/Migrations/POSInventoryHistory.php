<?php
/**
 * Migration for creating the POS inventory history table.
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
 * Class POSInventoryHistory
 *
 * Creates the readypos_inventory_history table for tracking all inventory movements.
 *
 * @package Readypos\Database\Migrations
 */
class POSInventoryHistory implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_inventory_history';

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
				$table->unsignedBigInteger( 'product_id' );
				$table->string( 'transaction_type', 50 ); // 'purchase_order', 'sale', 'transfer_in', 'transfer_out', 'adjustment', 'count'
				$table->decimal( 'quantity_before', 10, 2 );
				$table->decimal( 'quantity_change', 10, 2 ); // Positive for increase, negative for decrease
				$table->decimal( 'quantity_after', 10, 2 );
				$table->unsignedBigInteger( 'reference_id' )->nullable(); // ID of related order/transfer/adjustment
				$table->string( 'reference_type', 50 )->nullable(); // 'order', 'transfer', 'adjustment', 'count'
				$table->text( 'notes' )->nullable();
				$table->unsignedBigInteger( 'user_id' );
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Add indices
				$table->index( array( 'outlet_id', 'product_id' ) );
				$table->index( 'transaction_type' );
				$table->index( array( 'reference_id', 'reference_type' ) );
				$table->index( 'created_at' );
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
