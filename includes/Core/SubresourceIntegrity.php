<?php
/**
 * Subresource Integrity (SRI) Manager for Ready POS.
 *
 * SECURITY FIX #13: Add SRI hashes to external scripts and styles
 *
 * @package Readypos\Core
 * @since 1.0.2
 */

namespace Readypos\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Class SubresourceIntegrity
 *
 * Adds integrity and crossorigin attributes to external resources.
 *
 * @package Readypos\Core
 */
class SubresourceIntegrity {

	/**
	 * Known CDN resources with their SRI hashes
	 *
	 * Format: 'url' => 'integrity_hash'
	 *
	 * @var array
	 */
	private static $known_hashes = array(
		// React (if loaded from CDN)
		'https://unpkg.com/react@18.2.0/umd/react.production.min.js' => 'sha384-/S8G8L2qeid4rFY/hHYo8kxZOmKuR+3rYPE0lDqFJ0qFjjqcH9CqGOJdOlH9F6KQ',
		'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js' => 'sha384-j8/fZ/dQS3rF8yM/ZsGZNjqVqHWvhL5dQqT6lTEqLhiNdCk6rX6pXr1eLQcDj/Gj',
	);

	/**
	 * Initialize SRI hooks
	 *
	 * @return void
	 */
	public static function init() {
		// Add SRI to scripts
		add_filter( 'script_loader_tag', array( __CLASS__, 'add_sri_to_script' ), 10, 3 );
		
		// Add SRI to styles
		add_filter( 'style_loader_tag', array( __CLASS__, 'add_sri_to_style' ), 10, 4 );
		
		// Add Content Security Policy headers
		add_action( 'send_headers', array( __CLASS__, 'add_csp_headers' ) );
	}

	/**
	 * Add SRI attributes to script tags
	 *
	 * @param string $tag    Script tag HTML.
	 * @param string $handle Script handle.
	 * @param string $src    Script source URL.
	 * @return string Modified script tag.
	 */
	public static function add_sri_to_script( $tag, $handle, $src ) {
		// Only add SRI to external scripts (CDN)
		if ( ! self::is_external_resource( $src ) ) {
			return $tag;
		}

		$integrity = self::get_integrity_hash( $src );
		
		if ( ! $integrity ) {
			// If no hash available, at least add crossorigin
			return self::add_crossorigin_attribute( $tag );
		}

		// Add both integrity and crossorigin attributes
		$tag = self::add_integrity_attribute( $tag, $integrity );
		$tag = self::add_crossorigin_attribute( $tag );

		return $tag;
	}

	/**
	 * Add SRI attributes to style tags
	 *
	 * @param string $html   Link tag HTML.
	 * @param string $handle Style handle.
	 * @param string $href   Style URL.
	 * @param string $media  Media attribute.
	 * @return string Modified link tag.
	 */
	public static function add_sri_to_style( $html, $handle, $href, $media ) {
		// Only add SRI to external stylesheets
		if ( ! self::is_external_resource( $href ) ) {
			return $html;
		}

		$integrity = self::get_integrity_hash( $href );
		
		if ( ! $integrity ) {
			// If no hash available, at least add crossorigin
			return self::add_crossorigin_attribute( $html );
		}

		// Add both integrity and crossorigin attributes
		$html = self::add_integrity_attribute( $html, $integrity );
		$html = self::add_crossorigin_attribute( $html );

		return $html;
	}

	/**
	 * Check if a resource is external (CDN)
	 *
	 * @param string $url Resource URL.
	 * @return bool
	 */
	private static function is_external_resource( $url ) {
		if ( empty( $url ) ) {
			return false;
		}

		$site_url = site_url();
		$parsed_site = wp_parse_url( $site_url );
		$parsed_url = wp_parse_url( $url );

		// If no host, it's relative (local)
		if ( empty( $parsed_url['host'] ) ) {
			return false;
		}

		// If hosts match, it's local
		if ( $parsed_url['host'] === $parsed_site['host'] ) {
			return false;
		}

		return true;
	}

	/**
	 * Get SRI integrity hash for a URL
	 *
	 * @param string $url Resource URL.
	 * @return string|false Integrity hash or false if not found.
	 */
	private static function get_integrity_hash( $url ) {
		// Check known hashes first
		if ( isset( self::$known_hashes[ $url ] ) ) {
			return self::$known_hashes[ $url ];
		}

		// Check custom hashes from database
		$custom_hashes = get_option( 'readypos_sri_hashes', array() );
		if ( isset( $custom_hashes[ $url ] ) ) {
			return $custom_hashes[ $url ];
		}

		// Try to generate hash on-the-fly (only in development)
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG && defined( 'WP_ENVIRONMENT_TYPE' ) && 'local' === WP_ENVIRONMENT_TYPE ) {
			return self::generate_integrity_hash( $url );
		}

