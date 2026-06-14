<?php
/**
 * Migration: Add outlet-specific configuration fields
 *
 * Adds support for:
 * - Custom pricing per outlet
 * - Outlet-specific tax rates
 * - Payment methods configuration per outlet
 *
 * @package Readypos\Database\Migrations
 * @since 1.0.0
 */

namespace Readypos\Database\Migrations;

use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;

defined( 'ABSPATH' ) || exit;

/**
 * Class AddOutletConfiguration
 *
 * Adds configuration columns to readypos_outlets table.
 *
 * @package Readypos\Database\Migrations
 */
class AddOutletConfiguration {

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
		if ( ! Capsule::schema()->hasTable( self::$table ) ) {
			return;
		}

		Capsule::schema()->table(
			self::$table,
			function ( Blueprint $table ) {
				// Check if columns don't exist before adding
				if ( ! Capsule::schema()->hasColumn( self::$table, 'code' ) ) {
					$table->string( 'code', 32 )->nullable()->unique()->after( 'name' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'city' ) ) {
					$table->string( 'city', 100 )->nullable()->after( 'address' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'state' ) ) {
					$table->string( 'state', 100 )->nullable()->after( 'city' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'zip_code' ) ) {
					$table->string( 'zip_code', 20 )->nullable()->after( 'state' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'country' ) ) {
					$table->string( 'country', 100 )->nullable()->after( 'zip_code' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'manager_id' ) ) {
					$table->unsignedBigInteger( 'manager_id' )->nullable()->after( 'email' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'default_register_id' ) ) {
					$table->unsignedBigInteger( 'default_register_id' )->nullable()->after( 'manager_id' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'pricing_config' ) ) {
					$table->text( 'pricing_config' )->nullable()->comment( 'JSON: outlet-specific pricing rules' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'tax_config' ) ) {
					$table->text( 'tax_config' )->nullable()->comment( 'JSON: outlet-specific tax rates' );
				}
				if ( ! Capsule::schema()->hasColumn( self::$table, 'payment_methods' ) ) {
					$table->text( 'payment_methods' )->nullable()->comment( 'JSON: enabled payment methods' );
				}
			}
		);
	}

	/**
	 * Reverse the migrations.
	 */
	public static function down() {
		if ( ! Capsule::schema()->hasTable( self::$table ) ) {
			return;
		}

		Capsule::schema()->table(
			self::$table,
			function ( Blueprint $table ) {
				$columns_to_drop = array( 'code', 'city', 'state', 'zip_code', 'country', 'manager_id', 'default_register_id', 'pricing_config', 'tax_config', 'payment_methods' );
				foreach ( $columns_to_drop as $column ) {
					if ( Capsule::schema()->hasColumn( self::$table, $column ) ) {
						$table->dropColumn( $column );
					}
				}
			}
		);
	}
}
