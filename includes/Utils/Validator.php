<?php
/**
 * Input Validation Utility
 *
 * Centralized, chainable validation helpers used by POS controllers.
 * Returns WP_Error on failure so callers can short-circuit with
 * `is_wp_error( $value )` checks.
 *
 * @package Readypos\Utils
 */

namespace Readypos\Utils;

defined( 'ABSPATH' ) || exit;

/**
 * Class Validator
 *
 * @package Readypos\Utils
 */
class Validator {

	/**
	 * Required string field. Empty (after trim) returns WP_Error.
	 *
	 * @param mixed  $value Raw value from request.
	 * @param string $field Human-readable field name.
	 * @param int    $max_length Optional max length cap.
	 * @return string|\WP_Error
	 */
	public static function required_string( $value, $field, $max_length = 255 ) {
		$value = is_string( $value ) ? trim( $value ) : '';
		if ( '' === $value ) {
			return new \WP_Error(
				'validation_required',
				sprintf( /* translators: %s field name */ __( '%s is required.', 'ready-pos-for-woocommerce' ), $field ),
				array( 'status' => 400, 'field' => $field )
			);
		}
		if ( strlen( $value ) > $max_length ) {
			return new \WP_Error(
				'validation_max_length',
				sprintf(
					/* translators: 1: field, 2: max length */
					__( '%1$s must be %2$d characters or fewer.', 'ready-pos-for-woocommerce' ),
					$field,
					$max_length
				),
				array( 'status' => 400, 'field' => $field )
			);
		}
		return sanitize_text_field( $value );
	}

	/**
	 * Optional string field. Returns empty string if null/empty.
	 *
	 * @param mixed  $value Raw value from request.
	 * @param int    $max_length Optional max length cap.
	 * @return string
	 */
	public static function optional_string( $value, $max_length = 255 ) {
		if ( null === $value || '' === $value ) {
			return '';
		}
		$value = (string) $value;
		if ( strlen( $value ) > $max_length ) {
			$value = substr( $value, 0, $max_length );
		}
		return sanitize_text_field( $value );
	}

	/**
	 * Required text area (multi-line). Allows newlines.
	 *
	 * @param mixed  $value Raw value.
	 * @param string $field Field name.
	 * @param int    $max_length Max length cap.
	 * @return string|\WP_Error
	 */
	public static function required_textarea( $value, $field, $max_length = 5000 ) {
		$value = is_string( $value ) ? trim( $value ) : '';
		if ( '' === $value ) {
			return new \WP_Error(
				'validation_required',
				sprintf( /* translators: %s field name */ __( '%s is required.', 'ready-pos-for-woocommerce' ), $field ),
				array( 'status' => 400, 'field' => $field )
			);
		}
		if ( strlen( $value ) > $max_length ) {
			$value = substr( $value, 0, $max_length );
		}
		return sanitize_textarea_field( $value );
	}

	/**
	 * Required positive integer.
	 *
	 * @param mixed  $value Raw value.
	 * @param string $field Field name.
	 * @return int|\WP_Error
	 */
	public static function required_int( $value, $field ) {
		if ( ! is_numeric( $value ) ) {
			return new \WP_Error(
				'validation_invalid_int',
				sprintf( /* translators: %s field name */ __( '%s must be a valid number.', 'ready-pos-for-woocommerce' ), $field ),
				array( 'status' => 400, 'field' => $field )
			);
		}
		$int = intval( $value );
		if ( $int <= 0 ) {
			return new \WP_Error(
				'validation_positive_int',
				sprintf( /* translators: %s field name */ __( '%s must be greater than zero.', 'ready-pos-for-woocommerce' ), $field ),
				array( 'status' => 400, 'field' => $field )
			);
		}
		return $int;
	}

	/**
	 * Optional integer (0 if missing).
	 *
	 * @param mixed $value Raw value.
	 * @return int
	 */
	public static function optional_int( $value ) {
		if ( ! is_numeric( $value ) || '' === $value || null === $value ) {
			return 0;
		}
		return max( 0, intval( $value ) );
	}

	/**
	 * Optional positive numeric (for currency-style values).
	 *
	 * @param mixed  $value Raw value.
	 * @param string $field Field name.
	 * @return float|\WP_Error
	 */
	public static function optional_numeric( $value, $field = 'Value' ) {
		if ( null === $value || '' === $value ) {
			return 0.0;
		}
		if ( ! is_numeric( $value ) ) {
			return new \WP_Error(
				'validation_invalid_numeric',
				sprintf( /* translators: %s field name */ __( '%s must be a valid number.', 'ready-pos-for-woocommerce' ), $field ),
				array( 'status' => 400, 'field' => $field )
			);
		}
		return round( floatval( $value ), 4 );
	}

