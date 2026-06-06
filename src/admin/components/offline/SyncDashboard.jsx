import { useEffect, useState } from "react";
import { useOfflineSync } from "@/admin/hooks/useOfflineSync";
import { useOfflineInventory } from "@/admin/hooks/useOfflineInventory";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Sync Dashboard Component
 *
 * Provides merchants with complete visibility into offline operations:
 * - Connection status and sync state
 * - Pending orders queue with details
 * - Failed orders requiring attention
 * - Inventory conflicts needing resolution
 * - Manual sync controls
 * - Sync history and statistics
 */

export function SyncDashboard({ open, onOpenChange }) {
  const {
    isOnline,
    pendingCount,
    failedCount,
    syncingCount,
    isSyncing,
    syncOfflineOrders,
    retryFailedOrder,
    discardFailedOrder,
    getFailedOrders,
  } = useOfflineSync();

  const {
    conflicts,
    syncStatus,
    lastSyncTime,
    syncInventory,
    resolveConflict,
    refreshInventoryCache,
  } = useOfflineInventory();

  const [failedOrders, setFailedOrders] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadFailedOrders();
    }
  }, [open, failedCount]);

  const loadFailedOrders = async () => {
    const orders = await getFailedOrders();
    setFailedOrders(orders);
  };

  const handleManualSync = async () => {
    toast.info("Starting manual sync...");
    await Promise.all([syncOfflineOrders(), syncInventory()]);
    await loadFailedOrders();
  };

  const handleRefreshCache = async () => {
    await refreshInventoryCache();
  };

  const handleResolveConflict = (conflict) => {
    setSelectedConflict(conflict);
    setConflictDialogOpen(true);
  };

  const applyConflictResolution = async (resolution) => {
    if (!selectedConflict) return;

    await resolveConflict(selectedConflict, resolution);
    setConflictDialogOpen(false);
    setSelectedConflict(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-emerald-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-orange-500" />
              )}
              Offline Sync Dashboard
            </DialogTitle>
            <DialogDescription>
              Monitor and manage offline operations, sync status, and resolve
              conflicts
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Status Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Connection Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {isOnline ? (
                        <Cloud className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <CloudOff className="w-4 h-4 text-orange-500" />
                      )}
                      Connection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isOnline ? (
                        <span className="text-emerald-600">Online</span>
                      ) : (
                        <span className="text-orange-600">Offline</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lastSyncTime
                        ? `Last sync ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`
                        : "Never synced"}
                    </p>
                  </CardContent>
                </Card>

                {/* Pending Orders */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Pending Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {pendingCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Waiting for sync
                    </p>
                  </CardContent>
                </Card>

                {/* Failed Orders */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      Failed Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-rose-600">
                      {failedCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Needs attention
                    </p>
                  </CardContent>
                </Card>

                {/* Inventory Conflicts */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Conflicts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">
                      {conflicts.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inventory conflicts
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Sync Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sync Controls</CardTitle>
                  <CardDescription>
                    Manually trigger sync operations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleManualSync}
                      disabled={!isOnline || isSyncing}
                      className="gap-2">
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Sync All Data
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRefreshCache}
                      disabled={!isOnline}>
                      <Cloud className="w-4 h-4 mr-2" />
                      Refresh Inventory Cache
                    </Button>
                    {syncingCount > 0 && (
                      <Badge variant="secondary" className="py-2 px-3">
                        <Loader2 className="w-3 h-3 animate-spin mr-2" />
                        Syncing {syncingCount} items...
                      </Badge>
                    )}
                    {syncStatus === "syncing" && (
                      <Badge variant="secondary" className="py-2 px-3">
                        <Loader2 className="w-3 h-3 animate-spin mr-2" />
                        Syncing inventory...
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Failed Orders List */}
              {failedOrders.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      Failed Orders ({failedOrders.length})
                    </CardTitle>
                    <CardDescription>
                      These orders failed to sync and require manual attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {failedOrders.map((order) => (
                          <div
                            key={order.localId}
                            className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold text-sm flex items-center gap-2">
                                  Order #{order.localId?.slice(0, 12)}...
                                  <Badge variant="destructive" className="text-xs">
                                    Failed
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {order.items?.length || 0} items •{" "}
                                  {formatPrice(
                                    order.items?.reduce(
                                      (sum, item) =>
                                        sum + (item.price || 0) * (item.quantity || 1),
                                      0,
                                    ) || 0,
                                  )}
                                </p>
                                {order._createdAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Created{" "}
                                    {formatDistanceToNow(
                                      new Date(order._createdAt),
                                      {
                                        addSuffix: true,
                                      },
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>

                            {order._lastError && (
                              <div className="bg-rose-500/10 text-rose-700 text-xs p-2 rounded border border-rose-500/20">
                                <strong>Error:</strong> {order._lastError}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => retryFailedOrder(order.localId)}
                                disabled={!isOnline}
                                className="gap-1.5">
                                <RefreshCw className="w-3 h-3" />
                                Retry
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => discardFailedOrder(order.localId)}
                                className="gap-1.5">
                                <XCircle className="w-3 h-3" />
                                Discard
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Inventory Conflicts */}
              {conflicts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Inventory Conflicts ({conflicts.length})
                    </CardTitle>
                    <CardDescription>
                      Local inventory changes conflict with server updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {conflicts.map((conflict) => (
                          <div
                            key={conflict.product_id}
                            className="border rounded-lg p-4 space-y-3">
                            <div>
                              <div className="font-semibold text-sm">
                                {conflict.product_name}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Product ID: {conflict.product_id}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Local Quantity
                                </div>
                                <div className="text-lg font-bold text-blue-600">
                                  {conflict.local_quantity}
                                </div>
                              </div>
                              <div className="bg-purple-500/10 p-3 rounded border border-purple-500/20">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Server Quantity
                                </div>
                                <div className="text-lg font-bold text-purple-600">
                                  {conflict.server_quantity}
                                </div>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveConflict(conflict)}
                              className="w-full">
                              Resolve Conflict
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Success State */}
              {pendingCount === 0 &&
                failedCount === 0 &&
                conflicts.length === 0 &&
                isOnline && (
                  <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="font-semibold text-lg">All Synced!</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          No pending operations or conflicts
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Inventory Conflict</DialogTitle>
            <DialogDescription>
              Choose which version to keep for{" "}
              {selectedConflict?.product_name || "this product"}
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    LOCAL VERSION
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {selectedConflict.local_quantity}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedConflict.local_changes?.length || 0} changes made
                    offline
                  </div>
                </div>
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    SERVER VERSION
                  </div>
                  <div className="text-3xl font-bold text-purple-600">
                    {selectedConflict.server_quantity}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Latest server value
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 p-3 rounded-lg text-sm text-amber-800 border border-amber-500/20">
                <strong>⚠ Warning:</strong> This will permanently apply the chosen
                version. Choose carefully.
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => applyConflictResolution("use_local")}
              className="flex-1">
              Use Local
            </Button>
            <Button
              variant="outline"
              onClick={() => applyConflictResolution("use_server")}
              className="flex-1">
              Use Server
            </Button>
            <Button
              variant="secondary"
              onClick={() => setConflictDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
