import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { sessionAtom, settingsAtom } from "@/admin/stores/posStore";
import {
  LayoutDashboard,
  LogOut,
  Clock,
  Layers,
  Moon,
  Sun,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";
import CashAdjustModal from "./CashAdjustModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { useOfflineSync } from "@/admin/hooks/useOfflineSync";
import { useHardware } from "@/admin/hooks/useHardware";
import { useLicense } from "@/admin/hooks/useLicense";
import { useAlert } from "@/components/ui/alert-provider";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Printer,
  ScanBarcode,
  Crown,
  Monitor,
} from "lucide-react";
import { CustomerDisplayGuide, useCustomerDisplayGuide } from "./CustomerDisplayGuide";

export default function POSHeader({
  onOpenCloseSession,
  onOpenHeldCarts,
  onOpenShiftTracker,
  activeShift,
}) {
  const { showConfirm } = useAlert();
  const [session, setSession] = useAtom(sessionAtom);
  const [settings] = useAtom(settingsAtom);
  const { theme, setTheme } = useTheme();
  const [time, setTime] = useState(new Date());
  const {
    isOnline,
    pendingCount,
    failedCount,
    syncOfflineOrders,
    getFailedOrders,
    retryFailedOrder,
    discardFailedOrder,
  } = useOfflineSync();
  const hw = useHardware();
  const license = useLicense();
  const [cashAdjustOpen, setCashAdjustOpen] = useState(false);
  const [failedOrdersOpen, setFailedOrdersOpen] = useState(false);
  const [failedOrders, setFailedOrders] = useState([]);
  const { showGuide, setShowGuide, checkAndShowGuide } = useCustomerDisplayGuide();

  const handleOpenFailedOrders = async () => {
    const orders = await getFailedOrders();
    setFailedOrders(orders);
    setFailedOrdersOpen(true);
  };

  const refreshFailedList = async () => {
    const orders = await getFailedOrders();
    setFailedOrders(orders);
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCloseRegister = async () => {
    if (!session.has_active) return;
    onOpenCloseSession();
  };

  const userName =
    typeof readypos_admin !== "undefined"
      ? readypos_admin.userInfo.username
      : "Cashier";
  const userRole =
    typeof readypos_admin !== "undefined"
      ? readypos_admin.userInfo.roles.join(", ")
      : "Staff";

  const handleOpenCustomerDisplay = () => {
    // Check if user needs to see the guide first
    const needsGuide = checkAndShowGuide();
    if (needsGuide) {
      return; // Guide modal will show, user clicks "Got It" to proceed
    }

    // Open customer display in a new window (for second monitor)
    openCustomerDisplayWindow();
  };

  const openCustomerDisplayWindow = () => {
    const width = 1920;
    const height = 1080;
    const left = window.screen.width - width;
    const top = 0;
    
    const customerDisplayWindow = window.open(
      `#/customer-display`,
      "CustomerDisplay",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    if (customerDisplayWindow) {
      customerDisplayWindow.focus();
    } else {
      toast.error("Please allow pop-ups to open customer display");
    }
  };

  return (
    <header className="h-16 border-b bg-card text-card-foreground flex items-center justify-between gap-4 px-4 lg:px-6 shadow-sm select-none">
      {/* ==================================================
                 LEFT — Branding + Register status + Clock
                 ================================================== */}
      <div className="flex items-center gap-3 min-w-0">
        <a
          href="#/dashboard"
          className="flex items-center gap-2 font-bold text-base text-primary shrink-0">
          <img 
            src={typeof readypos_admin !== 'undefined' ? `${readypos_admin.pluginUrl}/assets/images/pos.png` : '/wp-content/plugins/ready-pos/assets/images/pos.png'}
            alt="Ready POS"
            className="w-7 h-7 object-contain"
          />
          <span className="hidden sm:inline">Ready POS</span>
        </a>

        <span className="h-6 w-px bg-border shrink-0" />

        {/* Register status pill */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground whitespace-nowrap">
            {session.has_active ? "Register 1" : "Register Closed"}
          </span>
          {session.has_active && (
            <span className="bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Open
            </span>
          )}
        </div>

        {/* Live clock — compact, single block */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
          <span className="tabular-nums">{time.toLocaleDateString()}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="tabular-nums">
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* ==================================================
                 RIGHT — System status, Quick actions, User
                 ================================================== */}
      <div className="flex items-center gap-2">
        {/* === Status indicator group (icon-only pills) === */}
        <div className="flex items-center gap-1">
          {/* Connection */}
          {isOnline ? (
            <div
              title="Online"
              className="flex items-center justify-center w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-full">
              <Wifi className="w-3.5 h-3.5" />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={syncOfflineOrders}
              title="Offline — click to sync manually"
              className="flex items-center justify-center gap-1 min-w-8 h-8 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-full animate-pulse transition-all">
              <WifiOff className="w-3.5 h-3.5" />
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold">{pendingCount}</span>
              )}
            </Button>
          )}

          {/* Failed orders */}
          {failedCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenFailedOrders}
              title="Review failed offline orders"
              className="flex items-center justify-center gap-1 min-w-8 h-8 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-full animate-pulse transition-all">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">{failedCount}</span>
            </Button>
          )}

          {/* Hardware status */}
          {hw.printerConnected && (
            <div
              title="Thermal printer connected"
              className="flex items-center justify-center w-8 h-8 bg-blue-500/10 text-blue-600 rounded-full">
              <Printer className="w-3.5 h-3.5" />
            </div>
          )}
          {hw.scannerConnected && (
            <div
              title={`Scanner connected (${hw.scannerMode})`}
              className="flex items-center justify-center w-8 h-8 bg-purple-500/10 text-purple-600 rounded-full">
              <ScanBarcode className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* === Drawer info (only when register is open) === */}
        {session.has_active && (
          <>
            <span className="h-6 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCashAdjustOpen(true)}
              className="h-9 gap-1.5 border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs px-3"
              title="Manage petty cash drawer adjustments">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="tabular-nums">
                {formatPrice(
                  (parseFloat(session.session?.opening_cash) || 0) +
                    (parseFloat(session.session?.cash_total) || 0),
                )}
              </span>
            </Button>

            {hw.printerConnected && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  try {
                    await hw.openDrawer();
                    toast.success("Drawer opened");
                  } catch (err) {
                    toast.error(err.message || "Failed to open drawer");
                  }
                }}
                className="h-9 w-9"
                title="Open cash drawer">
                <Wallet className="w-4 h-4 text-emerald-500" />
              </Button>
            )}
          </>
        )}

        {/* === Quick action group (segmented buttons) === */}
        <span className="h-6 w-px bg-border" />
        <div className="flex items-center bg-muted/40 rounded-lg p-0.5 gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenCustomerDisplay}
            className="h-8 gap-1.5 text-xs font-semibold hover:bg-background"
            title="Open Customer Display (Second Screen)">
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Display</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenHeldCarts}
            className="h-8 gap-1.5 text-xs font-semibold hover:bg-background">
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Held</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenShiftTracker}
            className="h-8 gap-1.5 text-xs font-semibold hover:bg-background"
            title={
              activeShift ? "View Shift Tracker / Clock Out" : "Clock In Shift"
            }>
            <Clock
              className={`w-3.5 h-3.5 ${
                activeShift ? "text-amber-500" : "text-muted-foreground"
              }`}
            />
            <span className="hidden xl:inline">
              {activeShift ? "Shift" : "Off"}
            </span>
            {activeShift && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </Button>
        </div>

        {/* === Theme + User + Register controls === */}
        <span className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 rounded-full"
          title="Toggle theme">
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        <div className="hidden md:flex items-center gap-3">
          <div className="text-right max-w-[120px]">
            <div className="text-xs font-bold text-foreground truncate">
              {userName}
            </div>
            <div className="text-[10px] text-muted-foreground capitalize truncate">
              {userRole}
            </div>
          </div>
        </div>

        {session.has_active ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCloseRegister}
            className="h-9 gap-1.5 font-bold text-xs">
            <LogOut className="w-3.5 h-3.5" />
            <span>Close Register</span>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={onOpenCloseSession}
            className="h-9 font-bold text-xs">
            Open Register
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => (window.location.href = "#/dashboard")}
          className="h-9 w-9"
          title="Exit to Dashboard">
          <LayoutDashboard className="w-4.5 h-4.5 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>

      <CashAdjustModal open={cashAdjustOpen} onOpenChange={setCashAdjustOpen} />

      {/* Customer Display Setup Guide */}
      <CustomerDisplayGuide 
        open={showGuide} 
        onOpenChange={(open) => {
          setShowGuide(open);
          // If guide is being closed and user clicked "Got It", open the display
          if (!open && !localStorage.getItem("readypos_cfd_guide_seen")) {
            // User cancelled, don't open
          } else if (!open && localStorage.getItem("readypos_cfd_guide_seen")) {
            // User clicked "Got It", open display
            setTimeout(openCustomerDisplayWindow, 100);
          }
        }} 
      />

      {/* Failed Offline Orders Modal */}
      <Dialog open={failedOrdersOpen} onOpenChange={setFailedOrdersOpen}>
        <DialogContent className="max-w-2xl rounded-xl select-none max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Failed Offline Orders ({failedOrders.length})</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              These orders couldn't be synced to the server after multiple
              attempts. Review the error, retry manually, or discard.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {failedOrders.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <span className="text-xs font-semibold">No failed orders</span>
              </div>
            ) : (
              failedOrders.map((order) => (
                <div
                  key={order.localId}
                  className="border border-rose-500/20 bg-rose-500/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">
                        Order {order.localId.replace(/^pos_/, "")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(order._createdAt).toLocaleString()} ·{" "}
                        {order.items?.length || 0} items · Tries:{" "}
                        {order._retryCount}
                      </div>
                      {order._lastError && (
                        <div className="text-[10px] text-rose-600 font-mono bg-rose-500/10 rounded px-2 py-1 mt-1 break-words">
                          {order._lastError}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await retryFailedOrder(order.localId);
                          refreshFailedList();
                        }}
                        className="h-7 text-[10px] font-bold gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const confirmed = await showConfirm(
                            "Discard this order? This cannot be undone.",
                            "Discard Order"
                          );
                          if (confirmed) {
                            await discardFailedOrder(order.localId);
                            refreshFailedList();
                          }
                        }}
                        className="h-7 text-[10px] font-bold gap-1 text-rose-500 hover:bg-rose-500/10">
                        <Trash2 className="w-3 h-3" />
                        Discard
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFailedOrdersOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
