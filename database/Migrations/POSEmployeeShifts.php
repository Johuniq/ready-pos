<?php
/**
 * Migration for creating the POS employee shifts table.
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
 * Class POSEmployeeShifts
 *
 * Creates the readypos_employee_shifts table.
 *
 * @package Readypos\Database\Migrations
 */
class POSEmployeeShifts implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_employee_shifts';

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
				$table->unsignedBigInteger( 'session_id' )->nullable();
				$table->dateTime( 'clock_in_at' );
				$table->dateTime( 'clock_out_at' )->nullable();
				$table->text( 'notes' )->nullable();
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Indices
				$table->index( 'user_id' );
				$table->index( 'session_id' );
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
