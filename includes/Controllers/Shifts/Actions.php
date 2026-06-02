<?php
/**
 * Employee Shift actions for POS.
 *
 * @package Readypos\Controllers\Shifts
 * @since 1.0.0
 */

namespace Readypos\Controllers\Shifts;

use Readypos\Models\POSEmployeeShift;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles cashier shift clock-ins, clock-outs, and shift tracking.
 *
 * @package Readypos\Controllers\Shifts
 */
class Actions {

	/**
	 * Clock in an employee.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function clock_in( \WP_REST_Request $request ) {
		$user_id    = get_current_user_id();
		$session_id = $request->get_param( 'sessionId' ) ? intval( $request->get_param( 'sessionId' ) ) : null;
		$notes      = sanitize_text_field( $request->get_param( 'notes' ) );

		// Check if user is already clocked in
		$active_shift = POSEmployeeShift::where( 'user_id', $user_id )
			->whereNull( 'clock_out_at' )
			->first();

		if ( $active_shift ) {
			return new \WP_Error(
				'already_clocked_in',
				__( 'You are already clocked in for a shift.', 'ready-pos' ),
				array( 'status' => 400 )
			);
		}

		// Create new shift entry
		$shift = POSEmployeeShift::create(
			array(
				'user_id'     => $user_id,
				'session_id'  => $session_id,
				'clock_in_at' => current_time( 'mysql', 1 ),
				'notes'       => $notes,
			)
		);

		return new \WP_REST_Response(
			array(
				'success'  => true,
				'shift_id' => $shift->id,
			),
			200
		);
	}

	/**
	 * Clock out an employee.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function clock_out( \WP_REST_Request $request ) {
		$user_id    = get_current_user_id();
		$session_id = $request->get_param( 'sessionId' ) ? intval( $request->get_param( 'sessionId' ) ) : null;
		$notes      = sanitize_text_field( $request->get_param( 'notes' ) );

		// Find active shift
		$shift = POSEmployeeShift::where( 'user_id', $user_id )
			->whereNull( 'clock_out_at' )
			->first();

		if ( ! $shift ) {
			return new \WP_Error(
				'no_active_shift',
				__( 'You do not have an active shift to clock out from.', 'ready-pos' ),
				array( 'status' => 400 )
			);
		}

		// Update shift
		$shift->clock_out_at = current_time( 'mysql', 1 );
		if ( ! empty( $session_id ) ) {
			$shift->session_id = $session_id;
		}
		if ( ! empty( $notes ) ) {
			$shift->notes = empty( $shift->notes ) ? $notes : $shift->notes . "\nClock-out notes: " . $notes;
		}
		$shift->save();

		return new \WP_REST_Response(
			array(
				'success' => true,
			),
			200
		);
	}

	/**
	 * Get current active shift for the logged in employee.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function current( \WP_REST_Request $request ) {
		$user_id = get_current_user_id();

		$shift = POSEmployeeShift::where( 'user_id', $user_id )
			->whereNull( 'clock_out_at' )
			->first();

		if ( $shift ) {
			return new \WP_REST_Response(
				array(
					'has_active' => true,
					'shift'      => array(
						'id'          => $shift->id,
						'session_id'  => $shift->session_id,
						'clock_in_at' => gmdate( 'c', strtotime( $shift->clock_in_at . ' UTC' ) ),
						'notes'       => $shift->notes,
					),
				),
				200
			);
		}

		return new \WP_REST_Response(
			array(
				'has_active' => false,
			),
			200
		);
	}
}
