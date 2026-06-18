import { useCart } from "@/admin/hooks/useCart";
import {
    cartAtom,
    cartCouponsAtom,
    cartDiscountAmountAtom,
    cartSubtotalAtom,
    cartTaxAmountAtom,
    cartTotalAtom,
    customerAtom,
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
import PaymentModal from "./components/PaymentModal";
import POSHeader from "./components/POSHeader";
import ProductGrid from "./components/ProductGrid";
import RegisterSessionModal from "./components/RegisterSessionModal";

export default function Terminal() {
  const [session, setSession] = useAtom(sessionAtom);
  const setSettings = useSetAtom(settingsAtom);
  const { addToCart, cart } = useCart();

  // Modal Visibility States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionModalMode, setSessionModalMode] = useState("open"); // "open" or "close"

  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

  const initializePOS = async () => {
    setInitializing(true);
    setInitError(null);
    try {
      // Fetch settings and session concurrently to optimize POS initialization
      const [settingsData, sessionData] = await Promise.all([
        api.get("/settings/get"),
        api.get("/sessions/current"),
      ]);

      if (settingsData) {
        setSettings(settingsData);
      }

      setSession(sessionData || { has_active: false, session: null });

      // Force session modal open if there's no active session
      if (!sessionData || !sessionData.has_active) {
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

  // Load initial settings and check session status
  useEffect(() => {
    initializePOS();
  }, [setSession, setSettings]);

  // Refresh settings when another tab signals an update, or when the
  // window regains focus. Ensures settings are always in sync.
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

    // Throttle focus/visibility re-fetches to at most once per 5 minutes
    let lastFetchAt = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;

    const throttledRefetch = () => {
      if (Date.now() - lastFetchAt < FIVE_MIN) return;
      lastFetchAt = Date.now();
      api
        .get("/settings/get")
        .then((data) => data && setSettings(data))
        .catch(() => {});
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", throttledRefetch);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") throttledRefetch();
    });

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch (e) {
          /* ignore */
        }
      }
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", throttledRefetch);
    };
  }, [setSettings]);

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
        if (showSessionModal) {
          setShowSessionModal(false);
          return;
        }

        // Let other components handle Escape (e.g. product variation dialog)
        const ev = new KeyboardEvent("keydown", { key: "Escape" });
        document.dispatchEvent(ev);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPaymentModal, showSessionModal, cart]);

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
          />
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
      />

      <RegisterSessionModal
        open={showSessionModal}
        onOpenChange={setShowSessionModal}
        mode={sessionModalMode}
      />
    </div>
  );
}
