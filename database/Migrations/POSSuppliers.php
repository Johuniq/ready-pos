<?php
/**
 * POS Suppliers Migration
 *
 * Creates table for supplier management
 *
 * @package Readypos
 */

namespace Readypos\Database\Migrations;

use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;

/**
 * POSSuppliers Migration Class
 */
class POSSuppliers {

	/**
	 * Table name
	 *
	 * @var string
	 */
	private static $table = 'readypos_suppliers';

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
				$table->string( 'supplier_code', 50 )->unique();
				$table->string( 'supplier_name', 200 );
				$table->string( 'contact_person', 200 )->nullable();
				$table->string( 'email', 200 )->nullable();
				$table->string( 'phone', 50 )->nullable();
				$table->text( 'address' )->nullable();
				$table->string( 'city', 100 )->nullable();
				$table->string( 'state', 100 )->nullable();
				$table->string( 'zip_code', 20 )->nullable();
				$table->string( 'country', 100 )->nullable();
				$table->text( 'notes' )->nullable();
				$table->string( 'payment_terms', 100 )->nullable(); // NET30, NET60, etc.
				$table->integer( 'lead_time_days' )->default( 7 );
				$table->string( 'status', 20 )->default( 'active' ); // active, inactive
				$table->dateTime( 'created_at' )->nullable();
				$table->dateTime( 'updated_at' )->nullable();

				// Indexes
				$table->index( 'supplier_code' );
				$table->index( 'supplier_name' );
				$table->index( 'status' );
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
