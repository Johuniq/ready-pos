<?php
/**
 * Plugin Installer.
 *
 * Runs on plugin activation to install tables and seed defaults.
 * The plugin does not introduce custom roles or capabilities; access
 * is controlled by the default WordPress `manage_options` cap.
 *
 * @package Readypos\Core
 * @since 1.0.0
 */

namespace Readypos\Core;

use Readypos\Database\Migrations\POSOutlets;
use Readypos\Database\Migrations\AddOutletConfiguration;
use Readypos\Database\Migrations\POSRegisters;
use Readypos\Database\Migrations\POSSessions;
use Readypos\Database\Migrations\POSOrderMeta;
use Readypos\Database\Migrations\POSCustomers;
use Readypos\Database\Migrations\POSOutletStock;
use Readypos\Database\Migrations\POSSuppliers;
use Readypos\Database\Migrations\POSPurchaseOrders;
use Readypos\Database\Migrations\POSStockTransfers;
use Readypos\Database\Migrations\POSStockAdjustments;
use Readypos\Database\Migrations\POSInventoryCounts;
use Readypos\Database\Migrations\POSInventoryCountItems;
use Readypos\Database\Migrations\POSInventoryHistory;
use Readypos\Database\Migrations\POSSessionAdjustments;
use Readypos\Traits\Base;

/**
 * Class Install
 *
 * @package Readypos\Core
 */
class Install {

	use Base;

	/**
	 * Initialize the setup.
	 *
	 * @return void
	 */
	public function init() {
		$this->install_pages();
		$this->install_tables();
	}

	/**
	 * Install custom template pages.
	 *
	 * @return void
	 */
	private function install_pages() {
		readypos_install_page(
			Template::FRONTEND_TEMPLATE_NAME,
			Template::FRONTEND_TEMPLATE_SLUG,
			Template::FRONTEND_TEMPLATE
		);
	}

	/**
	 * Run all tables migrations.
	 *
	 * @return void
	 */
	private function install_tables() {
		POSOutlets::up();
		AddOutletConfiguration::up();
		POSRegisters::up();
		POSSessions::up();
		POSOrderMeta::up();
		POSCustomers::up();
		POSOutletStock::up();

		POSSuppliers::up();
		POSPurchaseOrders::up();
		POSStockTransfers::up();
		POSStockAdjustments::up();
		POSInventoryCounts::up();
		POSInventoryCountItems::up();
		POSInventoryHistory::up();
		POSSessionAdjustments::up();

		// SECURITY FIX #17: Install audit log table
		\Readypos\Database\Migrations\AuditLog::up();
	}
}
