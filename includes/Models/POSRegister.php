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
		'code',
		'status',
	);

	/**
	 * Status constants.
	 */
	const STATUS_OPEN   = 'open';
	const STATUS_CLOSED = 'closed';
	const STATUS_ACTIVE = 'active';
	const STATUS_INACTIVE = 'inactive';

	/**
	 * Get the outlet that owns the register.
	 */
	public function outlet() {
		return $this->belongsTo( POSOutlet::class, 'outlet_id' );
	}

	/**
	 * Check if a register name is already in use within the same outlet.
	 *
	 * @param string $name  Register name.
	 * @param int    $outlet_id Outlet ID.
	 * @param int    $ignore_id Register ID to ignore (for updates).
	 * @return bool
	 */
	public static function name_exists_in_outlet( $name, $outlet_id, $ignore_id = 0 ) {
		$name = trim( (string) $name );
		if ( '' === $name || ! $outlet_id ) {
			return false;
		}
		$query = static::where( 'outlet_id', (int) $outlet_id )
			->where( 'name', $name );
		if ( $ignore_id ) {
			$query->where( 'id', '!=', (int) $ignore_id );
		}
		return null !== $query->first();
	}

	/**
	 * Check if a register code is already in use within the same outlet.
	 *
	 * @param string $code  Register code.
	 * @param int    $outlet_id Outlet ID.
	 * @param int    $ignore_id Register ID to ignore (for updates).
	 * @return bool
	 */
	public static function code_exists_in_outlet( $code, $outlet_id, $ignore_id = 0 ) {
		$code = strtoupper( trim( (string) $code ) );
		if ( '' === $code || ! $outlet_id ) {
			return false;
		}
		$query = static::where( 'outlet_id', (int) $outlet_id )
			->where( 'code', $code );
		if ( $ignore_id ) {
			$query->where( 'id', '!=', (int) $ignore_id );
		}
		return null !== $query->first();
	}

	/**
	 * Find a register and return the model, or null.
	 *
	 * Centralized so controllers don't need to repeat null-checks.
	 *
	 * @param int $id Register ID.
	 * @return POSRegister|null
	 */
	public static function find_safe( $id ) {
		$id = (int) $id;
		if ( $id <= 0 ) {
			return null;
		}
		return static::find( $id );
	}
}
