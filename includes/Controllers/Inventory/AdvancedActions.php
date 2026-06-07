<?php
/**
 * Advanced Inventory Actions
 *
 * Handles suppliers, purchase orders, stock transfers, and adjustments
 *
 * @package Readypos
 */

namespace Readypos\Controllers\Inventory;

use Readypos\Models\POSSupplier;
use Readypos\Models\POSPurchaseOrder;
use Readypos\Models\POSStockTransfer;
use Readypos\Models\POSStockAdjustment;
use Readypos\Models\POSOutletStock;
use Readypos\Models\POSOutlet;
use Readypos\Traits\Cacheable;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * AdvancedActions Class
 */
class AdvancedActions {

	use Cacheable;

	/**
	 * Check permissions
	 *
	 * @return bool
	 */
	private function check_permissions() {
		return current_user_can( 'manage_woocommerce' ) || current_user_can( 'manage_pos' );
	}

	// ==================== SUPPLIERS ====================

	/**
	 * Get suppliers list
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_suppliers( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$page     = $request->get_param( 'page' ) ?: 1;
		$per_page = $request->get_param( 'per_page' ) ?: 20;
		$status   = $request->get_param( 'status' );
		$search   = $request->get_param( 'search' );

		// Cache key includes all request parameters
		$cache_key = "suppliers_list_{$page}_{$per_page}_{$status}_{$search}";

		return $this->cache_response(
			$cache_key,
			function() use ( $page, $per_page, $status, $search ) {
				return $this->get_suppliers_internal( $page, $per_page, $status, $search );
			},
			'suppliers',
			1800 // 30 minutes
		);
	}

	/**
	 * Internal method to get suppliers list (used for caching).
	 *
	 * @param int    $page Page number.
	 * @param int    $per_page Results per page.
	 * @param string $status Status filter.
	 * @param string $search Search term.
	 * @return \WP_REST_Response
	 */
	private function get_suppliers_internal( $page, $per_page, $status, $search ) {
		$query = POSSupplier::query();

		if ( $status ) {
			$query->where( 'status', $status );
		}

		if ( $search ) {
			$query->where( function ( $q ) use ( $search ) {
				$q->where( 'supplier_name', 'LIKE', '%' . $search . '%' )
				  ->orWhere( 'supplier_code', 'LIKE', '%' . $search . '%' );
			});
		}

		$total     = $query->count();
		$suppliers = $query->orderBy( 'supplier_name', 'ASC' )
						   ->skip( ( $page - 1 ) * $per_page )
						   ->take( $per_page )
						   ->get();

		return new WP_REST_Response(
			array(
				'suppliers' => $suppliers,
				'total'     => $total,
				'page'      => $page,
				'pages'     => ceil( $total / $per_page ),
			),
			200
		);
	}

