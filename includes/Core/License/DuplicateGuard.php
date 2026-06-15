<?php
/**
 * Duplicate installation guard.
 *
 * The wp.org Free build (`ready-pos-for-woocommerce`) and the Pro build
 * (`ready-pos-pro-for-woocommerce`) intentionally share the same PHP class
 * name (`Readypos`), the same text domain and the same option-key prefix.
 * This means the two builds CANNOT run at the same time — PHP would fatal
 * with "Cannot redeclare class".
 *
 * This class centralises every check we need to do to:
 *
 *  1. Detect a sibling Free install on the same site.
 *  2. Show the user a one-time admin notice pointing at the sibling.
 *  3. Provide a one-click "deactivate the other one and continue" action
 *     that runs a nonce-protected request and self-deactivates the
 *     conflicting plugin.
 *  4. Run a best-effort migration of stored license/session data from
 *     the Free install to the Pro install on first activation.
 *
 * All of the "is the Free plugin active?" detection is tolerant of
 * different folder names, slug differences, and the case where the user
 * has overwritten the Free plugin in place with the Pro zip (in which
 * case there is no sibling — the upgrade is silent).
 *
 * @package Ready_POS_Pro
 * @since   1.0.1
 */

namespace Readypos\Core\License;

defined( 'ABSPATH' ) || exit;

final class DuplicateGuard {

	const SIBLING_OPTION         = 'readypos_sibling_origin_file';
	const NOTICE_DISMISS_OPTION = 'readypos_sibling_notice_dismissed';
	const NOTICE_TRANSIENT      = 'readypos_sibling_notice_active';
	const MIGRATED_OPTION       = 'readypos_pro_migrated_from_free';

	/**
	 * Boot the guard. Hooks the necessary actions.
	 *
	 * Safe to call multiple times — we no-op after the first call.
	 *
	 * @return void
	 */
	public static function boot(): void {
		static $booted = false;
		if ( $booted ) {
			return;
		}
		$booted = true;

		add_action( 'admin_init', array( __CLASS__, 'maybe_handle_sibling_action' ) );
		add_action( 'admin_notices', array( __CLASS__, 'maybe_render_sibling_notice' ) );
		add_action( 'network_admin_notices', array( __CLASS__, 'maybe_render_sibling_notice' ) );

		// Persist a marker when our own Pro build is running so that
		// sibling detection has a stable fingerprint.
		self::mark_pro_installed();
	}

	/**
	 * Has the Pro build loaded successfully, with no other "Readypos"
	 * class declaration shadowing it?
	 *
	 * @return bool
	 */
	public static function is_pro_build(): bool {
		return defined( 'READYPOS_PRO_LOADED' ) && true === READYPOS_PRO_LOADED;
	}

	/**
	 * Persist / refresh the Pro installation marker.
	 *
	 * @return void
	 */
	public static function mark_pro_installed(): void {
		if ( ! defined( 'READYPOS_PLUGIN_FILE' ) ) {
			return;
		}
		update_option( 'readypos_pro_installed', READYPOS_PLUGIN_FILE, false );
		update_option( 'readypos_pro_build_version', READYPOS_PRO_BUILD ?? '1.0.1-pro', false );
	}

