<?php
/**
 * License & feature plan facade.
 *
 * Public API used throughout the codebase. Delegates lifecycle work to
 * Readypos\Core\License\Manager and only owns the feature/quota maps.
 *
 * @package Readypos\Core
 * @since 1.1.0
 */

namespace Readypos\Core;

use Readypos\Core\License\Manager;
use Readypos\Traits\Base;

defined( 'ABSPATH' ) || exit;

/**
 * Class License
 */
class License {

	use Base;

	/* Plan constants for easy access. */
	const PLAN_FREE = Manager::PLAN_FREE;
	const PLAN_PRO  = Manager::PLAN_PRO;

	/* Backward-compatible option names (used by existing code). */
	const OPTION_PLAN = Manager::OPT_PLAN;
	const OPTION_KEY  = Manager::OPT_KEY;

	/**
	 * Hook the periodic re-validation cron and admin heartbeat.
	 */
	public function init() {
		add_action( Manager::CRON_HOOK, array( __CLASS__, 'cron_validate' ) );

		// On admin pages, check if revalidation is overdue (> 3 days since last check).
		// This catches cases where wp_cron is disabled or unreliable.
		if ( is_admin() && ! wp_doing_ajax() && ! wp_doing_cron() ) {
			add_action( 'admin_init', array( __CLASS__, 'heartbeat_check' ), 1 );
		}
	}

	/**
	 * Heartbeat: if the license hasn't been validated in 3+ days, force a
	 * background revalidation. This ensures that even with cron disabled,
	 * revoked/expired licenses get caught within a few days.
	 */
	public static function heartbeat_check() {
		$plan = get_option( Manager::OPT_PLAN, Manager::PLAN_FREE );
		$key  = get_option( Manager::OPT_KEY, '' );

		if ( $plan !== Manager::PLAN_PRO && empty( $key ) ) {
			return;
		}

		$last_check = (int) get_option( Manager::OPT_LAST_CHECK, 0 );
		$threshold  = 3 * DAY_IN_SECONDS;

		// If a key exists but the plan is free (e.g. after a salt change), trigger immediate background validation to auto-recover.
		if ( $plan === Manager::PLAN_FREE && ! empty( $key ) ) {
			$threshold = 0;
		}

		if ( ( time() - $last_check ) > $threshold ) {
			// Non-blocking: schedule an immediate one-off revalidation.
			if ( ! wp_next_scheduled( Manager::CRON_HOOK ) ) {
				wp_schedule_single_event( time(), Manager::CRON_HOOK );
			}
		}
	}

	public static function cron_validate() {
		Manager::revalidate();
	}

	/* ============================================================
	 * Plan & feature gating
	 * ============================================================ */

	/**
	 * Map of feature keys → minimum plan required.
	 */
	public static function feature_map() {
		return array(
			// Multi-site / register.
			'multi_outlet'        => self::PLAN_PRO,
			'multi_register'      => self::PLAN_PRO,

			// Payments.
			'split_payment'       => self::PLAN_PRO,
			'gift_cards'          => self::PLAN_PRO,
			'emv_reader'          => self::PLAN_PRO,

			// Customers.
			'loyalty_points'      => self::PLAN_PRO,
			'purchase_history'    => self::PLAN_PRO,

			// Reports.
			'advanced_reports'    => self::PLAN_PRO,
			'cashier_reports'     => self::PLAN_PRO,
			'product_reports'     => self::PLAN_PRO,
			'payment_reports'     => self::PLAN_PRO,

			// Hardware.
			'hardware_panel'      => self::PLAN_PRO,
			'thermal_printer'     => self::PLAN_PRO,
			'cash_drawer'         => self::PLAN_PRO,
			'weight_scale'        => self::PLAN_PRO,
			'usb_scanner'         => self::PLAN_PRO,

			// Inventory & operations.
			'barcode_labels'      => self::PLAN_PRO,
			'inventory_take'      => self::PLAN_PRO,
			'low_stock_alerts'    => self::PLAN_PRO,
			'employee_shifts'     => self::PLAN_PRO,

			// Offline.
			'offline_sync'        => self::PLAN_PRO,
			'conflict_resolution' => self::PLAN_PRO,

			// Settings.
			'custom_receipt'      => self::PLAN_PRO,
			'tax_classes'         => self::PLAN_PRO,
			'pos_order_prefix'    => self::PLAN_PRO,
		);
	}

	/**
	 * Quantity limits per plan. -1 = unlimited.
	 */
	public static function limits_map() {
		return array(
			self::PLAN_FREE => array(
				'outlets'   => 1,
				'registers' => 1,
				'cashiers'  => 2,
				'customers' => 50,
				'products'  => 100,
			),
			self::PLAN_PRO  => array(
				'outlets'   => -1,
				'registers' => -1,
				'cashiers'  => -1,
				'customers' => -1,
				'products'  => -1,
			),
		);
	}

	public static function get_plan() {
		return Manager::get_plan();
	}

	public static function get_status() {
		return Manager::get_status();
	}

	public static function is_pro() {
		return Manager::is_pro();
	}

	public static function can_access( $feature ) {
		$map      = self::feature_map();
		$required = $map[ $feature ] ?? self::PLAN_FREE;

		if ( $required === self::PLAN_FREE ) {
			return true;
		}

		return self::is_pro();
	}

	public static function get_limit( $resource ) {
		$plan   = self::get_plan();
		$limits = self::limits_map();
		return isset( $limits[ $plan ][ $resource ] ) ? (int) $limits[ $plan ][ $resource ] : -1;
	}

