<?php
/**
 * POS Returns Migration
 *
 * Creates table for tracking returns and exchanges
 *
 * @package Readypos
 */

namespace Readypos\Database\Migrations;

use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;

/**
 * POSReturns Migration Class
 */
class POSReturns {

	/**
	 * Table name
	 *
	 * @var string
	 */
	private static $table = 'readypos_returns';

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
				$table->unsignedBigInteger( 'original_order_id' ); // WooCommerce order ID
				$table->unsignedBigInteger( 'return_order_id' )->nullable(); // New WC order if exchange
				$table->unsignedBigInteger( 'session_id' )->nullable();
				$table->unsignedBigInteger( 'cashier_id' );
				$table->unsignedBigInteger( 'customer_id' )->nullable();
				$table->string( 'return_type', 20 )->default( 'refund' ); // refund, exchange, store_credit
				$table->string( 'return_status', 20 )->default( 'pending' ); // pending, approved, completed, rejected
				$table->decimal( 'return_amount', 10, 2 )->default( 0 );
				$table->decimal( 'restocking_fee', 10, 2 )->default( 0 );
				$table->decimal( 'refund_amount', 10, 2 )->default( 0 ); // After restocking fee
				$table->string( 'refund_method', 50 )->nullable(); // cash, card, store_credit
				$table->string( 'return_reason', 100 )->nullable();
				$table->text( 'return_notes' )->nullable();
				$table->boolean( 'restock_items' )->default( true );
				$table->text( 'items' )->nullable(); // JSON array of returned items
				$table->dateTime( 'processed_at' )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Indexes for performance
				$table->index( 'original_order_id' );
				$table->index( 'return_order_id' );
				$table->index( 'session_id' );
				$table->index( 'return_status' );
				$table->index( 'return_type' );
				$table->index( 'customer_id' );
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
