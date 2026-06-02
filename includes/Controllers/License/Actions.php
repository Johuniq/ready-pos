<?php
/**
 * License management REST endpoints.
 *
 * @package Readypos\Controllers\License
 * @since 1.1.0
 */

namespace Readypos\Controllers\License;

use Readypos\Core\License;
use Readypos\Core\License\Manager;

defined( 'ABSPATH' ) || exit;

class Actions {

	/**
	 * GET /license/get — current license + plan info.
	 */
	public function get() {
		return new \WP_REST_Response( License::frontend_data(), 200 );
	}

	/**
	 * POST /license/activate
	 */
	public function activate( \WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new \WP_Error( 'forbidden', __( 'Only administrators can activate a license.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$key    = $request->get_param( 'key' ) ?: '';
		$result = License::activate( $key );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => License::frontend_data(),
			),
			200
		);
	}

	/**
	 * POST /license/deactivate
	 */
	public function deactivate() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new \WP_Error( 'forbidden', __( 'Only administrators can deactivate a license.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		License::deactivate();

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => License::frontend_data(),
			),
			200
		);
	}

	/**
	 * POST /license/revalidate — manual re-check against the server.
	 */
	public function revalidate() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new \WP_Error( 'forbidden', __( 'Only administrators can re-validate a license.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$result = Manager::revalidate();

		if ( is_wp_error( $result ) ) {
			return new \WP_Error(
				$result->get_error_code(),
				$result->get_error_message(),
				array( 'status' => 400 )
			);
		}

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => License::frontend_data(),
			),
			200
		);
	}

	/**
	 * GET /license/audit — audit log of license events.
	 */
	public function audit() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new \WP_Error( 'forbidden', __( 'Only administrators can view the audit log.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		return new \WP_REST_Response( Manager::get_audit_log(), 200 );
	}

	/**
	 * POST /license/reset — complete reset of all license and cache data.
	 * 
	 * This endpoint should be called during onboarding to ensure no cached
	 * license data persists from previous installations.
	 */
	public function reset() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new \WP_Error( 'forbidden', __( 'Only administrators can reset license data.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$result = Manager::full_reset();

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'All license and cache data has been reset.', 'ready-pos' ),
				'data'    => License::frontend_data(),
			),
			200
		);
	}
}
