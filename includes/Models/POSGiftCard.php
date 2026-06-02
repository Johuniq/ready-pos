<?php
/**
 * Class POSGiftCard
 *
 * Represents the POSGiftCard model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.1.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSGiftCard
 *
 * @package Readypos\Models
 */
class POSGiftCard extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_gift_cards';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'code',
		'type',
		'initial_balance',
		'balance',
		'customer_id',
		'issued_by',
		'status',
		'expires_at',
		'notes',
	);
}
