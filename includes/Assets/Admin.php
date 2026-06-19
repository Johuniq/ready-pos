<?php
/**
 * Admin Assets Enqueue.
 *
 * @package Readypos\Assets
 * @since 1.0.0
 */

declare(strict_types=1);

namespace Readypos\Assets;

use Readypos\Traits\Base;
use Readypos\Libs\Assets;

/**
 * Class Admin
 *
 * Handles enqueuing React assets for the admin pages.
 *
 * @package Readypos\Assets
 */
class Admin {

	use Base;

	/**
	 * Script handle.
	 */
	const HANDLE = 'readypos-admin';

	/**
	 * Localized JS global object name.
	 * Prefixed with 'readypos_' to avoid naming collisions per WordPress.org guidelines.
	 */
	const OBJ_NAME = 'readypos_admin';

	/**
	 * Dev entry script.
	 */
	const DEV_SCRIPT = 'src/admin/main.jsx';

	/**
	 * Allowed screens for script enqueue.
	 *
	 * @var array
	 */
	private $allowed_screens = array(
		'toplevel_page_readypos',
	);

	/**
	 * Bootstrap assets actions.
	 *
	 * @return void
	 */
	public function bootstrap() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_script' ) );
		add_filter( 'admin_footer_text', array( $this, 'custom_footer' ) );
		add_filter( 'update_footer', array( $this, 'custom_footer_version' ), 99 );
		add_action( 'admin_notices', array( $this, 'show_cache_notice' ) );
		add_filter( 'style_loader_tag', array( $this, 'manifest_style_tag' ), 10, 2 );
	}

	/**
	 * Show admin notice when cache is cleared.
	 *
	 * @return void
	 */
	public function show_cache_notice() {
		// Only show on Ready POS pages
		$screen = get_current_screen();
		if ( ! $screen || ! in_array( $screen->id, $this->allowed_screens, true ) ) {
			return;
		}

		// Check if cache was just cleared
		if ( isset( $_GET['readypos_cache_cleared'] ) && '1' === sanitize_text_field( wp_unslash( $_GET['readypos_cache_cleared'] ) ) ) {
			?>
			<div class="notice notice-success is-dismissible">
				<p>
					<strong><?php esc_html_e( 'Ready POS:', 'ready-pos-for-woocommerce' ); ?></strong>
					<?php esc_html_e( 'All caches have been cleared successfully. Please refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) to see the latest changes.', 'ready-pos-for-woocommerce' ); ?>
				</p>
			</div>
			<?php
		}
	}

	/**
	 * Enqueue assets.
	 *
	 * @param string $screen Current admin screen ID.
	 * @return void
	 */
	public function enqueue_script( $screen ) {
		if ( in_array( $screen, $this->allowed_screens, true ) ) {
			Assets\enqueue_asset(
				\READYPOS_DIR . '/assets/admin/dist',
				self::DEV_SCRIPT,
				$this->get_config()
			);
			wp_localize_script( self::HANDLE, self::OBJ_NAME, $this->get_data() );

			// PWA: enqueue manifest link and theme-color meta tag.
			wp_enqueue_style( 'readypos-manifest', plugins_url( 'assets/manifest.json', READYPOS_PLUGIN_FILE ), array(), READYPOS_VERSION );
			add_action( 'admin_head', array( $this, 'output_pwa_meta' ) );

			// SECURITY FIX #WP.ORG-2: Use wp_enqueue_script instead of inline <script> tags
			add_action(
				'admin_footer',
				function () {
					// Register and enqueue a handle for the service worker inline script
					wp_register_script( 'readypos-sw-registration', false, array(), false, true ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
					wp_enqueue_script( 'readypos-sw-registration' );

					$sw_url = plugins_url( 'assets/sw.js', READYPOS_PLUGIN_FILE );
					$cache_version = get_option( 'readypos_cache_version', 1 );
					
					$sw_script = "
					// Set cache version for service worker
					self.READYPOS_CACHE_VERSION = 'v" . esc_js( $cache_version ) . "';
					
					if ('serviceWorker' in navigator) {
						window.addEventListener('load', function() {
							navigator.serviceWorker.register('" . esc_url( $sw_url ) . "?v=" . esc_js( $cache_version ) . "', { scope: '/wp-admin/' })
								.then(function(reg) { /* SW registered */ })
								.catch(function(err) { /* SW registration failed */ });
						});
					}
					";
					
					wp_add_inline_script( 'readypos-sw-registration', $sw_script );
				}
			);
		}
	}

	/**
	 * Output PWA theme-color meta tag and preconnect for manifest in admin head.
	 *
	 * Note: WordPress has no wp_enqueue_* API for <link rel="manifest"> or <meta>.
	 * We use wp_resource_hints for the manifest URL and output the meta tag directly.
	 *
	 * @return void
	 */
	public function output_pwa_meta() {
		echo '<meta name="theme-color" content="#2563eb">' . "\n";
	}

	/**
	 * Change the rel attribute for the manifest stylesheet tag.
	 *
	 * @param string $html    The link tag HTML.
	 * @param string $handle  The stylesheet handle.
	 * @return string Modified HTML.
	 */
	public function manifest_style_tag( $html, $handle ) {
		if ( 'readypos-manifest' === $handle ) {
			$html = str_replace( "rel='stylesheet'", "rel='manifest'", $html );
		}
		return $html;
	}

	/**
	 * Asset config.
	 *
	 * @return array
	 */
	public function get_config() {
		return array(
			'dependencies' => array( 'react', 'react-dom' ),
			'handle'       => self::HANDLE,
			'in-footer'    => true,
		);
	}

	/**
	 * Data passed to React application.
	 *
	 * @return array
	 */
	public function get_data() {
		return array(
			'isAdmin'             => is_admin(),
			'apiUrl'              => rest_url( READYPOS_ROUTE_PREFIX ),
			'restNonce'           => wp_create_nonce( 'wp_rest' ),
			'userInfo'            => $this->get_user_data(),
			'currency'            => $this->get_currency_data(),
			'onboardingComplete'  => get_option( 'readypos_onboarding_complete', 'no' ) === 'yes',
			'pluginUrl'           => plugins_url( '', READYPOS_PLUGIN_FILE ),
			'assetsUrl'           => plugins_url( 'assets', READYPOS_PLUGIN_FILE ),
		);
	}

	/**
	 * Get current user data.
	 *
	 * @return array
	 */
	private function get_user_data() {
		$username   = '';
		$avatar_url = '';
		$roles      = array();

		if ( is_user_logged_in() ) {
			$current_user = wp_get_current_user();
			$username     = $current_user->display_name;
			$avatar_url   = get_avatar_url( $current_user->ID );
			$roles        = (array) $current_user->roles;
		}

		return array(
			'username' => $username,
			'avatar'   => $avatar_url,
			'roles'    => $roles,
		);
	}

	/**
	 * Custom footer text for Ready POS admin pages.
	 *
	 * @param string $text Default footer text.
	 * @return string
	 */
	public function custom_footer( $text ) {
		$screen = get_current_screen();
		if ( $screen && in_array( $screen->id, $this->allowed_screens, true ) ) {
			return sprintf(
				'<span id="footer-thankyou">%s <a href="https://wordpress.org/plugins/ready-pos/" target="_blank" rel="noopener">%s</a></span>',
				__( 'Ready POS — Professional WooCommerce Point of Sale. Released under', 'ready-pos-for-woocommerce' ),
				__( 'GPLv2 or later', 'ready-pos-for-woocommerce' )
			);
		}
		return $text;
	}

	/**
	 * Custom version text in the footer.
	 *
	 * @param string $text Default version text.
	 * @return string
	 */
	public function custom_footer_version( $text ) {
		$screen = get_current_screen();
		if ( $screen && in_array( $screen->id, $this->allowed_screens, true ) ) {
			return 'Ready POS v' . READYPOS_VERSION;
		}
		return $text;
	}

	/**
	 * Retrieve WooCommerce currency settings.
	 *
	 * @return array
	 */
	private function get_currency_data() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return array(
				'symbol'    => '$',
				'code'      => 'USD',
				'position'  => 'left',
				'decimals'  => 2,
				'thousand'  => ',',
				'decimal'   => '.',
			);
		}

		return array(
			'symbol'    => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ),
			'code'      => get_woocommerce_currency(),
			'position'  => get_option( 'woocommerce_currency_pos', 'left' ),
			'decimals'  => wc_get_price_decimals(),
			'thousand'  => html_entity_decode( wc_get_price_thousand_separator(), ENT_QUOTES, 'UTF-8' ),
			'decimal'   => html_entity_decode( wc_get_price_decimal_separator(), ENT_QUOTES, 'UTF-8' ),
		);
	}
}
