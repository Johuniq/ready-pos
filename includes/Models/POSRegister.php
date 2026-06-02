<?php
/**
 * Class POSRegister
 *
 * Represents the POSRegister model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSRegister
 *
 * @package Readypos\Models
 */
class POSRegister extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_registers';

	/**
	 * The primary key for the model.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'outlet_id',
		'name',
		'status',
	);

	/**
	 * Get the outlet that owns the register.
	 */
	public function outlet() {
		return $this->belongsTo( POSOutlet::class, 'outlet_id' );
	}
}
