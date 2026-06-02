<?php
/**
 * Readypos API Routes.
 *
 * Defines the custom REST API routes for POS operations.
 *
 * @package Readypos\Routes
 */

namespace Readypos\Routes;

use Readypos\Libs\API\Route;

Route::prefix(
	READYPOS_ROUTE_PREFIX,
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

		// Reports API - Pro Features (Require License).
		$route->get( '/reports/sales-summary', '\Readypos\Controllers\Reports\Actions@sales_summary' );
		$route->get( '/reports/product-performance', '\Readypos\Controllers\Reports\Actions@product_performance' );
		$route->get( '/reports/cashier-performance', '\Readypos\Controllers\Reports\Actions@cashier_performance' );
		$route->get( '/reports/payment-methods', '\Readypos\Controllers\Reports\Actions@payment_methods' );

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

		// Hook for additional custom API routes.
		do_action( 'readypos_api', $route );
	}
);
