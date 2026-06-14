import { useCart } from "@/admin/hooks/useCart";
import {
    cartAtom,
    cartCouponsAtom,
    cartDiscountAmountAtom,
    cartSubtotalAtom,
    cartTaxAmountAtom,
    cartTotalAtom,
    customerAtom,
    heldOrdersCountAtom,
    sessionAtom,
    settingsAtom,
} from "@/admin/stores/posStore";
import { ErrorState } from "@/components/error/ErrorState";
import { TerminalSkeleton } from "@/components/loading/TerminalSkeleton";
import { api } from "@/lib/api";
import { handleError } from "@/lib/errorHandler";
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import CartPanel from "./components/CartPanel";
import CartTabs from "./components/CartTabs";
import HeldCartsModal from "./components/HeldCartsModal";
import PaymentModal from "./components/PaymentModal";
import POSHeader from "./components/POSHeader";
import ProductGrid from "./components/ProductGrid";
import RegisterSessionModal from "./components/RegisterSessionModal";
import ShiftTrackerModal from "./components/ShiftTrackerModal";

export default function Terminal() {
  const [session, setSession] = useAtom(sessionAtom);
  const setSettings = useSetAtom(settingsAtom);
  const setHeldCount = useSetAtom(heldOrdersCountAtom);
  const { addToCart } = useCart();

  // Read cart states to broadcast to customer-display
  const [cart] = useAtom(cartAtom);
  const [customer] = useAtom(customerAtom);
  const [discountAmount] = useAtom(cartDiscountAmountAtom);
  const [taxAmount] = useAtom(cartTaxAmountAtom);
  const [subtotal] = useAtom(cartSubtotalAtom);
  const [total] = useAtom(cartTotalAtom);
  const [coupons] = useAtom(cartCouponsAtom);
  const [settings] = useAtom(settingsAtom);

  // Sync state with Customer Display via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel("readypos_customer_display");

    const broadcastState = () => {
      channel.postMessage({
        type: "SYNC_STATE",
        data: {
          cart,
          customer,
          discountAmount,
          taxAmount,
          subtotal,
          total,
          coupons,
          settings,
        },
      });
    };

    // Broadcast current state on changes
    broadcastState();

    // Listen for REQUEST_STATE from new customer display windows
    const handleMessage = (event) => {
      if (event.data?.type === "REQUEST_STATE") {
        broadcastState();
      }
    };
    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [
    cart,
    customer,
    discountAmount,
    taxAmount,
    subtotal,
    total,
    coupons,
    settings,
  ]);

  // Modal Visibility States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [sessionModalMode, setSessionModalMode] = useState("open"); // "open" or "close"

  // Shift Tracking States
  const [activeShift, setActiveShift] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

  const initializePOS = async () => {
    setInitializing(true);
    setInitError(null);
    try {
      // Fetch settings, session, shift, and held orders concurrently to optimize POS initialization
      const [settingsData, sessionData, shiftData, heldData] = await Promise.all([
        api.get("/settings/get"),
        api.get("/sessions/current"),
        api.get("/shifts/current"),
        api.get("/orders/held"),
      ]);

      if (settingsData) {
        setSettings(settingsData);
      }

      setSession(sessionData || { has_active: false, session: null });

      const hasShift = shiftData && shiftData.has_active;
      if (hasShift) {
        setActiveShift(shiftData.shift);
      } else {
        setActiveShift(null);
        setShowShiftModal(true);
      }

      setHeldCount(heldData?.length || 0);

      // Force session modal open if there's no active session AND shift is clocked in
      if ((!sessionData || !sessionData.has_active) && hasShift) {
        setSessionModalMode("open");
        setShowSessionModal(true);
      }
    } catch (err) {
      const appError = handleError(err, {
        showToast: true,
        customMessage: "Failed to initialize POS terminal",
      });
      setInitError(appError);
    } finally {
      setInitializing(false);
    }
  };

  // Load initial settings and check shift & session status
  useEffect(() => {
    initializePOS();
  }, [setSession, setSettings, setHeldCount]);

  // Refresh settings when another tab signals an update, or when the
  // window regains focus. Ensures customer display message/promos and
  // other settings are always in sync.
  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel("readypos_settings");
      channel.onmessage = async (ev) => {
        if (ev?.data?.type === "SETTINGS_UPDATED") {
          try {
            const data = await api.get("/settings/get");
            if (data) setSettings(data);
          } catch (e) {
            /* ignore */
          }
        }
      };
    } catch (e) {
      /* BroadcastChannel not supported */
    }

    const onStorage = (ev) => {
      if (ev.key === "readypos_settings_updated") {
        api
          .get("/settings/get")
          .then((data) => data && setSettings(data))
          .catch(() => {});
      }
    };
    const onFocus = () => {
      api
        .get("/settings/get")
        .then((data) => data && setSettings(data))
        .catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        api
          .get("/settings/get")
          .then((data) => data && setSettings(data))
          .catch(() => {});
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch (e) {
          /* ignore */
        }
      }
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [setSettings]);

  // Sequential lock: force register session open once a shift is active
  useEffect(() => {
    if (!initializing && activeShift && (!session || !session.has_active)) {
      setSessionModalMode("open");
      setShowSessionModal(true);
    }
  }, [activeShift, session?.has_active, initializing]);

  // Global keyboard shortcuts for keyboard-first workflow:
  // F1 -> focus product search, F2 -> focus customer search,
  // F3 -> open payment, Enter -> complete (when payment open), Esc -> cancel/close
  useEffect(() => {
    const handler = (e) => {
      // Ignore when modifier keys are held
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // F1: focus product search
      if (e.key === "F1") {
        e.preventDefault();
        const prod = document.getElementById("search-input");
        if (prod) {
          prod.focus();
          if (prod.select) prod.select();
        }
        return;
      }

      // F2: focus customer search
      if (e.key === "F2") {
        e.preventDefault();
        const cust = document.getElementById("customer-search-input");
        if (cust) {
          cust.focus();
          if (cust.select) cust.select();
        }
        return;
      }

      // F3: open payment modal
      if (e.key === "F3") {
        e.preventDefault();
        if (!cart || cart.length === 0) {
          toast.info("Cart is empty");
          return;
        }
        setShowPaymentModal(true);
        return;
      }

      // Enter: when payment modal open, trigger complete action
      if (e.key === "Enter") {
        if (showPaymentModal) {
          e.preventDefault();
          const btn = document.getElementById("payment-complete-btn");
          if (btn) btn.click();
        }
        return;
      }

      // Escape: close active modals or forward Escape
      if (e.key === "Escape") {
        if (showPaymentModal) {
          setShowPaymentModal(false);
          return;
        }
        if (showHeldCartsModal) {
          setShowHeldCartsModal(false);
          return;
        }
        if (showSessionModal) {
          setShowSessionModal(false);
          return;
        }
        if (showShiftModal) {
          setShowShiftModal(false);
          return;
        }

        // Let other components handle Escape (e.g. product variation dialog)
        const ev = new KeyboardEvent("keydown", { key: "Escape" });
        document.dispatchEvent(ev);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPaymentModal, showHeldCartsModal, showSessionModal, showShiftModal, cart]);

  // Handle session button click in Header
  const handleOpenCloseSession = () => {
    if (session.has_active) {
      setSessionModalMode("close");
    } else {
      setSessionModalMode("open");
    }
    setShowSessionModal(true);
  };

  if (initializing) {
    return <TerminalSkeleton />;
  }

  if (initError) {
    return (
      <div className="w-screen h-screen bg-background">
        <ErrorState
          title="POS terminal could not start"
          message={initError.message}
          onRetry={initializePOS}
        />
      </div>
    );
  }

  return (
    <div className="readypos-app w-screen h-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <POSHeader
        onOpenCloseSession={handleOpenCloseSession}
        onOpenHeldCarts={() => setShowHeldCartsModal(true)}
        onOpenShiftTracker={() => setShowShiftModal(true)}
        activeShift={activeShift}
      />

      {/* Main Terminal Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Product Search & Grid Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">
          <ProductGrid />
        </div>

        {/* Cart & Customer Panel */}
        <div className="w-96 shrink-0 flex flex-col border-l border-border bg-card">
          <CartTabs />
          <CartPanel
            onOpenPayment={() => setShowPaymentModal(true)}
            onOpenHeldCarts={() => setShowHeldCartsModal(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
      />

      <HeldCartsModal
        open={showHeldCartsModal}
        onOpenChange={setShowHeldCartsModal}
      />

      <RegisterSessionModal
        open={showSessionModal}
        onOpenChange={setShowSessionModal}
        mode={sessionModalMode}
        onShiftChange={setActiveShift}
      />

      <ShiftTrackerModal
        open={showShiftModal}
        onOpenChange={setShowShiftModal}
        activeShift={activeShift}
        onShiftChange={setActiveShift}
        sessionId={session.session?.id}
      />
    </div>
  );
}
