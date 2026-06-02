<?php
/**
 * Class POSEmployeeShift
 *
 * Represents the POSEmployeeShift model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSEmployeeShift
 *
 * @package Readypos\Models
 */
class POSEmployeeShift extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_employee_shifts';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'user_id',
		'session_id',
		'clock_in_at',
		'clock_out_at',
		'notes',
	);

	/**
	 * Get the register session associated with the shift.
	 */
	public function session() {
		return $this->belongsTo( POSSession::class, 'session_id' );
	}
}
