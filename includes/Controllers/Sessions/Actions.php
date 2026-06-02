<?php
/**
 * Register Session actions for POS.
 *
 * @package Readypos\Controllers\Sessions
 * @since 1.0.0
 */

namespace Readypos\Controllers\Sessions;

use Readypos\Models\POSSession;
use Readypos\Models\POSRegister;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles opening, closing, and tracking active register sessions.
 *
 * @package Readypos\Controllers\Sessions
 */
class Actions {

	/**
	 * Open a register session.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function open( \WP_REST_Request $request ) {
		$user_id      = get_current_user_id();
		$register_id  = intval( $request->get_param( 'registerId' ) );
		$outlet_id    = intval( $request->get_param( 'outletId' ) );
		$opening_cash = floatval( $request->get_param( 'openingCash' ) );
		$notes        = sanitize_text_field( $request->get_param( 'notes' ) );

		if ( empty( $register_id ) || empty( $outlet_id ) ) {
			return new \WP_Error( 'missing_fields', __( 'Outlet ID and Register ID are required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Check if register is already open
		$active_session = POSSession::where( 'register_id', $register_id )
			->where( 'status', 'open' )
			->first();

		if ( $active_session ) {
			return new \WP_Error( 'already_open', __( 'This register is already open in another session.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Create session
		$session = POSSession::create(
			array(
				'user_id'       => $user_id,
				'outlet_id'     => $outlet_id,
				'register_id'   => $register_id,
				'opening_cash'  => $opening_cash,
				'total_sales'   => 0,
				'total_orders'  => 0,
				'total_refunds' => 0,
				'cash_total'    => 0,
				'card_total'    => 0,
				'status'        => 'open',
				'notes'         => $notes,
				'opened_at'     => current_time( 'mysql' ),
			)
		);

		// Update register status
		POSRegister::where( 'id', $register_id )->update( array( 'status' => 'open' ) );

		// SECURITY FIX #17: Log session opened
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_FINANCIAL,
			'session_opened',
			sprintf( 'Register session #%d opened with $%.2f opening cash', $session->id, $opening_cash ),
			array(
				'session_id'   => $session->id,
				'register_id'  => $register_id,
				'outlet_id'    => $outlet_id,
				'opening_cash' => $opening_cash,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new \WP_REST_Response(
			array(
				'success'    => true,
				'session_id' => $session->id,
			),
			200
		);
	}

	/**
	 * Close register session.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function close( \WP_REST_Request $request ) {
		$session_id   = intval( $request->get_param( 'sessionId' ) );
		$closing_cash = floatval( $request->get_param( 'closingCash' ) );
		$notes        = sanitize_text_field( $request->get_param( 'notes' ) );

		$session = POSSession::find( $session_id );
		if ( ! $session || 'closed' === $session->status ) {
			return new \WP_Error( 'invalid_session', __( 'Active session not found or already closed.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Close session and update stats
		$session->closing_cash = $closing_cash;
		$session->status       = 'closed';
		$session->notes        = empty( $notes ) ? $session->notes : $session->notes . "\nClose notes: " . $notes;
		$session->closed_at    = current_time( 'mysql' );
		$session->save();

		// Update register status
		POSRegister::where( 'id', $session->register_id )->update( array( 'status' => 'closed' ) );

		// SECURITY FIX #17: Log session closed
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_FINANCIAL,
			'session_closed',
			sprintf( 
				'Register session #%d closed. Sales: $%.2f, Orders: %d, Cash: $%.2f',
				$session_id,
				$session->total_sales,
				$session->total_orders,
				$closing_cash
			),
			array(
				'session_id'    => $session_id,
				'register_id'   => $session->register_id,
				'total_sales'   => $session->total_sales,
				'total_orders'  => $session->total_orders,
				'opening_cash'  => $session->opening_cash,
				'closing_cash'  => $closing_cash,
				'discrepancy'   => $closing_cash - ( $session->opening_cash + $session->cash_total ),
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Get current active session for the logged in user or register.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function current( \WP_REST_Request $request ) {
		$user_id = get_current_user_id();

		$session = POSSession::where( 'user_id', $user_id )
			->where( 'status', 'open' )
			->first();

		if ( $session ) {
			return new \WP_REST_Response(
				array(
					'has_active' => true,
					'session'    => array(
						'id'           => $session->id,
						'outlet_id'    => $session->outlet_id,
						'register_id'  => $session->register_id,
						'opening_cash' => floatval( $session->opening_cash ),
						'total_sales'  => floatval( $session->total_sales ),
						'total_orders' => intval( $session->total_orders ),
						'cash_total'   => floatval( $session->cash_total ),
						'card_total'   => floatval( $session->card_total ),
						'notes'        => $session->notes,
						'opened_at'    => $session->opened_at,
					),
				),
				200
			);
		}

		return new \WP_REST_Response( array( 'has_active' => false ), 200 );
	}

	/**
	 * Get session history.
	 *
	 * @return \WP_REST_Response
	 */
	public function history() {
		$sessions = POSSession::orderBy( 'opened_at', 'desc' )->take( 20 )->get();
		$history  = array();

		foreach ( $sessions as $session ) {
			$user     = get_userdata( $session->user_id );
			$register = POSRegister::find( $session->register_id );

			$history[] = array(
				'id'            => $session->id,
				'cashier'       => $user ? $user->display_name : __( 'Unknown', 'ready-pos' ),
				'register_name' => $register ? $register->name : __( 'Register', 'ready-pos' ),
				'opening_cash'  => floatval( $session->opening_cash ),
				'closing_cash'  => floatval( $session->closing_cash ),
				'total_sales'   => floatval( $session->total_sales ),
				'status'        => $session->status,
				'opened_at'     => $session->opened_at,
				'closed_at'     => $session->closed_at,
			);
		}

		return new \WP_REST_Response( $history, 200 );
	}

