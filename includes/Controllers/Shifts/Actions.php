<?php
/**
 * POS employee shift actions.
 *
 * @package Readypos\Controllers\Shifts
 * @since 1.0.0
 */

namespace Readypos\Controllers\Shifts;

use Readypos\Models\POSEmployeeShift;
use Readypos\Models\POSSession;
use Readypos\Traits\Cacheable;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles employee shift clock-in/clock-out and current-shift lookups.
 *
 * @package Readypos\Controllers\Shifts
 */
class Actions {

	use Cacheable;

	/**
	 * Cache group for shift data.
	 *
	 * @var string
	 */
	private $cache_group = 'pos_shifts';

	/**
	 * Clock the current user into a new shift.
	 *
	 * Expected body params:
	 *  - session_id (int, optional) — links shift to an open register session
	 *  - notes      (string, optional)
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function clock_in( \WP_REST_Request $request ) {
		$user_id    = get_current_user_id();
		$session_id = intval( $request->get_param( 'session_id' ) ?: $request->get_param( 'sessionId' ) );
		$notes      = sanitize_textarea_field( (string) $request->get_param( 'notes' ) );

		if ( ! $user_id ) {
			return new \WP_Error( 'not_authenticated', __( 'You must be logged in to clock in.', 'ready-pos-for-woocommerce' ), array( 'status' => 401 ) );
		}

		// Reject if the user already has an open shift.
		$existing = POSEmployeeShift::where( 'user_id', $user_id )
			->whereNull( 'clock_out_at' )
			->first();

		if ( $existing ) {
			return new \WP_Error(
				'shift_already_active',
				__( 'You already have an active shift. Clock out before starting a new one.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409, 'shift' => $this->format_shift( $existing ) )
			);
		}

		// Optionally attach to an open register session.
		if ( $session_id ) {
			$session = POSSession::where( 'id', $session_id )->first();
			if ( $session && 'open' !== $session->status ) {
				return new \WP_Error( 'session_not_open', __( 'Cannot attach shift to a closed session.', 'ready-pos-for-woocommerce' ), array( 'status' => 409 ) );
			}
		}

		$shift = POSEmployeeShift::create(
			array(
				'user_id'       => $user_id,
				'session_id'    => $session_id ?: null,
				'clock_in_at'   => current_time( 'mysql' ),
				'clock_out_at'  => null,
				'notes'         => $notes,
			)
		);

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_SHIFT,
			'shift_clock_in',
			sprintf( 'User #%d clocked in (shift #%d)', $user_id, $shift->id ),
			array(
				'shift_id'   => $shift->id,
				'session_id' => $session_id ?: null,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		$this->clear_cache( $this->cache_group );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $this->format_shift( $shift ),
			),
			201
		);
	}

	/**
	 * Clock the current user out of their active shift.
	 *
	 * Expected body params:
	 *  - shift_id (int, optional — defaults to the user's open shift)
	 *  - notes    (string, optional)
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function clock_out( \WP_REST_Request $request ) {
		$user_id  = get_current_user_id();
		$shift_id = intval( $request->get_param( 'shift_id' ) ?: $request->get_param( 'shiftId' ) );
		$notes    = sanitize_textarea_field( (string) $request->get_param( 'notes' ) );

		if ( $shift_id ) {
			$shift = POSEmployeeShift::where( 'id', $shift_id )->first();
		} else {
			$shift = POSEmployeeShift::where( 'user_id', $user_id )
				->whereNull( 'clock_out_at' )
				->orderBy( 'clock_in_at', 'desc' )
				->first();
		}

		if ( ! $shift ) {
			return new \WP_Error( 'shift_not_found', __( 'No active shift to clock out from.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		if ( $shift->clock_out_at ) {
			return new \WP_Error( 'shift_already_closed', __( 'This shift is already closed.', 'ready-pos-for-woocommerce' ), array( 'status' => 409 ) );
		}

		$shift->clock_out_at = current_time( 'mysql' );
		if ( $notes ) {
			$shift->notes = $notes;
		}
		$shift->save();

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_SHIFT,
			'shift_clock_out',
			sprintf( 'User #%d clocked out (shift #%d)', $user_id, $shift->id ),
			array(
				'shift_id'     => $shift->id,
				'clock_in_at'  => $shift->clock_in_at,
				'clock_out_at' => $shift->clock_out_at,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		$this->clear_cache( $this->cache_group );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $this->format_shift( $shift ),
			),
			200
		);
	}

	/**
	 * Return the current open shift for the logged-in user.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function current( \WP_REST_Request $request ) {
		$user_id = get_current_user_id();

		$cache_key = 'current_' . $user_id;

		return $this->cache_response(
			$cache_key,
			function () use ( $user_id ) {
				$shift = POSEmployeeShift::where( 'user_id', $user_id )
					->whereNull( 'clock_out_at' )
					->orderBy( 'clock_in_at', 'desc' )
					->first();

				return new \WP_REST_Response(
					array(
						'success'    => true,
						'has_active' => ! empty( $shift ),
						'shift'      => $shift ? $this->format_shift( $shift ) : null,
					),
					200
				);
			},
			$this->cache_group,
			15
		);
	}

	/**
	 * Format an Eloquent shift model into the response payload.
	 *
	 * @param POSEmployeeShift $shift Shift model.
	 * @return array
	 */
	private function format_shift( POSEmployeeShift $shift ) {
		$row = (object) $shift->getAttributes();

		$clock_in  = $row->clock_in_at ? strtotime( $row->clock_in_at ) : null;
		$clock_out = $row->clock_out_at ? strtotime( $row->clock_out_at ) : null;
		$duration  = null;
		if ( $clock_in ) {
			$end      = $clock_out ? $clock_out : time();
			$duration = max( 0, $end - $clock_in );
		}

		return array(
			'id'           => isset( $row->id ) ? (int) $row->id : 0,
			'user_id'      => isset( $row->user_id ) ? (int) $row->user_id : 0,
			'session_id'   => isset( $row->session_id ) ? (int) $row->session_id : 0,
			'clock_in_at'  => $row->clock_in_at ?? null,
			'clock_out_at' => $row->clock_out_at ?? null,
			'is_active'    => empty( $row->clock_out_at ),
			'duration'     => $duration,
			'notes'        => isset( $row->notes ) ? (string) $row->notes : '',
		);
	}
}
