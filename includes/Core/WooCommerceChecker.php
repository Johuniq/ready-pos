<?php
/**
 * WooCommerce dependency checker.
 *
 * @package Readypos\Core
 * @since 1.0.0
 */

namespace Readypos\Core;

use Readypos\Traits\Base;

/**
 * Class WooCommerceChecker
 *
 * Ensures WooCommerce is active and shows administrative notices if not.
 *
 * @package Readypos\Core
 */
class WooCommerceChecker {

	use Base;

	/**
	 * Check if WooCommerce is active.
	 *
	 * @return bool
	 */
	public function is_wc_active() {
		return class_exists( 'WooCommerce' );
	}

	/**
	 * Initialize notices hooks.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_init', array( $this, 'check_dependency' ) );
	}

	/**
	 * Check dependency and display admin notice if WooCommerce is inactive.
	 *
	 * @return void
	 */
	public function check_dependency() {
		if ( ! $this->is_wc_active() ) {
			add_action( 'admin_notices', array( $this, 'render_wc_missing_notice' ) );
		}
	}

	/**
	 * Render WooCommerce missing admin notice.
	 *
	 * @return void
	 */
	public function render_wc_missing_notice() {
		$class   = 'notice notice-error';
		$message = __( 'Ready POS requires WooCommerce to be installed and active. Please install or activate WooCommerce to use Ready POS.', 'ready-pos' );

		printf( '<div class="%1$s"><p>%2$s</p></div>', esc_attr( $class ), esc_html( $message ) );
	}
}