	/**
	 * Is a Free (gpl-version) sibling currently active?
	 *
	 * We look for any active plugin whose main file declares
	 * `Plugin Name: Ready POS` *without* the "Pro" suffix. We also accept
	 * the same heuristic based on the `Text Domain` of the plugin header,
	 * which lets us catch builds that renamed the display title.
	 *
	 * @return array{basename:string,file:string}|null
	 */
	public static function detect_free_sibling() {
		if ( ! function_exists( 'get_option' ) ) {
			return null;
		}

		$self_file = defined( 'READYPOS_PLUGIN_FILE' ) ? wp_normalize_path( READYPOS_PLUGIN_FILE ) : '';
		$self_dir  = $self_file ? wp_normalize_path( dirname( $self_file ) ) : '';

		// 1. The autoloader has already declared our own class; any other
		//    active plugin that *also* declared `Readypos` is a sibling.
		if ( class_exists( 'Readypos', false ) ) {
			$ref  = new \ReflectionClass( 'Readypos' );
			$file = $ref->getFileName();
			if ( $file ) {
				$file = wp_normalize_path( $file );
				if ( $self_dir && 0 === strpos( $file, $self_dir ) ) {
					// Same folder — this is the safe in-place upgrade case.
					return null;
				}
				return array(
					'basename' => plugin_basename( $file ),
					'file'     => $file,
				);
			}
		}

		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$active = get_option( 'active_plugins', array() );
		if ( ! is_array( $active ) ) {
			return null;
		}

		$all_plugins = function_exists( 'get_plugins' ) ? get_plugins() : array();

		foreach ( $active as $basename ) {
			if ( $self_file && false !== strpos( $basename, plugin_basename( $self_file ) ) ) {
				// Skip ourselves (Pro).
				continue;
			}
			$data = $all_plugins[ $basename ] ?? array();
			if ( ! is_array( $data ) ) {
				continue;
			}
			$name = (string) ( $data['Name'] ?? '' );
			if ( '' === $name ) {
				continue;
			}
			// Match "Ready POS" but NOT "Ready POS Pro".
			if ( false !== stripos( $name, 'Ready POS Pro' ) ) {
				continue;
			}
			if ( false !== stripos( $name, 'Ready POS' ) ) {
				return array(
					'basename' => $basename,
					'file'     => $basename,
				);
			}
		}

		return null;
	}

	/**
	 * Get the origin file we recorded in the bootstrap shim, if any.
	 *
	 * The `ready-pos.php` shim records `$GLOBALS['readypos_pro_sibling_origin']`
	 * before the autoloader is registered. We promote it to an option
	 * once WP is loaded so that the rest of the code (admin notices,
	 * user actions) can read it via standard APIs.
	 *
	 * @return string
	 */
	public static function get_sibling_origin(): string {
		if ( isset( $GLOBALS['readypos_pro_sibling_origin'] ) ) {
			$origin = (string) $GLOBALS['readypos_pro_sibling_origin'];
			update_option( self::SIBLING_OPTION, $origin, false );
			unset( $GLOBALS['readypos_pro_sibling_origin'] );
			return $origin;
		}
		return (string) get_option( self::SIBLING_OPTION, '' );
	}

	/**
	 * Render the sibling-notice admin notice when applicable.
	 *
	 * The notice is shown at most once per page-load and is dismissed
	 * for a day via a transient after the user clicks the "Deactivate
	 * Free" link or dismisses it.
	 *
	 * @return void
	 */
	public static function maybe_render_sibling_notice(): void {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		$sibling = self::detect_free_sibling();
		if ( null === $sibling ) {
			// No sibling — clear any pending notice state.
			delete_transient( self::NOTICE_TRANSIENT );
			return;
		}

		// Already dismissed for this run?
		if ( (int) get_option( self::NOTICE_DISMISS_OPTION, 0 ) > time() ) {
			return;
		}

		$deactivate_url = wp_nonce_url(
			add_query_arg(
				array(
					'action'   => 'readypos_deactivate_sibling',
					'basename' => rawurlencode( $sibling['basename'] ),
				),
				admin_url( 'plugins.php' )
			),
			'readypos_deactivate_sibling'
		);

		$sibling_name = basename( dirname( $sibling['file'] ) );
		if ( '' === $sibling_name ) {
			$sibling_name = $sibling['basename'];
		}

		echo '<div class="notice notice-warning readypos-sibling-notice" data-readypos-sibling="' . esc_attr( $sibling['basename'] ) . '">';
		echo '<p><strong>' . esc_html__( 'Ready POS Pro:', 'ready-pos-for-woocommerce' ) . '</strong> ';
		echo esc_html(
			sprintf(
				/* translators: %s: conflicting plugin folder/file name */
				__( 'A free "Ready POS" installation was detected at %s. The free and Pro versions cannot run at the same time because they share the same plugin class — please deactivate the free version to continue using Pro.', 'ready-pos-for-woocommerce' ),
				$sibling_name
			)
		);
		echo '</p>';
		echo '<p>';
		echo '<a class="button button-primary" href="' . esc_url( $deactivate_url ) . '">' . esc_html__( 'Deactivate Free & Continue', 'ready-pos-for-woocommerce' ) . '</a> ';
		echo '<a class="button" href="' . esc_url( admin_url( 'plugins.php' ) ) . '">' . esc_html__( 'Open Plugins page', 'ready-pos-for-woocommerce' ) . '</a>';
		echo '</p>';
		echo '</div>';

		set_transient( self::NOTICE_TRANSIENT, time(), DAY_IN_SECONDS );
	}

