<?php
/**
 * Gift Card and Store Credit actions.
 *
 * @package Readypos\Controllers\GiftCards
 * @since 1.1.0
 */

namespace Readypos\Controllers\GiftCards;

use Readypos\Models\POSGiftCard;
use Readypos\Core\License;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles CRUD and balance operations for gift cards and store credit.
 *
 * @package Readypos\Controllers\GiftCards
 */
class Actions {

	/**
	 * Secure integrity check to prevent license bypass.
	 *
	 * Checks the option plan, status, and recalculates the SHA-256 HMAC signature
	 * of the license data using WordPress AUTH_KEY and the current site domain host.
	 *
	 * @return bool|\WP_Error
	 */
	private function verify_gated_access() {
		$plan       = get_option( 'readypos_license_plan', 'free' );
		$status     = get_option( 'readypos_license_status', 'free' );
		$stored_sig = get_option( 'readypos_license_sig', '' );

		if ( 'pro' !== $plan || ! in_array( $status, array( 'active', 'grace' ), true ) || empty( $stored_sig ) ) {
			return new \WP_Error(
				'pro_feature_required',
				__( 'This premium feature requires a valid ReadyPOS Pro license.', 'ready-pos' ),
				array( 'status' => 402 )
			);
		}

		$auth_key = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'readypos-fallback-key';
		$host     = wp_parse_url( home_url(), PHP_URL_HOST ) ?: '';
		$key      = hash( 'sha256', $auth_key . '|readypos-license-integrity|' . $host, true );

		$fields = array(
			'plan'       => $plan,
			'status'     => $status,
			'key'        => get_option( 'readypos_license_key', '' ),
			'expires_at' => get_option( 'readypos_license_expires_at', '' ),
			'type'       => get_option( 'readypos_license_type', '' ),
		);
		ksort( $fields );
		$payload = implode( '|', $fields );
		$expected = hash_hmac( 'sha256', $payload, $key );

		if ( ! hash_equals( $expected, $stored_sig ) ) {
			return new \WP_Error(
				'license_integrity_violation',
				__( 'License integrity check failed.', 'ready-pos' ),
				array( 'status' => 402 )
			);
		}

		return true;
	}

