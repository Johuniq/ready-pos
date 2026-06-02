<?php
/**
 * Class POSOutlet
 *
 * Represents the POSOutlet model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSOutlet
 *
 * @package Readypos\Models
 */
class POSOutlet extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_outlets';

	/**
	 * The primary key for the model.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'name',
		'address',
		'phone',
		'email',
		'receipt_header',
		'receipt_footer',
		'status',
	);

	/**
	 * Get registers for this outlet.
	 */
	public function registers() {
		return $this->hasMany( POSRegister::class, 'outlet_id' );
	}
}
