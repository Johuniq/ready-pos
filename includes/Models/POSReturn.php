<?php
/**
 * POS Return Model
 *
 * @package Readypos
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * POSReturn Model Class
 */
class POSReturn extends Model {

	/**
	 * Table name
	 *
	 * @var string
	 */
	protected $table = 'readypos_returns';

	/**
	 * Disable timestamps auto-management (we'll handle manually)
	 *
	 * @var bool
	 */
	public $timestamps = false;

	/**
	 * Mass assignable attributes
	 *
	 * @var array
	 */
	protected $fillable = array(
		'original_order_id',
		'return_order_id',
		'session_id',
		'cashier_id',
		'customer_id',
		'return_type',
		'return_status',
		'return_amount',
		'restocking_fee',
		'refund_amount',
		'refund_method',
		'return_reason',
		'return_notes',
		'restock_items',
		'items',
		'processed_at',
		'created_at',
		'updated_at',
	);

	/**
	 * Cast attributes
	 *
	 * @var array
	 */
	protected $casts = array(
		'return_amount'   => 'decimal:2',
		'restocking_fee'  => 'decimal:2',
		'refund_amount'   => 'decimal:2',
		'restock_items'   => 'boolean',
		'items'           => 'array',
	);

	/**
	 * Get return items as array
	 *
	 * @return array
	 */
	public function get_items() {
		if ( is_string( $this->items ) ) {
			return json_decode( $this->items, true ) ?: array();
		}
		return $this->items ?: array();
	}

	/**
	 * Set return items from array
	 *
	 * @param array $items Items array.
	 */
	public function set_items( $items ) {
		$this->items = is_array( $items ) ? json_encode( $items ) : $items;
	}
}
