<?php
/**
 * Migration for creating the POS registers table.
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
 * Class POSRegisters
 *
 * Creates the readypos_registers table for managing POS registers within outlets.
 *
 * @package Readypos\Database\Migrations
 */
class POSRegisters implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_registers';

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
				$table->string( 'name' );
				$table->string( 'status', 20 )->default( 'closed' );
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
