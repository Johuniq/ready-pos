<?php
/**
 * WebSocket Server Manager
 *
 * Provides real-time communication between POS terminals.
 * Falls back to REST API polling if WebSocket server not available.
 *
 * @package Readypos
 * @since 2.0.0
 */

namespace Readypos\Realtime;

class WebSocketServer {

    /**
     * Event storage (in-memory for REST API fallback)
     * In production, use Redis or database
     */
    private static $events = [];

    /**
     * Max events to store
     */
    private const MAX_EVENTS = 100;

    /**
     * Event TTL in seconds
     */
    private const EVENT_TTL = 60;

    /**
     * Initialize WebSocket or REST fallback
     */
    public static function init() {
        // Register REST API endpoints for polling fallback
        add_action('rest_api_init', [self::class, 'register_rest_routes']);

        // Check if Ratchet WebSocket library is available
        if (self::is_websocket_available()) {
            // WebSocket server would run as separate process
            // This is just a placeholder for the configuration
            add_action('admin_init', [self::class, 'maybe_start_websocket_server']);
        }
    }

    /**
     * Register REST API routes for polling fallback
     */
    public static function register_rest_routes() {
        // Broadcast event
        register_rest_route('readypos/v1', '/realtime/broadcast', [
            'methods' => 'POST',
            'callback' => [self::class, 'broadcast_event'],
            'permission_callback' => [self::class, 'check_permissions'],
        ]);

        // Poll for events
        register_rest_route('readypos/v1', '/realtime/poll', [
            'methods' => 'GET',
            'callback' => [self::class, 'poll_events'],
            'permission_callback' => [self::class, 'check_permissions'],
        ]);

        // Get connection status
        register_rest_route('readypos/v1', '/realtime/status', [
            'methods' => 'GET',
            'callback' => [self::class, 'get_status'],
            'permission_callback' => [self::class, 'check_permissions'],
        ]);
    }

    /**
     * Check permissions
     */
    public static function check_permissions() {
        return current_user_can('manage_options');
    }

    /**
     * Broadcast event via REST API
     *
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public static function broadcast_event($request) {
        $type = $request->get_param('type');
        $payload = $request->get_param('payload');
        $register_id = $request->get_param('registerId');
        $outlet_id = $request->get_param('outletId');

        if (!$type) {
            return new \WP_REST_Response([
                'success' => false,
                'message' => 'Event type is required',
            ], 400);
        }

        $event = [
            'id' => uniqid('evt_', true),
            'type' => $type,
            'payload' => $payload,
            'registerId' => $register_id,
            'outletId' => $outlet_id,
            'timestamp' => time(),
        ];

        // Store event (in production, use Redis or database)
        self::store_event($event);

        // If WebSocket server is running, broadcast via WebSocket
        if (self::is_websocket_running()) {
            self::send_to_websocket($event);
        }

        return new \WP_REST_Response([
            'success' => true,
            'eventId' => $event['id'],
        ], 200);
    }

    /**
     * Poll for events
     *
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public static function poll_events($request) {
        $register_id = $request->get_param('registerId');
        $outlet_id = $request->get_param('outletId');
        $since = (int) $request->get_param('since');

        if (!$since) {
            $since = time() - 10; // Default: last 10 seconds
        } else {
            $since = (int) ($since / 1000); // Convert from milliseconds
        }

        // Get events since timestamp
        $events = self::get_events_since($since, $register_id, $outlet_id);

        return new \WP_REST_Response([
            'success' => true,
            'events' => $events,
            'count' => count($events),
            'timestamp' => time(),
        ], 200);
    }

    /**
     * Get connection status
     *
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public static function get_status($request) {
        return new \WP_REST_Response([
            'success' => true,
            'websocket_available' => self::is_websocket_available(),
            'websocket_running' => self::is_websocket_running(),
            'fallback_mode' => !self::is_websocket_running(),
            'active_registers' => self::get_active_registers(),
        ], 200);
    }

    /**
     * Store event
     *
     * @param array $event
     */
    private static function store_event($event) {
        // In-memory storage (for single-server setup)
        // For production: use Redis, Memcached, or database
        
        self::$events[] = $event;

        // Keep only recent events
        if (count(self::$events) > self::MAX_EVENTS) {
            array_shift(self::$events);
        }

        // Also store in transient for persistence across requests
        $transient_key = 'readypos_realtime_events';
        $stored_events = get_transient($transient_key) ?: [];
        $stored_events[] = $event;

        // Keep only last MAX_EVENTS
        if (count($stored_events) > self::MAX_EVENTS) {
            $stored_events = array_slice($stored_events, -self::MAX_EVENTS);
        }

        set_transient($transient_key, $stored_events, self::EVENT_TTL);
    }

