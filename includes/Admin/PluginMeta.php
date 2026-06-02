<?php
/**
 * Plugin metadata customization for WordPress plugins list page.
 *
 * @package Readypos
 * @since 1.0.0
 */

namespace Readypos\Admin;

use Readypos\Traits\Base;
use Readypos\Core\License\Manager;

defined( 'ABSPATH' ) || exit;

/**
 * Class PluginMeta
 *
 * Handles plugin row metadata and action links on the WordPress plugins page.
 */
class PluginMeta {

	use Base;

	/**
	 * Initialize hooks.
	 *
	 * @return void
	 */
	public function init() {
		$plugin_basename = plugin_basename( READYPOS_PLUGIN_FILE );

		// Add custom action links (left side - Activate, Deactivate, etc.).
		add_filter( "plugin_action_links_{$plugin_basename}", array( $this, 'add_action_links' ) );

		// Add custom row meta links (right side - View details, etc.).
		add_filter( 'plugin_row_meta', array( $this, 'add_row_meta' ), 10, 2 );

		// Add custom plugin information in the "View details" modal.
		add_filter( 'plugins_api', array( $this, 'custom_plugin_info' ), 20, 3 );

		// Add upgrade banner after plugin row (only for free users).
		add_action( "after_plugin_row_{$plugin_basename}", array( $this, 'add_upgrade_banner' ), 10, 2 );
	}

	/**
	 * Add custom action links to the plugin (left side).
	 *
	 * @param array $links Existing plugin action links.
	 * @return array Modified links.
	 */
	public function add_action_links( $links ) {
		$license_manager = Manager::get_instance();
		$is_pro          = $license_manager->is_pro();

		$custom_links = array();

		// Settings link.
		$custom_links['settings'] = sprintf(
			'<a href="%s" style="font-weight: 600; color: #2271b1;">%s</a>',
			admin_url( 'admin.php?page=ready-pos#/settings' ),
			__( 'Settings', 'ready-pos' )
		);

		// Pro upgrade link (only show if not Pro).
		if ( ! $is_pro ) {
			$custom_links['upgrade'] = sprintf(
				'<a href="%s" style="font-weight: 700; color: #fff; background: #d63638; padding: 4px 10px; border-radius: 4px; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.15); margin-left: 2px; text-decoration: none;">%s</a>',
				admin_url( 'admin.php?page=ready-pos#/license' ),
				__( '⚡ Upgrade to Pro', 'ready-pos' )
			);
		}

		return array_merge( $custom_links, $links );
	}

	/**
	 * Add custom row meta links to the plugin (right side).
	 *
	 * @param array  $links Existing row meta links.
	 * @param string $file  Plugin file path.
	 * @return array Modified links.
	 */
	public function add_row_meta( $links, $file ) {
		$plugin_basename = plugin_basename( READYPOS_PLUGIN_FILE );

		if ( $file !== $plugin_basename ) {
			return $links;
		}

		$license_manager = Manager::get_instance();
		$is_pro          = $license_manager->is_pro();

		$custom_links = array();

		// Documentation link.
		$custom_links[] = sprintf(
			'<a href="%s" target="_blank" rel="noopener noreferrer" style="color: #2271b1;">%s</a>',
			'https://readypos.io/docs',
			__( '📚 Documentation', 'ready-pos' )
		);

		// Support link.
		$custom_links[] = sprintf(
			'<a href="%s" target="_blank" rel="noopener noreferrer" style="color: #2271b1;">%s</a>',
			'https://readypos.io/support',
			__( '💬 Support', 'ready-pos' )
		);

		// Pro features link (only show if not Pro).
		if ( ! $is_pro ) {
			$custom_links[] = sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer" style="font-weight: 700; color: #d63638;">%s</a>',
				'https://readypos.io/pro',
				__( '⚡ Pro Features', 'ready-pos' )
			);
		} else {
			// Show Pro badge if already Pro.
			$custom_links[] = sprintf(
				'<span style="font-weight: 700; color: #00a32a;">%s</span>',
				__( '✓ Pro Active', 'ready-pos' )
			);
		}

