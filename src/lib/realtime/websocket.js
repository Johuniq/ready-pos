/**
 * WebSocket Real-time Sync Manager
 *
 * Provides instant updates across multiple POS terminals:
 * - Register A sells → Register B updates immediately
 * - Inventory changes sync in real-time
 * - Order notifications across terminals
 * - Automatic reconnection with exponential backoff
 * - Graceful fallback to polling if WebSocket unavailable
 *
 * @since 2.0.0
 */

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start at 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.heartbeatInterval = null;
    this.messageHandlers = new Map();
    this.connectionId = null;
    this.registerId = null;
    this.outletId = null;
    this.pollingInterval = null;
    this.pollingFallback = false;

    // Event types
    this.events = {
      ORDER_CREATED: "order.created",
      INVENTORY_UPDATED: "inventory.updated",
      STOCK_CHANGED: "stock.changed",
      CART_TRANSFERRED: "cart.transferred",
      SESSION_OPENED: "session.opened",
      SESSION_CLOSED: "session.closed",
      REGISTER_ONLINE: "register.online",
      REGISTER_OFFLINE: "register.offline",
    };
  }

  /**
   * Initialize WebSocket connection
   */
  async connect(config = {}) {
    this.registerId = config.registerId;
    this.outletId = config.outletId;

    // Try WebSocket first
    const wsUrl = this.getWebSocketUrl();

    if (!wsUrl) {
      console.warn("[WebSocket] No WebSocket server configured, using polling fallback");
      this.enablePollingFallback();
      return;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (error) => this.handleError(error);
      this.ws.onclose = () => this.handleClose();
    } catch (error) {
      console.error("[WebSocket] Connection failed, falling back to polling:", error);
      this.enablePollingFallback();
    }
  }

  /**
   * Get WebSocket URL from WordPress config
   */
  getWebSocketUrl() {
    // Check if WebSocket URL is configured in WordPress
    if (window.readyPOS?.websocket?.url) {
      return window.readyPOS.websocket.url;
    }

    // Auto-detect based on current URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    // Default WebSocket endpoint (requires server setup)
    return `${protocol}//${host}/ws/ready-pos`;
  }

  /**
   * Handle WebSocket connection open
   */
  handleOpen() {
    console.log("[WebSocket] Connected");
    this.connected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.pollingFallback = false;

    // Send authentication
    this.send({
      type: "auth",
      token: window.readyPOS?.nonce,
      registerId: this.registerId,
      outletId: this.outletId,
    });

    // Start heartbeat
    this.startHeartbeat();

    // Notify handlers
    this.emit("connected", { registerId: this.registerId });
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // Handle special messages
      if (data.type === "auth_success") {
        this.connectionId = data.connectionId;
        console.log("[WebSocket] Authenticated:", this.connectionId);
        return;
      }

      if (data.type === "pong") {
        // Heartbeat response
        return;
      }

      // Emit to registered handlers
      this.emit(data.type, data.payload);
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
    }
  }

  /**
   * Handle WebSocket error
   */
  handleError(error) {
    console.error("[WebSocket] Error:", error);
    this.connected = false;
  }

  /**
   * Handle WebSocket close
   */
  handleClose() {
    console.log("[WebSocket] Connection closed");
    this.connected = false;
    this.stopHeartbeat();

    // Attempt reconnection with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay,
      );

      console.log(
        `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
      );

      setTimeout(() => {
        this.connect({
          registerId: this.registerId,
          outletId: this.outletId,
        });
      }, delay);
    } else {
      console.warn("[WebSocket] Max reconnection attempts reached, falling back to polling");
      this.enablePollingFallback();
    }
  }

  /**
   * Send message through WebSocket
   */
  send(data) {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else if (this.pollingFallback) {
      // In polling mode, messages are sent via API
      this.sendViaAPI(data);
    }
  }

  /**
   * Send message via REST API (fallback)
   */
  async sendViaAPI(data) {
    try {
      await fetch(`${window.readyPOS.apiUrl}/realtime/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": window.readyPOS.nonce,
        },
        body: JSON.stringify({
          type: data.type,
          payload: data.payload || data,
          registerId: this.registerId,
          outletId: this.outletId,
        }),
      });
    } catch (error) {
      console.error("[WebSocket] Failed to send via API:", error);
    }
  }

  /**
   * Broadcast event to other terminals
   */
  broadcast(eventType, payload) {
    this.send({
      type: eventType,
      payload: payload,
      timestamp: Date.now(),
      registerId: this.registerId,
      outletId: this.outletId,
    });
  }

  /**
   * Subscribe to event
   */
  on(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit event to handlers
   */
  emit(eventType, payload) {
    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[WebSocket] Handler error for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.send({ type: "ping" });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Enable polling fallback when WebSocket unavailable
   */
  enablePollingFallback() {
    if (this.pollingFallback) return;

    console.log("[WebSocket] Enabling polling fallback");
    this.pollingFallback = true;
    this.connected = false; // Mark as not connected via WebSocket

    // Poll for updates every 5 seconds
    this.pollingInterval = setInterval(async () => {
      await this.pollForUpdates();
    }, 5000);

    // Emit connected event (with fallback indicator)
    this.emit("connected", { registerId: this.registerId, fallback: true });
  }

  /**
   * Poll for updates via REST API
   */
  async pollForUpdates() {
    try {
      const response = await fetch(
        `${window.readyPOS.apiUrl}/realtime/poll?registerId=${this.registerId}&outletId=${this.outletId}&since=${Date.now() - 6000}`,
        {
          headers: {
            "X-WP-Nonce": window.readyPOS.nonce,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.events && data.events.length > 0) {
          data.events.forEach((event) => {
            this.emit(event.type, event.payload);
          });
        }
      }
    } catch (error) {
      console.error("[WebSocket] Polling error:", error);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.stopHeartbeat();

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.pollingFallback = false;
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.connected || this.pollingFallback;
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();

// Export events enum
export const WS_EVENTS = wsManager.events;
