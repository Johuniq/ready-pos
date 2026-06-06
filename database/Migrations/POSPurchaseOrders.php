<?php
/**
 * POS Purchase Orders Migration
 *
 * Creates table for purchase order management
 *
 * @package Readypos
 */

namespace Readypos\Database\Migrations;

use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;

/**
 * POSPurchaseOrders Migration Class
 */
class POSPurchaseOrders {

	/**
	 * Table name
	 *
	 * @var string
	 */
	private static $table = 'readypos_purchase_orders';

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
				$table->string( 'po_number', 50 )->unique();
				$table->unsignedBigInteger( 'supplier_id' );
				$table->unsignedBigInteger( 'outlet_id' );
				$table->unsignedBigInteger( 'created_by' ); // User ID
				$table->string( 'status', 20 )->default( 'draft' ); // draft, submitted, approved, received, cancelled
				$table->decimal( 'total_amount', 10, 2 )->default( 0 );
				$table->decimal( 'tax_amount', 10, 2 )->default( 0 );
				$table->decimal( 'shipping_cost', 10, 2 )->default( 0 );
				$table->decimal( 'grand_total', 10, 2 )->default( 0 );
				$table->text( 'items' )->nullable(); // JSON array of items
				$table->text( 'notes' )->nullable();
				$table->dateTime( 'expected_delivery_date' )->nullable();
				$table->dateTime( 'actual_delivery_date' )->nullable();
				$table->dateTime( 'submitted_at' )->nullable();
				$table->dateTime( 'approved_at' )->nullable();
				$table->dateTime( 'received_at' )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Indexes
				$table->index( 'po_number' );
				$table->index( 'supplier_id' );
				$table->index( 'outlet_id' );
				$table->index( 'status' );
				$table->index( 'expected_delivery_date' );
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
