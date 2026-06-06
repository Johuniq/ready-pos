<?php
/**
 * Class POSInventoryHistory
 *
 * Represents the POSInventoryHistory model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSInventoryHistory
 *
 * @package Readypos\Models
 */
class POSInventoryHistory extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_inventory_history';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'outlet_id',
		'product_id',
		'transaction_type',
		'quantity_before',
		'quantity_change',
		'quantity_after',
		'reference_id',
		'reference_type',
		'notes',
		'user_id',
	);

	/**
	 * Get the outlet associated with this history entry.
	 */
	public function outlet() {
		return $this->belongsTo( POSOutlet::class, 'outlet_id' );
	}
}
