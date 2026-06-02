<?php
/**
 * Migration for creating the POS sessions table.
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
 * Class POSSessions
 *
 * Creates the readypos_sessions table for tracking POS register sessions.
 *
 * @package Readypos\Database\Migrations
 */
class POSSessions implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_sessions';

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
				$table->unsignedBigInteger( 'user_id' );
				$table->unsignedBigInteger( 'outlet_id' );
				$table->unsignedBigInteger( 'register_id' );
				$table->decimal( 'opening_cash', 10, 2 )->default( 0 );
				$table->decimal( 'closing_cash', 10, 2 )->nullable();
				$table->decimal( 'total_sales', 10, 2 )->default( 0 );
				$table->integer( 'total_orders' )->default( 0 );
				$table->decimal( 'total_refunds', 10, 2 )->default( 0 );
				$table->decimal( 'cash_total', 10, 2 )->default( 0 );
				$table->decimal( 'card_total', 10, 2 )->default( 0 );
				$table->string( 'status', 20 )->default( 'open' );
				$table->text( 'notes' )->nullable();
				$table->dateTime( 'opened_at' )->nullable();
				$table->dateTime( 'closed_at' )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// PERFORMANCE FIX: Add index on status for faster active session queries
				$table->index( 'status' );
				$table->index( 'register_id' );
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
