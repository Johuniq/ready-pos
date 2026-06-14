<?php
/**
 * Admin Menu registration for Ready POS.
 *
 * @package Readypos\Admin
 * @since 1.0.0
 */

namespace Readypos\Admin;

use Readypos\Traits\Base;

/**
 * Class Menu
 *
 * Configures the WordPress dashboard menus for Ready POS.
 *
 * @package Readypos\Admin
 */
class Menu {

	use Base;

	/**
	 * Parent slug.
	 *
	 * @var string
	 */
	private $parent_slug = 'ready-pos';

	/**
	 * Initialize menu hooks.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'menu' ) );
	}

	/**
	 * Register menus.
	 *
	 * @return void
	 */
	public function menu() {
		add_menu_page(
			__( 'Ready POS', 'ready-pos-for-woocommerce' ),
			__( 'Ready POS', 'ready-pos-for-woocommerce' ),
			'use_pos',
			$this->parent_slug,
			array( $this, 'admin_page' ),
			'dashicons-store',
			56
		);

		$plugin_url = admin_url( '/admin.php?page=' . $this->parent_slug );
		$current_page = get_admin_page_parent();

		if ( $current_page === $this->parent_slug ) {
			$plugin_url = '';
		}

		$submenu_pages = array(
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'POS Terminal', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'POS Terminal', 'ready-pos-for-woocommerce' ),
				'capability'  => 'use_pos',
				'menu_slug'   => $plugin_url . '/#/terminal',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Orders', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Orders', 'ready-pos-for-woocommerce' ),
				'capability'  => 'use_pos',
				'menu_slug'   => $plugin_url . '/#/orders',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Customers', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Customers', 'ready-pos-for-woocommerce' ),
				'capability'  => 'manage_pos',
				'menu_slug'   => $plugin_url . '/#/customers',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Outlets', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Outlets', 'ready-pos-for-woocommerce' ),
				'capability'  => 'manage_pos',
				'menu_slug'   => $plugin_url . '/#/outlets',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Settings', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Settings', 'ready-pos-for-woocommerce' ),
				'capability'  => 'manage_pos',
				'menu_slug'   => $plugin_url . '/#/settings',
				'function'    => null,
			),
		);

		$plugin_submenu_pages = apply_filters( 'readypos_submenu_pages', $submenu_pages );

		foreach ( $plugin_submenu_pages as $submenu ) {
			add_submenu_page(
				$submenu['parent_slug'],
				$submenu['page_title'],
				$submenu['menu_title'],
				$submenu['capability'],
				$submenu['menu_slug'],
				$submenu['function']
			);
		}
	}

	/**
	 * Callback for the main admin page.
	 *
	 * @return void
	 */
	public function admin_page() {
		if ( ! current_user_can( 'use_pos' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'ready-pos-for-woocommerce' ) );
		}
		?>
		<div id="myplugin" class="readypos-app"></div>
		<?php
	}
}
