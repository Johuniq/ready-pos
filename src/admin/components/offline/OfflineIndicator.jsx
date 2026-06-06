import { useState, useEffect } from "react";
import { useOfflineSync } from "@/admin/hooks/useOfflineSync";
import { useOfflineInventory } from "@/admin/hooks/useOfflineInventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { SyncDashboard } from "./SyncDashboard";

/**
 * Offline Status Indicator
 *
 * A compact, always-visible indicator showing:
 * - Online/offline status
 * - Pending operations count
 * - Failed operations alert
 * - Quick access to sync dashboard
 *
 * This gives merchants constant visibility into offline mode status.
 */

export function OfflineIndicator() {
  const {
    isOnline,
    pendingCount,
    failedCount,
    isSyncing,
    syncOfflineOrders,
  } = useOfflineSync();

  const { conflicts } = useOfflineInventory();

  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const totalIssues = pendingCount + failedCount + conflicts.length;
  const hasIssues = totalIssues > 0;

  // Auto-close popover after a few seconds
  useEffect(() => {
    if (popoverOpen && isOnline && !hasIssues) {
      const timer = setTimeout(() => {
        setPopoverOpen(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [popoverOpen, isOnline, hasIssues]);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={!isOnline || hasIssues ? "default" : "ghost"}
            size="sm"
            className={`gap-2 ${
              !isOnline
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : hasIssues
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : ""
            }`}>
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold">
              {isOnline ? "Online" : "Offline"}
            </span>
            {hasIssues && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-xs bg-white/20">
                {totalIssues}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-4 space-y-3">
            {/* Status Header */}
            <div className="flex items-start gap-3">
              {isOnline ? (
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Wifi className="w-5 h-5 text-emerald-500" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <WifiOff className="w-5 h-5 text-orange-500" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  {isOnline ? "System Online" : "Offline Mode Active"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isOnline
                    ? "All operations synced with server"
                    : "Operations saved locally for sync"}
                </p>
              </div>
            </div>

            {/* Status Breakdown */}
            {hasIssues && (
              <div className="space-y-2 pt-2 border-t">
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground">
                      {pendingCount} pending order{pendingCount !== 1 ? "s" : ""}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {pendingCount}
                    </Badge>
                  </div>
                )}

                {failedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span className="text-muted-foreground">
                      {failedCount} failed order{failedCount !== 1 ? "s" : ""}
                    </span>
                    <Badge variant="destructive" className="ml-auto text-xs">
                      {failedCount}
                    </Badge>
                  </div>
                )}

                {conflicts.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-muted-foreground">
                      {conflicts.length} inventory conflict
                      {conflicts.length !== 1 ? "s" : ""}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs bg-amber-500/20 text-amber-700 border-amber-500/30">
                      {conflicts.length}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Success State */}
            {isOnline && !hasIssues && (
              <div className="flex items-center gap-2 text-sm pt-2 border-t text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>All operations synced</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPopoverOpen(false);
                  setDashboardOpen(true);
                }}
                className="flex-1">
                View Details
              </Button>
              {isOnline && hasIssues && (
                <Button
                  size="sm"
                  onClick={() => {
                    syncOfflineOrders();
                    setPopoverOpen(false);
                  }}
                  disabled={isSyncing}
                  className="flex-1 gap-1.5">
                  {isSyncing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Sync Now
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <SyncDashboard open={dashboardOpen} onOpenChange={setDashboardOpen} />
    </>
  );
}
