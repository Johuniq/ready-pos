import { useEffect, useCallback, useState } from "react";
import { wsManager, WS_EVENTS } from "@/lib/realtime/websocket";
import { toast } from "sonner";
import { useAtom } from "jotai";
import { sessionAtom, settingsAtom } from "@/admin/stores/posStore";

/**
 * Real-time Sync Hook
 *
 * Provides instant updates across multiple POS terminals:
 * - Auto-connects on mount
 * - Subscribes to relevant events
 * - Handles inventory updates
 * - Handles order notifications
 * - Automatic reconnection
 *
 * Usage:
 * ```js
 * const { isConnected, broadcast } = useRealtime({
 *   onInventoryUpdate: (data) => {
 *     // Refresh product stock
 *   },
 *   onOrderCreated: (data) => {
 *     // Show notification
 *   }
 * });
 * ```
 */

export const useRealtime = (config = {}) => {
  const [session] = useAtom(sessionAtom);
  const [settings] = useAtom(settingsAtom);
  const [isConnected, setIsConnected] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const {
    onInventoryUpdate,
    onOrderCreated,
    onStockChanged,
    onCartTransferred,
    onSessionOpened,
    onSessionClosed,
    onRegisterOnline,
    onRegisterOffline,
    showNotifications = true,
  } = config;

  // Initialize connection
  useEffect(() => {
    const registerId = session?.register?.id;
    const outletId = settings?.outlet_id;

    if (!registerId) {
      console.warn("[Realtime] No register ID, skipping WebSocket connection");
      return;
    }

    console.log("[Realtime] Connecting...", { registerId, outletId });

    wsManager.connect({ registerId, outletId });

    // Connection status listener
    const unsubConnect = wsManager.on("connected", (data) => {
      setIsConnected(true);
      setIsFallback(data.fallback || false);
      if (showNotifications) {
        if (data.fallback) {
          toast.info("Real-time sync active (polling mode)");
        } else {
          toast.success("Real-time sync connected");
        }
      }
    });

    return () => {
      unsubConnect();
      wsManager.disconnect();
    };
  }, [session?.register?.id, settings?.outlet_id, showNotifications]);

  // Subscribe to events
  useEffect(() => {
    const unsubscribers = [];

    // Inventory update event
    if (onInventoryUpdate) {
      unsubscribers.push(
        wsManager.on(WS_EVENTS.INVENTORY_UPDATED, (data) => {
          console.log("[Realtime] Inventory updated:", data);
          if (showNotifications) {
            toast.info(
              `Inventory updated: ${data.productName || "Product"} (${data.quantity} units)`,
              { duration: 3000 }
            );
          }
          onInventoryUpdate(data);
        }),
      );
    }

    // Stock change event
    if (onStockChanged) {
      unsubscribers.push(
        wsManager.on(WS_EVENTS.STOCK_CHANGED, (data) => {
          console.log("[Realtime] Stock changed:", data);
          if (showNotifications && data.registerId !== session?.register?.id) {
            toast.info(
              `${data.productName || "Product"}: ${data.oldStock} → ${data.newStock}`,
              { duration: 3000 }
            );
          }
          onStockChanged(data);
        }),
      );
    }

    // Order created event
    if (onOrderCreated) {
      unsubscribers.push(
        wsManager.on(WS_EVENTS.ORDER_CREATED, (data) => {
          console.log("[Realtime] Order created:", data);
          if (showNotifications && data.registerId !== session?.register?.id) {
            toast.success(
              `New order #${data.orderId} - ${data.total}`,
              { duration: 4000 }
            );
          }
          onOrderCreated(data);
        }),
      );
    }

    // Cart transferred event
    if (onCartTransferred) {
      unsubscribers.push(
        wsManager.on(WS_EVENTS.CART_TRANSFERRED, (data) => {
          console.log("[Realtime] Cart transferred:", data);
          if (showNotifications && data.toRegisterId === session?.register?.id) {
            toast.info(
              `Cart transferred to you from ${data.fromCashierName}`,
              { duration: 5000 }
            );
          }
          onCartTransferred(data);
        }),
      );
    }

    // Session events
    if (onSessionOpened) {
      unsubscribers.push(
        wsManager.on(WS_EVENTS.SESSION_OPENED, (data) => {
          console.log("[Realtime] Session opened:", data);
          if (showNotifications && data.registerId !== session?.register?.id) {
            toast.info(
              `${data.cashierName} opened session at ${data.registerName}`,
            );
          }
          onSessionOpened(data);
        }),
      );
    }

    if (onSessionClosed) {
      unsubscribers.push(
        wsManager.on(WS_EVENTS.SESSION_CLOSED, (data) => {
          console.log("[Realtime] Session closed:", data);
          if (showNotifications && data.registerId !== session?.register?.id) {
            toast.info(
              `${data.cashierName} closed session at ${data.registerName}`,
            );
          }
          onSessionClosed(data);
        }),
      );
    }

    // Register online/offline
    if (onRegisterOnline) {
      unsubscribers.push(
        wsManager.on(WS_EVENTS.REGISTER_ONLINE, (data) => {
          console.log("[Realtime] Register online:", data);
          if (showNotifications) {
            toast.success(`${data.registerName} is now online`);
          }
          onRegisterOnline(data);
        }),
      );
    }

    if (onRegisterOffline) {
      unsubscribers.push(
        wsManager.on(WS_EVENTS.REGISTER_OFFLINE, (data) => {
          console.log("[Realtime] Register offline:", data);
          if (showNotifications) {
            toast.warning(`${data.registerName} went offline`);
          }
          onRegisterOffline(data);
        }),
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [
    onInventoryUpdate,
    onOrderCreated,
    onStockChanged,
    onCartTransferred,
    onSessionOpened,
    onSessionClosed,
    onRegisterOnline,
    onRegisterOffline,
    showNotifications,
    session?.register?.id,
  ]);

  // Broadcast helper
  const broadcast = useCallback((eventType, payload) => {
    wsManager.broadcast(eventType, payload);
  }, []);

  // Specific broadcast helpers
  const broadcastOrderCreated = useCallback(
    (orderData) => {
      broadcast(WS_EVENTS.ORDER_CREATED, {
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        total: orderData.total,
        items: orderData.items?.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
        })),
        registerId: session?.register?.id,
        registerName: session?.register?.name,
        cashierName: session?.user?.display_name,
      });
    },
    [broadcast, session],
  );

  const broadcastStockChanged = useCallback(
    (productId, productName, oldStock, newStock) => {
      broadcast(WS_EVENTS.STOCK_CHANGED, {
        productId,
        productName,
        oldStock,
        newStock,
        registerId: session?.register?.id,
        registerName: session?.register?.name,
      });
    },
    [broadcast, session],
  );

  const broadcastInventoryUpdate = useCallback(
    (updates) => {
      broadcast(WS_EVENTS.INVENTORY_UPDATED, {
        updates,
        registerId: session?.register?.id,
        registerName: session?.register?.name,
        timestamp: Date.now(),
      });
    },
    [broadcast, session],
  );

  const broadcastCartTransferred = useCallback(
    (cartData, toRegisterId, toCashierId, toCashierName) => {
      broadcast(WS_EVENTS.CART_TRANSFERRED, {
        cartId: cartData.id,
        cartLabel: cartData.label,
        itemCount: cartData.items?.length || 0,
        fromRegisterId: session?.register?.id,
        fromCashierName: session?.user?.display_name,
        toRegisterId,
        toCashierId,
        toCashierName,
      });
    },
    [broadcast, session],
  );

  return {
    isConnected,
    isFallback,
    broadcast,
    broadcastOrderCreated,
    broadcastStockChanged,
    broadcastInventoryUpdate,
    broadcastCartTransferred,
    events: WS_EVENTS,
  };
};
