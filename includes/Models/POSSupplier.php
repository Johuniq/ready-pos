<?php
/**
 * POS Supplier Model
 *
 * @package Readypos
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * POSSupplier Model Class
 */
class POSSupplier extends Model {

	/**
	 * Table name
	 *
	 * @var string
	 */
	protected $table = 'readypos_suppliers';

	/**
	 * Disable timestamps auto-management
	 *
	 * @var bool
	 */
	public $timestamps = false;

	/**
	 * Mass assignable attributes
	 *
	 * @var array
	 */
	protected $fillable = array(
		'supplier_code',
		'supplier_name',
		'contact_person',
		'email',
		'phone',
		'address',
		'city',
		'state',
		'zip_code',
		'country',
		'notes',
		'payment_terms',
		'lead_time_days',
		'status',
		'created_at',
		'updated_at',
	);

	/**
	 * Cast attributes
	 *
	 * @var array
	 */
	protected $casts = array(
		'lead_time_days' => 'integer',
	);
}