	/**
	 * Create supplier
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function create_supplier( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$supplier_code = sanitize_text_field( $request->get_param( 'supplier_code' ) );
		$supplier_name = sanitize_text_field( $request->get_param( 'supplier_name' ) );

		if ( empty( $supplier_code ) || empty( $supplier_name ) ) {
			return new WP_Error( 'missing_fields', __( 'Supplier code and name are required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Check for duplicate code
		$existing = POSSupplier::where( 'supplier_code', $supplier_code )->first();
		if ( $existing ) {
			return new WP_Error( 'duplicate_code', __( 'Supplier code already exists.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$supplier = POSSupplier::create(
			array(
				'supplier_code'   => $supplier_code,
				'supplier_name'   => $supplier_name,
				'contact_person'  => sanitize_text_field( $request->get_param( 'contact_person' ) ),
				'email'           => sanitize_email( $request->get_param( 'email' ) ),
				'phone'           => sanitize_text_field( $request->get_param( 'phone' ) ),
				'address'         => sanitize_textarea_field( $request->get_param( 'address' ) ),
				'city'            => sanitize_text_field( $request->get_param( 'city' ) ),
				'state'           => sanitize_text_field( $request->get_param( 'state' ) ),
				'zip_code'        => sanitize_text_field( $request->get_param( 'zip_code' ) ),
				'country'         => sanitize_text_field( $request->get_param( 'country' ) ),
				'notes'           => sanitize_textarea_field( $request->get_param( 'notes' ) ),
				'payment_terms'   => sanitize_text_field( $request->get_param( 'payment_terms' ) ),
				'lead_time_days'  => intval( $request->get_param( 'lead_time_days' ) ?: 7 ),
				'status'          => 'active',
				'created_at'      => current_time( 'mysql' ),
				'updated_at'      => current_time( 'mysql' ),
			)
		);

		// Invalidate supplier caches
		$this->invalidate_cache( 'supplier', $supplier->id );

		return new WP_REST_Response( array( 'success' => true, 'supplier' => $supplier ), 201 );
	}

	/**
	 * Update supplier
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function update_supplier( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$id = intval( $request->get_param( 'id' ) );
		$supplier = POSSupplier::find( $id );

		if ( ! $supplier ) {
			return new WP_Error( 'not_found', __( 'Supplier not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$supplier->supplier_name  = sanitize_text_field( $request->get_param( 'supplier_name' ) ) ?: $supplier->supplier_name;
		$supplier->contact_person = sanitize_text_field( $request->get_param( 'contact_person' ) );
		$supplier->email          = sanitize_email( $request->get_param( 'email' ) );
		$supplier->phone          = sanitize_text_field( $request->get_param( 'phone' ) );
		$supplier->address        = sanitize_textarea_field( $request->get_param( 'address' ) );
		$supplier->city           = sanitize_text_field( $request->get_param( 'city' ) );
		$supplier->state          = sanitize_text_field( $request->get_param( 'state' ) );
		$supplier->zip_code       = sanitize_text_field( $request->get_param( 'zip_code' ) );
		$supplier->country        = sanitize_text_field( $request->get_param( 'country' ) );
		$supplier->notes          = sanitize_textarea_field( $request->get_param( 'notes' ) );
		$supplier->payment_terms  = sanitize_text_field( $request->get_param( 'payment_terms' ) );
		$supplier->lead_time_days = intval( $request->get_param( 'lead_time_days' ) ) ?: $supplier->lead_time_days;
		$supplier->status         = sanitize_text_field( $request->get_param( 'status' ) ) ?: $supplier->status;
		$supplier->updated_at     = current_time( 'mysql' );
		$supplier->save();

		// Invalidate supplier caches
		$this->invalidate_cache( 'supplier', $supplier->id );

		return new WP_REST_Response( array( 'success' => true, 'supplier' => $supplier ), 200 );
	}

	// ==================== PURCHASE ORDERS ====================

	/**
	 * Get purchase orders list
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_purchase_orders( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$page     = $request->get_param( 'page' ) ?: 1;
		$per_page = $request->get_param( 'per_page' ) ?: 20;
		$status   = $request->get_param( 'status' );
		$outlet_id = $request->get_param( 'outlet_id' );

		$query = POSPurchaseOrder::query();

		if ( $status ) {
			$query->where( 'status', $status );
		}

		if ( $outlet_id ) {
			$query->where( 'outlet_id', $outlet_id );
		}

		$total = $query->count();
		$pos   = $query->with( array( 'supplier', 'outlet' ) )
					   ->orderBy( 'created_at', 'DESC' )
					   ->skip( ( $page - 1 ) * $per_page )
					   ->take( $per_page )
					   ->get();

		return new WP_REST_Response(
			array(
				'purchase_orders' => $pos,
				'total'           => $total,
				'page'            => $page,
				'pages'           => ceil( $total / $per_page ),
			),
			200
		);
	}

	/**
	 * Create purchase order
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function create_purchase_order( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$supplier_id = intval( $request->get_param( 'supplier_id' ) );
		$outlet_id   = intval( $request->get_param( 'outlet_id' ) );
		$items       = $request->get_param( 'items' );

		if ( empty( $supplier_id ) || empty( $outlet_id ) || empty( $items ) ) {
			return new WP_Error( 'missing_fields', __( 'Supplier, outlet, and items are required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Generate PO number
		$po_number = 'PO-' . time() . '-' . $outlet_id;

		// Calculate totals
		$total_amount = 0;
		foreach ( $items as $item ) {
			$total_amount += floatval( $item['quantity'] ) * floatval( $item['unit_cost'] );
		}

		$tax_amount    = floatval( $request->get_param( 'tax_amount' ) ?: 0 );
		$shipping_cost = floatval( $request->get_param( 'shipping_cost' ) ?: 0 );
		$grand_total   = $total_amount + $tax_amount + $shipping_cost;

		$current_user = wp_get_current_user();

		$po = POSPurchaseOrder::create(
			array(
				'po_number'              => $po_number,
				'supplier_id'            => $supplier_id,
				'outlet_id'              => $outlet_id,
				'created_by'             => $current_user->ID,
				'status'                 => 'draft',
				'total_amount'           => $total_amount,
				'tax_amount'             => $tax_amount,
				'shipping_cost'          => $shipping_cost,
				'grand_total'            => $grand_total,
				'items'                  => json_encode( $items ),
				'notes'                  => sanitize_textarea_field( $request->get_param( 'notes' ) ),
				'expected_delivery_date' => $request->get_param( 'expected_delivery_date' ),
				'created_at'             => current_time( 'mysql' ),
				'updated_at'             => current_time( 'mysql' ),
			)
		);

		return new WP_REST_Response( array( 'success' => true, 'purchase_order' => $po ), 201 );
	}

	/**
	 * Update purchase order status
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function update_po_status( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$id     = intval( $request->get_param( 'id' ) );
		$status = sanitize_text_field( $request->get_param( 'status' ) );

		$po = POSPurchaseOrder::find( $id );
		if ( ! $po ) {
			return new WP_Error( 'not_found', __( 'Purchase order not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$po->status = $status;
		$po->updated_at = current_time( 'mysql' );

		if ( $status === 'submitted' ) {
			$po->submitted_at = current_time( 'mysql' );
		} elseif ( $status === 'approved' ) {
			$po->approved_at = current_time( 'mysql' );
		} elseif ( $status === 'received' ) {
			$po->received_at = current_time( 'mysql' );
			$po->actual_delivery_date = current_time( 'mysql' );
			// Update inventory
			$this->receive_purchase_order( $po );
		}

		$po->save();

		return new WP_REST_Response( array( 'success' => true, 'purchase_order' => $po ), 200 );
	}

	/**
	 * Receive purchase order and update inventory
	 *
	 * @param POSPurchaseOrder $po Purchase order.
	 */
	private function receive_purchase_order( $po ) {
		$items = $po->get_items();

		foreach ( $items as $item ) {
			$product_id = intval( $item['product_id'] );
			$quantity   = floatval( $item['quantity'] );

			// Update outlet stock
			$stock = POSOutletStock::where( 'outlet_id', $po->outlet_id )
				->where( 'product_id', $product_id )
				->first();

			if ( $stock ) {
				$stock->stock_quantity += $quantity;
				$stock->updated_at = current_time( 'mysql' );
				$stock->save();
			} else {
				POSOutletStock::create(
					array(
						'outlet_id'           => $po->outlet_id,
						'product_id'          => $product_id,
						'stock_quantity'      => $quantity,
						'low_stock_threshold' => 5,
						'created_at'          => current_time( 'mysql' ),
						'updated_at'          => current_time( 'mysql' ),
					)
				);
			}

			// Update WooCommerce stock
			$product = wc_get_product( $product_id );
			if ( $product && $product->managing_stock() ) {
				$new_stock = $product->get_stock_quantity() + $quantity;
				$product->set_stock_quantity( $new_stock );
				$product->save();
			}
		}
	}

