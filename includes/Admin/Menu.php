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
	private $parent_slug = 'readypos';

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
			\Readypos\Core\Roles::REQUIRED_CAP,
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

		$admin_cap = \Readypos\Core\Roles::REQUIRED_CAP;

		$submenu_pages = array(
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'POS Terminal', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'POS Terminal', 'ready-pos-for-woocommerce' ),
				'capability'  => $admin_cap,
				'menu_slug'   => $plugin_url . '/#/terminal',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Orders', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Orders', 'ready-pos-for-woocommerce' ),
				'capability'  => $admin_cap,
				'menu_slug'   => $plugin_url . '/#/orders',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Customers', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Customers', 'ready-pos-for-woocommerce' ),
				'capability'  => $admin_cap,
				'menu_slug'   => $plugin_url . '/#/customers',
				'function'    => null,
			),
			array(
				'parent_slug' => $this->parent_slug,
				'page_title'  => __( 'Settings', 'ready-pos-for-woocommerce' ),
				'menu_title'  => __( 'Settings', 'ready-pos-for-woocommerce' ),
				'capability'  => $admin_cap,
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
			\Readypos\Core\Roles::REQUIRED_CAP,
			'https://readypos.johuniq.tech',
			null
		);

		// Style the "Upgrade to Pro" menu item to stand out.
		add_action( 'admin_enqueue_scripts', array( $this, 'upgrade_menu_style' ) );
	}

	/**
	 * Enqueue inline CSS to highlight the "Upgrade to Pro" submenu item.
	 *
	 * Uses the standard WordPress enqueue API (wp_register_style + wp_add_inline_style)
	 * per WordPress.org plugin guidelines, instead of echoing a raw <style> tag.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return void
	 */
	public function upgrade_menu_style( $hook_suffix = '' ) {
		// Register a tiny dummy stylesheet handle so wp_add_inline_style has a valid target.
		// The src/file parameters are intentionally omitted because we only attach inline CSS.
		wp_register_style( 'readypos-admin-menu', false, array(), READYPOS_VERSION );
		wp_enqueue_style( 'readypos-admin-menu' );

		$inline_css = '
			#adminmenu a[href*="readypos.johuniq.tech"]{background:#d63638!important;color:#fff!important;font-weight:600;}
			#adminmenu a[href*="readypos.johuniq.tech"]:hover{background:#b32d2e!important;color:#fff!important;}
			#adminmenu a[href*="readypos.johuniq.tech"] .wp-menu-image::before{color:#fff!important;}
			.readypos-cache-clear-form{display:inline;}
			.readypos-cache-clear-form .dashicons{vertical-align:middle;}
			a.readypos-upgrade-pro{color:#d63638;font-weight:600;}
		';

		wp_add_inline_style( 'readypos-admin-menu', $inline_css );
	}

	/**
	 * Callback for the main admin page.
	 *
	 * @return void
	 */
	public function admin_page() {
		if ( ! current_user_can( \Readypos\Core\Roles::REQUIRED_CAP ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'ready-pos-for-woocommerce' ) );
		}
		?>
		<div id="readypos-app" class="readypos-app"></div>
		<?php
	}
}
