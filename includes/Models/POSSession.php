<?php
/**
 * Class POSSession
 *
 * Represents the POSSession model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSSession
 *
 * @package Readypos\Models
 */
class POSSession extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_sessions';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'user_id',
		'outlet_id',
		'register_id',
		'opening_cash',
		'closing_cash',
		'total_sales',
		'total_orders',
		'total_refunds',
		'cash_total',
		'card_total',
		'status',
		'notes',
		'opened_at',
		'closed_at',
	);

	/**
	 * Get the register associated with this session.
	 */
	public function register() {
		return $this->belongsTo( POSRegister::class, 'register_id' );
	}

	/**
	 * Get the outlet associated with this session.
	 */
	public function outlet() {
		return $this->belongsTo( POSOutlet::class, 'outlet_id' );
	}
}
