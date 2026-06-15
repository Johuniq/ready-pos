<?php
/**
 * Plugin metadata customization for WordPress plugins list page.
 *
 * @package Readypos
 * @since 1.0.0
 */

namespace Readypos\Admin;

use Readypos\Traits\Base;
use Readypos\Core\License;

defined( 'ABSPATH' ) || exit;

/**
 * Class PluginMeta
 *
 * Handles plugin row metadata and action links on the WordPress plugins page.
 */
class PluginMeta {

	use Base;

	// -------------------------------------------------------------------------
	// SVG icon library — inline, theme-neutral, no external dependencies.
	// -------------------------------------------------------------------------

	/**
	 * Return a named SVG icon string.
	 *
	 * @param string $name   Icon key.
	 * @param string $size   Width / height attribute value (default '16').
	 * @param string $color  Fill / stroke colour (default 'currentColor').
	 * @return string SVG markup.
	 */
	private function icon( string $name, string $size = '16', string $color = 'currentColor' ): string {
		$icons = array(

			// Settings / cog
			'settings' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',

			// Lightning bolt / upgrade
			'bolt' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="{color}" aria-hidden="true"><path d="M13 2L4.09 12.47A1 1 0 0 0 5 14h5.5l-1 8L19.91 11.53A1 1 0 0 0 19 10h-5.5L13 2z"/></svg>',

			// Crown / pro badge
			'crown' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="{color}" aria-hidden="true"><path d="M2 20h20v2H2v-2zM3.5 8l3.5 4 5-8 5 8 3.5-4L22 18H2L3.5 8z"/></svg>',

			// Check mark
			'check' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',

			// Close / X
			'close' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',

			// Arrow right
			'arrow-right' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',

			// Store / outlet
			'store' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l1-5h16l1 5"/><path d="M21 9v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9"/><path d="M9 9v6"/><path d="M15 9v6"/><path d="M3 9h18"/></svg>',

			// Bar chart / analytics
			'chart' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',

			// Printer / hardware
			'printer' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',

			// Gift card
			'gift' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',

			// Support / headset
			'support' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',

			// Tag / coupon
			'tag' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',

			// Star / pro active
			'star' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="{color}" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',

			// Info / lightbulb tip
			'info' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',

			// External link
			'external' => '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
		);

		if ( ! isset( $icons[ $name ] ) ) {
			return '';
		}

		return str_replace(
			array( '{size}', '{color}' ),
			array( $size, $color ),
			$icons[ $name ]
		);
	}

	// -------------------------------------------------------------------------
	// Hook registration
	// -------------------------------------------------------------------------

	/**
	 * Initialize hooks.
	 *
	 * @return void
	 */
	public function init(): void {
		$plugin_basename = plugin_basename( READYPOS_PLUGIN_FILE );

		add_filter( "plugin_action_links_{$plugin_basename}", array( $this, 'add_action_links' ) );
		add_filter( 'plugin_row_meta', array( $this, 'add_row_meta' ), 10, 2 );
		add_filter( 'plugins_api', array( $this, 'custom_plugin_info' ), 20, 3 );
		add_action( "after_plugin_row_{$plugin_basename}", array( $this, 'add_upgrade_banner' ), 10, 2 );
	}

	// -------------------------------------------------------------------------
	// Action links (left column)
	// -------------------------------------------------------------------------

