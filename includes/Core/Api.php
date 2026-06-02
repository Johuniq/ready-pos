<?php

namespace Readypos\Core;

use Readypos\Traits\Base;
use Readypos\Libs\API\Config;

/**
 * Class API
 *
 * Initializes and configures the API for the Readypos.
 *
 * @package Readypos\Core
 */
class API {

	use Base;

	/**
	 * Initializes the API for the Readypos.
	 *
	 * @return void
	 */
	public function init() {
		Config::set_route_file( READYPOS_DIR . '/includes/Routes/Api.php' )
			->set_namespace( 'Readypos\Api' )
			->init();
	}
}
