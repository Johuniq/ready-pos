<?php
/**
 * Class POSOutlet
 *
 * Represents the POSOutlet model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSOutlet
 *
 * @package Readypos\Models
 */
class POSOutlet extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_outlets';

	/**
	 * The primary key for the model.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'name',
		'code',
		'address',
		'city',
		'state',
		'zip_code',
		'country',
		'phone',
		'email',
		'manager_id',
		'default_register_id',
		'receipt_header',
		'receipt_footer',
		'status',
		'pricing_config',
		'tax_config',
		'payment_methods',
	);

	/**
	 * Status constants.
	 */
	const STATUS_ACTIVE   = 'active';
	const STATUS_INACTIVE = 'inactive';

	/**
	 * Check if a code is already in use by another outlet.
	 *
	 * @param string $code  Outlet code (will be normalized to upper-case).
	 * @param int    $ignore_id Outlet ID to ignore (for updates).
	 * @return bool
	 */
	public static function code_exists( $code, $ignore_id = 0 ) {
		if ( '' === $code ) {
			return false;
		}
		$code = strtoupper( trim( (string) $code ) );
		$query = static::where( 'code', $code );
		if ( $ignore_id ) {
			$query->where( 'id', '!=', (int) $ignore_id );
		}
		return null !== $query->first();
	}

	/**
	 * Check if a name is already in use by another outlet.
	 *
	 * @param string $name  Outlet name.
	 * @param int    $ignore_id Outlet ID to ignore (for updates).
	 * @return bool
	 */
	public static function name_exists( $name, $ignore_id = 0 ) {
		$name = trim( (string) $name );
		if ( '' === $name ) {
			return false;
		}
		$query = static::where( 'name', $name );
		if ( $ignore_id ) {
			$query->where( 'id', '!=', (int) $ignore_id );
		}
		return null !== $query->first();
	}

	/**
	 * Get pricing configuration for this outlet.
	 *
	 * @return array
	 */
	public function get_pricing_config() {
		if ( empty( $this->pricing_config ) ) {
			return array();
		}
		$config = json_decode( $this->pricing_config, true );
		return is_array( $config ) ? $config : array();
	}

	/**
	 * Set pricing configuration for this outlet.
	 *
	 * @param array $config Pricing configuration array.
	 */
	public function set_pricing_config( $config ) {
		$this->pricing_config = wp_json_encode( $config );
	}

	/**
	 * Get tax configuration for this outlet.
	 *
	 * @return array
	 */
	public function get_tax_config() {
		if ( empty( $this->tax_config ) ) {
			return array();
		}
		$config = json_decode( $this->tax_config, true );
		return is_array( $config ) ? $config : array();
	}

	/**
	 * Set tax configuration for this outlet.
	 *
	 * @param array $config Tax configuration array.
	 */
	public function set_tax_config( $config ) {
		$this->tax_config = wp_json_encode( $config );
	}

	/**
	 * Get enabled payment methods for this outlet.
	 *
	 * @return array
	 */
	public function get_payment_methods() {
		if ( empty( $this->payment_methods ) ) {
			// Return default payment methods if not configured
			return array( 'cash', 'card' );
		}
		$methods = json_decode( $this->payment_methods, true );
		return is_array( $methods ) ? $methods : array( 'cash', 'card' );
	}

	/**
	 * Set enabled payment methods for this outlet.
	 *
	 * @param array $methods Array of enabled payment method IDs.
	 */
	public function set_payment_methods( $methods ) {
		$this->payment_methods = wp_json_encode( $methods );
	}

	/**
	 * Get outlet-specific price for a product.
	 *
	 * @param int $product_id Product ID.
	 * @return float|null Returns custom price or null if not set.
	 */
	public function get_product_price( $product_id ) {
		$pricing = $this->get_pricing_config();
		
		if ( isset( $pricing['products'][ $product_id ] ) ) {
			return floatval( $pricing['products'][ $product_id ]['price'] );
		}

		// Check category-based pricing
		if ( isset( $pricing['categories'] ) && ! empty( $pricing['categories'] ) ) {
			$product = wc_get_product( $product_id );
			if ( $product ) {
				$category_ids = $product->get_category_ids();
				foreach ( $category_ids as $cat_id ) {
					if ( isset( $pricing['categories'][ $cat_id ] ) ) {
						$modifier = $pricing['categories'][ $cat_id ];
						$base_price = floatval( $product->get_regular_price() );
						
						if ( $modifier['type'] === 'percent' ) {
							return $base_price * ( 1 + ( $modifier['value'] / 100 ) );
						} elseif ( $modifier['type'] === 'fixed' ) {
							return $base_price + $modifier['value'];
						}
					}
				}
			}
		}

		return null; // No custom pricing, use default
	}

	/**
	 * Get registers for this outlet.
	 */
	public function registers() {
		return $this->hasMany( POSRegister::class, 'outlet_id' );
	}
}
