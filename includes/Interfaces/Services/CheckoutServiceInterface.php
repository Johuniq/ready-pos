<?php
/**
 * Checkout Service Interface
 *
 * @package Readypos\Interfaces\Services
 */

namespace Readypos\Interfaces\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Interface CheckoutServiceInterface
 */
interface CheckoutServiceInterface {

	/**
	 * Process cart checkout and generate WC order
	 *
	 * @param array $data Request payload from POST REST route.
	 * @return array Resulting order details.
	 */
	public function checkout( array $data );
}
