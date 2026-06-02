<?php
/**
 * Class POSCustomer
 *
 * Represents the POSCustomer model for Readypos.
 *
 * @package Readypos\Models
 * @since 1.0.0
 */

namespace Readypos\Models;

use Prappo\WpEloquent\Database\Eloquent\Model;

/**
 * Class POSCustomer
 *
 * @package Readypos\Models
 */
class POSCustomer extends Model {

	/**
	 * The table associated with the model.
	 *
	 * @var string
	 */
	protected $table = 'readypos_customers';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = array(
		'wc_customer_id',
		'first_name',
		'last_name',
		'email',
		'phone',
		'loyalty_points',
		'total_spent',
		'visit_count',
		'notes',
	);
}