	/**
	 * Add custom action links to the plugin (left side).
	 *
	 * @param array $links Existing plugin action links.
	 * @return array Modified links.
	 */
	public function add_action_links( array $links ): array {
		$is_pro = License::get_instance()->is_pro();

		$settings_icon = $this->icon( 'settings', '13' );

		$custom_links = array(
			'settings' => sprintf(
				'<a href="%s" style="display:inline-flex;align-items:center;gap:4px;font-weight:600;color:#2271b1;">%s %s</a>',
				esc_url( admin_url( 'admin.php?page=ready-pos#/settings' ) ),
				$settings_icon,
				esc_html__( 'Settings', 'ready-pos-for-woocommerce' )
			),
		);

		if ( $is_pro ) {
			$support_icon = $this->icon( 'support', '13', '#00a32a' );

			$custom_links['support'] = sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;font-weight:600;color:#00a32a;">%s %s</a>',
				esc_url( 'https://readypos.johuniq.tech/support' ),
				$support_icon,
				esc_html__( 'Priority Support', 'ready-pos-for-woocommerce' )
			);
		} else {
			$bolt_icon = $this->icon( 'bolt', '13', '#d63638' );

			$custom_links['upgrade'] = sprintf(
				'<a href="%s" style="display:inline-flex;align-items:center;gap:4px;font-weight:700;color:#d63638;">%s %s</a>',
				esc_url( admin_url( 'admin.php?page=ready-pos#/license' ) ),
				$bolt_icon,
				esc_html__( 'Upgrade to Pro', 'ready-pos-for-woocommerce' )
			);
		}

