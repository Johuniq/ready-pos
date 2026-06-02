import React, { useState, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  sessionAtom,
  settingsAtom,
  heldOrdersCountAtom,
  cartAtom,
  customerAtom,
  cartDiscountAmountAtom,
  cartTaxAmountAtom,
  cartSubtotalAtom,
  cartTotalAtom,
  cartCouponsAtom,
} from "@/admin/stores/posStore";
import { api } from "@/lib/api";
import POSHeader from "./components/POSHeader";
import ProductGrid from "./components/ProductGrid";
import CartPanel from "./components/CartPanel";
import CartTabs from "./components/CartTabs";
import PaymentModal from "./components/PaymentModal";
import HeldCartsModal from "./components/HeldCartsModal";
import RegisterSessionModal from "./components/RegisterSessionModal";
import ShiftTrackerModal from "./components/ShiftTrackerModal";
import CashierLoginPanel from "./components/CashierLoginPanel";
import { useCart } from "@/admin/hooks/useCart";
import { dbOperations } from "@/admin/lib/db";
import { toast } from "sonner";
import { ErrorState } from "@/components/error/ErrorState";
import { TerminalSkeleton } from "@/components/loading/TerminalSkeleton";
import { handleError } from "@/lib/errorHandler";

export default function Terminal() {
  const [session, setSession] = useAtom(sessionAtom);
  const setSettings = useSetAtom(settingsAtom);
  const setHeldCount = useSetAtom(heldOrdersCountAtom);
  const { addToCart } = useCart();

  // Cashier PIN login state.
  // If the current WP user is a cashier (not admin/manager), they must
  // authenticate via PIN before accessing the terminal.
  const [cashierAuthenticated, setCashierAuthenticated] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  const currentUserRoles =
    typeof readyPosAdmin !== "undefined"
      ? readyPosAdmin.userInfo?.roles || []
      : [];
  const isCashierRole = currentUserRoles.includes("pos_cashier");
  const isManagerOrAdmin =
    currentUserRoles.includes("administrator") ||
    currentUserRoles.includes("shop_manager") ||
    currentUserRoles.includes("pos_manager");

  // Managers/admins can optionally skip PIN login; cashiers must always PIN in.
  const requiresPinLogin =
    isCashierRole || (!isManagerOrAdmin && !cashierAuthenticated);
  const showLoginPanel =
    !cashierAuthenticated && (isCashierRole || !isManagerOrAdmin);

  const handleCashierLogin = (user, nonce, license) => {
    setCashierAuthenticated(true);
    setAuthenticatedUser(user);
    // Update the REST nonce for subsequent API calls under this user's session.
    if (typeof readyPosAdmin !== "undefined" && nonce) {
      readyPosAdmin.restNonce = nonce;
      readyPosAdmin.userInfo = {
        ...readyPosAdmin.userInfo,
        username: user.name,
        roles: user.roles,
      };
      // Update license data to ensure cashiers see the correct Pro status
      if (license) {
        readyPosAdmin.license = license;
      }
    }
  };

  const handleSkipLogin = () => {
    setCashierAuthenticated(true);
  };

  const handleLogout = () => {
    // Clear authentication state
    setCashierAuthenticated(false);
    setAuthenticatedUser(null);
    
    // Redirect to WordPress logout
    window.location.href = typeof readyPosAdmin !== "undefined" 
      ? readyPosAdmin.logoutUrl || "/wp-login.php?action=logout"
      : "/wp-login.php?action=logout";
  };

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
      // 1. Fetch settings (currency, tax, etc.)
      const settingsData = await api.get("/settings/get");
      if (settingsData) {
        setSettings(settingsData);
      }

      // 2. Fetch active session
      const sessionData = await api.get("/sessions/current");
      setSession(sessionData || { has_active: false, session: null });

      // 2.5 Fetch active shift
      const shiftData = await api.get("/shifts/current");
      const hasShift = shiftData && shiftData.has_active;
      if (hasShift) {
        setActiveShift(shiftData.shift);
      } else {
        setActiveShift(null);
        setShowShiftModal(true);
      }

      // 3. Fetch held count
      const heldData = await api.get("/orders/held");
      setHeldCount(heldData?.length || 0);

      // 4. Force session modal open if there's no active session AND shift is clocked in
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

  // Sequential lock: force register session open once cashier is clocked in
  useEffect(() => {
    if (!initializing && activeShift && (!session || !session.has_active)) {
      setSessionModalMode("open");
      setShowSessionModal(true);
    }
  }, [activeShift, session?.has_active, initializing]);

  // Handle session button click in Header
  const handleOpenCloseSession = () => {
    if (session.has_active) {
      setSessionModalMode("close");
    } else {
      setSessionModalMode("open");
    }
    setShowSessionModal(true);
  };

  // Show the PIN login panel for cashiers (or when not yet authenticated).
  // NOTE: The BroadcastChannel useEffect above still runs even when this
  // returns early, because React hooks execute before the return statement.
  if (showLoginPanel) {
    return (
      <CashierLoginPanel
        onLogin={handleCashierLogin}
        onSkip={handleSkipLogin}
        onLogout={handleLogout}
      />
    );
  }

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
