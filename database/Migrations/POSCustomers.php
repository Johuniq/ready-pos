<?php
/**
 * Migration for creating the POS customers table.
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
 * Class POSCustomers
 *
 * Creates the readypos_customers table for POS-specific customer data.
 * Links to WooCommerce customer IDs where applicable.
 *
 * @package Readypos\Database\Migrations
 */
class POSCustomers implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_customers';

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
				$table->unsignedBigInteger( 'wc_customer_id' )->nullable();
				$table->string( 'first_name' );
				$table->string( 'last_name' )->nullable();
				$table->string( 'email' )->nullable();
				$table->string( 'phone', 50 )->nullable();
				$table->integer( 'loyalty_points' )->default( 0 );
				$table->decimal( 'total_spent', 10, 2 )->default( 0 );
				$table->integer( 'visit_count' )->default( 0 );
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
