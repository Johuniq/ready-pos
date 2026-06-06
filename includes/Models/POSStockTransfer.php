<?php
/**
 * POS Stock Transfer Model
 *
 * @package Readypos
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * POSStockTransfer Model Class
 */
class POSStockTransfer extends Model {

	/**
	 * Table name
	 *
	 * @var string
	 */
	protected $table = 'readypos_stock_transfers';

	/**
	 * Disable timestamps auto-management
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
		'transfer_number',
		'from_outlet_id',
		'to_outlet_id',
		'requested_by',
		'approved_by',
		'received_by',
		'status',
		'items',
		'notes',
		'reason',
		'requested_at',
		'approved_at',
		'shipped_at',
		'received_at',
		'created_at',
		'updated_at',
	);

	/**
	 * Cast attributes
	 *
	 * @var array
	 */
	protected $casts = array(
		'items' => 'array',
	);

	/**
	 * Get source outlet relationship
	 */
	public function from_outlet() {
		return $this->belongsTo( POSOutlet::class, 'from_outlet_id' );
	}

	/**
	 * Get destination outlet relationship
	 */
	public function to_outlet() {
		return $this->belongsTo( POSOutlet::class, 'to_outlet_id' );
	}

	/**
	 * Get items as array
	 *
	 * @return array
	 */
	public function get_items() {
		if ( is_string( $this->items ) ) {
			return json_decode( $this->items, true ) ?: array();
		}
		return $this->items ?: array();
	}
}
