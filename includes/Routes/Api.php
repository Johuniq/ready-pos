<?php
/**
 * Readypos API Routes.
 *
 * Defines the custom REST API routes for POS operations.
 *
 * @package Readypos\Routes
 */

namespace Readypos\Routes;

defined( 'ABSPATH' ) || exit;

use Readypos\Libs\API\Route;

Route::prefix(
	\READYPOS_ROUTE_PREFIX,
	function ( Route $route ) {

		// Products API.
		$route->get( '/products/get', '\Readypos\Controllers\Products\Actions@get' );
		$route->get( '/products/categories', '\Readypos\Controllers\Products\Actions@categories' );
		$route->get( '/products/search', '\Readypos\Controllers\Products\Actions@search' );

		// Orders API.
		$route->post( '/orders/create', '\Readypos\Controllers\Orders\Actions@create' );
		$route->get( '/orders/get', '\Readypos\Controllers\Orders\Actions@get' );
		$route->get( '/orders/get/{id}', '\Readypos\Controllers\Orders\Actions@get_detail' );
		$route->post( '/orders/refund', '\Readypos\Controllers\Orders\Actions@refund' );
		$route->post( '/orders/hold', '\Readypos\Controllers\Orders\Actions@hold' );
		$route->get( '/orders/held', '\Readypos\Controllers\Orders\Actions@get_held' );
		$route->post( '/orders/resume', '\Readypos\Controllers\Orders\Actions@resume' );

		// Returns & Exchanges API.
		$route->get( '/returns/settings', '\Readypos\Controllers\Returns\Actions@get_settings' );
		$route->get( '/returns/get', '\Readypos\Controllers\Returns\Actions@get' );
		$route->get( '/returns/get/{id}', '\Readypos\Controllers\Returns\Actions@get_detail' );
		$route->post( '/returns/check-eligibility', '\Readypos\Controllers\Returns\Actions@check_eligibility' );
		$route->post( '/returns/process', '\Readypos\Controllers\Returns\Actions@process_return' );
		$route->post( '/returns/exchange', '\Readypos\Controllers\Returns\Actions@process_exchange' );

		// Customers API.
		$route->get( '/customers/list', '\Readypos\Controllers\Customers\Actions@list' );
		$route->get( '/customers/search', '\Readypos\Controllers\Customers\Actions@search' );
		$route->post( '/customers/create', '\Readypos\Controllers\Customers\Actions@create' );
		$route->get( '/customers/get/{id}', '\Readypos\Controllers\Customers\Actions@get_detail' );
		$route->post( '/customers/update', '\Readypos\Controllers\Customers\Actions@update' );
		$route->post( '/customers/delete', '\Readypos\Controllers\Customers\Actions@delete' );
		$route->get( '/customers/history/{id}', '\Readypos\Controllers\Customers\Actions@purchase_history' );
		$route->post( '/customers/redeem-points', '\Readypos\Controllers\Customers\Actions@redeem_points' );

		// Coupons API.
		$route->get( '/coupons/validate', '\Readypos\Controllers\Coupons\Actions@validate' );

		// Carts API - Multi-cart management with naming and transfer.
		$route->post( '/carts/save', '\Readypos\Controllers\Carts\Actions@save' );
		$route->get( '/carts/list', '\Readypos\Controllers\Carts\Actions@list' );
		$route->delete( '/carts/delete/{id}', '\Readypos\Controllers\Carts\Actions@delete' );
		$route->post( '/carts/transfer', '\Readypos\Controllers\Carts\Actions@transfer' );
		$route->get( '/carts/cashiers', '\Readypos\Controllers\Carts\Actions@get_cashiers' );

		// Shipping API.
		$route->post( '/shipping/calculate', '\Readypos\Controllers\Shipping\Actions@calculate' );
		$route->get( '/shipping/methods', '\Readypos\Controllers\Shipping\Actions@get_methods' );

		// Gift Cards & Store Credit API.
		$route->get( '/gift-cards/list', '\Readypos\Controllers\GiftCards\Actions@list' );
		$route->post( '/gift-cards/create', '\Readypos\Controllers\GiftCards\Actions@create' );
		$route->get( '/gift-cards/check', '\Readypos\Controllers\GiftCards\Actions@check_balance' );
		$route->post( '/gift-cards/redeem', '\Readypos\Controllers\GiftCards\Actions@redeem' );
		$route->post( '/gift-cards/topup', '\Readypos\Controllers\GiftCards\Actions@topup' );

		// Sessions API.
		$route->post( '/sessions/open', '\Readypos\Controllers\Sessions\Actions@open' );
		$route->post( '/sessions/close', '\Readypos\Controllers\Sessions\Actions@close' );
		$route->get( '/sessions/current', '\Readypos\Controllers\Sessions\Actions@current' );
		$route->get( '/sessions/history', '\Readypos\Controllers\Sessions\Actions@history' );
		$route->post( '/sessions/cash-adjustment', '\Readypos\Controllers\Sessions\Actions@cash_adjustment' );

		// Shifts API.
		$route->post( '/shifts/clock-in', '\Readypos\Controllers\Shifts\Actions@clock_in' );
		$route->post( '/shifts/clock-out', '\Readypos\Controllers\Shifts\Actions@clock_out' );
		$route->get( '/shifts/current', '\Readypos\Controllers\Shifts\Actions@current' );

		// Cashier PIN Login API.
		$route->get( '/cashier/list', '\Readypos\Controllers\Cashier\Actions@list_cashiers' );
		$route->get( '/cashier/login-list', '\Readypos\Controllers\Cashier\Actions@login_list' );
		$route->post( '/cashier/login', '\Readypos\Controllers\Cashier\Actions@login' );
		$route->post( '/cashier/create', '\Readypos\Controllers\Cashier\Actions@create' );
		$route->post( '/cashier/set-pin', '\Readypos\Controllers\Cashier\Actions@set_pin' );
		$route->post( '/cashier/remove-pin', '\Readypos\Controllers\Cashier\Actions@remove_pin' );

		// Inventory Take API.
		$route->post( '/inventory/take', '\Readypos\Controllers\Inventory\Actions@take' );
		$route->get( '/inventory/low-stock', '\Readypos\Controllers\Inventory\Actions@low_stock' );

		// Inventory Counting API.
		$route->post( '/inventory/counts/start', '\Readypos\Controllers\Inventory\CountActions@start' );
		$route->post( '/inventory/counts/update-item', '\Readypos\Controllers\Inventory\CountActions@update_item' );
		$route->post( '/inventory/counts/scan', '\Readypos\Controllers\Inventory\CountActions@scan' );
		$route->post( '/inventory/counts/complete', '\Readypos\Controllers\Inventory\CountActions@complete' );
		$route->post( '/inventory/counts/cancel', '\Readypos\Controllers\Inventory\CountActions@cancel' );
		$route->get( '/inventory/counts/list', '\Readypos\Controllers\Inventory\CountActions@get_counts' );
		$route->get( '/inventory/counts/get/{id}', '\Readypos\Controllers\Inventory\CountActions@get_count' );
		$route->get( '/inventory/counts/variance-report', '\Readypos\Controllers\Inventory\CountActions@variance_report' );

		// Inventory History API.
		$route->get( '/inventory/history', '\Readypos\Controllers\Inventory\HistoryActions@get_history' );
		$route->get( '/inventory/history/summary', '\Readypos\Controllers\Inventory\HistoryActions@get_summary' );

		// Advanced Inventory API - Suppliers.
		$route->get( '/inventory/suppliers', '\Readypos\Controllers\Inventory\AdvancedActions@get_suppliers' );
		$route->post( '/inventory/suppliers/create', '\Readypos\Controllers\Inventory\AdvancedActions@create_supplier' );
		$route->post( '/inventory/suppliers/update', '\Readypos\Controllers\Inventory\AdvancedActions@update_supplier' );

		// Advanced Inventory API - Purchase Orders.
		$route->get( '/inventory/purchase-orders', '\Readypos\Controllers\Inventory\AdvancedActions@get_purchase_orders' );
		$route->post( '/inventory/purchase-orders/create', '\Readypos\Controllers\Inventory\AdvancedActions@create_purchase_order' );
		$route->post( '/inventory/purchase-orders/update-status', '\Readypos\Controllers\Inventory\AdvancedActions@update_po_status' );

		// Advanced Inventory API - Stock Transfers.
		$route->get( '/inventory/stock-transfers', '\Readypos\Controllers\Inventory\AdvancedActions@get_stock_transfers' );
		$route->post( '/inventory/stock-transfers/create', '\Readypos\Controllers\Inventory\AdvancedActions@create_stock_transfer' );
		$route->post( '/inventory/stock-transfers/update-status', '\Readypos\Controllers\Inventory\AdvancedActions@update_transfer_status' );
		$route->get( '/inventory/stock-transfers/pending', '\Readypos\Controllers\Inventory\AdvancedActions@get_pending_transfers' );
		$route->get( '/inventory/stock-transfers/in-transit', '\Readypos\Controllers\Inventory\AdvancedActions@get_in_transit_transfers' );
		$route->post( '/inventory/stock-transfers/approve', '\Readypos\Controllers\Inventory\AdvancedActions@approve_transfer' );
		$route->post( '/inventory/stock-transfers/reject', '\Readypos\Controllers\Inventory\AdvancedActions@reject_transfer' );
		$route->post( '/inventory/stock-transfers/ship', '\Readypos\Controllers\Inventory\AdvancedActions@ship_transfer' );
		$route->post( '/inventory/stock-transfers/receive', '\Readypos\Controllers\Inventory\AdvancedActions@receive_transfer' );
		$route->post( '/inventory/stock-transfers/cancel', '\Readypos\Controllers\Inventory\AdvancedActions@cancel_transfer' );

		// Advanced Inventory API - Stock Adjustments.
		$route->get( '/inventory/stock-adjustments', '\Readypos\Controllers\Inventory\AdvancedActions@get_stock_adjustments' );
		$route->post( '/inventory/stock-adjustments/create', '\Readypos\Controllers\Inventory\AdvancedActions@create_stock_adjustment' );

		// Advanced Inventory API - Reorder Alerts.
		$route->get( '/inventory/reorder-alerts', '\Readypos\Controllers\Inventory\AdvancedActions@get_reorder_alerts' );

		// Reports API - Pro Features (Require License).
		$route->get( '/reports/sales-summary', '\Readypos\Controllers\Reports\Actions@sales_summary' );
		$route->get( '/reports/product-performance', '\Readypos\Controllers\Reports\Actions@product_performance' );
		$route->get( '/reports/cashier-performance', '\Readypos\Controllers\Reports\Actions@cashier_performance' );
		$route->get( '/reports/payment-methods', '\Readypos\Controllers\Reports\Actions@payment_methods' );
		$route->get( '/reports/outlet-analytics', '\Readypos\Controllers\Reports\Actions@outlet_analytics' );

		// Reports API - Dashboard-Only (Free for All Users).
		$route->get( '/reports/dashboard-sales-summary', '\Readypos\Controllers\Reports\Actions@dashboard_sales_summary' );
		$route->get( '/reports/dashboard-product-performance', '\Readypos\Controllers\Reports\Actions@dashboard_product_performance' );
		$route->get( '/reports/dashboard-cashier-performance', '\Readypos\Controllers\Reports\Actions@dashboard_cashier_performance' );
		$route->get( '/reports/dashboard-payment-methods', '\Readypos\Controllers\Reports\Actions@dashboard_payment_methods' );

		// Settings API.
		$route->get( '/settings/get', '\Readypos\Controllers\Settings\Actions@get' );
		$route->post( '/settings/update', '\Readypos\Controllers\Settings\Actions@update' );
		$route->get( '/settings/payment-methods', '\Readypos\Controllers\Settings\Actions@get_payment_methods' );
		$route->get( '/settings/outlets', '\Readypos\Controllers\Settings\Actions@get_outlets' );
		$route->post( '/settings/outlets/create', '\Readypos\Controllers\Settings\Actions@create_outlet' );
		$route->post( '/settings/outlets/update', '\Readypos\Controllers\Settings\Actions@update_outlet' );
		$route->post( '/settings/outlets/update-config', '\Readypos\Controllers\Settings\Actions@update_outlet_config' );
		$route->get( '/settings/outlets/config/{id}', '\Readypos\Controllers\Settings\Actions@get_outlet_config' );
		$route->post( '/settings/registers/create', '\Readypos\Controllers\Settings\Actions@create_register' );
		$route->post( '/settings/registers/update', '\Readypos\Controllers\Settings\Actions@update_register' );
		$route->post( '/settings/registers/delete', '\Readypos\Controllers\Settings\Actions@delete_register' );

		// License API.
		$route->get( '/license/get', '\Readypos\Controllers\License\Actions@get' );
		$route->post( '/license/activate', '\Readypos\Controllers\License\Actions@activate' );
		$route->post( '/license/deactivate', '\Readypos\Controllers\License\Actions@deactivate' );
		$route->post( '/license/revalidate', '\Readypos\Controllers\License\Actions@revalidate' );
		$route->get( '/license/audit', '\Readypos\Controllers\License\Actions@audit' );
		$route->post( '/license/reset', '\Readypos\Controllers\License\Actions@reset' );

		// Offline Sync API - Conflict detection and idempotency.
		// Orders endpoint with idempotency is handled by OfflineSync::create_order_with_idempotency
		// which overrides the standard create endpoint when _idempotencyKey is present
		$route->post( '/inventory/adjust', '\Readypos\Controllers\Orders\OfflineSync@adjust_inventory_with_idempotency' );
		$route->get( '/sync/status', '\Readypos\Controllers\Orders\OfflineSync@get_sync_status' );

		// Hook for additional custom API routes.
		do_action( 'readypos_api', $route );
	}
)->auth( '\Readypos\Core\Roles@check_pos_access' );
