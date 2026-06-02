<?php
/**
 * Migration for creating the POS outlets table.
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
 * Class POSOutlets
 *
 * Creates the readypos_outlets table for managing store outlets.
 *
 * @package Readypos\Database\Migrations
 */
class POSOutlets implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_outlets';

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
				$table->string( 'name' );
				$table->text( 'address' )->nullable();
				$table->string( 'phone', 50 )->nullable();
				$table->string( 'email' )->nullable();
				$table->text( 'receipt_header' )->nullable();
				$table->text( 'receipt_footer' )->nullable();
				$table->string( 'status', 20 )->default( 'active' );
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
