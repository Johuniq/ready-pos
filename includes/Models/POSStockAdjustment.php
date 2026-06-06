<?php
/**
 * POS Stock Adjustment Model
 *
 * @package Readypos
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * POSStockAdjustment Model Class
 */
class POSStockAdjustment extends Model {

	/**
	 * Table name
	 *
	 * @var string
	 */
	protected $table = 'readypos_stock_adjustments';

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
		'adjustment_number',
		'outlet_id',
		'product_id',
		'adjusted_by',
		'adjustment_type',
		'previous_quantity',
		'adjustment_quantity',
		'new_quantity',
		'reason',
		'notes',
		'cost_impact',
		'created_at',
	);

	/**
	 * Cast attributes
	 *
	 * @var array
	 */
	protected $casts = array(
		'previous_quantity'    => 'decimal:2',
		'adjustment_quantity'  => 'decimal:2',
		'new_quantity'         => 'decimal:2',
		'cost_impact'          => 'decimal:2',
	);

	/**
	 * Get outlet relationship
	 */
	public function outlet() {
		return $this->belongsTo( POSOutlet::class, 'outlet_id' );
	}
}