		return array_merge( $links, $custom_links );
	}

	/**
	 * Customize plugin information in the "View details" modal.
	 *
	 * @param false|object|array $result The result object or array.
	 * @param string             $action The type of information being requested.
	 * @param object             $args   Plugin API arguments.
	 * @return false|object|array Modified result.
	 */
	public function custom_plugin_info( $result, $action, $args ) {
		// Only modify if requesting plugin information for our plugin.
		if ( 'plugin_information' !== $action || empty( $args->slug ) || 'ready-pos' !== $args->slug ) {
			return $result;
		}

		$license_manager = Manager::get_instance();
		$is_pro          = $license_manager->is_pro();

		// Create custom plugin info object.
		$plugin_info = new \stdClass();

		$plugin_info->name        = 'Ready POS';
		$plugin_info->slug        = 'ready-pos';
		$plugin_info->version     = READYPOS_VERSION;
		$plugin_info->author      = '<a href="https://johuniq.tech" target="_blank">Johuniq</a>';
		$plugin_info->homepage    = 'https://readypos.io';
		$plugin_info->requires    = '5.8';
		$plugin_info->tested      = '6.7';
		$plugin_info->requires_php = '7.4';
		$plugin_info->last_updated = gmdate( 'Y-m-d' );
		$plugin_info->sections    = array(
			'description' => $this->get_description_section( $is_pro ),
			'features'    => $this->get_features_section( $is_pro ),
			'pro_upgrade' => $is_pro ? '' : $this->get_pro_upgrade_section(),
			'changelog'   => $this->get_changelog_section(),
		);

		$plugin_info->banners = array(
			'high' => READYPOS_ASSETS_URL . '/images/banner-1544x500.png',
			'low'  => READYPOS_ASSETS_URL . '/images/banner-772x250.png',
		);

		$plugin_info->download_link = '';

		return $plugin_info;
	}

	/**
	 * Get the description section content.
	 *
	 * @param bool $is_pro Whether the user has Pro license.
	 * @return string HTML content.
	 */
	private function get_description_section( $is_pro ) {
		$status_badge = $is_pro
			? '<span style="display: inline-block; background: #00a32a; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 12px; margin-left: 8px;">✓ PRO ACTIVE</span>'
			: '<span style="display: inline-block; background: #d63638; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 12px; margin-left: 8px;">FREE VERSION</span>';

		return sprintf(
			'<h3>Ready POS - Modern Point of Sale for WooCommerce %s</h3>
			<p><strong>Transform your WooCommerce store into a powerful Point of Sale system.</strong></p>
			<p>Ready POS is a complete, modern POS solution that seamlessly integrates with WooCommerce. Perfect for retail stores, restaurants, cafes, and any business that needs fast, reliable in-person sales.</p>
			<ul style="list-style: disc; margin-left: 20px;">
				<li><strong>Lightning-fast checkout</strong> - Process sales in seconds with an intuitive interface</li>
				<li><strong>Multi-outlet support</strong> - Manage multiple locations from one dashboard</li>
				<li><strong>Real-time inventory</strong> - Track stock across all outlets automatically</li>
				<li><strong>Cashier management</strong> - Create staff accounts with role-based permissions</li>
				<li><strong>Session tracking</strong> - Monitor cash drawer activity and shift reports</li>
				<li><strong>Customer management</strong> - Build customer profiles and track purchase history</li>
			</ul>',
			$status_badge
		);
	}

	/**
	 * Get the features section content.
	 *
	 * @param bool $is_pro Whether the user has Pro license.
	 * @return string HTML content.
	 */
	private function get_features_section( $is_pro ) {
		$free_features = array(
			'1 outlet, 1 register',
			'Up to 2 cashier accounts',
			'Up to 50 customers',
			'Unlimited products',
			'Cash & manual card payments',
			'Basic sales reporting',
			'Session management',
		);

		$pro_features = array(
			'<strong>Unlimited outlets & registers</strong>',
			'<strong>Unlimited cashiers & customers</strong>',
			'<strong>Split payment</strong> - Multiple payment methods per order',
			'<strong>Gift cards & store credit</strong> - Issue and redeem balances',
			'<strong>Loyalty points</strong> - Reward customers and let them redeem at checkout',
			'<strong>Customer purchase history</strong> - Full lifetime order timeline',
			'<strong>Advanced reports</strong> - Sales, profit, tax, and inventory analytics',
			'<strong>Cashier performance</strong> - Track individual staff metrics',
			'<strong>Product performance</strong> - Best sellers and inventory insights',
			'<strong>Hardware integration</strong> - Thermal printer, cash drawer, weight scale, USB scanner',
			'<strong>EMV card reader</strong> - Integrated chip-card payment terminal',
			'<strong>Priority support</strong> - Get help when you need it',
		);

		$free_list = '<ul style="list-style: disc; margin-left: 20px;">';
		foreach ( $free_features as $feature ) {
			$free_list .= "<li>{$feature}</li>";
		}
		$free_list .= '</ul>';

		$pro_list = '<ul style="list-style: disc; margin-left: 20px;">';
		foreach ( $pro_features as $feature ) {
			$pro_list .= "<li>{$feature}</li>";
		}
		$pro_list .= '</ul>';

		$upgrade_cta = $is_pro
			? ''
			: sprintf(
				'<div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 24px; border-radius: 8px; margin-top: 24px; text-align: center;">
					<h3 style="color: white; margin-top: 0;">🚀 Upgrade to Pro Today!</h3>
					<p style="font-size: 16px; margin: 12px 0;">Unlock all premium features and take your POS to the next level.</p>
					<a href="%s" style="display: inline-block; background: white; color: #667eea; padding: 12px 32px; border-radius: 6px; font-weight: 700; text-decoration: none; margin-top: 8px;">View Pro Plans →</a>
				</div>',
				admin_url( 'admin.php?page=ready-pos#/license' )
			);

		return sprintf(
			'<h3>Free Version Includes:</h3>
			%s
			<h3 style="margin-top: 24px;">Pro Version Includes:</h3>
			%s
			%s',
			$free_list,
			$pro_list,
			$upgrade_cta
		);
	}

	/**
	 * Get the Pro upgrade section content.
	 *
	 * @return string HTML content.
	 */
	private function get_pro_upgrade_section() {
		return sprintf(
			'<div style="background: #f0f0f1; padding: 24px; border-radius: 8px; border-left: 4px solid #d63638;">
				<h3 style="margin-top: 0; color: #d63638;">⚡ Why Upgrade to Pro?</h3>
				<p><strong>The free version is great for getting started, but Pro unlocks the full potential of Ready POS:</strong></p>
				<ul style="list-style: disc; margin-left: 20px;">
					<li><strong>Scale your business</strong> - No limits on outlets, registers, cashiers, or customers</li>
					<li><strong>Advanced payments</strong> - Split payments, gift cards, store credit, and EMV readers</li>
					<li><strong>Customer loyalty</strong> - Build repeat business with points and purchase history</li>
					<li><strong>Better insights</strong> - Advanced reports for sales, profit, tax, and inventory</li>
					<li><strong>Hardware support</strong> - Thermal printers, cash drawers, scales, and scanners</li>
					<li><strong>Priority support</strong> - Get expert help when you need it most</li>
				</ul>
				<p style="margin-top: 20px;">
					<a href="%s" style="display: inline-block; background: #d63638; color: white; padding: 12px 24px; border-radius: 6px; font-weight: 700; text-decoration: none;">View Pro Plans & Pricing →</a>
				</p>
			</div>',
			admin_url( 'admin.php?page=ready-pos#/license' )
		);
	}

	/**
	 * Get the changelog section content.
	 *
	 * @return string HTML content.
	 */
	private function get_changelog_section() {
		return '<h4>Version 1.0.0</h4>
		<ul style="list-style: disc; margin-left: 20px;">
			<li>Initial release</li>
			<li>Complete POS terminal with fast checkout</li>
			<li>Multi-outlet and register management</li>
			<li>Cashier accounts and permissions</li>
			<li>Session tracking and reporting</li>
			<li>Customer management</li>
			<li>Real-time inventory sync</li>
			<li>WooCommerce integration</li>
		</ul>';
	}

	/**
	 * Add upgrade banner after plugin row on plugins page.
	 *
	 * @param string $plugin_file Path to the plugin file relative to the plugins directory.
	 * @param array  $plugin_data An array of plugin data.
	 * @return void
	 */
	public function add_upgrade_banner( $plugin_file, $plugin_data ) {
		$license_manager = Manager::get_instance();
		$is_pro          = $license_manager->is_pro();

		// Only show banner for free users.
		if ( $is_pro ) {
			return;
		}

		// Get the number of columns in the plugins table.
		$wp_list_table = _get_list_table( 'WP_Plugins_List_Table' );
		$columns_count = $wp_list_table->get_column_count();

		?>
		<tr class="plugin-update-tr active" id="ready-pos-upgrade-banner">
			<td colspan="<?php echo esc_attr( $columns_count ); ?>" class="plugin-update colspanchange">
				<div class="update-message notice inline notice-warning notice-alt" style="margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-left: 4px solid #5568d3; padding: 0; overflow: hidden;">
					<div style="display: flex; align-items: center; gap: 20px; padding: 16px 20px;">
						<!-- Icon Section -->
						<div style="flex-shrink: 0;">
							<div style="width: 56px; height: 56px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
								<span style="font-size: 28px;">👑</span>
							</div>
						</div>

						<!-- Content Section -->
						<div style="flex: 1; min-width: 0;">
							<h3 style="margin: 0 0 6px 0; color: #ffffff; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
								<span>Unlock the Full Power of Ready POS</span>
								<span style="background: rgba(255, 255, 255, 0.25); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">PRO</span>
							</h3>
							<p style="margin: 0 0 12px 0; color: rgba(255, 255, 255, 0.95); font-size: 14px; line-height: 1.5;">
								You're using the <strong>Free version</strong>. Upgrade to Pro and unlock unlimited outlets, advanced reports, hardware integration, gift cards, loyalty points, and priority support.
							</p>
							
							<!-- Features Grid -->
							<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-bottom: 12px;">
								<div style="display: flex; align-items: center; gap: 6px; color: rgba(255, 255, 255, 0.95); font-size: 13px;">
									<span style="font-size: 16px;">✓</span>
									<span><strong>Unlimited</strong> outlets & registers</span>
								</div>
								<div style="display: flex; align-items: center; gap: 6px; color: rgba(255, 255, 255, 0.95); font-size: 13px;">
									<span style="font-size: 16px;">✓</span>
									<span><strong>Advanced</strong> reports & analytics</span>
								</div>
								<div style="display: flex; align-items: center; gap: 6px; color: rgba(255, 255, 255, 0.95); font-size: 13px;">
									<span style="font-size: 16px;">✓</span>
									<span><strong>Hardware</strong> integration</span>
								</div>
								<div style="display: flex; align-items: center; gap: 6px; color: rgba(255, 255, 255, 0.95); font-size: 13px;">
									<span style="font-size: 16px;">✓</span>
									<span><strong>Gift cards</strong> & loyalty points</span>
								</div>
							</div>
						</div>

						<!-- CTA Section -->
						<div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
							<a href="<?php echo esc_url( admin_url( 'admin.php?page=ready-pos#/license' ) ); ?>" 
							   class="button button-primary" 
							   style="background: #ffffff; color: #667eea; border: none; padding: 10px 24px; font-size: 14px; font-weight: 700; border-radius: 6px; text-decoration: none; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">
								<span style="font-size: 16px;">⚡</span>
								<span>Upgrade to Pro</span>
							</a>
							<a href="https://readypos.io/pro" 
							   target="_blank" 
							   rel="noopener noreferrer"
							   style="color: rgba(255, 255, 255, 0.9); font-size: 12px; text-decoration: underline; white-space: nowrap;">
								View pricing & features →
							</a>
						</div>
					</div>

					<!-- Dismissible Option -->
					<div style="background: rgba(0, 0, 0, 0.1); padding: 8px 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
						<p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
							<span>💡 <strong>Limited Time:</strong> Get 20% off your first year with code <strong style="background: rgba(255, 255, 255, 0.2); padding: 2px 6px; border-radius: 3px; font-family: monospace;">WELCOME20</strong></span>
							<button type="button" 
									class="notice-dismiss" 
									onclick="this.closest('tr').style.display='none';"
									style="position: relative; float: none; margin: 0; padding: 0; background: transparent; border: none; cursor: pointer; color: rgba(255, 255, 255, 0.7);">
								<span class="screen-reader-text">Dismiss this notice.</span>
							</button>
						</p>
					</div>
				</div>
			</td>
		</tr>
		<style>
			#ready-pos-upgrade-banner .update-message:hover {
				box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
			}
			#ready-pos-upgrade-banner .button-primary:hover {
				transform: translateY(-2px);
				box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
			}
			@media screen and (max-width: 782px) {
				#ready-pos-upgrade-banner .update-message > div:first-child {
					flex-direction: column;
					text-align: center;
				}
				#ready-pos-upgrade-banner .update-message > div:first-child > div:last-child {
					align-items: center;
				}
			}
		</style>
		<?php
	}
}
