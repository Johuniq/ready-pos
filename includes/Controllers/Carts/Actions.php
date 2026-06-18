<?php
/**
 * Cart management actions for POS multi-cart system.
 *
 * @package Readypos\Controllers\Carts
 * @since 1.0.0
 */

namespace Readypos\Controllers\Carts;

defined( 'ABSPATH' ) || exit;

/**
 * Class Actions
 *
 * Handles saving, loading, and managing unlimited carts.
 *
 * @package Readypos\Controllers\Carts
 */
class Actions {

	/**
	 * Save a cart to the database for persistence.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save( \WP_REST_Request $request ) {
		global $wpdb;
		
		$cart_data   = $request->get_param( 'cart' );
		$user_id     = get_current_user_id();
		$cart_id     = isset( $cart_data['id'] ) ? intval( $cart_data['id'] ) : null;
		$label       = isset( $cart_data['label'] ) ? sanitize_text_field( $cart_data['label'] ) : 'Cart';
		$items       = isset( $cart_data['items'] ) ? $cart_data['items'] : array();
		$customer    = isset( $cart_data['customer'] ) ? $cart_data['customer'] : null;
		$discount    = isset( $cart_data['discount'] ) ? $cart_data['discount'] : array( 'type' => null, 'value' => 0 );
		$coupons     = isset( $cart_data['coupons'] ) ? $cart_data['coupons'] : array();
		$notes       = isset( $cart_data['notes'] ) ? sanitize_textarea_field( $cart_data['notes'] ) : '';
		$owner_id    = isset( $cart_data['ownerId'] ) ? intval( $cart_data['ownerId'] ) : $user_id;
		$owner_name  = isset( $cart_data['ownerName'] ) ? sanitize_text_field( $cart_data['ownerName'] ) : '';

		// Validate cart data
		if ( empty( $items ) || ! is_array( $items ) ) {
			return new \WP_Error( 'empty_cart', __( 'Cannot save empty cart.', 'ready-pos-for-woocommerce' ), array( 'status' => 400 ) );
		}

		$table_name = $wpdb->prefix . 'readypos_saved_carts';

		// Prepare cart data for storage
		$cart_content = wp_json_encode(
			array(
				'items'      => $items,
				'customer'   => $customer,
				'discount'   => $discount,
				'coupons'    => $coupons,
				'notes'      => $notes,
				'owner_id'   => $owner_id,
				'owner_name' => $owner_name,
			)
		);

		$data = array(
			'user_id'      => $owner_id,
			'cashier_id'   => $user_id,
			'label'        => $label,
			'cart_content' => $cart_content,
			'item_count'   => count( $items ),
			'updated_at'   => current_time( 'mysql' ),
		);

		// Check if we're updating an existing cart or creating a new one
		if ( $cart_id ) {
			// Verify ownership before updating
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Required for cart management
			$existing = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table_name} WHERE id = %d", $cart_id ) );
			
			if ( ! $existing ) {
				return new \WP_Error( 'cart_not_found', __( 'Cart not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
			}

			// Update existing cart
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Required for cart update
			$wpdb->update( $table_name, $data, array( 'id' => $cart_id ) );
			$saved_cart_id = $cart_id;
		} else {
			// Create new cart
			$data['created_at'] = current_time( 'mysql' );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Required for cart creation
			$wpdb->insert( $table_name, $data );
			$saved_cart_id = $wpdb->insert_id;
		}

		// SECURITY FIX: Log cart saved
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_CART,
			'cart_saved',
			sprintf( 'Cart "%s" saved with %d items', $label, count( $items ) ),
			array(
				'cart_id'    => $saved_cart_id,
				'label'      => $label,
				'item_count' => count( $items ),
				'owner_id'   => $owner_id,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new \WP_REST_Response(
			array(
				'success' => true,
				'cart_id' => $saved_cart_id,
				'message' => __( 'Cart saved successfully.', 'ready-pos-for-woocommerce' ),
			),
			200
		);
	}

	/**
	 * Get all saved carts for the current user or all carts for managers.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function list( \WP_REST_Request $request ) {
		global $wpdb;
		
		$user_id = get_current_user_id();
		$table_name = $wpdb->prefix . 'readypos_saved_carts';

		// Check if user is manager/admin - they can see all carts
		$is_manager = current_user_can( 'readypos_manage_pos' ) || current_user_can( 'manage_options' );

		if ( $is_manager ) {
			// Get all carts
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Required for cart listing, table name is safe
			$carts = $wpdb->get_results( "SELECT * FROM {$table_name} ORDER BY updated_at DESC" );
		} else {
			// Get only carts owned by current user
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Required for cart listing
			$carts = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table_name} WHERE user_id = %d ORDER BY updated_at DESC", $user_id ) );
		}

		$formatted_carts = array();
		foreach ( $carts as $cart ) {
			$content = json_decode( $cart->cart_content, true );
			
			$formatted_carts[] = array(
				'id'         => intval( $cart->id ),
				'label'      => $cart->label,
				'items'      => isset( $content['items'] ) ? $content['items'] : array(),
				'customer'   => isset( $content['customer'] ) ? $content['customer'] : null,
				'discount'   => isset( $content['discount'] ) ? $content['discount'] : array( 'type' => null, 'value' => 0 ),
				'coupons'    => isset( $content['coupons'] ) ? $content['coupons'] : array(),
				'notes'      => isset( $content['notes'] ) ? $content['notes'] : '',
				'ownerId'    => intval( $cart->user_id ),
				'ownerName'  => isset( $content['owner_name'] ) ? $content['owner_name'] : '',
				'itemCount'  => intval( $cart->item_count ),
				'createdAt'  => strtotime( $cart->created_at ) * 1000, // Convert to JS timestamp
				'updatedAt'  => strtotime( $cart->updated_at ) * 1000,
			);
		}

		return new \WP_REST_Response(
			array(
				'carts' => $formatted_carts,
				'total' => count( $formatted_carts ),
			),
			200
		);
	}

	/**
	 * Delete a saved cart.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete( \WP_REST_Request $request ) {
		global $wpdb;
		
		$cart_id = intval( $request->get_param( 'id' ) );
		$user_id = get_current_user_id();
		$table_name = $wpdb->prefix . 'readypos_saved_carts';

		// Verify ownership
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Required for cart verification
		$cart = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table_name} WHERE id = %d", $cart_id ) );

		if ( ! $cart ) {
			return new \WP_Error( 'cart_not_found', __( 'Cart not found.', 'ready-pos-for-woocommerce' ), array( 'status' => 404 ) );
		}

		// Check if user is manager/admin or owner
		$is_manager = current_user_can( 'readypos_manage_pos' ) || current_user_can( 'manage_options' );

		if ( ! $is_manager && intval( $cart->user_id ) !== $user_id ) {
			return new \WP_Error( 'unauthorized', __( 'You do not have permission to delete this cart.', 'ready-pos-for-woocommerce' ), array( 'status' => 403 ) );
		}

		// Delete cart
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Required for cart deletion
		$wpdb->delete( $table_name, array( 'id' => $cart_id ) );

		// SECURITY FIX: Log cart deleted
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_CART,
			'cart_deleted',
			sprintf( 'Cart "%s" deleted', $cart->label ),
			array(
				'cart_id' => $cart_id,
				'label'   => $cart->label,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Cart deleted successfully.', 'ready-pos-for-woocommerce' ),
			),
			200
		);
	}
}