	/**
	 * Required email.
	 *
	 * @param mixed  $value Raw value.
	 * @param string $field Field name.
	 * @return string|\WP_Error
	 */
	public static function required_email( $value, $field = 'Email' ) {
		$value = is_string( $value ) ? trim( $value ) : '';
		if ( '' === $value ) {
			return new \WP_Error(
				'validation_required',
				sprintf( /* translators: %s field name */ __( '%s is required.', 'ready-pos-for-woocommerce' ), $field ),
				array( 'status' => 400, 'field' => $field )
			);
		}
		$sanitized = sanitize_email( $value );
		if ( '' === $sanitized || ! is_email( $sanitized ) ) {
			return new \WP_Error(
				'validation_invalid_email',
				sprintf( /* translators: %s field name */ __( '%s must be a valid email address.', 'ready-pos-for-woocommerce' ), $field ),
				array( 'status' => 400, 'field' => $field )
			);
		}
		return $sanitized;
	}

	/**
	 * Optional email. Returns empty string if blank.
	 *
	 * @param mixed $value Raw value.
	 * @return string|\WP_Error Empty string on blank, or sanitized email.
	 */
	public static function optional_email( $value ) {
		$value = is_string( $value ) ? trim( $value ) : '';
		if ( '' === $value ) {
			return '';
		}
		$sanitized = sanitize_email( $value );
		if ( '' === $sanitized || ! is_email( $sanitized ) ) {
			return new \WP_Error(
				'validation_invalid_email',
				__( 'Email must be a valid email address.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 400, 'field' => 'email' )
			);
		}
		return $sanitized;
	}

	/**
	 * Validate value is one of the allowed enum values.
	 *
	 * @param mixed   $value Raw value.
	 * @param array   $allowed List of allowed string values.
	 * @param string  $field Field name for error message.
	 * @param bool    $required Whether the value is required.
	 * @return string|\WP_Error
	 */
	public static function enum( $value, array $allowed, $field = 'Value', $required = true ) {
		$value = is_string( $value ) ? trim( $value ) : '';
		if ( '' === $value ) {
			if ( $required ) {
				return new \WP_Error(
					'validation_required',
					sprintf( /* translators: %s field name */ __( '%s is required.', 'ready-pos-for-woocommerce' ), $field ),
					array( 'status' => 400, 'field' => $field )
				);
			}
			return '';
		}
		if ( ! in_array( $value, $allowed, true ) ) {
			return new \WP_Error(
				'validation_invalid_enum',
				sprintf(
					/* translators: 1: field, 2: list of allowed values */
					__( '%1$s must be one of: %2$s.', 'ready-pos-for-woocommerce' ),
					$field,
					implode( ', ', $allowed )
				),
				array( 'status' => 400, 'field' => $field, 'allowed' => $allowed )
			);
		}
		return $value;
	}

	/**
	 * Optional alphanumeric slug. Useful for codes.
	 *
	 * @param mixed  $value Raw value.
	 * @param int    $max_length Max length.
	 * @return string Sanitized slug or empty string.
	 */
	public static function optional_slug( $value, $max_length = 64 ) {
		if ( ! is_string( $value ) || '' === $value ) {
			return '';
		}
		$value = strtoupper( trim( $value ) );
		$value = preg_replace( '/[^A-Z0-9_\-]/', '', $value ) ?: '';
		return substr( $value, 0, $max_length );
	}

	/**
	 * Check that the current user can perform a given capability.
	 *
	 * @param string $capability WordPress capability.
	 * @return bool|\WP_Error
	 */
	public static function require_capability( $capability ) {
		if ( ! current_user_can( $capability ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to perform this action.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * Check that the current user is authenticated.
	 *
	 * @return int|\WP_Error User ID on success.
	 */
	public static function require_authenticated() {
		$user_id = get_current_user_id();
		if ( ! $user_id ) {
			return new \WP_Error(
				'not_authenticated',
				__( 'You must be logged in to perform this action.', 'ready-pos-for-woocommerce' ),
				array( 'status' => 401 )
			);
		}
		return $user_id;
	}
}
