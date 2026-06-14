<?php
/**
 * Job interface for Queue
 *
 * @package Readypos\Core\Architecture\Queue
 */

namespace Readypos\Core\Architecture\Queue;

defined( 'ABSPATH' ) || exit;

/**
 * Interface JobInterface
 */
interface JobInterface {

	/**
	 * Execute the job
	 *
	 * @return void
	 */
	public function handle();
}