		return false;
	}

	/**
	 * Generate SRI hash for a resource
	 *
	 * WARNING: Only use in development. For production, pre-compute hashes.
	 *
	 * @param string $url Resource URL.
	 * @return string|false Integrity hash or false on failure.
	 */
	private static function generate_integrity_hash( $url ) {
		// Use WordPress HTTP API
		$response = wp_remote_get( $url, array( 'timeout' => 10 ) );

		if ( is_wp_error( $response ) ) {
			return false;
		}

		$body = wp_remote_retrieve_body( $response );
		
		if ( empty( $body ) ) {
			return false;
		}

		// Generate SHA-384 hash (recommended for SRI)
		$hash = base64_encode( hash( 'sha384', $body, true ) );
		
		return 'sha384-' . $hash;
	}

	/**
	 * Add integrity attribute to HTML tag
	 *
	 * @param string $html      HTML tag.
	 * @param string $integrity Integrity hash.
	 * @return string Modified HTML.
	 */
	private static function add_integrity_attribute( $html, $integrity ) {
		// Don't add if already present
		if ( strpos( $html, 'integrity=' ) !== false ) {
			return $html;
		}

		// Find the end of the opening tag
		$pos = strpos( $html, '>' );
		if ( false === $pos ) {
			return $html;
		}

		// Insert integrity attribute before closing >
		$before = substr( $html, 0, $pos );
		$after = substr( $html, $pos );

		return $before . ' integrity="' . esc_attr( $integrity ) . '"' . $after;
	}

	/**
	 * Add crossorigin attribute to HTML tag
	 *
	 * @param string $html HTML tag.
	 * @return string Modified HTML.
	 */
	private static function add_crossorigin_attribute( $html ) {
		// Don't add if already present
		if ( strpos( $html, 'crossorigin' ) !== false ) {
			return $html;
		}

		// Find the end of the opening tag
		$pos = strpos( $html, '>' );
		if ( false === $pos ) {
			return $html;
		}

		// Insert crossorigin attribute before closing >
		$before = substr( $html, 0, $pos );
		$after = substr( $html, $pos );

		return $before . ' crossorigin="anonymous"' . $after;
	}

	/**
	 * Add Content Security Policy headers
	 *
	 * @return void
	 */
	public static function add_csp_headers() {
		// Only add CSP on admin pages
		if ( ! is_admin() ) {
			return;
		}

		// Get current screen
		$screen = get_current_screen();
		if ( ! $screen || strpos( $screen->id, 'ready-pos' ) === false ) {
			return;
		}

		// Build CSP directives
		$directives = self::get_csp_directives();
		$csp = implode( '; ', $directives );

		// Send CSP header
		header( "Content-Security-Policy: {$csp}" );
		
		// Also send report-only header for monitoring
		header( "Content-Security-Policy-Report-Only: {$csp}" );
	}

	/**
	 * Get CSP directives for Ready POS
	 *
	 * @return array Array of CSP directives.
	 */
	private static function get_csp_directives() {
		$site_url = site_url();
		
		$directives = array(
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-inline needed for WordPress admin
			"style-src 'self' 'unsafe-inline'", // unsafe-inline needed for inline styles
			"img-src 'self' data: https:",
			"font-src 'self' data:",
			"connect-src 'self' " . rest_url(),
			"frame-ancestors 'none'", // Prevent clickjacking
			"base-uri 'self'",
			"form-action 'self'",
		);

		/**
		 * Filter CSP directives
		 *
		 * @param array $directives CSP directives.
		 */
		$directives = apply_filters( 'readypos_csp_directives', $directives );

		return $directives;
	}

	/**
	 * Register a custom SRI hash for a URL
	 *
	 * @param string $url       Resource URL.
	 * @param string $integrity Integrity hash (e.g., 'sha384-abc123...').
	 * @return bool Success.
	 */
	public static function register_hash( $url, $integrity ) {
		$custom_hashes = get_option( 'readypos_sri_hashes', array() );
		$custom_hashes[ $url ] = $integrity;
		
		return update_option( 'readypos_sri_hashes', $custom_hashes );
	}

	/**
	 * Get all registered SRI hashes
	 *
	 * @return array Array of URL => hash pairs.
	 */
	public static function get_all_hashes() {
		$known = self::$known_hashes;
		$custom = get_option( 'readypos_sri_hashes', array() );
		
		return array_merge( $known, $custom );
	}

	/**
	 * Clear all custom SRI hashes
	 *
	 * @return bool Success.
	 */
	public static function clear_custom_hashes() {
		return delete_option( 'readypos_sri_hashes' );
	}

	/**
	 * CLI command to generate SRI hash for a URL
	 *
	 * Usage: wp eval "Readypos\Core\SubresourceIntegrity::generate_hash_cli('https://example.com/script.js');"
	 *
	 * @param string $url Resource URL.
	 * @return void
	 */
	public static function generate_hash_cli( $url ) {
		$hash = self::generate_integrity_hash( $url );
		
		if ( $hash ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI output, not web output
			echo 'URL: ' . $url . "\n";
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI output, not web output
			echo 'Hash: ' . $hash . "\n";
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI output, not web output
			echo "\nAdd to your code:\n";
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI output, not web output
			echo "SubresourceIntegrity::register_hash('" . $url . "', '" . $hash . "');\n";
		} else {
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI output, not web output
			echo 'Failed to generate hash for: ' . $url . "\n";
		}
	}
}

