<?php
/**
 * Class POSInventoryCountItem
 *
 * Represents individual items within an inventory count.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSInventoryCountItem
 *
 * @package Readypos\Models
 */
class POSInventoryCountItem extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_inventory_count_items';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'count_id',
		'product_id',
		'expected_quantity',
		'counted_quantity',
		'variance',
		'variance_reason',
		'is_counted',
		'scanner_id',
		'counted_by',
		'counted_at',
	);

	/**
	 * Get the count session this item belongs to.
	 */
	public function count() {
		return $this->belongsTo( POSInventoryCount::class, 'count_id' );
	}
}
