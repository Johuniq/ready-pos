<?php
/**
 * Migration for creating the POS gift cards / store credit table.
 *
 * @package Readypos
 * @subpackage Database
 * @since 1.1.0
 */

namespace Readypos\Database\Migrations;

use Readypos\Interfaces\Migration;
use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;
use Prappo\WpEloquent\Support\Facades\Schema;

/**
 * Class POSGiftCards
 *
 * Creates the readypos_gift_cards table for store credit and gift card balances.
 *
 * @package Readypos\Database\Migrations
 */
class POSGiftCards implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_gift_cards';

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
				$table->string( 'code', 64 )->unique();
				$table->enum( 'type', array( 'gift_card', 'store_credit' ) )->default( 'gift_card' );
				$table->decimal( 'initial_balance', 10, 2 )->default( 0 );
				$table->decimal( 'balance', 10, 2 )->default( 0 );
				$table->unsignedBigInteger( 'customer_id' )->nullable();
				$table->unsignedBigInteger( 'issued_by' )->nullable();
				$table->string( 'status', 20 )->default( 'active' );
				$table->dateTime( 'expires_at' )->nullable();
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
