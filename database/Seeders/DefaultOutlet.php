<?php
/**
 * Seeder for creating a default POS outlet and register.
 *
 * @package Readypos
 * @subpackage Database
 * @since 1.0.0
 */

namespace Readypos\Database\Seeders;

use Readypos\Models\POSOutlet;
use Readypos\Models\POSRegister;

/**
 * Class DefaultOutlet
 *
 * Seeds the default outlet and register on plugin activation.
 *
 * @package Readypos\Database\Seeders
 */
class DefaultOutlet {

	/**
	 * Run the seeder.
	 *
	 * @return void
	 */
	public static function run() {
		// Only seed if no outlets exist.
		if ( POSOutlet::count() > 0 ) {
			return;
		}

		$outlet = POSOutlet::create(
			array(
				'name'           => get_bloginfo( 'name' ) ?: 'Main Store',
				'address'        => '',
				'phone'          => '',
				'email'          => get_option( 'admin_email', '' ),
				'receipt_header' => get_bloginfo( 'name' ) ?: 'Main Store',
				'receipt_footer' => __( 'Thank you for your purchase!', 'ready-pos-for-woocommerce' ),
				'status'         => 'active',
			)
		);

		POSRegister::create(
			array(
				'outlet_id' => $outlet->id,
				'name'      => __( 'Register 1', 'ready-pos-for-woocommerce' ),
				'status'    => 'closed',
			)
		);
	}
}
