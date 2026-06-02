<?php
/**
 * Security Fix #5 Testing Script
 * 
 * Run this script from WordPress admin or WP-CLI to test session security features.
 * DO NOT include in production builds.
 *
 * Usage:
 *   wp eval-file tests/security-test.php
 *   OR access via: /wp-admin/admin.php?page=readypos-security-test
 *
 * @package Readypos\Tests
 */

namespace Readypos\Tests;

// Prevent direct access
defined( 'ABSPATH' ) || exit;

/**
 * Test Session Security Implementation
 */
class SecurityFixTest {

	/**
	 * Run all tests
	 */
	public static function run_tests() {
		echo "<h1>Ready POS Security Fix #5 - Test Results</h1>\n";
		echo "<hr>\n";

		self::test_session_security();
		self::test_rate_limiter();
		self::test_api_authentication();
		self::test_audit_logging();

		echo "<hr>\n";
		echo "<h2>✅ All Tests Completed</h2>\n";
	}

	/**
	 * Test Session Security
	 */
	private static function test_session_security() {
		echo "<h2>1. Session Security Tests</h2>\n";

		// Test 1: Check if SessionSecurity class exists
		if ( class_exists( '\Readypos\Core\SessionSecurity' ) ) {
			echo "✅ SessionSecurity class loaded<br>\n";
		} else {
			echo "❌ SessionSecurity class NOT found<br>\n";
			return;
		}

		// Test 2: Get session info for current user
		if ( is_user_logged_in() ) {
			$info = \Readypos\Core\SessionSecurity::get_session_info();
			echo "✅ Session info retrieved:<br>\n";
			echo "<pre>" . print_r( $info, true ) . "</pre>\n";

			// Test 3: Validate request
			$valid = \Readypos\Core\SessionSecurity::validate_request();
			if ( is_wp_error( $valid ) ) {
				echo "❌ Session validation failed: " . $valid->get_error_message() . "<br>\n";
			} else {
				echo "✅ Session validation passed<br>\n";
			}
		} else {
			echo "ℹ️ No user logged in - skipping session tests<br>\n";
		}

		// Test 4: Check constants
		$constants = array(
			'MAX_SESSION_LIFETIME' => \Readypos\Core\SessionSecurity::MAX_SESSION_LIFETIME,
			'IDLE_TIMEOUT'         => \Readypos\Core\SessionSecurity::IDLE_TIMEOUT,
			'ENABLE_IP_VALIDATION' => \Readypos\Core\SessionSecurity::ENABLE_IP_VALIDATION,
		);
		echo "✅ Session Security Constants:<br>\n";
		echo "<pre>" . print_r( $constants, true ) . "</pre>\n";
	}

	/**
	 * Test Rate Limiter
	 */
	private static function test_rate_limiter() {
		echo "<h2>2. Rate Limiter Tests</h2>\n";

		// Test 1: Check if RateLimiter class exists
		if ( class_exists( '\Readypos\Core\RateLimiter' ) ) {
			echo "✅ RateLimiter class loaded<br>\n";
		} else {
			echo "❌ RateLimiter class NOT found<br>\n";
			return;
		}

		// Test 2: Get current rate limit status
		$status = \Readypos\Core\RateLimiter::get_status();
		echo "✅ Rate limit status retrieved:<br>\n";
		echo "<pre>" . print_r( $status, true ) . "</pre>\n";

		// Test 3: Check limit for normal endpoint
		$result = \Readypos\Core\RateLimiter::check_limit( 'normal' );
		if ( is_wp_error( $result ) ) {
			echo "⚠️ Rate limit check returned error: " . $result->get_error_message() . "<br>\n";
		} else {
			echo "✅ Rate limit check passed for normal endpoint<br>\n";
		}

		// Test 4: Check constants
		$constants = array(
			'MAX_REQUESTS_AUTH'      => \Readypos\Core\RateLimiter::MAX_REQUESTS_AUTH,
			'MAX_REQUESTS_UNAUTH'    => \Readypos\Core\RateLimiter::MAX_REQUESTS_UNAUTH,
			'MAX_REQUESTS_SENSITIVE' => \Readypos\Core\RateLimiter::MAX_REQUESTS_SENSITIVE,
			'LOCKOUT_DURATION'       => \Readypos\Core\RateLimiter::LOCKOUT_DURATION,
		);
		echo "✅ Rate Limiter Constants:<br>\n";
		echo "<pre>" . print_r( $constants, true ) . "</pre>\n";
	}