		return array_merge( $custom_links, $links );
	}

	// -------------------------------------------------------------------------
	// Row meta links (right column)
	// -------------------------------------------------------------------------

	/**
	 * Add custom row meta links to the plugin (right side).
	 *
	 * @param array  $links Existing row meta links.
	 * @param string $file  Plugin file path.
	 * @return array Modified links.
	 */
	public function add_row_meta( array $links, string $file ): array {
		if ( $file !== plugin_basename( READYPOS_PLUGIN_FILE ) ) {
			return $links;
		}

		$is_pro = License::get_instance()->is_pro();

		if ( $is_pro ) {
			$star_icon    = $this->icon( 'star', '13', '#00a32a' );
			$crown_icon   = $this->icon( 'crown', '13', '#7c3aed' );
			$custom_links = array(
				sprintf(
					'<span style="display:inline-flex;align-items:center;gap:4px;background:#00a32a;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;">%s %s</span>',
					$star_icon,
					esc_html__( 'Pro Active', 'ready-pos-for-woocommerce' )
				),
				sprintf(
					'<span style="display:inline-flex;align-items:center;gap:4px;font-weight:600;color:#7c3aed;">%s %s</span>',
					$crown_icon,
					esc_html__( 'Lifetime Updates', 'ready-pos-for-woocommerce' )
				),
			);
		} else {
			$bolt_icon    = $this->icon( 'bolt', '13', '#d63638' );
			$custom_links = array(
				sprintf(
					'<a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;font-weight:700;color:#d63638;">%s %s</a>',
					esc_url( 'https://readypos.johuniq.tech/' ),
					$bolt_icon,
					esc_html__( 'Pro Features', 'ready-pos-for-woocommerce' )
				),
			);
		}

		return array_merge( $links, $custom_links );
	}

	// -------------------------------------------------------------------------
	// "View details" modal
	// -------------------------------------------------------------------------

	/**
	 * Customize plugin information in the "View details" modal.
	 *
	 * @param false|object|array $result The result object or array.
	 * @param string             $action The type of information being requested.
	 * @param object             $args   Plugin API arguments.
	 * @return false|object|array Modified result.
	 */
	public function custom_plugin_info( $result, string $action, object $args ) {
		if ( 'plugin_information' !== $action || empty( $args->slug ) || 'ready-pos' !== $args->slug ) {
			return $result;
		}

		$is_pro = License::get_instance()->is_pro();

		$plugin_info                = new \stdClass();
		$plugin_info->name          = $is_pro ? 'Ready POS Pro' : 'Ready POS';
		$plugin_info->slug          = 'ready-pos';
		$plugin_info->version       = READYPOS_VERSION;
		$plugin_info->author        = '<a href="https://johuniq.tech" target="_blank" rel="noopener noreferrer">Johuniq</a>';
		$plugin_info->homepage      = 'https://readypos.johuniq.tech';
		$plugin_info->requires      = '5.8';
		$plugin_info->tested        = '6.7';
		$plugin_info->requires_php  = '7.4';
		$plugin_info->last_updated  = gmdate( 'Y-m-d' );
		$plugin_info->download_link = '';

		$plugin_info->sections = array(
			'description' => $this->get_description_section( $is_pro ),
			'features'    => $this->get_features_section( $is_pro ),
			'changelog'   => $this->get_changelog_section(),
		);

		if ( $is_pro ) {
			$plugin_info->sections['pro_support'] = $this->get_pro_support_section();
		} else {
			$plugin_info->sections['pro_upgrade'] = $this->get_pro_upgrade_section();
		}

		$plugin_info->banners = array(
			'high' => READYPOS_ASSETS_URL . '/images/banner-1544x500.png',
			'low'  => READYPOS_ASSETS_URL . '/images/banner-772x250.png',
		);

		return $plugin_info;
	}

	// -------------------------------------------------------------------------
	// Modal section builders
	// -------------------------------------------------------------------------

	/**
	 * Get the description section HTML.
	 *
	 * @param bool $is_pro Whether the user has a Pro licence.
	 * @return string HTML content.
	 */
	private function get_description_section( bool $is_pro ): string {
		if ( $is_pro ) {
			$badge = sprintf(
				'<span style="display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;vertical-align:middle;margin-left:8px;">%s PRO ACTIVE</span>',
				$this->icon( 'star', '11', '#fff' )
			);
			$tagline = __( 'Ready POS Pro is the complete, production-ready Point of Sale suite built natively on WooCommerce — every outlet, register, and feature unlocked, with lifetime updates and priority support.', 'ready-pos-for-woocommerce' );
		} else {
			$badge = '<span style="display:inline-flex;align-items:center;gap:5px;background:#d63638;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;vertical-align:middle;margin-left:8px;">FREE EDITION</span>';
			$tagline = __( 'Transform your WooCommerce store into a powerful, integrated Point of Sale system — and upgrade to Pro anytime to unlock unlimited outlets, hardware, and analytics.', 'ready-pos-for-woocommerce' );
		}

		$check = $this->icon( 'check', '14', '#2271b1' );

		return sprintf(
			'<h3 style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">Ready POS%s — Modern Point of Sale for WooCommerce %s</h3>
			<p><strong>%s</strong></p>
			<p>Ready POS is a complete, production-ready POS solution built natively on WooCommerce. Designed for retail stores, restaurants, cafes, and any business that demands fast, reliable, and scalable in-person sales.</p>
			<ul style="list-style:none;margin:16px 0;padding:0;">
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;">%s <span><strong>Lightning-fast checkout</strong> — Process sales in seconds with a streamlined, touch-friendly interface.</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;">%s <span><strong>Multi-outlet support</strong> — Operate and manage multiple locations from a single dashboard.</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;">%s <span><strong>Real-time inventory</strong> — Stock levels sync automatically across all outlets and registers.</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;">%s <span><strong>Cashier management</strong> — Create staff accounts with granular, role-based permissions.</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;">%s <span><strong>Session tracking</strong> — Monitor cash drawer activity, open/close shifts, and daily summaries.</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;">%s <span><strong>Customer management</strong> — Build customer profiles and track full purchase history.</span></li>
			</ul>',
			$is_pro ? ' Pro' : '',
			$badge,
			$tagline,
			$check, $check, $check, $check, $check, $check
		);
	}

	/**
	 * Get the features section HTML.
	 *
	 * @param bool $is_pro Whether the user has a Pro licence.
	 * @return string HTML content.
	 */
	private function get_features_section( bool $is_pro ): string {
		$check_pro  = $this->icon( 'check', '14', '#2271b1' );
		$check_free = $this->icon( 'check', '14', '#50575e' );

		$core_features = array(
			array( 'store',   '<strong>Unlimited outlets &amp; registers</strong> — Operate every location, every register, with no caps.' ),
			array( 'bolt',    '<strong>Unlimited cashiers &amp; customers</strong> — Onboard your whole team and customer base.' ),
			array( 'bolt',    '<strong>Split payments</strong> — Accept multiple payment methods in a single order.' ),
			array( 'gift',    '<strong>Gift cards &amp; store credit</strong> — Issue, track, and redeem balances at the till.' ),
			array( 'star',    '<strong>Loyalty points</strong> — Reward repeat customers and redeem points at checkout.' ),
			array( 'chart',   '<strong>Advanced analytics</strong> — Sales, profit, tax, and inventory dashboards.' ),
			array( 'chart',   '<strong>Cashier performance</strong> — Track and compare individual staff metrics.' ),
			array( 'printer', '<strong>Hardware integration</strong> — Thermal printers, cash drawers, barcode scanners &amp; scales.' ),
			array( 'bolt',    '<strong>EMV card reader</strong> — Integrated chip-card payment terminal support.' ),
			array( 'support', '<strong>Priority support</strong> — Direct access to the Ready POS engineering team.' ),
		);

		$core_list = '<ul style="list-style:none;margin:0;padding:0;">';
		foreach ( $core_features as $feature ) {
			$core_list .= sprintf(
				'<li style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #f0f0f1;font-size:13px;">%s <span>%s</span></li>',
				$check_pro,
				$feature[1]
			);
		}
		$core_list .= '</ul>';

		if ( $is_pro ) {
			return sprintf(
				'<div style="background:#f0f6fc;border:1px solid #c3d4e4;border-radius:8px;padding:18px 24px;margin-bottom:20px;">
					<h3 style="margin:0;color:#1d2327;">Everything in Ready POS Pro</h3>
					<p style="margin:6px 0 0;color:#50575e;font-size:13px;">You already have access to every feature below. No add-ons, no upsells.</p>
				</div>
				%s',
				$core_list
			);
		}

		$free_features = array(
			'1 outlet &amp; 1 register',
			'Up to 2 cashier accounts',
			'Up to 50 customers',
			'Unlimited products',
			'Cash &amp; manual card payments',
			'Basic sales reporting',
			'Session open &amp; close management',
		);

		$free_list = '<ul style="list-style:none;margin:0;padding:0;">';
		foreach ( $free_features as $feature ) {
			$free_list .= sprintf(
				'<li style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f0f0f1;font-size:13px;">%s <span>%s</span></li>',
				$check_free,
				$feature
			);
		}
		$free_list .= '</ul>';

		$upgrade_cta = sprintf(
			'<div style="margin-top:24px;background:#f0f6fc;border:1px solid #c3d4e4;border-radius:8px;padding:20px 24px;text-align:center;">
				<p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#1d2327;">Ready to unlock the full Pro suite?</p>
				<p style="margin:0 0 16px;color:#50575e;font-size:13px;">Upgrade to Ready POS Pro and unlock every feature on this page — no hidden fees, lifetime updates.</p>
				<a href="%s" style="display:inline-flex;align-items:center;gap:8px;background:#2271b1;color:#fff;padding:10px 22px;border-radius:6px;font-weight:700;text-decoration:none;font-size:13px;">%s View Pro Plans</a>
			</div>',
			esc_url( admin_url( 'admin.php?page=ready-pos#/license' ) ),
			$this->icon( 'bolt', '14', '#fff' )
		);

		return sprintf(
			'<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;">
				<div>
					<h3 style="margin-top:0;">Free Plan</h3>
					%s
				</div>
				<div>
					<h3 style="margin-top:0;color:#2271b1;">Pro Plan</h3>
					%s
				</div>
			</div>
			%s',
			$free_list,
			$core_list,
			$upgrade_cta
		);
	}

	/**
	 * Get the Pro support / what's-included section HTML.
	 *
	 * @return string HTML content.
	 */
	private function get_pro_support_section(): string {
		$items = array(
			array( 'support', __( 'Direct priority support', 'ready-pos-for-woocommerce' ), __( 'Reach the Ready POS engineering team — real humans, fast responses.', 'ready-pos-for-woocommerce' ) ),
			array( 'bolt',    __( 'Lifetime updates', 'ready-pos-for-woocommerce' ),       __( 'Every new feature, integration, and security patch at no extra cost.', 'ready-pos-for-woocommerce' ) ),
			array( 'chart',   __( 'Roadmap influence', 'ready-pos-for-woocommerce' ),      __( 'Pro merchants help shape the upcoming releases.', 'ready-pos-for-woocommerce' ) ),
			array( 'star',    __( 'Premium onboarding', 'ready-pos-for-woocommerce' ),     __( 'Optional setup assistance and migration guidance on request.', 'ready-pos-for-woocommerce' ) ),
		);

		$items_html = '';
		foreach ( $items as $item ) {
			$items_html .= sprintf(
				'<div style="display:flex;gap:12px;margin-bottom:14px;">
					<div style="flex-shrink:0;width:36px;height:36px;background:#f0f6fc;border-radius:8px;display:flex;align-items:center;justify-content:center;">%s</div>
					<div>
						<p style="margin:0 0 2px;font-weight:600;font-size:13px;color:#1d2327;">%s</p>
						<p style="margin:0;font-size:12px;color:#50575e;line-height:1.5;">%s</p>
					</div>
				</div>',
				$this->icon( $item[0], '18', '#2271b1' ),
				esc_html( $item[1] ),
				esc_html( $item[2] )
			);
		}

		return sprintf(
			'<div style="border:1px solid #c3d4e4;border-radius:8px;overflow:hidden;">
				<div style="background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);padding:18px 24px;">
					<h3 style="margin:0;color:#fff;font-size:16px;">Your Pro benefits</h3>
					<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Everything that ships with your Ready POS Pro licence.</p>
				</div>
				<div style="padding:24px;">
					%s
					<p style="margin-top:20px;margin-bottom:0;">
						<a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#2271b1;color:#fff;padding:10px 22px;border-radius:6px;font-weight:700;text-decoration:none;font-size:13px;">%s Open Priority Support</a>
					</p>
				</div>
			</div>',
			$items_html,
			esc_url( 'https://readypos.johuniq.tech/support' ),
			$this->icon( 'external', '14', '#fff' )
		);
	}

	/**
	 * Get the Pro upgrade section HTML.
	 *
	 * @return string HTML content.
	 */
	private function get_pro_upgrade_section(): string {
		$reasons = array(
			array( 'store',   'Scale without limits', 'Unlimited outlets, registers, cashiers, and customers.' ),
			array( 'bolt',    'Advanced payment flows', 'Split payments, gift cards, store credit, and EMV chip readers.' ),
			array( 'star',    'Built-in loyalty engine', 'Issue points, track redemptions, and view full purchase histories.' ),
			array( 'chart',   'Deep business insights', 'Revenue, profit, tax, and inventory analytics in one place.' ),
			array( 'printer', 'Full hardware support', 'Thermal printers, cash drawers, barcode scanners, and weight scales.' ),
			array( 'support', 'Priority support', 'Direct access to the Ready POS team — real humans, fast responses.' ),
		);

		$items_html = '';
		foreach ( $reasons as $reason ) {
			$items_html .= sprintf(
				'<div style="display:flex;gap:12px;margin-bottom:14px;">
					<div style="flex-shrink:0;width:36px;height:36px;background:#f0f6fc;border-radius:8px;display:flex;align-items:center;justify-content:center;">%s</div>
					<div>
						<p style="margin:0 0 2px;font-weight:600;font-size:13px;color:#1d2327;">%s</p>
						<p style="margin:0;font-size:12px;color:#50575e;line-height:1.5;">%s</p>
					</div>
				</div>',
				$this->icon( $reason[0], '18', '#2271b1' ),
				esc_html( $reason[1] ),
				esc_html( $reason[2] )
			);
		}

		return sprintf(
			'<div style="border:1px solid #c3d4e4;border-radius:8px;overflow:hidden;">
				<div style="background:#2271b1;padding:18px 24px;">
					<h3 style="margin:0;color:#fff;font-size:16px;">Why upgrade to Pro?</h3>
					<p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Everything you need to run a professional, scalable retail operation.</p>
				</div>
				<div style="padding:24px;">
					%s
					<p style="margin-top:20px;margin-bottom:0;">
						<a href="%s" style="display:inline-flex;align-items:center;gap:8px;background:#2271b1;color:#fff;padding:10px 22px;border-radius:6px;font-weight:700;text-decoration:none;font-size:13px;">%s View Plans &amp; Pricing</a>
					</p>
				</div>
			</div>',
			$items_html,
			esc_url( admin_url( 'admin.php?page=ready-pos#/license' ) ),
			$this->icon( 'arrow-right', '14', '#fff' )
		);
	}

	/**
	 * Get the changelog section HTML.
	 *
	 * @return string HTML content.
	 */
	private function get_changelog_section(): string {
		return '<h4>Ready POS Pro 1.0.0</h4>
		<ul style="list-style:disc;margin-left:20px;font-size:13px;line-height:1.8;">
			<li>Pro release — every feature unlocked out of the box.</li>
			<li>Unlimited outlets, registers, cashiers, and customers.</li>
			<li>Full POS terminal with optimised, touch-friendly checkout flow.</li>
			<li>Split payments, gift cards, store credit, and loyalty points.</li>
			<li>Hardware integration: thermal printers, cash drawers, barcode scanners &amp; scales.</li>
			<li>EMV card reader support and advanced cashier performance reporting.</li>
			<li>Session open / close tracking and daily summary reports.</li>
			<li>Customer profile management with purchase history.</li>
			<li>Real-time inventory synchronisation with WooCommerce stock.</li>
			<li>Native WooCommerce order and product integration.</li>
		</ul>';
	}

	// -------------------------------------------------------------------------
	// Upgrade banner (after_plugin_row)
	// -------------------------------------------------------------------------

	/**
	 * Add a dismissible upgrade banner after the plugin row (free users only).
	 *
	 * @param string $plugin_file Path to the plugin file relative to the plugins directory.
	 * @param array  $plugin_data An array of plugin data.
	 * @return void
	 */
	public function add_upgrade_banner( string $plugin_file, array $plugin_data ): void {
		if ( License::get_instance()->is_pro() ) {
			return;
		}

		// SECURITY FIX #WP.ORG-6: Enqueue styles and scripts properly
		// Register and enqueue a dummy handle for inline styles/scripts
		wp_register_style( 'readypos-plugin-banner', false ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
		wp_enqueue_style( 'readypos-plugin-banner' );
		
		$banner_css = '
			.readypos-upgrade-banner-row td { background: #f6f7f7 !important; }
			.readypos-btn-upgrade:hover {
				transform: translateY(-1px);
				box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4) !important;
				background: linear-gradient(135deg, #4338ca 0%, #2563eb 100%) !important;
			}
			.readypos-btn-pricing:hover {
				background: rgba(255, 255, 255, 0.08) !important;
				color: #ffffff !important;
				border-color: rgba(255, 255, 255, 0.16) !important;
			}
			#readypos-dismiss-banner:hover {
				background: rgba(255, 255, 255, 0.08) !important;
				color: #ffffff !important;
				border-color: rgba(255, 255, 255, 0.16) !important;
			}
		';
		wp_add_inline_style( 'readypos-plugin-banner', $banner_css );

		wp_register_script( 'readypos-plugin-banner', false, array(), false, true ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
		wp_enqueue_script( 'readypos-plugin-banner' );
		
		$banner_js = "
		(function () {
			var DISMISSED_KEY = 'readypos_banner_dismissed';

			function dismissBanner() {
				var row = document.getElementById( 'readypos-upgrade-banner-row' );
				if ( row ) {
					row.style.transition = 'opacity .25s ease';
					row.style.opacity    = '0';
					setTimeout( function () { row.style.display = 'none'; }, 250 );
				}

				try { sessionStorage.setItem( DISMISSED_KEY, '1' ); } catch (e) {}
			}

			// Restore dismissed state within the same browser session.
			try {
				if ( sessionStorage.getItem( DISMISSED_KEY ) ) {
					var row = document.getElementById( 'readypos-upgrade-banner-row' );
					if ( row ) { row.style.display = 'none'; }
				}
			} catch (e) {}

			var btn = document.getElementById( 'readypos-dismiss-banner' );
			if ( btn ) {
				btn.addEventListener( 'click', dismissBanner );
			}
		})();
		";
		wp_add_inline_script( 'readypos-plugin-banner', $banner_js );

		$wp_list_table = _get_list_table( 'WP_Plugins_List_Table' );
		$columns_count = $wp_list_table->get_column_count();
		$upgrade_url   = esc_url( admin_url( 'admin.php?page=ready-pos#/license' ) );
		$pricing_url   = esc_url( 'https://readypos.johuniq.tech/' );

		// Feature cards: [ icon_name, label, description ]
		$features = array(
			array( 'store',   __( 'Unlimited Outlets', 'ready-pos-for-woocommerce' ),     __( 'No cap on locations or registers.', 'ready-pos-for-woocommerce' ) ),
			array( 'chart',   __( 'Advanced Analytics', 'ready-pos-for-woocommerce' ),    __( 'Sales, profit, and inventory reports.', 'ready-pos-for-woocommerce' ) ),
			array( 'printer', __( 'Hardware Support', 'ready-pos-for-woocommerce' ),      __( 'Printers, drawers, scanners & scales.', 'ready-pos-for-woocommerce' ) ),
			array( 'gift',    __( 'Gift Cards & Loyalty', 'ready-pos-for-woocommerce' ),  __( 'Issue cards and reward points.', 'ready-pos-for-woocommerce' ) ),
		);

		?>
		<tr id="readypos-upgrade-banner-row" class="readypos-upgrade-banner-row" role="presentation">
			<td colspan="<?php echo esc_attr( $columns_count ); ?>" style="padding: 12px 20px 24px; background: #f6f7f7 !important; border-top: none;">

				<div class="readypos-upgrade-card" style="
					background: #0f172a;
					border: 1px solid rgba(255, 255, 255, 0.08);
					border-radius: 12px;
					padding: 24px 30px;
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 32px;
					flex-wrap: wrap;
					position: relative;
					box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
					overflow: hidden;
				">
					<!-- Ambient Gradient Background Glow -->
					<div style="
						position: absolute;
						top: -100px; right: -100px;
						width: 250px; height: 250px;
						background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0) 70%);
						pointer-events: none;
					"></div>

					<!-- Dismiss button -->
					<button type="button"
							id="readypos-dismiss-banner"
							aria-label="<?php esc_attr_e( 'Dismiss upgrade notice', 'ready-pos-for-woocommerce' ); ?>"
							style="
								position: absolute;
								top: 16px; right: 16px;
								background: rgba(255, 255, 255, 0.04);
								border: 1px solid rgba(255, 255, 255, 0.08);
								border-radius: 50%;
								width: 28px; height: 28px;
								display: inline-flex; align-items: center; justify-content: center;
								color: #94a3b8;
								cursor: pointer;
								padding: 0;
								transition: all 0.2s ease;
							">
						<?php echo $this->icon( 'close', '12', 'currentColor' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</button>

					<!-- Content Wrapper (Left & Middle Info) -->
					<div style="display: flex; align-items: center; gap: 24px; flex: 1; min-width: 280px;">
						<!-- Modernized Crown Icon Box -->
						<div style="
							flex-shrink: 0;
							width: 54px; height: 54px;
							background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
							border-radius: 12px;
							display: flex; align-items: center; justify-content: center;
							box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.4);
						">
							<?php echo $this->icon( 'crown', '28', '#ffffff' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</div>

						<!-- Text and Info -->
						<div style="flex: 1;">
							<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;">
								<h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">
									<?php esc_html_e( 'Activate your Ready POS Pro licence', 'ready-pos-for-woocommerce' ); ?>
								</h4>
								<span style="
									display: inline-flex; align-items: center; gap: 4px;
									background: rgba(99, 102, 241, 0.15);
									border: 1px solid rgba(99, 102, 241, 0.3);
									color: #a5b4fc;
									padding: 2px 8px;
									border-radius: 4px;
									font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
									text-transform: uppercase;
								">
									<?php echo $this->icon( 'bolt', '10', 'currentColor' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									PRO
								</span>
							</div>

							<p style="margin: 0 0 12px; color: #94a3b8; font-size: 13px; line-height: 1.5; max-width: 720px;">
								<?php
								printf(
									/* translators: %s: free plan emphasis label */
									esc_html__( 'You\'re running the Ready POS Pro build on the %s. Enter your licence key to unlock multi-outlet operations, split payments, gift cards, thermal receipts, and priority support.', 'ready-pos-for-woocommerce' ),
									'<span style="color: #cbd5e1; font-weight: 600;">' . esc_html__( 'Free Plan', 'ready-pos-for-woocommerce' ) . '</span>'
								);
								?>
							</p>

							<!-- Minimal inline features list -->
							<div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; color: #cbd5e1;">
								<span style="display: inline-flex; align-items: center; gap: 4px;">
									<span style="display: inline-block; width: 6px; height: 6px; background: #06b6d4; border-radius: 50%;"></span>
									<?php esc_html_e( 'Unlimited registers & outlets', 'ready-pos-for-woocommerce' ); ?>
								</span>
								<span style="display: inline-flex; align-items: center; gap: 4px;">
									<span style="display: inline-block; width: 6px; height: 6px; background: #06b6d4; border-radius: 50%;"></span>
									<?php esc_html_e( 'Thermal printing (ESC/POS)', 'ready-pos-for-woocommerce' ); ?>
								</span>
								<span style="display: inline-flex; align-items: center; gap: 4px;">
									<span style="display: inline-block; width: 6px; height: 6px; background: #06b6d4; border-radius: 50%;"></span>
									<?php esc_html_e( 'Store credit & split-payments', 'ready-pos-for-woocommerce' ); ?>
								</span>
							</div>
						</div>
					</div>

					<!-- Premium CTA Right-Aligned Column -->
					<div style="
						flex-shrink: 0;
						display: flex;
						flex-direction: column;
						align-items: stretch;
						gap: 10px;
						min-width: 180px;
					">
						<!-- Vibrant Premium Button -->
						<a href="<?php echo esc_url( $upgrade_url ); ?>"
						   class="readypos-btn-upgrade"
						   style="
								display: inline-flex; align-items: center; justify-content: center; gap: 8px;
								background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
								color: #ffffff;
								padding: 10px 20px;
								border-radius: 8px;
								font-size: 13px; font-weight: 700;
								text-decoration: none;
								text-align: center;
								box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
								transition: all 0.2s ease;
								border: none;
								cursor: pointer;
						   ">
							<?php echo $this->icon( 'bolt', '14', '#ffffff' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<?php esc_html_e( 'Activate Pro Licence', 'ready-pos-for-woocommerce' ); ?>
						</a>
					</div>

				</div><!-- .readypos-upgrade-card -->
			</td>
		</tr>
		<?php
	}
}