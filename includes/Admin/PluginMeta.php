<?php
/**
 * Plugin metadata customization for WordPress plugins list page.
 *
 * @package Readypos
 * @since 1.0.0
 */

namespace Readypos\Admin;

use Readypos\Traits\Base;

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
		$settings_icon = $this->icon( 'settings', '13' );
		$upgrade_icon  = $this->icon( 'bolt', '13', '#d63638' );

		$custom_links = array(
			'upgrade' => sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;font-weight:700;color:#d63638;text-decoration:none;">%s %s</a>',
				esc_url( 'https://readypos.io/pricing/?utm_source=plugins-page&utm_medium=wp-dashboard&utm_campaign=ready-pos-gpl-upgrade' ),
				$upgrade_icon,
				esc_html__( 'Upgrade to Pro', 'ready-pos-for-woocommerce' )
			),
			'settings' => sprintf(
				'<a href="%s" style="display:inline-flex;align-items:center;gap:4px;font-weight:600;color:#2271b1;">%s %s</a>',
				esc_url( admin_url( 'admin.php?page=ready-pos#/settings' ) ),
				$settings_icon,
				esc_html__( 'Settings', 'ready-pos-for-woocommerce' )
			),
		);

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

		$custom = array(
			'lite' => sprintf(
				'<span style="display:inline-flex;align-items:center;gap:4px;color:#50575e;font-weight:600;">%s %s</span>',
				$this->icon( 'info', '12', '#d4af37' ),
				esc_html__( 'You are using the Lite version of Ready POS. Get all features with Pro.', 'ready-pos-for-woocommerce' )
			),
		);

		return array_merge( $links, $custom );
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

		$plugin_info                = new \stdClass();
		$plugin_info->name          = 'Ready POS';
		$plugin_info->slug          = 'ready-pos';
		$plugin_info->version       = READYPOS_VERSION;
		$plugin_info->author        = '<a href="https://johuniq.tech" target="_blank" rel="noopener noreferrer">Johuniq</a>';
		$plugin_info->homepage      = 'https://readypos.io';
		$plugin_info->requires      = '5.8';
		$plugin_info->tested        = '6.7';
		$plugin_info->requires_php  = '7.4';
		$plugin_info->last_updated  = gmdate( 'Y-m-d' );
		$plugin_info->download_link = '';

		$plugin_info->sections = array(
			'description' => $this->get_description_section(),
			'features'    => $this->get_features_section(),
			'changelog'   => $this->get_changelog_section(),
		);

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
	 * @return string HTML content.
	 */
	private function get_description_section(): string {
		$lite_badge = '<span style="display:inline-flex;align-items:center;gap:5px;background:linear-gradient(90deg,#fff7d6,#fff1b8);color:#7a5a00;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;vertical-align:middle;margin-left:8px;border:1px solid #f1d97a;">LITE VERSION</span>';
		$brand_badge = '<span style="display:inline-flex;align-items:center;gap:5px;background:#2271b1;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;vertical-align:middle;margin-left:8px;">READY POS</span>';

		$check     = $this->icon( 'check', '14', '#2271b1' );
		$lock_icon = $this->icon( 'bolt', '14', '#d4af37' );

		return sprintf(
			'<h3 style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">Ready POS — Modern Point of Sale for WooCommerce %s%s</h3>
			<p><strong>You are using the Lite (free) version of Ready POS.</strong> This version includes the core POS essentials: 1 outlet, 1 register, unlimited products and customers, cash &amp; card payments, basic reports, and real-time WooCommerce sync.</p>
			<div style="background:linear-gradient(90deg,#fff7d6,#fff1b8);border:1px solid #f1d97a;border-radius:6px;padding:12px 14px;margin:14px 0;display:flex;align-items:flex-start;gap:10px;">
				<span style="flex-shrink:0;line-height:1.4;">%s</span>
				<div>
					<strong style="color:#7a5a00;">Need more?</strong><br>
					<span style="font-size:13px;color:#3c434a;">Upgrade to <strong>Ready POS Pro</strong> for unlimited outlets &amp; registers, split payments, gift cards, thermal receipt printers, cash drawer control, weight scales, customer-facing displays, and priority support.</span><br>
					<a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;background:#d4af37;color:#fff !important;padding:5px 12px;border-radius:4px;font-weight:600;text-decoration:none;">&#9733; See Pro Plans &amp; Pricing</a>
				</div>
			</div>
			<p>Ready POS is a complete, production-ready POS solution built natively on WooCommerce. Designed for retail stores, restaurants, cafes, and any business that demands fast, reliable, and scalable in-person sales.</p>
			<h4 style="margin-bottom:6px;">What&rsquo;s included in this Lite version</h4>
			<ul style="list-style:none;margin:8px 0 16px;padding:0;">
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">%s <span><strong>Lightning-fast checkout</strong> — Process sales in seconds with a streamlined, touch-friendly interface.</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">%s <span><strong>1 outlet &amp; 1 register</strong> — Enough to run a single-location store (unlimited in Pro).</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">%s <span><strong>Unlimited products &amp; customers</strong> — Sell as many SKUs and manage as many customers as you need.</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">%s <span><strong>Real-time inventory sync</strong> — Stock levels stay in sync with WooCommerce automatically.</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">%s <span><strong>Session &amp; shift tracking</strong> — Monitor register activity, open/close shifts, and daily summaries.</span></li>
			</ul>
			<h4 style="margin-bottom:6px;">Available in Pro</h4>
			<ul style="list-style:none;margin:8px 0 0;padding:0;">
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:13px;color:#3c434a;">%s <span>Unlimited outlets &amp; registers for multi-location retail</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:13px;color:#3c434a;">%s <span>Split payments, gift cards &amp; store credit</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:13px;color:#3c434a;">%s <span>Thermal receipt printers, cash drawer &amp; weight scale support</span></li>
				<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:13px;color:#3c434a;">%s <span>Customer-facing display &amp; priority support</span></li>
			</ul>',
			$brand_badge,
			$lite_badge,
			$lock_icon,
			esc_url( 'https://readypos.io/pricing/?utm_source=view-details-modal&utm_medium=wp-dashboard&utm_campaign=ready-pos-gpl-upgrade' ),
			$check, $check, $check, $check, $check,
			$lock_icon, $lock_icon, $lock_icon, $lock_icon
		);
	}

	/**
	 * Get the features section HTML.
	 *
	 * @return string HTML content.
	 */
	private function get_features_section(): string {
		$check = $this->icon( 'check', '14', '#2271b1' );

		$features = array(
			'Multi-outlet and multi-register support',
			'Customer management',
			'Unlimited products',
			'Cash &amp; manual card payments',
			'Basic sales reporting',
			'Session open &amp; close management',
		);

		$feature_list = '<ul style="list-style:none;margin:0;padding:0;">';
		foreach ( $features as $feature ) {
			$feature_list .= sprintf(
				'<li style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f0f0f1;font-size:13px;">%s <span>%s</span></li>',
				$check,
				$feature
			);
		}
		$feature_list .= '</ul>';

		return sprintf(
			'<div>
				<h3 style="margin-top:0;">What&rsquo;s included</h3>
				%s
			</div>',
			$feature_list
		);
	}

	/**
	 * Get the changelog section HTML.
	 *
	 * @return string HTML content.
	 */
	private function get_changelog_section(): string {
		return '<h4>Version 1.0.0</h4>
		<ul style="list-style:disc;margin-left:20px;font-size:13px;line-height:1.8;">
			<li>Initial public release.</li>
			<li>Full POS terminal with optimised, touch-friendly checkout flow.</li>
			<li>Multi-outlet and multi-register management.</li>
			<li>Session open / close tracking and daily summary reports.</li>
			<li>Customer profile management with purchase history.</li>
			<li>Real-time inventory synchronisation with WooCommerce stock.</li>
			<li>Native WooCommerce order and product integration.</li>
		</ul>';
	}
}