    /**
     * Get events since timestamp
     *
     * @param int $since Unix timestamp
     * @param string|null $register_id
     * @param string|null $outlet_id
     * @return array
     */
    private static function get_events_since($since, $register_id = null, $outlet_id = null) {
        // Get from transient
        $transient_key = 'readypos_realtime_events';
        $events = get_transient($transient_key) ?: [];

        // Filter by timestamp
        $events = array_filter($events, function($event) use ($since, $register_id) {
            // Exclude events from same register (no echo)
            if ($register_id && isset($event['registerId']) && $event['registerId'] === $register_id) {
                return false;
            }
            return $event['timestamp'] >= $since;
        });

        // Clean up old events
        self::cleanup_old_events();

        return array_values($events);
    }

    /**
     * Cleanup old events
     */
    private static function cleanup_old_events() {
        $transient_key = 'readypos_realtime_events';
        $events = get_transient($transient_key) ?: [];

        $cutoff = time() - self::EVENT_TTL;
        $events = array_filter($events, function($event) use ($cutoff) {
            return $event['timestamp'] >= $cutoff;
        });

        set_transient($transient_key, array_values($events), self::EVENT_TTL);
    }

    /**
     * Check if WebSocket library is available
     *
     * @return bool
     */
    private static function is_websocket_available() {
        // Check if Ratchet or similar library is installed
        return class_exists('Ratchet\Server\IoServer');
    }

    /**
     * Check if WebSocket server is running
     *
     * @return bool
     */
    private static function is_websocket_running() {
        // Check if WebSocket process is running
        // This would check a PID file or ping the WebSocket port
        $ws_port = get_option('readypos_websocket_port', 8080);
        
        // Simple check: try to connect to the port
        $connection = @fsockopen('localhost', $ws_port, $errno, $errstr, 1);
        if ($connection) {
            fclose($connection);
            return true;
        }

        return false;
    }

    /**
     * Maybe start WebSocket server
     */
    public static function maybe_start_websocket_server() {
        // This would be called by WP-CLI or admin action
        // Not auto-started to avoid blocking WordPress requests
        
        if (!self::is_websocket_available()) {
            return;
        }

        // Check if already running
        if (self::is_websocket_running()) {
            return;
        }

        // WebSocket server should be started separately via WP-CLI:
        // wp ready-pos websocket start
    }

    /**
     * Send event to WebSocket server
     *
     * @param array $event
     */
    private static function send_to_websocket($event) {
        // Send event to running WebSocket server via internal socket
        $ws_port = get_option('readypos_websocket_port', 8080);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => json_encode($event),
                'timeout' => 1,
            ],
        ]);

        @file_get_contents("http://localhost:{$ws_port}/internal/broadcast", false, $context);
    }

    /**
     * Get active registers
     *
     * @return array
     */
    private static function get_active_registers() {
        global $wpdb;

        $table = $wpdb->prefix . 'readypos_sessions';
        
        // Get sessions active in last 5 minutes
        $active_sessions = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT register_id, cashier_id, opened_at 
                FROM {$table} 
                WHERE closed_at IS NULL 
                AND opened_at > %s
                ORDER BY opened_at DESC",
                date('Y-m-d H:i:s', time() - 300)
            ),
            ARRAY_A
        );

        return $active_sessions;
    }

    /**
     * Broadcast inventory update
     *
     * @param int $product_id
     * @param string $product_name
     * @param int $old_stock
     * @param int $new_stock
     * @param int $register_id
     */
    public static function broadcast_inventory_update($product_id, $product_name, $old_stock, $new_stock, $register_id = null) {
        $event = [
            'id' => uniqid('evt_', true),
            'type' => 'stock.changed',
            'payload' => [
                'productId' => $product_id,
                'productName' => $product_name,
                'oldStock' => $old_stock,
                'newStock' => $new_stock,
            ],
            'registerId' => $register_id,
            'timestamp' => time(),
        ];

        self::store_event($event);

        if (self::is_websocket_running()) {
            self::send_to_websocket($event);
        }
    }

    /**
     * Broadcast order created
     *
     * @param int $order_id
     * @param array $order_data
     * @param int $register_id
     */
    public static function broadcast_order_created($order_id, $order_data, $register_id = null) {
        $event = [
            'id' => uniqid('evt_', true),
            'type' => 'order.created',
            'payload' => [
                'orderId' => $order_id,
                'orderNumber' => $order_data['order_number'] ?? '',
                'total' => $order_data['total'] ?? 0,
                'items' => $order_data['items'] ?? [],
            ],
            'registerId' => $register_id,
            'timestamp' => time(),
        ];

        self::store_event($event);

        if (self::is_websocket_running()) {
            self::send_to_websocket($event);
        }
    }
}
