<?php
/**
 * Dependency Injection Container
 *
 * @package Readypos\Core\Architecture
 */

namespace Readypos\Core\Architecture;

use Exception;
use ReflectionClass;
use ReflectionParameter;

defined( 'ABSPATH' ) || exit;

/**
 * Class Container
 *
 * Simple PSR-11 inspired Dependency Injection Container with auto-wiring capabilities.
 */
class Container {

	/**
	 * Unique instance for Singleton pattern
	 *
	 * @var Container|null
	 */
	private static $instance = null;

	/**
	 * Registered bindings/mappings
	 *
	 * @var array
	 */
	private $bindings = array();

	/**
	 * Resolved singleton instances
	 *
	 * @var array
	 */
	private $instances = array();

	/**
	 * Private constructor to prevent direct instantiation
	 */
	private function __construct() {}

	/**
	 * Get global container instance
	 *
	 * @return Container
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Bind an abstract key/interface to a concrete class/callback
	 *
	 * @param string  $abstract Interface or Class identifier.
	 * @param mixed   $concrete Concrete class name, closure, or object instance.
	 * @param boolean $singleton If true, instance will be shared globally.
	 * @return void
	 */
	public function bind( $abstract, $concrete = null, $singleton = false ) {
		if ( null === $concrete ) {
			$concrete = $abstract;
		}

		$this->bindings[ $abstract ] = array(
			'concrete'  => $concrete,
			'singleton' => $singleton,
		);
	}

	/**
	 * Bind a singleton class or interface
	 *
	 * @param string $abstract Interface or Class identifier.
	 * @param mixed  $concrete Concrete resolution logic.
	 * @return void
	 */
	public function singleton( $abstract, $concrete = null ) {
		$this->bind( $abstract, $concrete, true );
	}

	/**
	 * Check if the abstract binding exists
	 *
	 * @param string $abstract Key/Interface.
	 * @return boolean
	 */
	public function has( $abstract ) {
		return isset( $this->bindings[ $abstract ] ) || class_exists( $abstract );
	}

	/**
	 * Resolve/get instance of a given identifier
	 *
	 * @param string $abstract Interface or class name.
	 * @return mixed Resolved instance.
	 * @throws Exception When instantiation fails.
	 */
	public function get( $abstract ) {
		// Return existing singleton if already instantiated
		if ( isset( $this->instances[ $abstract ] ) ) {
			return $this->instances[ $abstract ];
		}

		$concrete = $abstract;
		$is_singleton = false;

		if ( isset( $this->bindings[ $abstract ] ) ) {
			$concrete     = $this->bindings[ $abstract ]['concrete'];
			$is_singleton = $this->bindings[ $abstract ]['singleton'];
		}

		// Resolve concrete
		if ( $concrete instanceof \Closure ) {
			$object = call_user_func( $concrete, $this );
		} elseif ( is_object( $concrete ) ) {
			$object = $concrete;
		} else {
			$object = $this->build( $concrete );
		}

		// Save instance if requested singleton
		if ( $is_singleton ) {
			$this->instances[ $abstract ] = $object;
		}

		return $object;
	}

	/**
	 * Build class instance with autowired constructor dependencies
	 *
	 * @param string $concrete Concrete class name.
	 * @return mixed Instantiated object.
	 * @throws Exception If resolution fails.
	 */
	protected function build( $concrete ) {
		if ( ! class_exists( $concrete ) ) {
			throw new Exception( "Target class [{$concrete}] does not exist." );
		}

		$reflector = new ReflectionClass( $concrete );

		if ( ! $reflector->isInstantiable() ) {
			throw new Exception( "Target class [{$concrete}] is not instantiable." );
		}

		$constructor = $reflector->getConstructor();

		if ( null === $constructor ) {
			return new $concrete();
		}

		$parameters   = $constructor->getParameters();
		$dependencies = $this->resolve_dependencies( $parameters );

		return $reflector->newInstanceArgs( $dependencies );
	}

	/**
	 * Resolve constructor parameter dependencies
	 *
	 * @param ReflectionParameter[] $parameters Constructor parameters reflection.
	 * @return array List of resolved dependency instances.
	 * @throws Exception If dependency cannot be resolved.
	 */
	protected function resolve_dependencies( $parameters ) {
		$dependencies = array();

		foreach ( $parameters as $parameter ) {
			$type = $parameter->getType();

			if ( null === $type || $type->isBuiltin() ) {
				if ( $parameter->isDefaultValueAvailable() ) {
					$dependencies[] = $parameter->getDefaultValue();
				} else {
					throw new Exception( "Cannot resolve class parameter [{$parameter->name}] with no default value." );
				}
			} else {
				$dependencies[] = $this->get( $type->getName() );
			}
		}

		return $dependencies;
	}
}
