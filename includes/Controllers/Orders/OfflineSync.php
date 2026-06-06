<?php
/**
 * Offline Sync Controller
 *
 * Handles offline order sync with conflict detection and idempotency.
 *
 * @package Readypos
 * @since 2.0.0
 */

namespace Readypos\Controllers\Orders;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

class OfflineSync {

    /**
     * Idempotency cache table name
     */
    private const IDEMPOTENCY_TABLE = 'ready_pos_idempotency';

    /**
     * Maximum age for idempotency keys (24 hours)
     */
    private const MAX_KEY_AGE = 86400;

    /**
     * Register REST API routes
     */
    public static function register_routes() {
        register_rest_route('ready-pos/v1', '/orders/create', [
            'methods' => 'POST',
            'callback' => [self::class, 'create_order_with_idempotency'],
            'permission_callback' => [self::class, 'check_permissions'],
        ]);

        register_rest_route('ready-pos/v1', '/inventory/adjust', [
            'methods' => 'POST',
            'callback' => [self::class, 'adjust_inventory_with_idempotency'],
            'permission_callback' => [self::class, 'check_permissions'],
        ]);

        register_rest_route('ready-pos/v1', '/sync/status', [
            'methods' => 'GET',
            'callback' => [self::class, 'get_sync_status'],
            'permission_callback' => [self::class, 'check_permissions'],
        ]);
    }

    /**
     * Check if user has permission
     */
    public static function check_permissions() {
        return current_user_can('manage_woocommerce');
    }

