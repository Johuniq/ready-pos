<?php
/**
 * Class POSOrderMeta
 *
 * Represents the POSOrderMeta model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSOrderMeta
 *
 * @package Readypos\Models
 */
class POSOrderMeta extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_order_meta';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'wc_order_id',
		'session_id',
		'cashier_id',
		'customer_id',
		'payment_method',
		'cash_received',
		'change_given',
		'discount_type',
		'discount_value',
		'order_status',
		'notes',
	);

	/**
	 * Get the session associated with this order.
	 */
	public function session() {
		return $this->belongsTo( POSSession::class, 'session_id' );
	}
}
