<?php
/**
 * POS Stock Transfers Migration
 *
 * Creates table for stock transfer tracking between outlets
 *
 * @package Readypos
 */

namespace Readypos\Database\Migrations;

use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;

/**
 * POSStockTransfers Migration Class
 */
class POSStockTransfers {

	/**
	 * Table name
	 *
	 * @var string
	 */
	private static $table = 'readypos_stock_transfers';

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
				$table->string( 'transfer_number', 50 )->unique();
				$table->unsignedBigInteger( 'from_outlet_id' );
				$table->unsignedBigInteger( 'to_outlet_id' );
				$table->unsignedBigInteger( 'requested_by' ); // User ID
				$table->unsignedBigInteger( 'approved_by' )->nullable(); // User ID
				$table->unsignedBigInteger( 'received_by' )->nullable(); // User ID
				$table->string( 'status', 20 )->default( 'pending' ); // pending, approved, rejected, in_transit, received, cancelled
				$table->text( 'items' )->nullable(); // JSON array of items
				$table->text( 'notes' )->nullable();
				$table->string( 'reason', 100 )->nullable(); // stock_balancing, emergency, seasonal, etc.
				$table->dateTime( 'requested_at' )->nullable();
				$table->dateTime( 'approved_at' )->nullable();
				$table->dateTime( 'shipped_at' )->nullable();
				$table->dateTime( 'received_at' )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Indexes
				$table->index( 'transfer_number' );
				$table->index( 'from_outlet_id' );
				$table->index( 'to_outlet_id' );
				$table->index( 'status' );
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