	/**
	 * List all gift cards / store credits with pagination.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function list( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$page   = max( 1, intval( $request->get_param( 'page' ) ?: 1 ) );
		$limit  = max( 1, min( 100, intval( $request->get_param( 'limit' ) ?: 20 ) ) );
		$type   = $request->get_param( 'type' ); // 'gift_card' or 'store_credit' or null for all.
		$search = sanitize_text_field( $request->get_param( 'search' ) ?: '' );

		$query = POSGiftCard::orderBy( 'created_at', 'desc' );

		if ( ! empty( $type ) ) {
			$query->where( 'type', $type );
		}

		if ( ! empty( $search ) ) {
			$query->where( 'code', 'LIKE', '%' . $search . '%' );
		}

		$total = $query->count();
		$cards = $query->skip( ( $page - 1 ) * $limit )->take( $limit )->get();

		$data = array();
		foreach ( $cards as $card ) {
			$data[] = $this->format_card( $card );
		}

		return new \WP_REST_Response(
			array(
				'cards'       => $data,
				'total'       => $total,
				'page'        => $page,
				'total_pages' => max( 1, (int) ceil( $total / $limit ) ),
			),
			200
		);
	}

	/**
	 * Issue a new gift card or store credit.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$type    = sanitize_text_field( $request->get_param( 'type' ) ?: 'gift_card' );
		$balance = floatval( $request->get_param( 'balance' ) );
		$code    = sanitize_text_field( $request->get_param( 'code' ) );
		$customer_id = $request->get_param( 'customerId' ) ? intval( $request->get_param( 'customerId' ) ) : null;
		$expires_at  = sanitize_text_field( $request->get_param( 'expiresAt' ) ?: '' );
		$notes       = sanitize_textarea_field( $request->get_param( 'notes' ) ?: '' );

		if ( $balance <= 0 ) {
			return new \WP_Error( 'invalid_balance', __( 'Balance must be greater than zero.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Auto-generate code if not provided.
		if ( empty( $code ) ) {
			$code = $this->generate_code( $type );
		}

		// Check uniqueness.
		if ( POSGiftCard::where( 'code', $code )->exists() ) {
			return new \WP_Error( 'code_exists', __( 'A card with this code already exists.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$card = POSGiftCard::create(
			array(
				'code'            => strtoupper( $code ),
				'type'            => in_array( $type, array( 'gift_card', 'store_credit' ), true ) ? $type : 'gift_card',
				'initial_balance' => $balance,
				'balance'         => $balance,
				'customer_id'     => $customer_id,
				'issued_by'       => get_current_user_id(),
				'status'          => 'active',
				'expires_at'      => ! empty( $expires_at ) ? $expires_at : null,
				'notes'           => $notes,
			)
		);

		return new \WP_REST_Response( $this->format_card( $card ), 200 );
	}

	/**
	 * Check balance of a gift card by code (used at POS terminal checkout).
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function check_balance( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$code = strtoupper( sanitize_text_field( $request->get_param( 'code' ) ) );

		if ( empty( $code ) ) {
			return new \WP_Error( 'missing_code', __( 'Card code is required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$card = POSGiftCard::where( 'code', $code )->first();

		if ( ! $card ) {
			return new \WP_Error( 'not_found', __( 'Gift card not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		if ( 'active' !== $card->status ) {
			return new \WP_Error( 'card_inactive', __( 'This card is no longer active.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		if ( $card->expires_at && strtotime( $card->expires_at ) < time() ) {
			return new \WP_Error( 'card_expired', __( 'This card has expired.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		return new \WP_REST_Response( $this->format_card( $card ), 200 );
	}

	/**
	 * Redeem (deduct) balance from a gift card during checkout.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function redeem( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$code   = strtoupper( sanitize_text_field( $request->get_param( 'code' ) ) );
		$amount = floatval( $request->get_param( 'amount' ) );

		if ( empty( $code ) || $amount <= 0 ) {
			return new \WP_Error( 'invalid_params', __( 'Valid code and amount are required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$card = POSGiftCard::where( 'code', $code )->first();

		if ( ! $card ) {
			return new \WP_Error( 'not_found', __( 'Gift card not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		if ( 'active' !== $card->status ) {
			return new \WP_Error( 'card_inactive', __( 'This card is no longer active.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		if ( $card->expires_at && strtotime( $card->expires_at ) < time() ) {
			return new \WP_Error( 'card_expired', __( 'This card has expired.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$available = floatval( $card->balance );
		$deduct    = min( $amount, $available );

		$card->balance = $available - $deduct;
		if ( $card->balance <= 0 ) {
			$card->status = 'depleted';
		}
		$card->save();

		return new \WP_REST_Response(
			array(
				'success'           => true,
				'amount_deducted'   => $deduct,
				'remaining_balance' => floatval( $card->balance ),
				'card'              => $this->format_card( $card ),
			),
			200
		);
	}

	/**
	 * Top-up / reload balance on an existing card.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function topup( \WP_REST_Request $request ) {
		$gate = $this->verify_gated_access();
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		$code   = strtoupper( sanitize_text_field( $request->get_param( 'code' ) ) );
		$amount = floatval( $request->get_param( 'amount' ) );

		if ( empty( $code ) || $amount <= 0 ) {
			return new \WP_Error( 'invalid_params', __( 'Valid code and amount are required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$card = POSGiftCard::where( 'code', $code )->first();

		if ( ! $card ) {
			return new \WP_Error( 'not_found', __( 'Gift card not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$card->balance += $amount;
		$card->status   = 'active';
		$card->save();

		return new \WP_REST_Response(
			array(
				'success'     => true,
				'new_balance' => floatval( $card->balance ),
				'card'        => $this->format_card( $card ),
			),
			200
		);
	}

	/**
	 * Generate a unique card code.
	 *
	 * @param string $type Card type.
	 * @return string
	 */
	private function generate_code( $type ) {
		$prefix = 'gift_card' === $type ? 'GC' : 'SC';
		do {
			$code = $prefix . '-' . strtoupper( wp_generate_password( 4, false ) ) . '-' . strtoupper( wp_generate_password( 4, false ) );
		} while ( POSGiftCard::where( 'code', $code )->exists() );

		return $code;
	}

	/**
	 * Format card for API response.
	 *
	 * @param POSGiftCard $card Model instance.
	 * @return array
	 */
	private function format_card( $card ) {
		return array(
			'id'              => $card->id,
			'code'            => $card->code,
			'type'            => $card->type,
			'initial_balance' => floatval( $card->initial_balance ),
			'balance'         => floatval( $card->balance ),
			'customer_id'     => $card->customer_id ? intval( $card->customer_id ) : null,
			'issued_by'       => $card->issued_by ? intval( $card->issued_by ) : null,
			'status'          => $card->status,
			'expires_at'      => $card->expires_at,
			'notes'           => $card->notes,
			'created_at'      => $card->created_at ? $card->created_at->toDateTimeString() : null,
		);
	}
}
