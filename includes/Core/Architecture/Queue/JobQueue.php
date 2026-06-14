<?php
/**
 * Action Scheduler Queue Driver
 *
 * @package Readypos\Core\Architecture\Queue
 */

namespace Readypos\Core\Architecture\Queue;

defined( 'ABSPATH' ) || exit;

/**
 * Class JobQueue
 *
 * Driver implementing asynchronous queues using Action Scheduler or a lightweight DB driver.
 */
class JobQueue {

	/**
	 * Hook action identifier for background execution
	 *
	 * @var string
	 */
	const HOOK_NAME = 'readypos_run_queued_job';

	/**
	 * Initialize queue actions
	 */
	public function init() {
		add_action( self::HOOK_NAME, array( $this, 'run_job' ) );
	}

	/**
	 * Push a job onto the background queue
	 *
	 * @param string $job_class Class path to instantiation logic.
	 * @param array  $payload Serialization data for parameter inputs.
	 * @return void
	 */
	public function push( $job_class, array $payload = array() ) {
		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action(
				self::HOOK_NAME,
				array(
					'job_class' => $job_class,
					'payload'   => $payload,
				),
				'readypos-queue'
			);
		} else {
			// Fallback: Dispatch using WP-Cron or execute immediately in-process
			wp_schedule_single_event(
				time(),
				self::HOOK_NAME,
				array(
					'job_class' => $job_class,
					'payload'   => $payload,
				)
			);
		}
	}

	/**
	 * Run worker instance handling job classes
	 *
	 * @param string $job_class Target Job.
	 * @param array  $payload Arguments.
	 * @return void
	 */
	public function run_job( $job_class, array $payload = array() ) {
		if ( class_exists( $job_class ) ) {
			$container = \Readypos\Core\Architecture\Container::get_instance();
			
			// Auto-wire job instance construction
			$reflector = new \ReflectionClass( $job_class );
			$constructor = $reflector->getConstructor();
			
			if ( null === $constructor ) {
				$job = new $job_class();
			} else {
				// Inject payload properties if constructor matches, otherwise inject standard DI container values
				$parameters = $constructor->getParameters();
				$dependencies = array();
				foreach ( $parameters as $param ) {
					if ( isset( $payload[ $param->name ] ) ) {
						$dependencies[] = $payload[ $param->name ];
					} elseif ( $container->has( $param->getType() ? $param->getType()->getName() : '' ) ) {
						$dependencies[] = $container->get( $param->getType()->getName() );
					} elseif ( $param->isDefaultValueAvailable() ) {
						$dependencies[] = $param->getDefaultValue();
					} else {
						$dependencies[] = null;
					}
				}
				$job = $reflector->newInstanceArgs( $dependencies );
			}

			if ( $job instanceof JobInterface ) {
				$job->handle();
			}
		}
	}
}
