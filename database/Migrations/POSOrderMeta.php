<?php
/**
 * Migration for creating the POS order metadata table.
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
 * Class POSOrderMeta
 *
 * Creates the readypos_order_meta table for storing POS-specific order data.
 * Links to WooCommerce orders via wc_order_id.
 *
 * @package Readypos\Database\Migrations
 */
class POSOrderMeta implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_order_meta';

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
				$table->unsignedBigInteger( 'wc_order_id' );
				$table->unsignedBigInteger( 'session_id' )->nullable();
				$table->unsignedBigInteger( 'cashier_id' );
				$table->unsignedBigInteger( 'customer_id' )->nullable();
				$table->string( 'payment_method', 50 )->default( 'cash' );
				$table->decimal( 'cash_received', 10, 2 )->nullable();
				$table->decimal( 'change_given', 10, 2 )->nullable();
				$table->string( 'discount_type', 20 )->nullable();
				$table->decimal( 'discount_value', 10, 2 )->nullable();
				$table->string( 'order_status', 30 )->default( 'completed' );
				$table->text( 'notes' )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();
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