	/**
	 * Test API Authentication
	 */
	private static function test_api_authentication() {
		echo "<h2>3. API Authentication Tests</h2>\n";

		// Test 1: Check if permission callbacks exist
		$callbacks = array(
			'readypos_require_authenticated_user',
			'readypos_require_pos_capability',
			'readypos_require_sensitive_access',
		);

		foreach ( $callbacks as $callback ) {
			$full_callback = "Readypos\\Routes\\{$callback}";
			if ( function_exists( $full_callback ) ) {
				echo "✅ Permission callback exists: {$callback}<br>\n";
			} else {
				echo "❌ Permission callback NOT found: {$callback}<br>\n";
			}
		}

		// Test 2: Check REST API route registration
		$routes = rest_get_server()->get_routes();
		$pos_routes = array_filter(
			array_keys( $routes ),
			function( $route ) {
				return strpos( $route, '/ready-pos/v1/' ) === 0;
			}
		);

		$protected_count = 0;
		$public_count = 0;

		foreach ( $pos_routes as $route ) {
			$route_data = $routes[ $route ];
			foreach ( $route_data as $handler ) {
				if ( isset( $handler['permission_callback'] ) ) {
					if ( '__return_true' === $handler['permission_callback'] ) {
						$public_count++;
					} else {
						$protected_count++;
					}
				}
			}
		}

		echo "✅ Total POS routes found: " . count( $pos_routes ) . "<br>\n";
		echo "✅ Protected routes: {$protected_count}<br>\n";
		echo "ℹ️ Public routes (login endpoints): {$public_count}<br>\n";

		// Test 3: Try authentication check
		if ( is_user_logged_in() ) {
			$auth_result = \Readypos\Routes\readypos_require_authenticated_user();
			if ( is_wp_error( $auth_result ) ) {
				echo "❌ Authentication check failed: " . $auth_result->get_error_message() . "<br>\n";
			} else {
				echo "✅ Authentication check passed<br>\n";
			}
		}
	}

	/**
	 * Test Audit Logging
	 */
	private static function test_audit_logging() {
		echo "<h2>4. Audit Logging Tests</h2>\n";

		// Test 1: Check if AuditLog class exists
		if ( class_exists( '\Readypos\Core\AuditLog' ) ) {
			echo "✅ AuditLog class loaded<br>\n";
		} else {
			echo "❌ AuditLog class NOT found<br>\n";
			return;
		}

		// Test 2: Check if audit log table exists
		global $wpdb;
		$table_name = $wpdb->prefix . 'readypos_audit_log';
		$table_exists = $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" ) === $table_name;

		if ( $table_exists ) {
			echo "✅ Audit log table exists: {$table_name}<br>\n";

			// Get recent security events
			$recent_events = $wpdb->get_results(
				"SELECT event_type, event_action, message, severity, created_at 
				FROM {$table_name} 
				WHERE event_type = 'security' 
				ORDER BY created_at DESC 
				LIMIT 5"
			);

			if ( ! empty( $recent_events ) ) {
				echo "✅ Recent security events found:<br>\n";
				echo "<table border='1' cellpadding='5'>\n";
				echo "<tr><th>Action</th><th>Message</th><th>Severity</th><th>Time</th></tr>\n";
				foreach ( $recent_events as $event ) {
					echo "<tr>";
					echo "<td>{$event->event_action}</td>";
					echo "<td>{$event->message}</td>";
					echo "<td>{$event->severity}</td>";
					echo "<td>{$event->created_at}</td>";
					echo "</tr>\n";
				}
				echo "</table>\n";
			} else {
				echo "ℹ️ No security events logged yet<br>\n";
			}
		} else {
			echo "❌ Audit log table NOT found: {$table_name}<br>\n";
		}

		// Test 3: Write test log entry
		$test_result = \Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_SECURITY,
			'security_test',
			'Security test executed from test script',
			array( 'test' => true ),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		if ( $test_result ) {
			echo "✅ Test audit log entry created successfully<br>\n";
		} else {
			echo "❌ Failed to create test audit log entry<br>\n";
		}
	}

	/**
	 * Test endpoint protection (API call simulation)
	 */
	private static function test_endpoint_simulation() {
		echo "<h2>5. Endpoint Protection Simulation</h2>\n";

		// Simulate API request to protected endpoint
		$request = new \WP_REST_Request( 'GET', '/ready-pos/v1/sessions/current' );

		// Test without nonce (should fail)
		unset( $_SERVER['HTTP_X_WP_NONCE'] );
		$response = rest_get_server()->dispatch( $request );

		if ( $response->is_error() ) {
			echo "✅ Request without nonce correctly rejected<br>\n";
			echo "   Error: " . $response->as_error()->get_error_message() . "<br>\n";
		} else {
			echo "❌ Request without nonce was allowed (SECURITY ISSUE)<br>\n";
		}

		// Test with valid nonce (should work if logged in)
		if ( is_user_logged_in() ) {
			$_SERVER['HTTP_X_WP_NONCE'] = wp_create_nonce( 'wp_rest' );
			$response = rest_get_server()->dispatch( $request );

			if ( ! $response->is_error() ) {
				echo "✅ Request with valid nonce correctly allowed<br>\n";
			} else {
				echo "⚠️ Request with valid nonce failed: " . $response->as_error()->get_error_message() . "<br>\n";
			}
		}
	}
}

// Run tests if accessed directly
if ( is_admin() && isset( $_GET['page'] ) && $_GET['page'] === 'readypos-security-test' ) {
	SecurityFixTest::run_tests();
	exit;
}

// Run from WP-CLI
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	SecurityFixTest::run_tests();
}
