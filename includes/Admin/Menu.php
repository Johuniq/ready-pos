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
			__( 'Overview', 'ready-pos-for-woocommerce' ),
			__( 'Ready POS', 'ready-pos-for-woocommerce' ),
			'readypos_use_pos',
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
				'capability'  => 'readypos_use_pos',
				'menu_slug'   => $plugin_url . '/#/terminal',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Orders', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Orders', 'ready-pos-for-woocommerce' ),
				'capability'  => 'readypos_use_pos',
				'menu_slug'   => $plugin_url . '/#/orders',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Customers', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Customers', 'ready-pos-for-woocommerce' ),
				'capability'  => 'readypos_manage_pos',
				'menu_slug'   => $plugin_url . '/#/customers',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Settings', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Settings', 'ready-pos-for-woocommerce' ),
				'capability'  => 'readypos_manage_pos',
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

		// Upgrade to Pro link (same pattern as WPForms, Yoast, etc.)
		add_submenu_page(
			$this->parent_slug,
			__( 'Upgrade to Pro', 'ready-pos-for-woocommerce' ),
			__( 'Upgrade to Pro', 'ready-pos-for-woocommerce' ),
			'readypos_manage_pos',
			'https://readypos.johuniq.tech',
			null
		);

		// Style the "Upgrade to Pro" menu item to stand out.
		add_action( 'admin_head', array( $this, 'upgrade_menu_style' ) );
	}

	/**
	 * Inject CSS to highlight the "Upgrade to Pro" submenu item.
	 *
	 * @return void
	 */
	public function upgrade_menu_style() {
		$screen = get_current_screen();
		if ( ! $screen ) {
			return;
		}
		$css = '#adminmenu a[href*="readypos.johuniq.tech"]{background:#d63638!important;color:#fff!important;font-weight:600;}';
		$css .= '#adminmenu a[href*="readypos.johuniq.tech"]:hover{background:#b32d2e!important;color:#fff!important;}';
		$css .= '#adminmenu a[href*="readypos.johuniq.tech"] .wp-menu-image::before{color:#fff!important;}';
		wp_add_inline_style( 'admin-menu', $css );
	}

	/**
	 * Callback for the main admin page.
	 *
	 * @return void
	 */
	public function admin_page() {
		if ( ! current_user_can( 'readypos_use_pos' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'ready-pos-for-woocommerce' ) );
		}
		?>
		<div id="myplugin" class="readypos-app"></div>
		<?php
	}
}
