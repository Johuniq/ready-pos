import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { dbOperations } from "../lib/db";
import { api } from "@/lib/api";

/**
 * Offline Inventory Management Hook
 *
 * Features:
 * - Local inventory cache with automatic sync
 * - Optimistic updates for instant UI feedback
 * - Conflict detection (same stock changed online and offline)
 * - Inventory change queue with retry logic
 * - Stock level validation before checkout
 *
 * This ensures merchants can continue selling even when offline,
 * with proper stock tracking and conflict resolution.
 */

export const useOfflineInventory = () => {
  const [inventoryCache, setInventoryCache] = useState(new Map());
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, error
  const [conflicts, setConflicts] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Load inventory cache from IndexedDB on mount
  useEffect(() => {
    loadInventoryCache();
  }, []);

  const loadInventoryCache = async () => {
    try {
      const cached = await dbOperations.getAll("offline_inventory");
      const map = new Map();
      cached.forEach((item) => {
        map.set(item.product_id, item);
      });
      setInventoryCache(map);
    } catch (error) {
      console.error("[OfflineInventory] Failed to load cache:", error);
    }
  };

  // Get stock level for a product (with fallback to API if not cached)
  const getStockLevel = useCallback(
    async (productId) => {
      // Check cache first
      if (inventoryCache.has(productId)) {
        return inventoryCache.get(productId).stock_quantity;
      }

      // Fallback to API if online
      if (navigator.onLine) {
        try {
          const response = await api.get(`/inventory/stock/${productId}`);
          if (response.success) {
            // Update cache
            await updateInventoryCache(productId, {
              stock_quantity: response.stock_quantity,
              _lastSync: Date.now(),
            });
            return response.stock_quantity;
          }
        } catch (error) {
          console.error(
            "[OfflineInventory] Failed to fetch stock:",
            productId,
            error,
          );
        }
      }

      // No data available
      return null;
    },
    [inventoryCache],
  );

  // Update inventory cache (optimistic update)
  const updateInventoryCache = async (productId, updates) => {
    try {
      const existing = inventoryCache.get(productId) || {
        product_id: productId,
      };
      const updated = { ...existing, ...updates, _lastUpdate: Date.now() };

      await dbOperations.put("offline_inventory", updated);

      setInventoryCache((prev) => {
        const next = new Map(prev);
        next.set(productId, updated);
        return next;
      });

      return updated;
    } catch (error) {
      console.error("[OfflineInventory] Failed to update cache:", error);
      throw error;
    }
  };

  // Reduce stock after sale (optimistic)
  const reduceStock = async (productId, quantity) => {
    const current = await getStockLevel(productId);

    if (current === null) {
      console.warn(
        "[OfflineInventory] Cannot reduce stock - no data for product:",
        productId,
      );
      return false;
    }

    if (current < quantity) {
      toast.warning(`Insufficient stock for product ${productId}`);
      return false;
    }

    const newQuantity = current - quantity;

    // Optimistic update
    await updateInventoryCache(productId, {
      stock_quantity: newQuantity,
      _pendingSync: true,
      _changeQueue: [
        ...(inventoryCache.get(productId)?._changeQueue || []),
        {
          type: "reduce",
          quantity,
          timestamp: Date.now(),
          synced: false,
        },
      ],
    });

    return true;
  };

  // Sync inventory changes to server
  const syncInventory = useCallback(async () => {
    if (!navigator.onLine) {
      toast.info("Cannot sync inventory - device is offline");
      return;
    }

    setSyncStatus("syncing");
    const detectedConflicts = [];

    try {
      const allCached = await dbOperations.getAll("offline_inventory");
      const pendingItems = allCached.filter((item) => item._pendingSync);

      if (pendingItems.length === 0) {
        setSyncStatus("idle");
        setLastSyncTime(Date.now());
        return;
      }

      toast.info(`Syncing ${pendingItems.length} inventory changes...`);

      for (const item of pendingItems) {
        try {
          // Fetch server version to detect conflicts
          const serverData = await api.get(
            `/inventory/stock/${item.product_id}`,
          );

          // Check for conflict: server was modified after our last sync
          if (
            serverData._lastModified &&
            item._lastSync &&
            serverData._lastModified > item._lastSync
          ) {
            // Conflict detected!
            detectedConflicts.push({
              product_id: item.product_id,
              product_name: item.product_name || `Product ${item.product_id}`,
              local_quantity: item.stock_quantity,
              server_quantity: serverData.stock_quantity,
              local_changes: item._changeQueue || [],
              conflict_time: Date.now(),
            });
            continue;
          }

          // No conflict - apply changes
          const changes = item._changeQueue || [];
          for (const change of changes.filter((c) => !c.synced)) {
            await api.post("/inventory/adjust", {
              product_id: item.product_id,
              type: change.type,
              quantity: change.quantity,
              timestamp: change.timestamp,
              _idempotencyKey: `inv_${change.timestamp}_${item.product_id}`,
            });

            // Mark as synced
            change.synced = true;
          }

          // Update cache with fresh data
          await updateInventoryCache(item.product_id, {
            stock_quantity: serverData.stock_quantity,
            _pendingSync: false,
            _lastSync: Date.now(),
            _changeQueue: changes.filter((c) => c.synced),
          });
        } catch (error) {
          console.error(
            "[OfflineInventory] Failed to sync item:",
            item.product_id,
            error,
          );
        }
      }

      if (detectedConflicts.length > 0) {
        setConflicts((prev) => [...prev, ...detectedConflicts]);
        toast.warning(`${detectedConflicts.length} inventory conflicts detected`);
      } else {
        toast.success("Inventory synced successfully");
      }

      setLastSyncTime(Date.now());
    } catch (error) {
      console.error("[OfflineInventory] Sync failed:", error);
      toast.error("Failed to sync inventory");
      setSyncStatus("error");
      return;
    }

    setSyncStatus("idle");
  }, [inventoryCache]);

  // Resolve conflict (choose local or server version)
  const resolveConflict = async (conflict, resolution) => {
    try {
      if (resolution === "use_server") {
        // Use server version - discard local changes
        await updateInventoryCache(conflict.product_id, {
          stock_quantity: conflict.server_quantity,
          _pendingSync: false,
          _lastSync: Date.now(),
          _changeQueue: [],
        });
        toast.success(
          `Using server inventory for ${conflict.product_name || "product"}`,
        );
      } else if (resolution === "use_local") {
        // Force push local version to server
        await api.post("/inventory/set", {
          product_id: conflict.product_id,
          stock_quantity: conflict.local_quantity,
          force: true,
          reason: "Manual conflict resolution",
        });

        await updateInventoryCache(conflict.product_id, {
          _pendingSync: false,
          _lastSync: Date.now(),
          _changeQueue: [],
        });

        toast.success(
          `Local inventory pushed for ${conflict.product_name || "product"}`,
        );
      } else if (resolution === "manual") {
        // User will manually adjust
        return;
      }

      // Remove from conflicts list
      setConflicts((prev) =>
        prev.filter((c) => c.product_id !== conflict.product_id),
      );
    } catch (error) {
      console.error("[OfflineInventory] Failed to resolve conflict:", error);
      toast.error("Failed to resolve conflict");
    }
  };

  // Bulk sync all inventory from server (refresh cache)
  const refreshInventoryCache = async () => {
    if (!navigator.onLine) {
      toast.info("Cannot refresh - device is offline");
      return;
    }

    try {
      toast.info("Refreshing inventory cache...");
      const response = await api.get("/inventory/all");

      if (response.success && response.products) {
        // Update cache with fresh data
        const updates = response.products.map((product) => ({
          product_id: product.id,
          product_name: product.name,
          stock_quantity: product.stock_quantity,
          _lastSync: Date.now(),
          _pendingSync: false,
          _changeQueue: [],
        }));

        await dbOperations.putAll("offline_inventory", updates);
        await loadInventoryCache();

        toast.success(`Refreshed ${updates.length} products`);
        setLastSyncTime(Date.now());
      }
    } catch (error) {
      console.error("[OfflineInventory] Failed to refresh cache:", error);
      toast.error("Failed to refresh inventory cache");
    }
  };

  // Auto-sync on network reconnection
  useEffect(() => {
    const handleOnline = () => {
      setTimeout(() => {
        syncInventory();
      }, 2000);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncInventory]);

  return {
    inventoryCache,
    syncStatus,
    conflicts,
    lastSyncTime,
    getStockLevel,
    reduceStock,
    syncInventory,
    resolveConflict,
    refreshInventoryCache,
    hasConflicts: conflicts.length > 0,
  };
};