	/**
	 * Handle the nonce-protected "deactivate the sibling" action.
	 *
	 * URL shape: `plugins.php?action=readypos_deactivate_sibling&basename=...&_wpnonce=...`
	 *
	 * @return void
	 */
	public static function maybe_handle_sibling_action(): void {
		if ( ! isset( $_GET['action'] ) || 'readypos_deactivate_sibling' !== $_GET['action'] ) {
			return;
		}
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		check_admin_referer( 'readypos_deactivate_sibling' );

		$basename = isset( $_GET['basename'] ) ? sanitize_text_field( wp_unslash( $_GET['basename'] ) ) : '';
		if ( '' === $basename ) {
			wp_safe_redirect( admin_url( 'plugins.php' ) );
			exit;
		}

		if ( ! function_exists( 'deactivate_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		// Make absolutely sure we are NOT asking WordPress to deactivate
		// the Pro plugin we are currently running as.
		$self_basename = defined( 'READYPOS_PLUGIN_FILE' ) ? plugin_basename( READYPOS_PLUGIN_FILE ) : '';
		if ( '' !== $self_basename && $self_basename === $basename ) {
			wp_safe_redirect( admin_url( 'plugins.php' ) );
			exit;
		}

		// Sanity check the basename looks like a real plugin path.
		if ( false === strpos( $basename, '/' ) ) {
			wp_safe_redirect( admin_url( 'plugins.php' ) );
			exit;
		}

		deactivate_plugins( array( $basename ) );

		// Run the migration helper (no-op if data already migrated or the
		// sibling has been removed from disk).
		self::migrate_from_free();

		// Dismiss the notice for 7 days.
		update_option( self::NOTICE_DISMISS_OPTION, time() + 7 * DAY_IN_SECONDS, false );
		delete_transient( self::NOTICE_TRANSIENT );
		delete_option( self::SIBLING_OPTION );

		wp_safe_redirect( admin_url( 'admin.php?page=ready-pos#/license' ) );
		exit;
	}

	/**
	 * Best-effort migration of stored options from a Free install.
	 *
	 * The two builds intentionally use the same option keys, so 99% of
	 * data carries over without any explicit copy. This method is a
	 * belt-and-braces step that records the migration moment and copies
	 * the license options from the Free options to the Pro options (in
	 * case the gpl-version ever forks the keys in the future).
	 *
	 * @return void
	 */
	public static function migrate_from_free(): void {
		if ( get_option( self::MIGRATED_OPTION, 0 ) ) {
			return;
		}

		$license_keys = array(
			'readypos_license_key',
			'readypos_license_status',
			'readypos_license_plan',
			'readypos_license_expires',
			'readypos_license_email',
			'readypos_license_data',
		);

		foreach ( $license_keys as $key ) {
			$free_value = get_option( $key . '_free', null );
			if ( null === $free_value || '' === $free_value ) {
				continue;
			}
			$pro_value = get_option( $key, null );
			if ( null === $pro_value || '' === $pro_value ) {
				update_option( $key, $free_value, false );
			}
		}

		update_option( self::MIGRATED_OPTION, time(), false );
	}
}