	public static function can_create( $resource, $current_count ) {
		$limit = self::get_limit( $resource );
		if ( $limit < 0 ) {
			return true;
		}
		return $current_count < $limit;
	}

	public static function get_usage() {
		$outlets   = 0;
		$registers = 0;
		$customers = 0;
		$products  = 0;
		$cashiers  = 0;

		try {
			if ( class_exists( '\Readypos\Models\POSOutlet' ) ) {
				$outlets = (int) \Readypos\Models\POSOutlet::count();
			}
			if ( class_exists( '\Readypos\Models\POSRegister' ) ) {
				$registers = (int) \Readypos\Models\POSRegister::count();
			}
			if ( class_exists( '\Readypos\Models\POSCustomer' ) ) {
				$customers = (int) \Readypos\Models\POSCustomer::count();
			}
		} catch ( \Throwable $e ) {
			// Tables missing.
		}

		if ( $customers === 0 ) {
			$user_count = count_users();
			if ( isset( $user_count['avail_roles']['customer'] ) ) {
				$customers = (int) $user_count['avail_roles']['customer'];
			}
		}

		$user_count = count_users();
		if ( isset( $user_count['avail_roles']['pos_cashier'] ) ) {
			$cashiers += (int) $user_count['avail_roles']['pos_cashier'];
		}
		if ( isset( $user_count['avail_roles']['pos_manager'] ) ) {
			$cashiers += (int) $user_count['avail_roles']['pos_manager'];
		}

		if ( function_exists( 'wp_count_posts' ) ) {
			$post_counts = wp_count_posts( 'product' );
			$products    = isset( $post_counts->publish ) ? (int) $post_counts->publish : 0;
		}

		return array(
			'outlets'   => $outlets,
			'registers' => $registers,
			'cashiers'  => $cashiers,
			'customers' => $customers,
			'products'  => $products,
		);
	}

	/* ============================================================
	 * Backward-compatible activation helpers
	 * ============================================================ */

	public static function activate( $key ) {
		return Manager::activate( $key );
	}

	public static function deactivate() {
		return Manager::deactivate();
	}

	public static function masked_key() {
		return Manager::masked_key();
	}

	/* ============================================================
	 * Frontend payload — superset of Manager's data.
	 * ============================================================ */

	public static function frontend_data() {
		$plan = self::get_plan();

		// Feature map: { featureKey: bool }
		$features = array();
		foreach ( self::feature_map() as $feature => $required ) {
			$features[ $feature ] = self::can_access( $feature );
		}

		$limits_full = self::limits_map();
		$limits      = $limits_full[ $plan ] ?? array();
		$usage       = self::get_usage();

		$lic = Manager::frontend_data();

		return array(
			'plan'           => $lic['plan'],
			'status'         => $lic['status'],
			'isPro'          => $lic['isPro'],
			'isExpired'      => $lic['isExpired'],
			'isGrace'        => $lic['isGrace'],
			'expiresAt'      => $lic['expiresAt'],
			'daysRemaining'  => $lic['daysRemaining'],
			'maskedKey'      => $lic['maskedKey'],
			'licenseType'    => $lic['licenseType'],
			'sitesUsed'      => $lic['sitesUsed'],
			'sitesMax'       => $lic['sitesMax'],
			'usageCount'     => $lic['usageCount'],
			'usageLimit'     => $lic['usageLimit'],
			'validations'    => $lic['validations'],
			'billingInterval'=> $lic['billingInterval'],
			'renewsAt'       => $lic['renewsAt'],
			'renewalStatus'  => $lic['renewalStatus'],
			'isTrial'        => $lic['isTrial'],
			'trialStart'     => $lic['trialStart'],
			'trialEnd'       => $lic['trialEnd'],
			'trialDaysRemaining' => $lic['trialDaysRemaining'],
			'customer'       => $lic['customer'],
			'portalUrl'      => $lic['portalUrl'],
			'isConfigured'   => $lic['isConfigured'],
			'features'       => $features,
			'limits'         => $limits,
			'usage'          => $usage,
		);
	}

	/* ============================================================
	 * REST helpers — return WP_Error when access is denied.
	 * ============================================================ */

	public static function require_feature( $feature ) {
		if ( self::can_access( $feature ) ) {
			return null;
		}

		return new \WP_Error(
			'pro_feature_required',
			/* translators: %s: feature name */
			sprintf( __( 'This feature (%s) requires a Pro license.', 'ready-pos-for-woocommerce' ), $feature ),
			array(
				'status'  => 402,
				'feature' => $feature,
				'plan'    => self::get_plan(),
				'data'    => array(
					'feature' => $feature,
					'plan'    => self::get_plan(),
				),
			)
		);
	}

	public static function require_quota( $resource, $current_count ) {
		if ( self::can_create( $resource, $current_count ) ) {
			return null;
		}

		$limit = self::get_limit( $resource );

		return new \WP_Error(
			'pro_quota_exceeded',
			sprintf(
				/* translators: 1: resource, 2: limit */
				__( 'Your Free plan is limited to %2$d %1$s. Upgrade to Pro for unlimited.', 'ready-pos-for-woocommerce' ),
				$resource,
				$limit
			),
			array(
				'status'   => 402,
				'resource' => $resource,
				'limit'    => $limit,
				'current'  => $current_count,
				'plan'     => self::get_plan(),
				'data'     => array(
					'resource' => $resource,
					'limit'    => $limit,
					'current'  => $current_count,
				),
			)
		);
	}
}
