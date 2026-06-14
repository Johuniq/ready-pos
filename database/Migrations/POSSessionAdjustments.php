<?php
/**
 * Migration for creating the POS session cash adjustments table.
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
 * Class POSSessionAdjustments
 *
 * Creates the readypos_session_adjustments table for tracking manual
 * pay-in / pay-out cash movements against an open register session.
 *
 * @package Readypos\Database\Migrations
 */
class POSSessionAdjustments implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_session_adjustments';

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
				$table->unsignedBigInteger( 'session_id' );
				$table->unsignedBigInteger( 'user_id' );
				$table->string( 'type', 20 ); // 'pay_in' or 'pay_out'
				$table->decimal( 'amount', 10, 2 );
				$table->string( 'reason', 255 )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				$table->index( 'session_id' );
				$table->index( 'type' );
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
