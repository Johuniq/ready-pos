<?php
/**
 * Class POSOutletStock
 *
 * Represents the POSOutletStock model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSOutletStock
 *
 * @package Readypos\Models
 */
class POSOutletStock extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_outlet_stock';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'outlet_id',
		'product_id',
		'stock_quantity',
		'low_stock_threshold',
	);

	/**
	 * Get the outlet associated with the stock level.
	 */
	public function outlet() {
		return $this->belongsTo( POSOutlet::class, 'outlet_id' );
	}
}
