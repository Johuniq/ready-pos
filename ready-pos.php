<?php
/**
 * Plugin Name: Ready POS Pro for WooCommerce
 * Plugin URI: https://readypos.johuniq.tech/
 * Description: Ready POS Pro — Transform your WooCommerce store into a professional Point of Sale system. Fast checkout, inventory sync, and customer management for retail stores.
 * Version: 1.0.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Author: Johuniq
 * Author URI: https://johuniq.tech
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ready-pos-for-woocommerce
 * Domain Path: /languages
 * WC requires at least: 6.0
 * WC tested up to: 9.0
 *
 * @package Ready_POS_Pro
 * @author Johuniq
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Build identifier. The Pro distribution always defines this constant; the
 * Free (gpl-version) distribution does not. Code paths that need to behave
 * differently between the two builds (e.g. duplicate-installation guard)
 * can rely on READYPOS_PRO_BUILD being defined.
 */
if ( ! defined( 'READYPOS_PRO_BUILD' ) ) {
	define( 'READYPOS_PRO_BUILD', '1.0.1-pro' );
}

// Define constants FIRST, before any autoloading
if ( ! defined( 'READYPOS_VERSION' ) ) {
	define( 'READYPOS_VERSION', '1.0.1' );
}
if ( ! defined( 'READYPOS_PLUGIN_FILE' ) ) {
	define( 'READYPOS_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( 'READYPOS_DIR' ) ) {
	define( 'READYPOS_DIR', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'READYPOS_URL' ) ) {
	define( 'READYPOS_URL', plugin_dir_url( __FILE__ ) );
}
if ( ! defined( 'READYPOS_ASSETS_URL' ) ) {
	define( 'READYPOS_ASSETS_URL', READYPOS_URL . 'assets' );
}
if ( ! defined( 'READYPOS_ROUTE_PREFIX' ) ) {
	define( 'READYPOS_ROUTE_PREFIX', 'ready-pos/v1' );
}

/**
 * Detect a sibling "Ready POS" installation loaded from a different folder.
 *
 * Both the Pro build and the wp.org Free build use the same PHP class name
 * (`Readypos`), the same text domain (`ready-pos-for-woocommerce`), and the
 * same option-key prefix. If both plugins are active at once the second
 * class declaration would fatal the entire site. We refuse to load our own
 * main plugin class if another plugin already declared `Readypos`, and we
 * surface a one-time admin notice pointing at the offending sibling.
 *
 * The check uses a ReflectionClass so it works even before the autoloader
 * is registered, and compares the declaring file to our own file to allow
 * the safe same-folder upgrade case (Free replaced by Pro in the same
 * directory via upload overwrite).
 */
$readypos_existing = false;
if ( class_exists( 'Readypos', false ) ) {
	$readypos_existing = true;
} elseif ( function_exists( 'get_declared_classes' ) ) {
	foreach ( get_declared_classes() as $readypos_declared ) {
		if ( 0 !== strcasecmp( $readypos_declared, 'Readypos' ) ) {
			continue;
		}
		$readypos_reflection = new ReflectionClass( $readypos_declared );
		$readypos_origin     = $readypos_reflection->getFileName();
		$readypos_self       = realpath( __FILE__ );
		if ( $readypos_origin && $readypos_self && false === strpos( str_replace( '\\', '/', $readypos_origin ), str_replace( '\\', '/', dirname( $readypos_self ) ) ) ) {
			$readypos_existing = true;
		}
		break;
	}
}

if ( $readypos_existing && ! defined( 'READYPOS_PRO_LOADED' ) ) {
	define( 'READYPOS_PRO_LOADED', false );
	// Stash the offending origin so the admin notice can name it.
	if ( ! class_exists( 'Readypos\\Core\\License\\DuplicateGuard', false ) && isset( $readypos_origin ) && $readypos_origin ) {
		// We can't autoload yet (autoloader not registered). Defer the
		// notice registration to plugins_loaded via a global function.
		$GLOBALS['readypos_pro_sibling_origin'] = $readypos_origin;
	}
} else {
	define( 'READYPOS_PRO_LOADED', true );
}

// Load dependencies AFTER constants are defined
$readypos_autoload_file = plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';
if ( ! file_exists( $readypos_autoload_file ) ) {
	add_action(
		'admin_notices',
		function () {
			echo '<div class="notice notice-error"><p><strong>Ready POS:</strong> Composer dependencies are missing. Please run <code>composer install --no-dev</code> in the plugin directory.</p></div>';
		}
	);
	return;
}

// Pre-register a PSR-4 autoloader for our own `Readypos\` namespace that
// points at the Pro build's own includes/ directory. Composer's default
// registration is `prepend = false`, which means the autoloader of the
// last-loaded plugin wins. The wp.org Free build uses the same
// `Readypos\` prefix but maps it to its own (different) includes/
// directory, so a side-by-side install would otherwise have whichever
// plugin loaded second shadow the other. By registering our own PSR-4
// loader and *prepending* it to the SPL stack, we guarantee that the
// Pro build's classes are always resolved against this very file, not
// the Free sibling's.
spl_autoload_register(
	static function ( $class ) {
		if ( 0 !== strpos( $class, 'Readypos\\' ) ) {
			return;
		}
		$relative = substr( $class, strlen( 'Readypos\\' ) );
		$file     = __DIR__ . '/includes/' . str_replace( '\\', '/', $relative ) . '.php';
		if ( is_file( $file ) ) {
			require_once $file;
		}
	},
	false,  // throw — do not re-throw; just no-op if class not ours
	true    // prepend — win the resolution race against the Free sibling
);

require_once $readypos_autoload_file;
require_once plugin_dir_path( __FILE__ ) . 'plugin.php';

/**
 * Initializes the Readypos plugin when plugins are loaded.
 *
 * @since 1.0.0
 * @return void
 */
function ready_pos_init() {
	// Boot the duplicate-installation guard regardless of build state.
	// It is a no-op when no sibling is present, and when a sibling is
	// present it surfaces the admin notice + deactivation flow without
	// re-running any of the main plugin's heavy init code.
	if ( class_exists( 'Readypos\Core\License\DuplicateGuard' ) ) {
		\Readypos\Core\License\DuplicateGuard::boot();
	}
	if ( class_exists( 'Readypos' ) ) {
		Readypos::get_instance()->init();
	}
}

// Hook for plugin initialization.
add_action( 'plugins_loaded', 'ready_pos_init' );

/**
 * Declare compatibility with WooCommerce HPOS.
 *
 * @since 1.0.0
 * @return void
 */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

// Hook for plugin activation — install tables, schedule license cron, clear caches.
register_activation_hook(
	__FILE__,
	function () {
		// Ensure Eloquent is booted before running migrations
		if ( function_exists( 'Readypos\Libs\DatabaseConnection\boot_eloquent' ) ) {
			\Readypos\Libs\DatabaseConnection\boot_eloquent();
		}
		
		// Use fully qualified class names to avoid use statement issues
		if ( class_exists( 'Readypos\Core\Install' ) ) {
			\Readypos\Core\Install::get_instance()->init();
		}
		
		if ( class_exists( 'Readypos\Core\License\Manager' ) ) {
			\Readypos\Core\License\Manager::ensure_cron();
		}
		
		// Force REST API routes registration before flushing
		if ( class_exists( 'Readypos\Core\Api' ) ) {
			\Readypos\Core\Api::get_instance()->init();
		}
		
		// Trigger rest_api_init to register routes
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- This is a WordPress core hook, not a custom hook
		do_action( 'rest_api_init' );
		
		// Flush rewrite rules to ensure REST API routes are registered
		flush_rewrite_rules();
		
		// Clear all caches to ensure fresh start
		if ( class_exists( 'Readypos\Core\Uninstall' ) ) {
			\Readypos\Core\Uninstall::clear_caches();
		}
		
		// Set default data retention option (keep data on uninstall by default)
		if ( false === get_option( 'readypos_keep_data_on_uninstall' ) ) {
			add_option( 'readypos_keep_data_on_uninstall', 'yes', '', false );
		}
		
		// Set activation timestamp and transient for notice
		update_option( 'readypos_activated_at', time(), false );
		set_transient( 'readypos_activated', true, 60 );
	}
);

// Hook for plugin deactivation — clear license cron, clear caches.
register_deactivation_hook(
	__FILE__,
	function () {
		if ( class_exists( 'Readypos\Core\License\Manager' ) ) {
			\Readypos\Core\License\Manager::clear_cron();
		}
		
		// Clear all caches on deactivation
		if ( class_exists( 'Readypos\Core\Uninstall' ) ) {
			\Readypos\Core\Uninstall::clear_caches();
		}
		
		// Flush rewrite rules
		flush_rewrite_rules();
		
		// Set deactivation timestamp
		update_option( 'readypos_deactivated_at', time(), false );
	}
);
