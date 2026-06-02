<?php
/**
 * Migration for creating the audit log table.
 *
 * SECURITY FIX #17: Comprehensive audit logging system
 *
 * @package Readypos
 * @subpackage Database
 * @since 1.0.2
 */

namespace Readypos\Database\Migrations;

use Readypos\Interfaces\Migration;
use Prappo\WpEloquent\Database\Capsule\Manager as Capsule;
use Prappo\WpEloquent\Database\Schema\Blueprint;
use Prappo\WpEloquent\Support\Facades\Schema;

/**
 * Class AuditLog
 *
 * Creates the readypos_audit_log table.
 *
 * @package Readypos\Database\Migrations
 */
class AuditLog implements Migration {

	/**
	 * Table name.
	 *
	 * @var string
	 */
	private static $table = 'readypos_audit_log';

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
				$table->string( 'event_type', 50 ); // authentication, access, data_change, security, financial, system
				$table->string( 'action', 100 );    // login, logout, create, update, delete, etc.
				$table->text( 'description' );      // Human-readable description
				$table->string( 'severity', 20 )->default( 'info' ); // info, warning, error, critical
				$table->unsignedBigInteger( 'user_id' )->nullable();
				$table->string( 'user_name', 100 )->nullable();
				$table->string( 'user_role', 100 )->nullable();
				$table->string( 'ip_address', 45 ); // IPv6 max length
				$table->string( 'user_agent', 255 )->nullable();
				$table->string( 'url', 500 )->nullable();
				$table->text( 'metadata' )->nullable(); // JSON encoded additional data
				$table->dateTime( 'created_at' );

				// Indexes for performance
				$table->index( 'event_type' );
				$table->index( 'action' );
				$table->index( 'severity' );
				$table->index( 'user_id' );
				$table->index( 'ip_address' );
				$table->index( 'created_at' );
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

