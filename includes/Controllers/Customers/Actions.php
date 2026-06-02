<?php
/**
 * Customer-related POS actions.
 *
 * @package Readypos\Controllers\Customers
 * @since 1.0.0
 */

namespace Readypos\Controllers\Customers;

use Readypos\Models\POSCustomer;
use Readypos\Core\License;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles customer search, retrieval, creation, updating, listing, and deletion.
 *
 * @package Readypos\Controllers\Customers
 */
class Actions {

	/**
	 * Paginated customer list for the back-office management page.
	 *
	 * Accepts:
	 *  - search (string)  Optional search keyword.
	 *  - page   (int)     Page number (default 1).
	 *  - limit  (int)     Per-page count (default 20, max 100).
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public function list( \WP_REST_Request $request ) {
		$search = $request->get_param( 'search' ) ? sanitize_text_field( $request->get_param( 'search' ) ) : '';
		$page   = max( 1, intval( $request->get_param( 'page' ) ?: 1 ) );
		$limit  = intval( $request->get_param( 'limit' ) ?: 20 );
		$limit  = max( 1, min( 100, $limit ) );

		$args = array(
			'role__in' => array( 'customer', 'subscriber' ),
			'orderby'  => 'registered',
			'order'    => 'DESC',
			'number'   => $limit,
			'offset'   => ( $page - 1 ) * $limit,
			'count_total' => true,
		);

		if ( ! empty( $search ) ) {
			$is_phone_search = is_numeric( str_replace( array( '+', '-', ' ' ), '', $search ) );

			if ( $is_phone_search ) {
				$args['meta_query'] = array(
					array(
						'key'     => 'billing_phone',
						'value'   => $search,
						'compare' => 'LIKE',
					),
				);
			} else {
				$args['search']         = '*' . $search . '*';
				$args['search_columns'] = array( 'user_login', 'user_nicename', 'user_email', 'display_name' );
			}
		}

		$query = new \WP_User_Query( $args );
		$users = $query->get_results();
		$total = (int) $query->get_total();

		$customers = array();
		foreach ( $users as $user ) {
			$customers[] = $this->format_customer( $user );
		}

		$total_pages = $limit > 0 ? (int) ceil( $total / $limit ) : 1;

		return new \WP_REST_Response(
			array(
				'customers'   => $customers,
				'total'       => $total,
				'page'        => $page,
				'total_pages' => max( 1, $total_pages ),
				'limit'       => $limit,
			),
			200
		);
	}

	/**
	 * Search WooCommerce/WordPress customers (typeahead for the POS terminal).
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public function search( \WP_REST_Request $request ) {
		$search = $request->get_param( 'search' ) ? sanitize_text_field( $request->get_param( 'search' ) ) : '';

		if ( empty( $search ) ) {
			// Return recent customers
			$users = get_users(
				array(
					'role__in' => array( 'customer', 'subscriber' ),
					'number'   => 15,
					'orderby'  => 'registered',
					'order'    => 'DESC',
				)
			);
		} else {
			// Search customers by search keyword (email, name, username, billing phone)
			$user_query_args = array(
				'role__in'       => array( 'customer', 'subscriber' ),
				'search'         => '*' . $search . '*',
				'search_columns' => array( 'user_login', 'user_nicename', 'user_email', 'display_name' ),
				'number'         => 30,
			);

			// Check if search keyword is a phone number to search billing_phone meta
			if ( is_numeric( str_replace( array( '+', '-', ' ' ), '', $search ) ) ) {
				unset( $user_query_args['search'] );
				unset( $user_query_args['search_columns'] );
				$user_query_args['meta_query'] = array(
					array(
						'key'     => 'billing_phone',
						'value'   => $search,
						'compare' => 'LIKE',
					),
				);
			}

			$users = get_users( $user_query_args );
		}

		$customers = array();
		foreach ( $users as $user ) {
			$customers[] = $this->format_customer( $user );
		}

		return new \WP_REST_Response( $customers, 200 );
	}

	/**
	 * Create a new customer in WooCommerce.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create( \WP_REST_Request $request ) {
		// Enforce customer quota for Free plan.
		$user_count = count_users();
		$current = isset( $user_count['avail_roles']['customer'] ) ? (int) $user_count['avail_roles']['customer'] : 0;
		$quota_check = License::require_quota( 'customers', $current );
		if ( $quota_check ) {
			return $quota_check;
		}

		$first_name = sanitize_text_field( $request->get_param( 'firstName' ) );
		$last_name  = sanitize_text_field( $request->get_param( 'lastName' ) );
		$email      = sanitize_email( $request->get_param( 'email' ) );
		$phone      = sanitize_text_field( $request->get_param( 'phone' ) );
		$notes      = sanitize_textarea_field( (string) $request->get_param( 'notes' ) );

		if ( empty( $first_name ) ) {
			return new \WP_Error( 'missing_fields', __( 'First name is required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Generate unique username from name or email
		$username = ! empty( $email ) ? explode( '@', $email )[0] : strtolower( $first_name . '_' . rand( 100, 999 ) );
		$username = sanitize_user( $username );

		if ( username_exists( $username ) ) {
			$username = $username . rand( 10, 99 );
		}

		if ( ! empty( $email ) && email_exists( $email ) ) {
			return new \WP_Error( 'email_exists', __( 'Customer with this email already exists.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$user_id = wp_create_user( $username, wp_generate_password(), $email ?: '' );

		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}

		// Update user information
		wp_update_user(
			array(
				'ID'         => $user_id,
				'first_name' => $first_name,
				'last_name'  => $last_name,
				'role'       => 'customer',
			)
		);

		// Save WooCommerce billing details
		update_user_meta( $user_id, 'billing_first_name', $first_name );
		update_user_meta( $user_id, 'billing_last_name', $last_name );
		update_user_meta( $user_id, 'billing_phone', $phone );
		if ( ! empty( $email ) ) {
			update_user_meta( $user_id, 'billing_email', $email );
		}

		// Store POS-specific customer data
		POSCustomer::create(
			array(
				'wc_customer_id' => $user_id,
				'first_name'     => $first_name,
				'last_name'      => $last_name,
				'email'          => $email,
				'phone'          => $phone,
				'notes'          => $notes,
				'loyalty_points' => 0,
				'total_spent'    => 0,
				'visit_count'    => 0,
			)
		);

		$user = get_userdata( $user_id );

		return new \WP_REST_Response( $this->format_customer( $user ), 200 );
	}

	/**
	 * Retrieve a single customer.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_detail( \WP_REST_Request $request ) {
		$user_id = intval( $request->get_param( 'id' ) );
		$user    = get_userdata( $user_id );

		if ( ! $user ) {
			return new \WP_Error( 'not_found', __( 'Customer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		return new \WP_REST_Response( $this->format_customer( $user ), 200 );
	}

	/**
	 * Update customer info.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update( \WP_REST_Request $request ) {
		$user_id    = intval( $request->get_param( 'id' ) );
		$first_name = sanitize_text_field( $request->get_param( 'firstName' ) );
		$last_name  = sanitize_text_field( $request->get_param( 'lastName' ) );
		$email      = sanitize_email( $request->get_param( 'email' ) );
		$phone      = sanitize_text_field( $request->get_param( 'phone' ) );
		$notes      = sanitize_textarea_field( (string) $request->get_param( 'notes' ) );

		if ( empty( $first_name ) ) {
			return new \WP_Error( 'missing_fields', __( 'First name is required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return new \WP_Error( 'not_found', __( 'Customer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		// Email check
		if ( ! empty( $email ) && $email !== $user->user_email && email_exists( $email ) ) {
			return new \WP_Error( 'email_exists', __( 'Customer with this email already exists.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$update_args = array(
			'ID'         => $user_id,
			'first_name' => $first_name,
			'last_name'  => $last_name,
		);

		// Only update user_email when a non-empty email is supplied to avoid
		// wiping the existing email or triggering wp_update_user validation errors.
		if ( ! empty( $email ) ) {
			$update_args['user_email'] = $email;
		}

		wp_update_user( $update_args );

		update_user_meta( $user_id, 'billing_first_name', $first_name );
		update_user_meta( $user_id, 'billing_last_name', $last_name );
		update_user_meta( $user_id, 'billing_phone', $phone );
		if ( ! empty( $email ) ) {
			update_user_meta( $user_id, 'billing_email', $email );
		}

		// Update or create POS customer record
		$pos_customer = POSCustomer::where( 'wc_customer_id', $user_id )->first();
		if ( $pos_customer ) {
			$pos_customer->first_name = $first_name;
			$pos_customer->last_name  = $last_name;
			$pos_customer->email      = $email;
			$pos_customer->phone      = $phone;
			$pos_customer->notes      = $notes;
			$pos_customer->save();
		} else {
			POSCustomer::create(
				array(
					'wc_customer_id' => $user_id,
					'first_name'     => $first_name,
					'last_name'      => $last_name,
					'email'          => $email,
					'phone'          => $phone,
					'notes'          => $notes,
				)
			);
		}

		return new \WP_REST_Response( $this->format_customer( get_userdata( $user_id ) ), 200 );
	}

	/**
	 * Delete a customer.
	 *
	 * Removes both the linked WordPress user account (reassigning their content
	 * to nothing) and the matching POS customer profile.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete( \WP_REST_Request $request ) {
		$user_id = intval( $request->get_param( 'id' ) );

		if ( ! $user_id ) {
			return new \WP_Error( 'invalid_id', __( 'A valid customer id is required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return new \WP_Error( 'not_found', __( 'Customer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		// Refuse to delete a user that holds privileged roles (admins, shop managers, cashiers).
		$privileged_roles = array( 'administrator', 'shop_manager', 'pos_cashier', 'pos_manager' );
		if ( array_intersect( $privileged_roles, (array) $user->roles ) ) {
			return new \WP_Error(
				'cannot_delete_staff',
				__( 'Privileged users cannot be deleted from the customer manager.', 'ready-pos' ),
				array( 'status' => 403 )
			);
		}

		require_once ABSPATH . 'wp-admin/includes/user.php';
		$deleted = wp_delete_user( $user_id );

		if ( ! $deleted ) {
			return new \WP_Error( 'delete_failed', __( 'Failed to delete customer.', 'ready-pos' ), array( 'status' => 500 ) );
		}

		// Remove linked POS customer record(s).
		POSCustomer::where( 'wc_customer_id', $user_id )->delete();

		return new \WP_REST_Response(
			array(
				'success' => true,
				'id'      => $user_id,
			),
			200
		);
	}

	/**
	 * Get purchase history for a customer.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function purchase_history( \WP_REST_Request $request ) {
		$gate = License::require_feature( 'purchase_history' );
		if ( $gate ) {
			return $gate;
		}

		$user_id = intval( $request->get_param( 'id' ) );
		$page    = max( 1, intval( $request->get_param( 'page' ) ?: 1 ) );
		$limit   = max( 1, min( 50, intval( $request->get_param( 'limit' ) ?: 10 ) ) );

		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return new \WP_Error( 'not_found', __( 'Customer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$orders = wc_get_orders(
			array(
				'customer_id' => $user_id,
				'limit'       => $limit,
				'offset'      => ( $page - 1 ) * $limit,
				'orderby'     => 'date',
				'order'       => 'DESC',
				'return'      => 'objects',
			)
		);

		$total = (int) wc_get_orders(
			array(
				'customer_id' => $user_id,
				'return'      => 'ids',
				'limit'       => -1,
			)
		);

		// Use count() on the returned array since 'return' => 'ids' gives an array.
		if ( is_array( $total ) ) {
			$total = count( $total );
		}

		$history = array();
		foreach ( $orders as $order ) {
			$history[] = array(
				'id'             => $order->get_id(),
				'order_number'   => $order->get_order_number(),
				'total'          => floatval( $order->get_total() ),
				'status'         => $order->get_status(),
				'payment_method' => $order->get_payment_method_title(),
				'items_count'    => $order->get_item_count(),
				'date'           => $order->get_date_created() ? $order->get_date_created()->date( 'Y-m-d H:i:s' ) : '',
			);
		}

		return new \WP_REST_Response(
			array(
				'orders'      => $history,
				'total'       => $total,
				'page'        => $page,
				'total_pages' => max( 1, (int) ceil( $total / $limit ) ),
			),
			200
		);
	}

	/**
	 * Redeem loyalty points as a cart discount.
	 *
	 * Accepts:
	 *  - id     (int)  Customer WP user ID.
	 *  - points (int)  Number of points to redeem.
	 *
	 * Conversion: 100 points = $1 discount.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function redeem_points( \WP_REST_Request $request ) {
		$gate = License::require_feature( 'loyalty_points' );
		if ( $gate ) {
			return $gate;
		}

		$user_id = intval( $request->get_param( 'id' ) );
		$points  = intval( $request->get_param( 'points' ) );

		if ( $points <= 0 ) {
			return new \WP_Error( 'invalid_points', __( 'Points must be greater than zero.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$pos_customer = POSCustomer::where( 'wc_customer_id', $user_id )->first();
		if ( ! $pos_customer ) {
			return new \WP_Error( 'not_found', __( 'Customer loyalty record not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		if ( $pos_customer->loyalty_points < $points ) {
			return new \WP_Error(
				'insufficient_points',
				__( 'Customer does not have enough loyalty points.', 'ready-pos' ),
				array( 'status' => 400 )
			);
		}

		// Deduct points.
		$pos_customer->loyalty_points -= $points;
		$pos_customer->save();

		// Conversion: 100 points = $1.
		$discount_amount = round( $points / 100, 2 );

		return new \WP_REST_Response(
			array(
				'success'          => true,
				'points_redeemed'  => $points,
				'discount_amount'  => $discount_amount,
				'remaining_points' => intval( $pos_customer->loyalty_points ),
			),
			200
		);
	}

	/**
	 * Helper function to format customer data.
	 *
	 * @param \WP_User $user WordPress User object.
	 * @return array
	 */
	private function format_customer( $user ) {
		$pos_customer = POSCustomer::where( 'wc_customer_id', $user->ID )->first();

		return array(
			'id'             => $user->ID,
			'username'       => $user->user_login,
			'first_name'     => $user->first_name ?: $user->display_name,
			'last_name'      => $user->last_name,
			'email'          => $user->user_email,
			'phone'          => get_user_meta( $user->ID, 'billing_phone', true ) ?: ( $pos_customer ? $pos_customer->phone : '' ),
			'notes'          => $pos_customer ? (string) $pos_customer->notes : '',
			'loyalty_points' => $pos_customer ? intval( $pos_customer->loyalty_points ) : 0,
			'visit_count'    => $pos_customer ? intval( $pos_customer->visit_count ) : 0,
			'total_spent'    => $pos_customer ? floatval( $pos_customer->total_spent ) : 0,
			'registered_at'  => $user->user_registered,
		);
	}
}
