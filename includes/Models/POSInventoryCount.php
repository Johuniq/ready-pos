<?php
/**
 * Class POSInventoryCount
 *
 * Represents the POSInventoryCount model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSInventoryCount
 *
 * @package Readypos\Models
 */
class POSInventoryCount extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_inventory_counts';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'outlet_id',
		'count_type',
		'status',
		'name',
		'notes',
		'created_by',
		'completed_by',
		'started_at',
		'completed_at',
	);

	/**
	 * Get the items associated with this count.
	 */
	public function items() {
		return $this->hasMany( POSInventoryCountItem::class, 'count_id' );
	}

	/**
	 * Get the outlet associated with this count.
	 */
	public function outlet() {
		return $this->belongsTo( POSOutlet::class, 'outlet_id' );
	}
}
