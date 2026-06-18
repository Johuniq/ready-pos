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

		// Carts API - Multi-cart management.
		$route->post( '/carts/save', '\Readypos\Controllers\Carts\Actions@save' );
		$route->get( '/carts/list', '\Readypos\Controllers\Carts\Actions@list' );
		$route->delete( '/carts/delete/{id}', '\Readypos\Controllers\Carts\Actions@delete' );

		// Shipping API.
		$route->post( '/shipping/calculate', '\Readypos\Controllers\Shipping\Actions@calculate' );
		$route->get( '/shipping/methods', '\Readypos\Controllers\Shipping\Actions@get_methods' );

		// Sessions API.
		$route->post( '/sessions/open', '\Readypos\Controllers\Sessions\Actions@open' );
		$route->post( '/sessions/close', '\Readypos\Controllers\Sessions\Actions@close' );
		$route->get( '/sessions/current', '\Readypos\Controllers\Sessions\Actions@current' );
		$route->get( '/sessions/history', '\Readypos\Controllers\Sessions\Actions@history' );
		$route->post( '/sessions/cash-adjustment', '\Readypos\Controllers\Sessions\Actions@cash_adjustment' );

		// Reports API - Dashboard-Only (Free for All Users).
		$route->get( '/reports/dashboard-sales-summary', '\Readypos\Controllers\Reports\Actions@dashboard_sales_summary' );
		$route->get( '/reports/dashboard-product-performance', '\Readypos\Controllers\Reports\Actions@dashboard_product_performance' );
		$route->get( '/reports/dashboard-payment-methods', '\Readypos\Controllers\Reports\Actions@dashboard_payment_methods' );
		$route->get( '/reports/dashboard-low-stock', '\Readypos\Controllers\Reports\Actions@dashboard_low_stock' );

		// Settings API.
		$route->get( '/settings/get', '\Readypos\Controllers\Settings\Actions@get' );
		$route->post( '/settings/update', '\Readypos\Controllers\Settings\Actions@update' );
		$route->get( '/settings/payment-methods', '\Readypos\Controllers\Settings\Actions@get_payment_methods' );
		$route->get( '/settings/outlets', '\Readypos\Controllers\Settings\Actions@get_outlets' );
		$route->post( '/settings/outlets/create', '\Readypos\Controllers\Settings\Actions@create_outlet' );
		$route->post( '/settings/outlets/update', '\Readypos\Controllers\Settings\Actions@update_outlet' );
		$route->post( '/settings/outlets/delete', '\Readypos\Controllers\Settings\Actions@delete_outlet' );
		$route->post( '/settings/outlets/update-config', '\Readypos\Controllers\Settings\Actions@update_outlet_config' );
		$route->get( '/settings/outlets/config/{id}', '\Readypos\Controllers\Settings\Actions@get_outlet_config' );
		$route->get( '/settings/outlets/{id}/registers', '\Readypos\Controllers\Settings\Actions@list_registers' );
		$route->get( '/settings/outlets/{id}/stats', '\Readypos\Controllers\Settings\Actions@get_outlet_stats' );
		$route->post( '/settings/registers/create', '\Readypos\Controllers\Settings\Actions@create_register' );
		$route->post( '/settings/registers/update', '\Readypos\Controllers\Settings\Actions@update_register' );
		$route->post( '/settings/registers/delete', '\Readypos\Controllers\Settings\Actions@delete_register' );
		$route->post( '/settings/registers/update-status', '\Readypos\Controllers\Settings\Actions@update_register_status' );

		// Hook for additional custom API routes.
		do_action( 'readypos_api', $route );
	}
)->auth( '\Readypos\Core\Roles@check_pos_access' );
