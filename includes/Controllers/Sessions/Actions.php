<?php
/**
 * POS register session actions.
 *
 * @package Readypos\Controllers\Sessions
 * @since 1.0.0
 */

namespace Readypos\Controllers\Sessions;

use Readypos\Models\POSSession;
use Readypos\Traits\Cacheable;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles opening, closing, and tracking POS register sessions, as well as
 * manual cash drawer adjustments made during an active session.
 *
 * @package Readypos\Controllers\Sessions
 */
class Actions {

	use Cacheable;

	/**
	 * Cache group for session listings.
	 *
	 * @var string
	 */
	private $cache_group = 'pos_sessions';

	/**
	 * Open a new register session.
	 *
	 * Expected body params:
	 *  - register_id (int, required)
	 *  - outlet_id   (int, optional — falls back to the register's outlet)
	 *  - opening_cash (numeric, default 0)
	 *  - notes        (string, optional)
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function open( \WP_REST_Request $request ) {
		global $wpdb;

		$user_id     = get_current_user_id();
		$register_id = intval( $request->get_param( 'register_id' ) ?: $request->get_param( 'registerId' ) );
		$outlet_id   = intval( $request->get_param( 'outlet_id' ) ?: $request->get_param( 'outletId' ) );
		$opening_cash = null !== $request->get_param( 'opening_cash' )
			? floatval( $request->get_param( 'opening_cash' ) )
			: ( null !== $request->get_param( 'openingCash' ) ? floatval( $request->get_param( 'openingCash' ) ) : 0.0 );
		$notes       = sanitize_textarea_field( (string) $request->get_param( 'notes' ) );

		if ( ! $user_id ) {
			return new \WP_Error( 'not_authenticated', __( 'You must be logged in to open a session.', 'ready-pos-for-woocommerce' ), array( 'status' => 401 ) );
		}

		if ( ! $register_id ) {
			return new \WP_Error( 'invalid_register', __( 'A valid register is required to open a session.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		// Verify register exists.
		$register_table = $wpdb->prefix . 'readypos_registers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Required for register lookup
		$register = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$register_table} WHERE id = %d", $register_id ) );

		if ( ! $register ) {
			return new \WP_Error( 'register_not_found', __( 'Register not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		// Default outlet to the register's outlet if not supplied.
		if ( ! $outlet_id ) {
			$outlet_id = intval( $register->outlet_id );
		}

		// Reject if user already has an open session on this register.
		$session = POSSession::where( 'register_id', $register_id )
			->where( 'status', 'open' )
			->first();

		if ( $session ) {
			return new \WP_Error(
				'session_already_open',
				__( 'A session is already open for this register.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 409 )
			);
		}

		$now = current_time( 'mysql' );

		$session = POSSession::create(
			array(
				'user_id'      => $user_id,
				'outlet_id'    => $outlet_id,
				'register_id'  => $register_id,
				'opening_cash' => $opening_cash,
				'closing_cash' => null,
				'total_sales'  => 0,
				'total_orders' => 0,
				'total_refunds' => 0,
				'cash_total'   => 0,
				'card_total'   => 0,
				'status'       => 'open',
				'notes'        => $notes,
				'opened_at'    => $now,
				'closed_at'    => null,
			)
		);

		// Mark the register as open.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Status update on related resource
		$wpdb->update( $register_table, array( 'status' => 'open' ), array( 'id' => $register_id ) );

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_SESSION,
			'session_opened',
			sprintf( 'Register session #%d opened by user #%d', $session->id, $user_id ),
			array(
				'session_id'   => $session->id,
				'register_id'  => $register_id,
				'outlet_id'    => $outlet_id,
				'opening_cash' => $opening_cash,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		$this->clear_cache( $this->cache_group );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $this->format_session( $session ),
			),
			201
		);
	}

	/**
	 * Close an open register session.
	 *
	 * Expected body params:
	 *  - session_id   (int, optional — defaults to the user's open session)
	 *  - closing_cash (numeric, required)
	 *  - notes        (string, optional)
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function close( \WP_REST_Request $request ) {
		global $wpdb;

		$user_id      = get_current_user_id();
		$session_id   = intval( $request->get_param( 'session_id' ) ?: $request->get_param( 'sessionId' ) );
		$closing_cash = null !== $request->get_param( 'closing_cash' ) ? $request->get_param( 'closing_cash' ) : $request->get_param( 'closingCash' );
		$notes        = sanitize_textarea_field( (string) $request->get_param( 'notes' ) );

		if ( null === $closing_cash || '' === $closing_cash ) {
			return new \WP_Error( 'invalid_closing_cash', __( 'Closing cash amount is required.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		if ( $session_id ) {
			$session = POSSession::where( 'id', $session_id )->first();
		} else {
			$session = POSSession::where( 'user_id', $user_id )
				->where( 'status', 'open' )
				->orderBy( 'opened_at', 'desc' )
				->first();
		}

		if ( ! $session ) {
			return new \WP_Error( 'session_not_found', __( 'No open session found to close.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		if ( 'open' !== $session->status ) {
			return new \WP_Error( 'session_not_open', __( 'This session is already closed.', 'ready-pos-for-woocommerce' ), array( 'status' => 409 ) );
		}

		$now = current_time( 'mysql' );

		$session->closing_cash = floatval( $closing_cash );
		$session->status       = 'closed';
		$session->closed_at    = $now;
		if ( $notes ) {
			$session->notes = $notes;
		}
		$session->save();

		// Mark the register as closed.
		$register_table = $wpdb->prefix . 'readypos_registers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Status update on related resource
		$wpdb->update( $register_table, array( 'status' => 'closed' ), array( 'id' => $session->register_id ) );

		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_SESSION,
			'session_closed',
			sprintf( 'Register session #%d closed by user #%d', $session->id, $user_id ),
			array(
				'session_id'    => $session->id,
				'register_id'   => $session->register_id,
				'opening_cash'  => $session->opening_cash,
				'closing_cash'  => $session->closing_cash,
				'total_sales'   => $session->total_sales,
				'total_orders'  => $session->total_orders,
				'total_refunds' => $session->total_refunds,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		$this->clear_cache( $this->cache_group );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $this->format_session( $session ),
			),
			200
		);
	}

	/**
	 * Return the current open session for the logged-in user (or for a specific
	 * register/outlet if the matching query params are present).
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function current( \WP_REST_Request $request ) {
		$user_id     = get_current_user_id();
		$register_id = intval( $request->get_param( 'register_id' ) );
		$outlet_id   = intval( $request->get_param( 'outlet_id' ) );

		$cache_key = 'current_' . $user_id . '_' . $register_id . '_' . $outlet_id;

		return $this->cache_response(
			$cache_key,
			function () use ( $user_id, $register_id, $outlet_id ) {
				$query = POSSession::where( 'status', 'open' );

				if ( $register_id ) {
					$query->where( 'register_id', $register_id );
				} else {
					if ( $user_id ) {
						$query->where( 'user_id', $user_id );
					}
					if ( $outlet_id ) {
						$query->where( 'outlet_id', $outlet_id );
					}
				}

				$session = $query->orderBy( 'opened_at', 'desc' )->first();

				return new \WP_REST_Response(
					array(
						'success'    => true,
						'has_active' => ! empty( $session ),
						'session'    => $session ? $this->format_session( $session ) : null,
					),
					200
				);
			},
			$this->cache_group,
			5
		);
	}

	/**
	 * List historical sessions (closed first), with simple pagination.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function history( \WP_REST_Request $request ) {
		global $wpdb;

		$user_id   = get_current_user_id();
		$status    = sanitize_text_field( (string) $request->get_param( 'status' ) );
		$per_page  = max( 1, min( 100, intval( $request->get_param( 'per_page' ) ) ?: 20 ) );
		$page      = max( 1, intval( $request->get_param( 'page' ) ) ?: 1 );
		$offset    = ( $page - 1 ) * $per_page;

		$table = $wpdb->prefix . 'readypos_sessions';

		$where        = '1=1';
		$where_params = array();

		if ( $user_id ) {
			$where         .= ' AND user_id = %d';
			$where_params[] = $user_id;
		}

		if ( $status ) {
			$where         .= ' AND status = %s';
			$where_params[] = $status;
		}

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where}";
		if ( $where_params ) {
			$count_sql = $wpdb->prepare( $count_sql, $where_params );
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Required for session history
		$total = (int) $wpdb->get_var( $count_sql );

		$select_sql = "SELECT * FROM {$table} WHERE {$where} ORDER BY opened_at DESC LIMIT %d OFFSET %d";
		$select_params   = array_merge( $where_params, array( $per_page, $offset ) );
		$prepared_select = $wpdb->prepare( $select_sql, $select_params );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Required for session history
		$rows = $wpdb->get_results( $prepared_select );

		$sessions = array();
		foreach ( $rows as $row ) {
			$sessions[] = $this->format_row( $row );
		}

		return new \WP_REST_Response(
			array(
				'success'  => true,
				'data'     => $sessions,
				'total'    => $total,
				'page'     => $page,
				'per_page' => $per_page,
			),
			200
		);
	}

	/**
	 * Record a manual cash adjustment (payout or pay-in) against an open session.
	 *
	 * Expected body params:
	 *  - session_id (int, optional — defaults to user's open session)
	 *  - type       (string, required) — 'pay_in' or 'pay_out'
	 *  - amount     (numeric, required, positive)
	 *  - reason     (string, optional)
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function cash_adjustment( \WP_REST_Request $request ) {
		global $wpdb;

		try {
			$user_id    = get_current_user_id();
			$session_id = intval( $request->get_param( 'session_id' ) ?: $request->get_param( 'sessionId' ) );
			$type_raw   = sanitize_text_field( (string) $request->get_param( 'type' ) );
			$amount     = floatval( $request->get_param( 'amount' ) );
			$reason     = sanitize_text_field( (string) $request->get_param( 'reason' ) );

			// Normalize short forms ("in"/"out") to the canonical
			// "pay_in"/"pay_out" used by the rest of the system.
			$type = $type_raw;
			if ( 'in' === $type ) {
				$type = 'pay_in';
			} elseif ( 'out' === $type ) {
				$type = 'pay_out';
			}

			if ( ! in_array( $type, array( 'pay_in', 'pay_out' ), true ) ) {
				return new \WP_Error( 'invalid_type', __( 'Adjustment type must be pay_in or pay_out.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
			}

			if ( $amount <= 0 ) {
				return new \WP_Error( 'invalid_amount', __( 'Adjustment amount must be positive.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
			}

			if ( $session_id ) {
				$session = POSSession::where( 'id', $session_id )->first();
			} else {
				$session = POSSession::where( 'user_id', $user_id )
					->where( 'status', 'open' )
					->orderBy( 'opened_at', 'desc' )
					->first();
			}

			if ( ! $session ) {
				return new \WP_Error( 'session_not_found', __( 'No open session for cash adjustment.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
			}

			if ( 'open' !== $session->status ) {
				return new \WP_Error( 'session_not_open', __( 'Cannot adjust a closed session.', 'ready-pos-for-woocommerce' ), array( 'status' => 409 ) );
			}

			// Best-effort insert into the optional adjustments table.
			// Treat insert as a non-fatal enhancement — the API still
			// returns success even if the table is missing or the row
			// fails to write, but we surface the error in the response.
			$stored   = true;
			$db_error = null;
			$table    = $wpdb->prefix . 'readypos_session_adjustments';

			// Auto-create the table if the install ran before the
			// POSSessionAdjustments migration existed. This is a no-op
			// once the table is in place.
			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
				if ( class_exists( '\\Readypos\\Database\\Migrations\\POSSessionAdjustments' ) ) {
					try {
						\Readypos\Database\Migrations\POSSessionAdjustments::up();
					} catch ( \Throwable $create_e ) {
						$db_error = sprintf( 'Adjustments table %s does not exist and could not be created: %s', $table, $create_e->getMessage() );
					}
				}
			}

			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) === $table ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$inserted = $wpdb->insert(
					$table,
					array(
						'session_id' => $session->id,
						'user_id'    => $user_id,
						'type'       => $type,
						'amount'     => $amount,
						'reason'     => $reason,
						'created_at' => current_time( 'mysql' ),
					)
				);
				$stored   = false !== $inserted;
				$db_error = $stored ? null : $wpdb->last_error;
			} else {
				$stored   = false;
				$db_error = sprintf( 'Adjustments table %s does not exist.', $table );
			}

			// Apply the cash movement to the session's cash_total so the
			// drawer total actually changes (pay_in increases it,
			// pay_out decreases it). Match the order-payment style with
			// an atomic SQL update and clear the session cache so the
			// next read sees the new totals.
			$delta = ( 'pay_in' === $type ) ? (float) $amount : -(float) $amount;
			try {
				$sessions_table = $wpdb->prefix . 'readypos_sessions';
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->query(
					$wpdb->prepare(
						"UPDATE `" . esc_sql( $sessions_table ) . "`
						 SET cash_total = cash_total + %f
						 WHERE id = %d AND status = 'open'",
						$delta,
						$session->id
					)
				);
				// Refresh the in-memory session model so the response
				// reflects the updated totals.
				$session = POSSession::where( 'id', $session->id )->first();
				if ( $session ) {
					$session->save();
				}

				// Append a structured line to session.notes so the
				// frontend ledger parser (`parseAdjustments` in
				// CashAdjustModal.jsx) can render this adjustment in the
				// "Shift Ledger Activity" column.
				//
				// Expected regex on the frontend:
				//   /^\[(Pay In|Pay Out)\]/
				//   /^\[.*?\]\s*([\d.]+)/
				//   /Reason:\s*(.*?),\s*Cashier/
				//   /Cashier ID:\s*(\d+)/
				//   /Time:\s*(.*?)\)/
				$type_label = ( 'pay_in' === $type ) ? 'Pay In' : 'Pay Out';
				$note_line  = sprintf(
					"[%s] %s (Reason: %s, Cashier ID: %d, Time: %s)\n",
					$type_label,
					number_format( (float) $amount, 2, '.', '' ),
					null !== $reason && '' !== $reason ? $reason : 'None',
					(int) $user_id,
					current_time( 'mysql' )
				);

				$existing_notes = isset( $session->notes ) ? (string) $session->notes : '';
				$new_notes      = trim( $existing_notes ) . "\n" . $note_line;
				$new_notes      = ltrim( $new_notes );

				$notes_updated = $wpdb->update(
					$sessions_table,
					array( 'notes' => $new_notes ),
					array( 'id' => $session->id ),
					array( '%s' ),
					array( '%d' )
				);
				if ( false === $notes_updated ) {
					$db_error = ( $db_error ? $db_error . ' | ' : '' ) . 'notes append failed: ' . $wpdb->last_error;
				} else {
					// Refresh the in-memory model so format_session() picks
					// up the new notes string in the response payload.
					$session = POSSession::where( 'id', $session->id )->first();
				}
			} catch ( \Throwable $delta_e ) {
				$db_error = ( $db_error ? $db_error . ' | ' : '' ) . 'cash_total update failed: ' . $delta_e->getMessage();
			}

			// Audit log + cache clear are best-effort. We do not want a
			// missing audit log helper to take down the request.
			try {
				if ( class_exists( '\\Readypos\\Core\\AuditLog' ) ) {
					\Readypos\Core\AuditLog::log(
						\Readypos\Core\AuditLog::EVENT_SESSION,
						'cash_adjustment',
						sprintf( 'Cash %s of %s on session #%d', $type, number_format( $amount, 2 ), $session->id ),
						array(
							'session_id' => $session->id,
							'type'       => $type,
							'amount'     => $amount,
							'reason'     => $reason,
						),
						\Readypos\Core\AuditLog::SEVERITY_INFO
					);
				}
			} catch ( \Throwable $audit_e ) {
				// Swallow — audit logging is non-critical.
				unset( $audit_e );
			}

			try {
				$this->clear_cache( $this->cache_group );
			} catch ( \Throwable $cache_e ) {
				unset( $cache_e );
			}

			return new \WP_REST_Response(
				array(
					'success'    => true,
					'stored'     => $stored,
					'db_error'   => $db_error,
					'session'    => method_exists( $this, 'format_session' ) ? $this->format_session( $session ) : null,
					'adjustment' => array(
						'type'   => $type,
						'amount' => $amount,
						'reason' => $reason,
					),
				),
				201
			);
		} catch ( \Throwable $e ) {
			return new \WP_Error( 'cash_adjustment_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
	}

	private function format_session( POSSession $session ) {
		$data = $this->format_row( (object) $session->getAttributes() );
		$outlet = \Readypos\Models\POSOutlet::find( $session->outlet_id );
		if ( $outlet ) {
			$data['outlet'] = array(
				'id'              => $outlet->id,
				'name'            => $outlet->name,
				'pricing_config'  => $outlet->get_pricing_config(),
				'tax_config'      => $outlet->get_tax_config(),
				'payment_methods' => $outlet->get_payment_methods(),
			);
		} else {
			$data['outlet'] = null;
		}
		return $data;
	}

	/**
	 * Format a raw database row into the response payload.
	 *
	 * @param object $row Row object.
	 * @return array
	 */
	private function format_row( $row ) {
		return array(
			'id'           => isset( $row->id ) ? (int) $row->id : 0,
			'user_id'      => isset( $row->user_id ) ? (int) $row->user_id : 0,
			'outlet_id'    => isset( $row->outlet_id ) ? (int) $row->outlet_id : 0,
			'register_id'  => isset( $row->register_id ) ? (int) $row->register_id : 0,
			'opening_cash' => isset( $row->opening_cash ) ? (float) $row->opening_cash : 0.0,
			'closing_cash' => null !== ( $row->closing_cash ?? null ) ? (float) $row->closing_cash : null,
			'total_sales'  => isset( $row->total_sales ) ? (float) $row->total_sales : 0.0,
			'total_orders' => isset( $row->total_orders ) ? (int) $row->total_orders : 0,
			'total_refunds' => isset( $row->total_refunds ) ? (float) $row->total_refunds : 0.0,
			'cash_total'   => isset( $row->cash_total ) ? (float) $row->cash_total : 0.0,
			'card_total'   => isset( $row->card_total ) ? (float) $row->card_total : 0.0,
			'status'       => isset( $row->status ) ? (string) $row->status : 'open',
			'notes'        => isset( $row->notes ) ? (string) $row->notes : '',
			'opened_at'    => isset( $row->opened_at ) ? $row->opened_at : null,
			'closed_at'    => isset( $row->closed_at ) ? $row->closed_at : null,
		);
	}
}
