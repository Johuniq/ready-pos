<?php
/**
 * Plugin Installer.
 *
 * Runs on plugin activation to install tables, seed defaults, and configure roles.
 *
 * @package Readypos\Core
 * @since 1.0.0
 */

namespace Readypos\Core;

use Readypos\Database\Migrations\POSOutlets;
use Readypos\Database\Migrations\POSRegisters;
use Readypos\Database\Migrations\POSSessions;
use Readypos\Database\Migrations\POSOrderMeta;
use Readypos\Database\Migrations\POSCustomers;
use Readypos\Database\Migrations\POSOutletStock;
use Readypos\Database\Migrations\POSEmployeeShifts;
use Readypos\Database\Migrations\POSGiftCards;
use Readypos\Core\Roles;
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
		$this->setup_roles();
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
		POSRegisters::up();
		POSSessions::up();
		POSOrderMeta::up();
		POSCustomers::up();
		POSOutletStock::up();
		POSEmployeeShifts::up();
		POSGiftCards::up();
		
		// SECURITY FIX #17: Install audit log table
		\Readypos\Database\Migrations\AuditLog::up();
	}

	/**
	 * Setup POS-specific roles.
	 *
	 * @return void
	 */
	private function setup_roles() {
		Roles::get_instance()->register_roles();
		Roles::get_instance()->refresh_pos_cashier_caps();
	}
}
