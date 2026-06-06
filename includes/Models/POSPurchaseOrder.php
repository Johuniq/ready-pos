<?php
/**
 * POS Purchase Order Model
 *
 * @package Readypos
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * POSPurchaseOrder Model Class
 */
class POSPurchaseOrder extends Model {

	/**
	 * Table name
	 *
	 * @var string
	 */
	protected $table = 'readypos_purchase_orders';

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
		'po_number',
		'supplier_id',
		'outlet_id',
		'created_by',
		'status',
		'total_amount',
		'tax_amount',
		'shipping_cost',
		'grand_total',
		'items',
		'notes',
		'expected_delivery_date',
		'actual_delivery_date',
		'submitted_at',
		'approved_at',
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
		'total_amount'   => 'decimal:2',
		'tax_amount'     => 'decimal:2',
		'shipping_cost'  => 'decimal:2',
		'grand_total'    => 'decimal:2',
		'items'          => 'array',
	);

	/**
	 * Get supplier relationship
	 */
	public function supplier() {
		return $this->belongsTo( POSSupplier::class, 'supplier_id' );
	}

	/**
	 * Get outlet relationship
	 */
	public function outlet() {
		return $this->belongsTo( POSOutlet::class, 'outlet_id' );
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
