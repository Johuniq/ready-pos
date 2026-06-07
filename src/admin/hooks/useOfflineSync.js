import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { dbOperations } from "../lib/db";

/**
 * Advanced offline sync hook with conflict resolution.
 *
 * Features:
 * - Saves orders to IndexedDB when offline
 * - Auto-syncs when connection returns
 * - Retry with exponential backoff on transient failures
 * - Conflict detection (duplicate order prevention via idempotency keys)
 * - Sync status tracking (pending, syncing, failed, resolved)
 * - Manual retry for permanently failed orders
 */

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

// Conflict resolution strategies
const CONFLICT_STRATEGIES = {
  SKIP: "skip", // Server already has this order, skip it
  RETRY: "retry", // Transient error, retry later
  FAIL: "fail", // Permanent failure, mark for manual review
};

function getRetryDelay(attempt) {
  // Exponential backoff with jitter: 2s, 4s, 8s, 16s, 32s + random jitter
  return Math.min(
    BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000,
    60000,
  );
}

function classifyError(error) {
  const msg = (error?.message || "").toLowerCase();
  const status = error?.status || 0;

  // Duplicate / already exists → skip (conflict resolved)
  if (
    msg.includes("duplicate") ||
    msg.includes("already exists") ||
    status === 409
  ) {
    return CONFLICT_STRATEGIES.SKIP;
  }

  // Auth errors or validation → permanent failure
  if (status === 401 || status === 403 || status === 400 || status === 422) {
    return CONFLICT_STRATEGIES.FAIL;
  }

  // Server errors or network issues → retry
  if (
    status >= 500 ||
    status === 0 ||
    msg.includes("network") ||
    msg.includes("fetch")
  ) {
    return CONFLICT_STRATEGIES.RETRY;
  }

  // Default: retry
  return CONFLICT_STRATEGIES.RETRY;
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncingCount, setSyncingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLockRef = useRef(false);

  // Update counts from IndexedDB
  const updateCounts = useCallback(async () => {
    try {
      const allOrders = await dbOperations.getAll("offline_orders");
      const pending = allOrders.filter(
        (o) => !o._syncStatus || o._syncStatus === "pending",
      );
      const failed = allOrders.filter((o) => o._syncStatus === "failed");
      setPendingCount(pending.length);
      setFailedCount(failed.length);
    } catch (error) {
      
    }
  }, []);

  // Save order offline with idempotency key
  const saveOfflineOrder = async (orderData) => {
    const idempotencyKey = `pos_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;
    const offlineOrder = {
      localId: idempotencyKey,
      ...orderData,
      _idempotencyKey: idempotencyKey,
      _syncStatus: "pending",
      _retryCount: 0,
      _lastError: null,
      _createdAt: new Date().toISOString(),
      isOffline: true,
    };

    try {
      await dbOperations.put("offline_orders", offlineOrder);
      await updateCounts();
      toast.success("Order saved locally (Offline Mode)", {
        description: "Will sync automatically when connection returns.",
      });
      return offlineOrder;
    } catch (error) {
      
      toast.error("Failed to save order locally.");
      throw error;
    }
  };

  // Sync a single order with conflict resolution
  const syncSingleOrder = async (offlineOrder) => {
    const {
      localId,
      isOffline,
      _idempotencyKey,
      _syncStatus,
      _retryCount,
      _lastError,
      _createdAt,
      ...wcOrderData
    } = offlineOrder;

    try {
      // Include idempotency key so server can detect duplicates
      const response = await api.post("/orders/create", {
        ...wcOrderData,
        _idempotencyKey,
      });

      if (response.success) {
        // Successfully synced — remove from local store
        await dbOperations.delete("offline_orders", localId);
        return { success: true, orderId: response.order_id };
      } else {
        throw new Error(response.message || "Server rejected the order");
      }
    } catch (error) {
      const strategy = classifyError(error);

      if (strategy === CONFLICT_STRATEGIES.SKIP) {
        // Server already has this order (duplicate) — remove locally
        await dbOperations.delete("offline_orders", localId);
        return { success: true, skipped: true };
      }

      if (strategy === CONFLICT_STRATEGIES.FAIL) {
        // Permanent failure — mark for manual review
        offlineOrder._syncStatus = "failed";
        offlineOrder._lastError = error.message || "Permanent failure";
        offlineOrder._retryCount += 1;
        await dbOperations.put("offline_orders", offlineOrder);
        return { success: false, permanent: true, error: error.message };
      }

      // Transient failure — increment retry count
      offlineOrder._retryCount += 1;
      offlineOrder._lastError = error.message || "Transient error";

      if (offlineOrder._retryCount >= MAX_RETRIES) {
        offlineOrder._syncStatus = "failed";
      } else {
        offlineOrder._syncStatus = "pending";
      }

      await dbOperations.put("offline_orders", offlineOrder);
      return { success: false, permanent: false, error: error.message };
    }
  };

  // Sync all pending offline orders
  const syncOfflineOrders = useCallback(async () => {
    if (!navigator.onLine || syncLockRef.current) return;

    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const allOrders = await dbOperations.getAll("offline_orders");
      const pendingOrders = allOrders.filter(
        (o) => !o._syncStatus || o._syncStatus === "pending",
      );

      if (pendingOrders.length === 0) {
        syncLockRef.current = false;
        setIsSyncing(false);
        return;
      }

      setSyncingCount(pendingOrders.length);
      toast.info(
        `Syncing ${pendingOrders.length} offline order${
          pendingOrders.length > 1 ? "s" : ""
        }...`,
      );

      let synced = 0;
      let failed = 0;
      let skipped = 0;

      for (const order of pendingOrders) {
        // Respect retry delay based on attempt count
        if (order._retryCount > 0) {
          const delay = getRetryDelay(order._retryCount - 1);
          const timeSinceLastAttempt =
            Date.now() - new Date(order._createdAt).getTime();
          if (timeSinceLastAttempt < delay) {
            continue; // Skip this one for now, not ready for retry
          }
        }

        const result = await syncSingleOrder(order);

        if (result.success) {
          if (result.skipped) {
            skipped++;
          } else {
            synced++;
          }
        } else {
          failed++;
        }
      }

      await updateCounts();
      setSyncingCount(0);

      // Summary notification
      const parts = [];
      if (synced > 0) parts.push(`${synced} synced`);
      if (skipped > 0) parts.push(`${skipped} duplicates resolved`);
      if (failed > 0) parts.push(`${failed} failed`);

      if (synced > 0 || skipped > 0) {
        toast.success(`Offline sync complete: ${parts.join(", ")}`);
      } else if (failed > 0) {
        toast.warning(`Sync issues: ${parts.join(", ")}. Check failed orders.`);
      }
    } catch (error) {
      
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
    }
  }, [updateCounts]);

  // Retry a specific failed order manually
  const retryFailedOrder = async (localId) => {
    try {
      const order = await dbOperations.get("offline_orders", localId);
      if (!order) {
        toast.error("Order not found");
        return;
      }

      // Reset status for retry
      order._syncStatus = "pending";
      order._retryCount = 0;
      await dbOperations.put("offline_orders", order);
      await updateCounts();

      // Attempt immediate sync
      if (navigator.onLine) {
        const result = await syncSingleOrder(order);
        await updateCounts();
        if (result.success) {
          toast.success("Order synced successfully!");
        } else {
          toast.error(result.error || "Retry failed");
        }
      } else {
        toast.info("Order queued for sync when connection returns.");
      }
    } catch (error) {
      toast.error("Failed to retry order");
    }
  };

  // Discard a permanently failed order
  const discardFailedOrder = async (localId) => {
    try {
      await dbOperations.delete("offline_orders", localId);
      await updateCounts();
      toast.info("Failed order discarded.");
    } catch (error) {
      toast.error("Failed to discard order");
    }
  };

  // Get all failed orders for manual review
  const getFailedOrders = async () => {
    try {
      const allOrders = await dbOperations.getAll("offline_orders");
      return allOrders.filter((o) => o._syncStatus === "failed");
    } catch {
      return [];
    }
  };

  useEffect(() => {
    updateCounts();

    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Connection restored. Syncing offline data...");
      // Small delay to let network stabilize
      setTimeout(() => syncOfflineOrders(), 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Network lost. POS running in Offline Mode.", {
        description:
          "All transactions will be saved locally and synced when connection returns.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync if online
    if (navigator.onLine) {
      syncOfflineOrders();
    }

    // Periodic sync check every 30 seconds
    const interval = setInterval(() => {
      if (navigator.onLine && !syncLockRef.current) {
        syncOfflineOrders();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [syncOfflineOrders, updateCounts]);

  return {
    isOnline,
    pendingCount,
    failedCount,
    syncingCount,
    isSyncing,
    saveOfflineOrder,
    syncOfflineOrders,
    retryFailedOrder,
    discardFailedOrder,
    getFailedOrders,
    updateCounts,
  };
};