    /**
     * Create order with idempotency key support
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public static function create_order_with_idempotency($request) {
        global $wpdb;

        $idempotency_key = $request->get_param('_idempotencyKey');
        
        if (!$idempotency_key) {
            return new WP_Error(
                'missing_idempotency_key',
                'Idempotency key is required for offline sync',
                ['status' => 400]
            );
        }

        // Check if this request was already processed
        $existing = self::check_idempotency($idempotency_key);
        
        if ($existing) {
            // Request already processed - return the existing result
            return new WP_REST_Response([
                'success' => true,
                'order_id' => $existing['order_id'],
                'duplicate' => true,
                'message' => 'Order already created with this idempotency key',
                'original_timestamp' => $existing['created_at'],
            ], 200);
        }

        // Process the order creation
        try {
            // Create WooCommerce order
            $order = wc_create_order([
                'customer_id' => $request->get_param('customerId') ?: 0,
                'created_via' => 'ready_pos_offline',
            ]);

            if (is_wp_error($order)) {
                throw new \Exception($order->get_error_message());
            }

            // Add items
            $items = $request->get_param('items') ?: [];
            foreach ($items as $item) {
                $product = wc_get_product($item['id']);
                if (!$product) {
                    continue;
                }

                $order->add_product(
                    $product,
                    $item['quantity'],
                    [
                        'subtotal' => $product->get_price() * $item['quantity'],
                        'total' => $product->get_price() * $item['quantity'],
                    ]
                );
            }

            // Apply discount if provided
            $discount_type = $request->get_param('discountType');
            $discount_value = $request->get_param('discountValue');
            
            if ($discount_type && $discount_value > 0) {
                if ($discount_type === 'percentage') {
                    $discount_amount = ($order->get_subtotal() * $discount_value) / 100;
                } else {
                    $discount_amount = $discount_value;
                }
                $order->set_discount_total($discount_amount);
            }

            // Set payment method
            $payment_method = $request->get_param('paymentMethod') ?: 'cash';
            $order->set_payment_method($payment_method);
            $order->set_payment_method_title(ucfirst($payment_method));

            // Add metadata
            $order->update_meta_data('_ready_pos_order', 'yes');
            $order->update_meta_data('_ready_pos_offline_sync', 'yes');
            $order->update_meta_data('_ready_pos_idempotency_key', $idempotency_key);
            
            if ($card_ref = $request->get_param('cardRef')) {
                $order->update_meta_data('_ready_pos_card_ref', $card_ref);
            }

            if ($notes = $request->get_param('notes')) {
                $order->set_customer_note($notes);
            }

            // Cash handling
            $cash_received = $request->get_param('cashReceived');
            $change_given = $request->get_param('changeGiven');
            
            if ($cash_received) {
                $order->update_meta_data('_ready_pos_cash_received', $cash_received);
            }
            if ($change_given) {
                $order->update_meta_data('_ready_pos_change_given', $change_given);
            }

            // Split payment details
            if ($split_payments = $request->get_param('splitPayments')) {
                $order->update_meta_data('_ready_pos_split_payments', json_encode($split_payments));
            }

            // Session info
            if ($session_id = $request->get_param('sessionId')) {
                $order->update_meta_data('_ready_pos_session_id', $session_id);
            }

            // Mark as paid if cash/card
            if (in_array($payment_method, ['cash', 'card', 'gift_card', 'split'])) {
                $order->payment_complete();
            }

            // Calculate and save
            $order->calculate_totals();
            $order->save();

            // Store idempotency key
            self::store_idempotency($idempotency_key, $order->get_id());

            // Log sync event
            self::log_sync_event('order_created', [
                'order_id' => $order->get_id(),
                'idempotency_key' => $idempotency_key,
                'offline_sync' => true,
            ]);

            return new WP_REST_Response([
                'success' => true,
                'order_id' => $order->get_id(),
                'order_number' => $order->get_order_number(),
                'total' => $order->get_total(),
                'duplicate' => false,
                'message' => 'Order created successfully',
            ], 201);

        } catch (\Exception $e) {
            return new WP_Error(
                'order_creation_failed',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Adjust inventory with idempotency
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public static function adjust_inventory_with_idempotency($request) {
        $idempotency_key = $request->get_param('_idempotencyKey');
        
        if (!$idempotency_key) {
            return new WP_Error(
                'missing_idempotency_key',
                'Idempotency key is required',
                ['status' => 400]
            );
        }

        // Check if already processed
        $existing = self::check_idempotency($idempotency_key);
        if ($existing) {
            return new WP_REST_Response([
                'success' => true,
                'duplicate' => true,
                'message' => 'Inventory adjustment already applied',
            ], 200);
        }

        // Get parameters
        $product_id = $request->get_param('product_id');
        $type = $request->get_param('type'); // 'reduce', 'add', 'set'
        $quantity = $request->get_param('quantity');

        if (!$product_id || !$type || $quantity === null) {
            return new WP_Error(
                'invalid_parameters',
                'Missing required parameters',
                ['status' => 400]
            );
        }

        // Get product
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_Error(
                'product_not_found',
                'Product not found',
                ['status' => 404]
            );
        }

        // Get current stock
        $current_stock = $product->get_stock_quantity();
        $new_stock = $current_stock;

        // Apply adjustment
        switch ($type) {
            case 'reduce':
                $new_stock = max(0, $current_stock - $quantity);
                break;
            case 'add':
                $new_stock = $current_stock + $quantity;
                break;
            case 'set':
                $new_stock = $quantity;
                break;
        }

        // Update stock
        wc_update_product_stock($product, $new_stock, 'set');

        // Store idempotency
        self::store_idempotency($idempotency_key, $product_id, 'inventory');

        // Log event
        self::log_sync_event('inventory_adjusted', [
            'product_id' => $product_id,
            'type' => $type,
            'quantity' => $quantity,
            'old_stock' => $current_stock,
            'new_stock' => $new_stock,
        ]);

        return new WP_REST_Response([
            'success' => true,
            'product_id' => $product_id,
            'old_stock' => $current_stock,
            'new_stock' => $new_stock,
            'duplicate' => false,
        ], 200);
    }

    /**
     * Get sync status and statistics
     */
    public static function get_sync_status($request) {
        global $wpdb;

        $table = $wpdb->prefix . self::IDEMPOTENCY_TABLE;

        // Count recent syncs
        $recent_syncs = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE created_at > %s",
                date('Y-m-d H:i:s', time() - self::MAX_KEY_AGE)
            )
        );

        // Get latest sync
        $latest_sync = $wpdb->get_row(
            "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 1"
        );

        return new WP_REST_Response([
            'success' => true,
            'recent_syncs' => (int) $recent_syncs,
            'latest_sync' => $latest_sync,
            'server_time' => current_time('mysql'),
        ], 200);
    }

    /**
     * Check if idempotency key exists
     *
     * @param string $key
     * @return array|null
     */
    private static function check_idempotency($key) {
        global $wpdb;

        $table = $wpdb->prefix . self::IDEMPOTENCY_TABLE;

        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE idempotency_key = %s",
                $key
            ),
            ARRAY_A
        );
    }

    /**
     * Store idempotency key
     *
     * @param string $key
     * @param int $resource_id
     * @param string $type
     */
    private static function store_idempotency($key, $resource_id, $type = 'order') {
        global $wpdb;

        $table = $wpdb->prefix . self::IDEMPOTENCY_TABLE;

        $wpdb->insert(
            $table,
            [
                'idempotency_key' => $key,
                'resource_type' => $type,
                'resource_id' => $resource_id,
                'created_at' => current_time('mysql'),
            ],
            ['%s', '%s', '%d', '%s']
        );

        // Clean up old keys
        self::cleanup_old_keys();
    }

    /**
     * Clean up old idempotency keys
     */
    private static function cleanup_old_keys() {
        global $wpdb;

        $table = $wpdb->prefix . self::IDEMPOTENCY_TABLE;
        $cutoff = date('Y-m-d H:i:s', time() - self::MAX_KEY_AGE);

        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$table} WHERE created_at < %s",
                $cutoff
            )
        );
    }

    /**
     * Log sync event
     *
     * @param string $event_type
     * @param array $data
     */
    private static function log_sync_event($event_type, $data) {
        // Could be expanded to dedicated logging table
        error_log(sprintf(
            '[ReadyPOS Offline Sync] %s: %s',
            $event_type,
            json_encode($data)
        ));
    }

    /**
     * Create idempotency table on activation
     */
    public static function create_idempotency_table() {
        global $wpdb;

        $table = $wpdb->prefix . self::IDEMPOTENCY_TABLE;
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            idempotency_key varchar(255) NOT NULL,
            resource_type varchar(50) NOT NULL,
            resource_id bigint(20) UNSIGNED NOT NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY idempotency_key (idempotency_key),
            KEY created_at (created_at)
        ) {$charset_collate};";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}
