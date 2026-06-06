<?php
/**
 * Admin Tools Page
 *
 * Provides admin tools for cache management, data cleanup, and system diagnostics.
 *
 * @package Readypos\Admin
 * @since 1.0.1
 */

declare(strict_types=1);

namespace Readypos\Admin;

use Readypos\Traits\Base;
use Readypos\Core\Uninstall;

/**
 * Class Tools
 *
 * Admin tools and utilities.
 */
class Tools {

	use Base;

	/**
	 * Initialize tools.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_post_readypos_clear_cache', array( $this, 'handle_clear_cache' ) );
		add_action( 'admin_post_readypos_get_data_summary', array( $this, 'handle_data_summary' ) );
	}

	/**
	 * Handle cache clearing request.
	 *
	 * @return void
	 */
	public function handle_clear_cache() {
		// Check nonce
		if ( ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ), 'readypos_clear_cache' ) ) {
			wp_die( esc_html__( 'Security check failed', 'ready-pos' ) );
		}

		// Check permissions
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to perform this action', 'ready-pos' ) );
		}

		// Clear caches
		Uninstall::clear_caches();

		// Redirect back with success message
		$redirect_url = add_query_arg(
			array(
				'page'                => 'ready-pos',
				'readypos_cache_cleared' => '1',
			),
			admin_url( 'admin.php' )
		);

		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Handle data summary request (AJAX).
	 *
	 * @return void
	 */
	public function handle_data_summary() {
		// Check nonce
		check_ajax_referer( 'readypos_data_summary', 'nonce' );

		// Check permissions
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Permission denied' ) );
		}

		// Get data summary
		$summary = Uninstall::get_data_summary();

		wp_send_json_success( $summary );
	}

	/**
	 * Get cache clear button HTML.
	 *
	 * @return string
	 */
	public static function get_cache_clear_button() {
		$nonce = wp_create_nonce( 'readypos_clear_cache' );
		$url   = admin_url( 'admin-post.php' );

		ob_start();
		?>
		<form method="post" action="<?php echo esc_url( $url ); ?>" style="display: inline;">
			<input type="hidden" name="action" value="readypos_clear_cache">
			<input type="hidden" name="_wpnonce" value="<?php echo esc_attr( $nonce ); ?>">
			<button type="submit" class="button button-secondary">
				<span class="dashicons dashicons-update" style="vertical-align: middle;"></span>
				<?php esc_html_e( 'Clear All Caches', 'ready-pos' ); ?>
			</button>
		</form>
		<?php
		return ob_get_clean();
	}
}

