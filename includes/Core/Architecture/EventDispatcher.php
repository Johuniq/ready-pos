<?php
/**
 * Event Dispatcher Module
 *
 * @package Readypos\Core\Architecture
 */

namespace Readypos\Core\Architecture;

defined( 'ABSPATH' ) || exit;

/**
 * Class EventDispatcher
 *
 * Custom Event Dispatcher supporting synchronous listeners and domain events.
 */
class EventDispatcher {

	/**
	 * Map of event names to registered listeners
	 *
	 * @var array
	 */
	protected $listeners = array();

	/**
	 * DI Container instance
	 *
	 * @var Container
	 */
	protected $container;

	/**
	 * EventDispatcher constructor
	 *
	 * @param Container $container DI container.
	 */
	public function __construct( Container $container ) {
		$this->container = $container;
	}

	/**
	 * Register a listener callback or class for a specific event
	 *
	 * @param string $event Event name.
	 * @param mixed  $listener Closure, array callback, or class name string.
	 * @return void
	 */
	public function listen( $event, $listener ) {
		$this->listeners[ $event ][] = $listener;
	}

	/**
	 * Dispatch an event to all registered listeners
	 *
	 * @param string $event_name Event identifier.
	 * @param mixed  $payload Data payload to pass to the listeners.
	 * @return void
	 */
	public function dispatch( $event_name, $payload = null ) {
		// Support WordPress hooks as generic hook execution
		do_action( 'readypos_event_' . $event_name, $payload );

		if ( ! isset( $this->listeners[ $event_name ] ) ) {
			return;
		}

		foreach ( $this->listeners[ $event_name ] as $listener ) {
			if ( is_string( $listener ) && class_exists( $listener ) ) {
				// Resolve listener via container if it's a class string
				$listener_instance = $this->container->get( $listener );
				if ( method_exists( $listener_instance, 'handle' ) ) {
					call_user_func( array( $listener_instance, 'handle' ), $payload );
				}
			} elseif ( is_callable( $listener ) ) {
				call_user_func( $listener, $payload );
			}
		}
	}
}