	/**
	 * Record a cash adjustment (Pay In / Pay Out).
	 *
	 * SECURITY FIX #6: Use atomic SQL update to prevent race condition
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function cash_adjustment( \WP_REST_Request $request ) {
		$session_id = intval( $request->get_param( 'sessionId' ) );
		$type       = sanitize_text_field( $request->get_param( 'type' ) ); // 'in' or 'out'
		$amount     = floatval( $request->get_param( 'amount' ) );
		$reason     = sanitize_text_field( $request->get_param( 'reason' ) );

		if ( empty( $session_id ) || empty( $type ) || $amount <= 0 ) {
			return new \WP_Error( 'missing_fields', __( 'Session ID, type, and valid amount are required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		if ( ! in_array( $type, array( 'in', 'out' ), true ) ) {
			return new \WP_Error( 'invalid_type', __( 'Type must be "in" or "out".', 'ready-pos' ), array( 'status' => 400 ) );
		}

		global $wpdb;
		$sessions_table = $wpdb->prefix . 'readypos_sessions';

		// Verify session exists and is open
		$session = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT id, cash_total, notes FROM {$sessions_table} WHERE id = %d AND status = 'open'",
				$session_id
			)
		);

		if ( ! $session ) {
			return new \WP_Error( 'invalid_session', __( 'Active session not found.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Determine adjustment direction
		$log_type = ( 'in' === $type ) ? 'Pay In' : 'Pay Out';
		$adjustment = ( 'in' === $type ) ? $amount : -$amount;

		// Format log entry
		$cashier_id = get_current_user_id();
		$time = current_time( 'mysql' );
		$log_entry = sprintf(
			"[%s] %s (Reason: %s, Cashier ID: %d, Time: %s)",
			$log_type,
			number_format( $amount, 2, '.', '' ),
			empty( $reason ) ? 'None' : $reason,
			$cashier_id,
			$time
		);

		$new_notes = empty( $session->notes ) ? $log_entry : $session->notes . "\n" . $log_entry;

		// SECURITY FIX #6: Atomic update to prevent race condition
		$updated = $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$sessions_table} 
				SET cash_total = cash_total + %f,
					notes = %s
				WHERE id = %d AND status = 'open'",
				$adjustment,
				$new_notes,
				$session_id
			)
		);

		if ( ! $updated ) {
			return new \WP_Error( 'update_failed', __( 'Failed to update session. Session may have been closed.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		// Fetch updated cash total
		$updated_session = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT cash_total, notes FROM {$sessions_table} WHERE id = %d",
				$session_id
			)
		);

		return new \WP_REST_Response(
			array(
				'success'    => true,
				'cash_total' => floatval( $updated_session->cash_total ),
				'notes'      => $updated_session->notes,
			),
			200
		);
	}

	/**
	 * Authorize and log a cash drawer open event.
	 *
	 * SECURITY FIX #3: Add server-side drawer authorization and audit trail
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function drawer_open( \WP_REST_Request $request ) {
		$session_id = intval( $request->get_param( 'sessionId' ) );
		$reason     = sanitize_text_field( $request->get_param( 'reason' ) );
		$register_id = intval( $request->get_param( 'registerId' ) );

		// SECURITY FIX #3: Require active session for drawer open
		if ( empty( $session_id ) ) {
			return new \WP_Error( 
				'session_required', 
				__( 'An active session is required to open the cash drawer.', 'ready-pos' ), 
				array( 'status' => 400 ) 
			);
		}

		// SECURITY FIX #3: Verify permission
		if ( ! current_user_can( 'use_pos' ) && ! current_user_can( 'manage_pos' ) ) {
			return new \WP_Error(
				'unauthorized',
				__( 'You do not have permission to open the cash drawer.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		// Verify session is active
		$session = POSSession::find( $session_id );
		if ( ! $session || 'open' !== $session->status ) {
			return new \WP_Error( 
				'invalid_session', 
				__( 'Session not found or not active.', 'ready-pos' ), 
				array( 'status' => 400 ) 
			);
		}

		// SECURITY FIX #3: Log drawer open event for audit trail
		$cashier_id = get_current_user_id();
		$cashier = get_userdata( $cashier_id );
		$ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
		$time = current_time( 'mysql' );

		$log_entry = sprintf(
			"[Drawer Open] Cashier: %s (ID: %d), Reason: %s, IP: %s, Time: %s",
			$cashier ? $cashier->display_name : 'Unknown',
			$cashier_id,
			empty( $reason ) ? 'No reason provided' : $reason,
			$ip_address,
			$time
		);

		// Append to session notes
		$session->notes = empty( $session->notes ) ? $log_entry : $session->notes . "\n" . $log_entry;
		$session->save();

		// SECURITY FIX #3: Log to WordPress error log for security monitoring
		error_log( sprintf(
			'ReadyPOS Cash Drawer Opened: Session ID %d, Cashier ID %d (%s), Register ID %d, Reason: %s, IP: %s',
			$session_id,
			$cashier_id,
			$cashier ? $cashier->display_name : 'Unknown',
			$register_id,
			empty( $reason ) ? 'None' : $reason,
			$ip_address
		) );

		// Trigger action hook for extensibility (e.g., external logging, notifications)
		do_action( 'readypos_drawer_opened', $session_id, $cashier_id, $reason, $register_id );

		return new \WP_REST_Response(
			array(
				'success'   => true,
				'authorized' => true,
				'session_id' => $session_id,
				'timestamp' => $time,
			),
			200
		);
	}
}