	// ==================== STOCK TRANSFERS ====================

	/**
	 * Get stock transfers list
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_stock_transfers( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$page     = $request->get_param( 'page' ) ?: 1;
		$per_page = $request->get_param( 'per_page' ) ?: 20;
		$status   = $request->get_param( 'status' );
		$outlet_id = $request->get_param( 'outlet_id' );

		$query = POSStockTransfer::query();

		if ( $status ) {
			$query->where( 'status', $status );
		}

		if ( $outlet_id ) {
			$query->where( function ( $q ) use ( $outlet_id ) {
				$q->where( 'from_outlet_id', $outlet_id )
				  ->orWhere( 'to_outlet_id', $outlet_id );
			});
		}

		$total     = $query->count();
		$transfers = $query->with( array( 'from_outlet', 'to_outlet' ) )
						   ->orderBy( 'created_at', 'DESC' )
						   ->skip( ( $page - 1 ) * $per_page )
						   ->take( $per_page )
						   ->get();

		return new WP_REST_Response(
			array(
				'transfers' => $transfers,
				'total'     => $total,
				'page'      => $page,
				'pages'     => ceil( $total / $per_page ),
			),
			200
		);
	}

	/**
	 * Create stock transfer
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function create_stock_transfer( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$from_outlet_id = intval( $request->get_param( 'from_outlet_id' ) );
		$to_outlet_id   = intval( $request->get_param( 'to_outlet_id' ) );
		$items          = $request->get_param( 'items' );
		$skip_approval  = $request->get_param( 'skip_approval' ) === true; // Manager override

		if ( empty( $from_outlet_id ) || empty( $to_outlet_id ) || empty( $items ) ) {
			return new WP_Error( 'missing_fields', __( 'Source outlet, destination outlet, and items are required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		if ( $from_outlet_id === $to_outlet_id ) {
			return new WP_Error( 'same_outlet', __( 'Cannot transfer to the same outlet.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Validate stock availability
		foreach ( $items as $item ) {
			$stock = POSOutletStock::where( 'outlet_id', $from_outlet_id )
				->where( 'product_id', $item['product_id'] )
				->first();

			if ( ! $stock || $stock->stock_quantity < floatval( $item['quantity'] ) ) {
				$product = wc_get_product( $item['product_id'] );
				return new WP_Error(
					'insufficient_stock',
					sprintf(
						/* translators: %s: product name */
						__( 'Insufficient stock for %s', 'ready-pos' ),
						$product ? $product->get_name() : 'Product #' . $item['product_id']
					),
					array( 'status' => 400 )
				);
			}
		}

		// Generate transfer number
		$transfer_number = 'ST-' . time() . '-' . $from_outlet_id;

		$current_user = wp_get_current_user();

		// Determine initial status based on user role and skip_approval flag
		$initial_status = 'pending';
		$approved_by = null;
		$approved_at = null;

		if ( $skip_approval && current_user_can( 'manage_woocommerce' ) ) {
			// Manager can create pre-approved transfers
			$initial_status = 'approved';
			$approved_by = $current_user->ID;
			$approved_at = current_time( 'mysql' );
		}

		$transfer = POSStockTransfer::create(
			array(
				'transfer_number' => $transfer_number,
				'from_outlet_id'  => $from_outlet_id,
				'to_outlet_id'    => $to_outlet_id,
				'requested_by'    => $current_user->ID,
				'approved_by'     => $approved_by,
				'status'          => $initial_status,
				'items'           => json_encode( $items ),
				'notes'           => sanitize_textarea_field( $request->get_param( 'notes' ) ),
				'reason'          => sanitize_text_field( $request->get_param( 'reason' ) ),
				'requested_at'    => current_time( 'mysql' ),
				'approved_at'     => $approved_at,
				'created_at'      => current_time( 'mysql' ),
				'updated_at'      => current_time( 'mysql' ),
			)
		);

		// If pre-approved, deduct stock immediately
		if ( $initial_status === 'approved' ) {
			$this->process_stock_transfer_deduction( $transfer );
		}

		// Audit log
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'transfer_created',
			sprintf( 'Stock transfer %s created from outlet #%d to outlet #%d', $transfer_number, $from_outlet_id, $to_outlet_id ),
			array(
				'transfer_id'    => $transfer->id,
				'transfer_number' => $transfer_number,
				'from_outlet'    => $from_outlet_id,
				'to_outlet'      => $to_outlet_id,
				'status'         => $initial_status,
				'item_count'     => count( $items ),
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new WP_REST_Response( array( 'success' => true, 'transfer' => $transfer ), 201 );
	}

	/**
	 * Approve transfer request
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function approve_transfer( WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return new WP_Error( 'insufficient_permissions', __( 'Only managers can approve transfers.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$id = intval( $request->get_param( 'id' ) );
		$transfer = POSStockTransfer::find( $id );

		if ( ! $transfer ) {
			return new WP_Error( 'not_found', __( 'Stock transfer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		if ( $transfer->status !== 'pending' ) {
			return new WP_Error( 'invalid_status', __( 'Transfer is not pending approval.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Check stock availability again
		$items = $transfer->get_items();
		foreach ( $items as $item ) {
			$stock = POSOutletStock::where( 'outlet_id', $transfer->from_outlet_id )
				->where( 'product_id', $item['product_id'] )
				->first();

			if ( ! $stock || $stock->stock_quantity < floatval( $item['quantity'] ) ) {
				$product = wc_get_product( $item['product_id'] );
				return new WP_Error(
					'insufficient_stock',
					sprintf(
						/* translators: %s: product name */
						__( 'Stock no longer available for %s', 'ready-pos' ),
						$product ? $product->get_name() : 'Product #' . $item['product_id']
					),
					array( 'status' => 400 )
				);
			}
		}

		$current_user = wp_get_current_user();

		$transfer->status = 'approved';
		$transfer->approved_by = $current_user->ID;
		$transfer->approved_at = current_time( 'mysql' );
		$transfer->updated_at = current_time( 'mysql' );
		$transfer->save();

		// Deduct from source outlet
		$this->process_stock_transfer_deduction( $transfer );

		// Audit log
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'transfer_approved',
			sprintf( 'Stock transfer %s approved by %s', $transfer->transfer_number, $current_user->display_name ),
			array(
				'transfer_id'     => $transfer->id,
				'transfer_number' => $transfer->transfer_number,
				'approved_by'     => $current_user->ID,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new WP_REST_Response( array( 'success' => true, 'transfer' => $transfer ), 200 );
	}

	/**
	 * Reject transfer request
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function reject_transfer( WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return new WP_Error( 'insufficient_permissions', __( 'Only managers can reject transfers.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$id = intval( $request->get_param( 'id' ) );
		$rejection_reason = sanitize_textarea_field( $request->get_param( 'rejection_reason' ) );

		$transfer = POSStockTransfer::find( $id );

		if ( ! $transfer ) {
			return new WP_Error( 'not_found', __( 'Stock transfer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		if ( $transfer->status !== 'pending' ) {
			return new WP_Error( 'invalid_status', __( 'Transfer is not pending approval.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$current_user = wp_get_current_user();

		$transfer->status = 'rejected';
		$transfer->approved_by = $current_user->ID; // Track who rejected it
		$transfer->approved_at = current_time( 'mysql' );
		$transfer->notes = ( $transfer->notes ? $transfer->notes . "\n\n" : '' ) . 'REJECTED: ' . $rejection_reason;
		$transfer->updated_at = current_time( 'mysql' );
		$transfer->save();

		// Audit log
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'transfer_rejected',
			sprintf( 'Stock transfer %s rejected by %s', $transfer->transfer_number, $current_user->display_name ),
			array(
				'transfer_id'      => $transfer->id,
				'transfer_number'  => $transfer->transfer_number,
				'rejected_by'      => $current_user->ID,
				'rejection_reason' => $rejection_reason,
			),
			\Readypos\Core\AuditLog::SEVERITY_WARNING
		);

		return new WP_REST_Response( array( 'success' => true, 'transfer' => $transfer ), 200 );
	}

	/**
	 * Mark transfer as shipped/in-transit
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function ship_transfer( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$id = intval( $request->get_param( 'id' ) );
		$tracking_number = sanitize_text_field( $request->get_param( 'tracking_number' ) );
		$carrier = sanitize_text_field( $request->get_param( 'carrier' ) );
		$shipping_notes = sanitize_textarea_field( $request->get_param( 'shipping_notes' ) );

		$transfer = POSStockTransfer::find( $id );

		if ( ! $transfer ) {
			return new WP_Error( 'not_found', __( 'Stock transfer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		if ( $transfer->status !== 'approved' ) {
			return new WP_Error( 'invalid_status', __( 'Transfer must be approved before shipping.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$transfer->status = 'in_transit';
		$transfer->shipped_at = current_time( 'mysql' );
		$transfer->updated_at = current_time( 'mysql' );
		
		// Store shipping details in notes
		$shipping_info = "Shipped via {$carrier}";
		if ( $tracking_number ) {
			$shipping_info .= " - Tracking: {$tracking_number}";
		}
		if ( $shipping_notes ) {
			$shipping_info .= "\nNotes: {$shipping_notes}";
		}
		$transfer->notes = ( $transfer->notes ? $transfer->notes . "\n\n" : '' ) . $shipping_info;
		$transfer->save();

		// Audit log
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'transfer_shipped',
			sprintf( 'Stock transfer %s marked as shipped', $transfer->transfer_number ),
			array(
				'transfer_id'     => $transfer->id,
				'transfer_number' => $transfer->transfer_number,
				'carrier'         => $carrier,
				'tracking_number' => $tracking_number,
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new WP_REST_Response( array( 'success' => true, 'transfer' => $transfer ), 200 );
	}

	/**
	 * Receive transfer
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function receive_transfer( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$id = intval( $request->get_param( 'id' ) );
		$received_items = $request->get_param( 'received_items' ); // Allow partial receipt
		$receipt_notes = sanitize_textarea_field( $request->get_param( 'receipt_notes' ) );

		$transfer = POSStockTransfer::find( $id );

		if ( ! $transfer ) {
			return new WP_Error( 'not_found', __( 'Stock transfer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		if ( ! in_array( $transfer->status, array( 'approved', 'in_transit' ), true ) ) {
			return new WP_Error( 'invalid_status', __( 'Transfer must be approved or in-transit to receive.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		$current_user = wp_get_current_user();

		$transfer->status = 'received';
		$transfer->received_by = $current_user->ID;
		$transfer->received_at = current_time( 'mysql' );
		$transfer->updated_at = current_time( 'mysql' );

		if ( $receipt_notes ) {
			$transfer->notes = ( $transfer->notes ? $transfer->notes . "\n\n" : '' ) . "Receipt Notes: {$receipt_notes}";
		}

		$transfer->save();

		// Add to destination outlet (use received_items if provided, otherwise use original items)
		$items_to_receive = $received_items ?: $transfer->get_items();
		$this->process_stock_transfer_addition_custom( $transfer, $items_to_receive );

		// Audit log
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'transfer_received',
			sprintf( 'Stock transfer %s received by %s', $transfer->transfer_number, $current_user->display_name ),
			array(
				'transfer_id'     => $transfer->id,
				'transfer_number' => $transfer->transfer_number,
				'received_by'     => $current_user->ID,
				'item_count'      => count( $items_to_receive ),
			),
			\Readypos\Core\AuditLog::SEVERITY_INFO
		);

		return new WP_REST_Response( array( 'success' => true, 'transfer' => $transfer ), 200 );
	}

	/**
	 * Cancel transfer
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function cancel_transfer( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$id = intval( $request->get_param( 'id' ) );
		$cancellation_reason = sanitize_textarea_field( $request->get_param( 'cancellation_reason' ) );

		$transfer = POSStockTransfer::find( $id );

		if ( ! $transfer ) {
			return new WP_Error( 'not_found', __( 'Stock transfer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		if ( in_array( $transfer->status, array( 'received', 'cancelled' ), true ) ) {
			return new WP_Error( 'invalid_status', __( 'Cannot cancel a completed or already cancelled transfer.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// If transfer was approved or in-transit, restore stock to source outlet
		if ( in_array( $transfer->status, array( 'approved', 'in_transit' ), true ) ) {
			$this->process_stock_transfer_addition( $transfer ); // Add back to source outlet (swap outlets temporarily)
			$original_from = $transfer->from_outlet_id;
			$transfer->from_outlet_id = $transfer->to_outlet_id;
			$transfer->to_outlet_id = $original_from;
			$this->process_stock_transfer_addition( $transfer ); // Restore
			$transfer->from_outlet_id = $original_from;
			$transfer->to_outlet_id = $transfer->to_outlet_id;
		}

		$transfer->status = 'cancelled';
		$transfer->notes = ( $transfer->notes ? $transfer->notes . "\n\n" : '' ) . 'CANCELLED: ' . $cancellation_reason;
		$transfer->updated_at = current_time( 'mysql' );
		$transfer->save();

		// Audit log
		\Readypos\Core\AuditLog::log(
			\Readypos\Core\AuditLog::EVENT_DATA,
			'transfer_cancelled',
			sprintf( 'Stock transfer %s cancelled', $transfer->transfer_number ),
			array(
				'transfer_id'          => $transfer->id,
				'transfer_number'      => $transfer->transfer_number,
				'cancellation_reason'  => $cancellation_reason,
			),
			\Readypos\Core\AuditLog::SEVERITY_WARNING
		);

		return new WP_REST_Response( array( 'success' => true, 'transfer' => $transfer ), 200 );
	}

	/**
	 * Update stock transfer status
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function update_transfer_status( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$id     = intval( $request->get_param( 'id' ) );
		$status = sanitize_text_field( $request->get_param( 'status' ) );

		$transfer = POSStockTransfer::find( $id );
		if ( ! $transfer ) {
			return new WP_Error( 'not_found', __( 'Stock transfer not found.', 'ready-pos' ), array( 'status' => 404 ) );
		}

		$current_user = wp_get_current_user();
		$transfer->status = $status;
		$transfer->updated_at = current_time( 'mysql' );

		if ( $status === 'approved' ) {
			$transfer->approved_by = $current_user->ID;
			$transfer->approved_at = current_time( 'mysql' );
			// Deduct from source outlet
			$this->process_stock_transfer_deduction( $transfer );
		} elseif ( $status === 'in_transit' ) {
			$transfer->shipped_at = current_time( 'mysql' );
		} elseif ( $status === 'received' ) {
			$transfer->received_by = $current_user->ID;
			$transfer->received_at = current_time( 'mysql' );
			// Add to destination outlet
			$this->process_stock_transfer_addition( $transfer );
		}

		$transfer->save();

		return new WP_REST_Response( array( 'success' => true, 'transfer' => $transfer ), 200 );
	}

	/**
	 * Process stock transfer deduction
	 *
	 * @param POSStockTransfer $transfer Transfer object.
	 */
	private function process_stock_transfer_deduction( $transfer ) {
		$items = $transfer->get_items();

		foreach ( $items as $item ) {
			$stock = POSOutletStock::where( 'outlet_id', $transfer->from_outlet_id )
				->where( 'product_id', $item['product_id'] )
				->first();

			if ( $stock ) {
				$stock->stock_quantity -= floatval( $item['quantity'] );
				$stock->updated_at = current_time( 'mysql' );
				$stock->save();
			}
		}
	}

	/**
	 * Process stock transfer addition with custom items
	 *
	 * @param POSStockTransfer $transfer Transfer object.
	 * @param array            $items Items to add.
	 */
	private function process_stock_transfer_addition_custom( $transfer, $items ) {
		foreach ( $items as $item ) {
			$stock = POSOutletStock::where( 'outlet_id', $transfer->to_outlet_id )
				->where( 'product_id', $item['product_id'] )
				->first();

			if ( $stock ) {
				$stock->stock_quantity += floatval( $item['quantity'] );
				$stock->updated_at = current_time( 'mysql' );
				$stock->save();
			} else {
				POSOutletStock::create(
					array(
						'outlet_id'           => $transfer->to_outlet_id,
						'product_id'          => $item['product_id'],
						'stock_quantity'      => floatval( $item['quantity'] ),
						'low_stock_threshold' => 5,
						'created_at'          => current_time( 'mysql' ),
						'updated_at'          => current_time( 'mysql' ),
					)
				);
			}
		}
	}

	/**
	 * Get pending transfer requests
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_pending_transfers( WP_REST_Request $request ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$outlet_id = $request->get_param( 'outlet_id' );

		$query = POSStockTransfer::where( 'status', 'pending' );

		if ( $outlet_id ) {
			$query->where( function ( $q ) use ( $outlet_id ) {
				$q->where( 'from_outlet_id', $outlet_id )
				  ->orWhere( 'to_outlet_id', $outlet_id );
			});
		}

		$transfers = $query->with( array( 'from_outlet', 'to_outlet' ) )
						   ->orderBy( 'requested_at', 'ASC' )
						   ->get();

		// Enrich with user data
		$user_ids = array_unique( array_filter( $transfers->pluck( 'requested_by' )->toArray() ) );
		$users_map = array();
		if ( ! empty( $user_ids ) ) {
			$user_query = new \WP_User_Query( array( 'include' => $user_ids, 'fields' => 'all' ) );
			foreach ( $user_query->get_results() as $u ) {
				$users_map[ $u->ID ] = $u->display_name;
			}
		}

		foreach ( $transfers as $t ) {
			$t->requested_by_name = isset( $users_map[ $t->requested_by ] ) ? $users_map[ $t->requested_by ] : 'User #' . $t->requested_by;
		}

		return new WP_REST_Response(
			array(
				'transfers' => $transfers,
				'total'     => count( $transfers ),
			),
			200
		);
	}

	/**
	 * Get in-transit transfers
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_in_transit_transfers( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$outlet_id = $request->get_param( 'outlet_id' );

		$query = POSStockTransfer::where( 'status', 'in_transit' );

		if ( $outlet_id ) {
			$query->where( function ( $q ) use ( $outlet_id ) {
				$q->where( 'from_outlet_id', $outlet_id )
				  ->orWhere( 'to_outlet_id', $outlet_id );
			});
		}

		$transfers = $query->with( array( 'from_outlet', 'to_outlet' ) )
						   ->orderBy( 'shipped_at', 'DESC' )
						   ->get();

		return new WP_REST_Response(
			array(
				'transfers' => $transfers,
				'total'     => count( $transfers ),
			),
			200
		);
	}

	// ==================== STOCK ADJUSTMENTS ====================

	/**
	 * Get stock adjustments list
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_stock_adjustments( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$page       = $request->get_param( 'page' ) ?: 1;
		$per_page   = $request->get_param( 'per_page' ) ?: 20;
		$outlet_id  = $request->get_param( 'outlet_id' );
		$product_id = $request->get_param( 'product_id' );
		$reason     = $request->get_param( 'reason' );

		$query = POSStockAdjustment::query();

		if ( $outlet_id ) {
			$query->where( 'outlet_id', $outlet_id );
		}

		if ( $product_id ) {
			$query->where( 'product_id', $product_id );
		}

		if ( $reason ) {
			$query->where( 'reason', $reason );
		}

		$total       = $query->count();
		$adjustments = $query->with( 'outlet' )
							 ->orderBy( 'created_at', 'DESC' )
							 ->skip( ( $page - 1 ) * $per_page )
							 ->take( $per_page )
							 ->get();

		// Batch-load product and user data to avoid N+1 queries.
		$product_ids = array_unique( array_filter( $adjustments->pluck( 'product_id' )->toArray() ) );
		$user_ids    = array_unique( array_filter( $adjustments->pluck( 'adjusted_by' )->toArray() ) );

		$products_map = array();
		if ( ! empty( $product_ids ) ) {
			// Prime the WC product cache in one query.
			_prime_post_caches( $product_ids, true, true );
			foreach ( $product_ids as $pid ) {
				$p = wc_get_product( $pid );
				if ( $p ) {
					$products_map[ $pid ] = $p;
				}
			}
		}

		$users_map = array();
		if ( ! empty( $user_ids ) ) {
			// Batch-load users in one query.
			$user_query = new \WP_User_Query( array( 'include' => $user_ids, 'fields' => 'all' ) );
			foreach ( $user_query->get_results() as $u ) {
				$users_map[ $u->ID ] = $u->display_name;
			}
		}

		foreach ( $adjustments as $adj ) {
			if ( isset( $products_map[ $adj->product_id ] ) ) {
				$adj->product_name = $products_map[ $adj->product_id ]->get_name();
				$adj->product_sku  = $products_map[ $adj->product_id ]->get_sku();
			}
			$adj->adjusted_by_name = isset( $users_map[ $adj->adjusted_by ] ) ? $users_map[ $adj->adjusted_by ] : '';
			$adj->outlet_name      = $adj->outlet ? $adj->outlet->name : 'Outlet #' . $adj->outlet_id;
		}

		return new WP_REST_Response(
			array(
				'adjustments' => $adjustments,
				'total'       => $total,
				'page'        => $page,
				'pages'       => ceil( $total / $per_page ),
			),
			200
		);
	}

	/**
	 * Create stock adjustment
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function create_stock_adjustment( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$outlet_id         = intval( $request->get_param( 'outlet_id' ) );
		$product_id        = intval( $request->get_param( 'product_id' ) );
		$adjustment_type   = sanitize_text_field( $request->get_param( 'adjustment_type' ) ); // increase, decrease, set
		$adjustment_qty    = floatval( $request->get_param( 'adjustment_quantity' ) );
		$reason            = sanitize_text_field( $request->get_param( 'reason' ) );

		if ( empty( $outlet_id ) || empty( $product_id ) || empty( $reason ) ) {
			return new WP_Error( 'missing_fields', __( 'Outlet, product, and reason are required.', 'ready-pos' ), array( 'status' => 400 ) );
		}

		// Get current stock
		$stock = POSOutletStock::where( 'outlet_id', $outlet_id )
			->where( 'product_id', $product_id )
			->first();

		$previous_qty = $stock ? $stock->stock_quantity : 0;
		$new_qty      = $previous_qty;

		if ( $adjustment_type === 'increase' ) {
			$new_qty = $previous_qty + $adjustment_qty;
		} elseif ( $adjustment_type === 'decrease' ) {
			$new_qty = max( 0, $previous_qty - $adjustment_qty );
		} elseif ( $adjustment_type === 'set' ) {
			$new_qty = $adjustment_qty;
		}

		// Calculate cost impact (if product has cost)
		$product      = wc_get_product( $product_id );
		$cost_impact  = 0;
		if ( $product ) {
			$unit_cost = floatval( $product->get_meta( '_cost', true ) ?: 0 );
			$cost_impact = ( $new_qty - $previous_qty ) * $unit_cost;
		}

		// Generate adjustment number
		$adjustment_number = 'ADJ-' . time() . '-' . $outlet_id;

		$current_user = wp_get_current_user();

		$adjustment = POSStockAdjustment::create(
			array(
				'adjustment_number'   => $adjustment_number,
				'outlet_id'           => $outlet_id,
				'product_id'          => $product_id,
				'adjusted_by'         => $current_user->ID,
				'adjustment_type'     => $adjustment_type,
				'previous_quantity'   => $previous_qty,
				'adjustment_quantity' => $adjustment_qty,
				'new_quantity'        => $new_qty,
				'reason'              => $reason,
				'notes'               => sanitize_textarea_field( $request->get_param( 'notes' ) ),
				'cost_impact'         => $cost_impact,
				'created_at'          => current_time( 'mysql' ),
			)
		);

		// Update stock
		if ( $stock ) {
			$stock->stock_quantity = $new_qty;
			$stock->updated_at = current_time( 'mysql' );
			$stock->save();
		} else {
			POSOutletStock::create(
				array(
					'outlet_id'           => $outlet_id,
					'product_id'          => $product_id,
					'stock_quantity'      => $new_qty,
					'low_stock_threshold' => 5,
					'created_at'          => current_time( 'mysql' ),
					'updated_at'          => current_time( 'mysql' ),
				)
			);
		}

		// Update WooCommerce stock
		if ( $product && $product->managing_stock() ) {
			$diff = $new_qty - $previous_qty;
			$new_wc_stock = $product->get_stock_quantity() + $diff;
			$product->set_stock_quantity( $new_wc_stock );
			$product->save();
		}

		return new WP_REST_Response( array( 'success' => true, 'adjustment' => $adjustment ), 201 );
	}

	// ==================== REORDER ALERTS ====================

	/**
	 * Get products needing reorder
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_reorder_alerts( WP_REST_Request $request ) {
		if ( ! $this->check_permissions() ) {
			return new WP_Error( 'insufficient_permissions', __( 'Permission denied.', 'ready-pos' ), array( 'status' => 403 ) );
		}

		$outlet_id = $request->get_param( 'outlet_id' );

		$alerts = array();

		// Get outlet stock below threshold
		$query = POSOutletStock::query();

		if ( $outlet_id ) {
			$query->where( 'outlet_id', $outlet_id );
		}

		$low_stocks = $query->whereRaw( 'stock_quantity <= low_stock_threshold' )->get();

		// Batch-load products to avoid N+1 queries.
		$product_ids = array_unique( array_filter( $low_stocks->pluck( 'product_id' )->toArray() ) );
		$outlet_ids  = array_unique( array_filter( $low_stocks->pluck( 'outlet_id' )->toArray() ) );

		$products_map = array();
		if ( ! empty( $product_ids ) ) {
			_prime_post_caches( $product_ids, true, true );
			foreach ( $product_ids as $pid ) {
				$p = wc_get_product( $pid );
				if ( $p ) {
					$products_map[ $pid ] = $p;
				}
			}
		}

		$outlets_map = array();
		if ( ! empty( $outlet_ids ) ) {
			$outlet_records = POSOutlet::whereIn( 'id', $outlet_ids )->get();
			foreach ( $outlet_records as $o ) {
				$outlets_map[ $o->id ] = $o->name;
			}
		}

		foreach ( $low_stocks as $stock ) {
			if ( ! isset( $products_map[ $stock->product_id ] ) ) {
				continue;
			}
			$product = $products_map[ $stock->product_id ];

			$alerts[] = array(
				'product_id'          => $stock->product_id,
				'product_name'        => $product->get_name(),
				'product_sku'         => $product->get_sku() ?: 'N/A',
				'outlet_id'           => $stock->outlet_id,
				'outlet_name'         => isset( $outlets_map[ $stock->outlet_id ] ) ? $outlets_map[ $stock->outlet_id ] : 'Outlet #' . $stock->outlet_id,
				'current_stock'       => floatval( $stock->stock_quantity ),
				'reorder_point'       => intval( $stock->low_stock_threshold ),
				'suggested_quantity'  => max( 10, intval( $stock->low_stock_threshold ) * 2 ),
				'image'               => wp_get_attachment_image_url( $product->get_image_id(), 'thumbnail' ),
			);
		}

		return new WP_REST_Response( array( 'alerts' => $alerts, 'total' => count( $alerts ) ), 200 );
	}
}
