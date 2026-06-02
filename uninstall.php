<?php
/**
 * Uninstall the plugin.
 *
 * Cleans up POS tables, custom roles, and all plugin options upon plugin uninstallation.
 *
 * @package Readypos
 * @subpackage Database
 */

use Readypos\Database\Migrations\POSOutlets;
use Readypos\Database\Migrations\POSRegisters;
use Readypos\Database\Migrations\POSSessions;
use Readypos\Database\Migrations\POSOrderMeta;
use Readypos\Database\Migrations\POSCustomers;
use Readypos\Database\Migrations\POSGiftCards;
use Readypos\Database\Migrations\POSOutletStock;
use Readypos\Database\Migrations\POSEmployeeShifts;
use Readypos\Core\Roles;

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

require_once __DIR__ . '/vendor/autoload.php';

// Drop POS tables.
POSOutlets::down();
POSRegisters::down();
POSSessions::down();
POSOrderMeta::down();
POSCustomers::down();
POSGiftCards::down();
POSOutletStock::down();
POSEmployeeShifts::down();

// Remove custom roles and capabilities.
Roles::get_instance()->remove_roles();

// Clean up all plugin options.
$options_to_delete = array(
	// License options
	'readypos_license_plan',
	'readypos_license_key',
	'readypos_license_status',
	'readypos_license_expires_at',
	'readypos_license_last_check',
	'readypos_license_type',
	'readypos_license_sites_used',
	'readypos_license_sites_max',
	'readypos_license_customer',
	'readypos_license_portal_url',
	'readypos_license_audit',
	'readypos_license_sig',
	'readypos_activation_id',
	'readypos_polar_activation_id',
	
	// Settings options
	'readypos_receipt_logo',
	'readypos_receipt_header',
	'readypos_receipt_footer',
	'readypos_payment_cash',
	'readypos_payment_card',
	'readypos_keyboard_status',
	'readypos_print_barcode',
	'readypos_cash_drawer_pulse',
	'readypos_receipt_paper_width',
	'readypos_customer_display_message',
	'readypos_max_discount_limit',
	'readypos_pos_order_prefix',
	
	// Onboarding
	'readypos_onboarding_complete',
	
	// Database version
	'readypos_db_version',
);

foreach ( $options_to_delete as $option ) {
	delete_option( $option );
}

// Clean up user meta (if any POS-specific user meta exists)
global $wpdb;
$wpdb->query( "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'readypos_%'" );

// Clear any scheduled cron jobs
wp_clear_scheduled_hook( 'readypos_license_check' );

// Clear all ReadyPOS transients (held orders, PIN attempts, etc.)
global $wpdb;
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_readypos_%' OR option_name LIKE '_transient_timeout_readypos_%'" );

// Clear service worker cache by updating cache version
$current_cache_version = get_option( 'readypos_cache_version', 1 );
update_option( 'readypos_cache_version', $current_cache_version + 1 );

// Force browser cache invalidation by updating asset version
update_option( 'readypos_asset_version', time() );
