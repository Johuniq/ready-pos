import { useCart } from "@/admin/hooks/useCart";
import { useMultiCart } from "@/admin/hooks/useMultiCart";
import { useRealtime } from "@/admin/hooks/useRealtime";
import {
    cartTotalAtom,
    sessionAtom,
    settingsAtom,
} from "@/admin/stores/posStore";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { isPaymentMethodEnabled } from "@/lib/paymentMethods";
import { useAtom } from "jotai";
import {
    Banknote,
    Check,
    CreditCard,
    Delete,
    Gift,
    Loader2,
    Plus,
    Split,
    Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Quick add chips — tap to add to current cash tendered amount
const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 200];

export default function PaymentModal({ open, onOpenChange }) {

  const [session] = useAtom(sessionAtom);
  const [settings] = useAtom(settingsAtom);
  const [total] = useAtom(cartTotalAtom);
  const { cart, customer, discount, notes, shipping, clearCart } = useCart();
  const { broadcastOrderCreated, broadcastStockChanged } = useRealtime();
  const [, setSession] = useAtom(sessionAtom);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [cardRef, setCardRef] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset fields when modal opens
  useEffect(() => {
    if (open) {
      // Single source of truth: payment methods are owned by global
      // Settings → Payments, and the server mirrors the same set onto the
      // outlet config so there is no per-outlet allow-list to consult. Use
      // the shared helper to read it the same way the cart and settings
      // pages do.
      const cashOk = isPaymentMethodEnabled(settings?.payment_cash);
      const cardOk = isPaymentMethodEnabled(settings?.payment_card);

      if (cashOk) {
        setPaymentMethod("cash");
      } else if (cardOk) {
        setPaymentMethod("card");
      }
      setCashReceived("");
      setCardRef("");
    }
  }, [open, session, settings]);

  // Focus sensible input when the modal opens for keyboard-first flow
  useEffect(() => {
    if (!open) return;
    const focusCash = () => {
      const el = document.getElementById("payment-cash-input");
      if (el) {
        el.focus();
        if (el.select) el.select();
      }
    };

    // Small timeout to allow dialog to render
    const t = setTimeout(() => {
      if (paymentMethod === "cash") focusCash();
    }, 60);

    return () => clearTimeout(t);
  }, [open, paymentMethod]);

  // Derived values
  const numTotal = parseFloat(total) || 0;
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeGiven = Math.max(0, numCashReceived - numTotal);
  const isAmountSufficient = numCashReceived >= numTotal;

  // Fast cash presets
  const getPresets = () => {
    const presets = [numTotal];
    const units = [5, 10, 20, 50, 100];
    units.forEach((unit) => {
      if (unit > numTotal && presets.length < 5) {
        presets.push(unit);
      }
    });
    // Make unique and sorted
    return Array.from(new Set(presets)).sort((a, b) => a - b);
  };

  const handleNumpadClick = (val) => {
    if (val === "C") {
      setCashReceived("");
    } else if (val === ".") {
      if (!cashReceived.includes(".")) {
        setCashReceived((prev) => (prev || "0") + ".");
      }
    } else {
      setCashReceived((prev) => prev + val);
    }
  };

  const handleBackspace = () => {
    setCashReceived((prev) => prev.slice(0, -1));
  };

  // Quick add: tap to add preset to current cash tendered (or set if empty)
  const handleQuickAmount = (preset) => {
    const current = parseFloat(cashReceived) || 0;
    const next = current + preset;
    setCashReceived(next.toFixed(2));
  };

  const { clearActiveAfterCheckout } = useMultiCart();

  /**
   * Print receipt using the browser print dialog.
   */
  const handlePrintReceipt = async (orderDetail) => {
    const { printReceipt } = await import("@/lib/receipt");
    await printReceipt(orderDetail, settings);
  };

  const handleCheckout = async (forcedCardRef = "") => {
    // Defense-in-depth: refuse to submit a method that the operator just
    // disabled in POS Settings while the modal was open. Payment methods
    // are owned by global settings (single source of truth — see
    // src/lib/paymentMethods.js).
    const cashOk = isPaymentMethodEnabled(settings?.payment_cash);
    const cardOk = isPaymentMethodEnabled(settings?.payment_card);
    if (paymentMethod === "cash" && !cashOk) {
      toast.error(
        "Cash payment is disabled in POS Settings → Payments. Enable it or switch to Card."
      );
      return;
    }
    if (paymentMethod === "card" && !cardOk) {
      toast.error(
        "Card payment is disabled in POS Settings → Payments. Enable it or switch to Cash."
      );
      return;
    }
    if (!cashOk && !cardOk) {
      toast.error(
        "No payment methods are enabled. Update POS Settings → Payments."
      );
      return;
    }

    if (paymentMethod === "cash" && !isAmountSufficient) {
      toast.error("Tendered cash is less than the total amount");
      return;
    }
    
    // For card payments without ref code, auto-generate one
    if (paymentMethod === "card" && !cardRef.trim() && !forcedCardRef) {
      const autoRef = `CARD-${Date.now().toString().slice(-8)}`;
      setCardRef(autoRef);
      toast.info("Auto-generated transaction reference");
    }

    setLoading(true);
    try {
      // Map items for API (id, quantity)
      const apiItems = cart.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      }));

      const activeCardRef =
        paymentMethod === "card"
          ? cardRef || forcedCardRef || `CARD-${Date.now().toString().slice(-8)}`
          : "";

      // Build payload
      let effectivePaymentMethod = paymentMethod;
      let cashPortion = paymentMethod === "cash" ? numCashReceived : 0;
      let changePortion = paymentMethod === "cash" ? changeGiven : 0;
      let splitBreakdown = null;

      const payload = {
        items: apiItems,
        customerId: customer?.id || null,
        paymentMethod: effectivePaymentMethod,
        cashReceived: cashPortion,
        changeGiven: changePortion,
        discountType: discount.type || null,
        discountValue: discount.value || 0,
        sessionId: session.session?.id || null,
        notes: notes || "",
        cardRef: activeCardRef,
        shipping: shipping.method
          ? {
              method_id: shipping.method.method_id || shipping.method.id,
              method_title: shipping.method.title,
              cost: shipping.cost,
              address: shipping.address,
            }
          : null,
      };

      // Online checkout
      const response = await api.post("/orders/create", payload);

      if (response.success) {
        toast.success("Transaction completed successfully!");

        // Broadcast to other terminals
        broadcastOrderCreated({
          id: response.order_id,
          order_number: response.order_number,
          total: formatPrice(numTotal),
          items: apiItems,
        });

        // Broadcast stock changes for each item
        apiItems.forEach((item) => {
          const cartItem = cart.find((c) => c.id === item.id);
          if (cartItem) {
            broadcastStockChanged(
              item.id,
              cartItem.name,
              null, // We don't have old stock here
              null, // Server will calculate
            );
          }
        });

        // Fetch full order details to print receipt properly
        try {
          const orderDetail = await api.get(
            `/orders/get/${response.order_id}`,
          );
          await handlePrintReceipt(orderDetail);
        } catch (receiptErr) {

          // Backup print structure
          await handlePrintReceipt({
            id: response.order_id,
            items: cart,
            subtotal: numTotal + (discount.value || 0),
            total: numTotal,
            discount: discount.value || 0,
            tax: 0,
            payment_method: paymentMethod,
            cash_received: payload.cashReceived,
            change_given: payload.changeGiven,
            notes: notes,
          });
        }

        clearCart();
        clearActiveAfterCheckout();
        onOpenChange(false);

        // Refetch the active session so the header badge
        // (opening_cash + cash_total) reflects the sale immediately.
        // The server's `Cache::invalidate('order', $id)` already
        // cascades to the 'sessions' group, so the next read returns
        // fresh data; we still append `_t` as defense-in-depth so the
        // md5 cache key always differs from the pre-sale read.
        try {
          const refreshedSession = await api.get(
            `/sessions/current?_t=${Date.now()}`,
          );
          if (refreshedSession) setSession(refreshedSession);
        } catch (refreshErr) {
          // Non-fatal: the header will self-heal within the 5s
          // group TTL or on the next focus event.
        }
      } else {
        toast.error("Checkout failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-xl p-0 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto select-none">
        {/* Left side: Order breakdown summary */}
        <div className="w-full md:w-80 border-r bg-muted/20 p-5 flex flex-col justify-between font-sans">
          <div>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Checkout Details
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground border-b pb-2">
                <span>Items in Cart</span>
                <span>{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-xs font-medium">
                    <span className="truncate max-w-[160px]">
                      {item.name}{" "}
                      <span className="text-muted-foreground text-[10px]">
                        x{item.quantity}
                      </span>
                    </span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4 space-y-2.5">
            {customer && (
              <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10 text-xs">
                <span className="font-bold block text-primary">
                  Customer Info
                </span>
                <span className="text-foreground font-semibold">
                  {customer.first_name} {customer.last_name || ""}
                </span>
                <span className="text-muted-foreground text-[10px] block mt-0.5">
                  {customer.phone || customer.email}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center font-bold text-sm text-foreground">
              <span>Total Due</span>
              <span className="text-lg text-primary font-black">
                {formatPrice(numTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Payment selection and calculator */}
        <div className="flex-1 p-6 flex flex-col justify-between font-sans">
          <div className="space-y-4">
            {/* Selector Tabs — segmented control style */}
            {(() => {
              // Payment methods are owned by global settings — single
              // source of truth (src/lib/paymentMethods.js). The server
              // mirrors that list onto the outlet config, so we don't
              // need a second per-outlet allow-list check here.
              const isCashEnabled = isPaymentMethodEnabled(settings?.payment_cash);
              const isCardEnabled = isPaymentMethodEnabled(settings?.payment_card);
              const columnsClass = isCashEnabled && isCardEnabled ? "grid-cols-2" : "grid-cols-1";
              const noMethodsEnabled = !isCashEnabled && !isCardEnabled;
              
              return (
                <div className={`grid ${columnsClass} gap-1.5 p-1 bg-muted/40 rounded-xl`}>
                  {isCashEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all ${
                        paymentMethod === "cash"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                      }`}>
                      <Banknote className="w-4 h-4" />
                      <span>Cash</span>
                    </button>
                  )}
                  {isCardEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all ${
                        paymentMethod === "card"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                      }`}>
                      <CreditCard className="w-4 h-4" />
                      <span>Card</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {(() => {
              // Single source of truth: global settings (Settings → Payments).
              const cashOk = isPaymentMethodEnabled(settings?.payment_cash);
              const cardOk = isPaymentMethodEnabled(settings?.payment_card);
              if (cashOk || cardOk) return null;
              return (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 p-3 text-xs font-medium leading-relaxed">
                  <p className="font-bold mb-1">No payment methods enabled</p>
                  <p>
                    Both Cash and Card are turned off in{" "}
                    <span className="font-semibold">POS Settings → Payments</span>{" "}
                    (or disabled for this outlet). Enable at least one method to
                    complete checkout.
                  </p>
                </div>
              );
            })()}

            {/* Payment Inputs */}
            {paymentMethod === "cash" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Input cash received */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Cash Tendered
                    </label>
                    <Input
                      type="number"
                      id="payment-cash-input"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                      className="h-11 font-extrabold text-base text-foreground"
                    />
                  </div>
                  {/* Change to give */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Change Due
                    </label>
                    <div className="h-11 border bg-muted/30 rounded-lg flex items-center px-3 font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                      {formatPrice(changeGiven)}
                    </div>
                  </div>
                </div>

                {/* Quick add chips — tap to add (5/10/20/50/100/200) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mr-1">
                    Quick Add
                  </span>
                  {QUICK_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickAmount(preset)}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border/70 bg-background hover:bg-primary/5 hover:border-primary/40 text-xs font-bold text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                      aria-label={`Add ${formatPrice(preset)} to cash tendered`}>
                      <Plus className="w-3 h-3 text-primary" />
                      <span>
                        {getCurrencySymbol()}
                        {preset}
                      </span>
                    </button>
                  ))}
                  {numCashReceived > 0 && (
                    <button
                      type="button"
                      onClick={() => setCashReceived("")}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border/70 bg-background hover:bg-destructive/5 hover:border-destructive/40 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30">
                      <Delete className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Presets & Touch Numpad */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Left: Presets */}
                  <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 md:justify-start">
                    {getPresets().map((preset, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => setCashReceived(preset.toFixed(2))}
                        className="h-10 text-xs font-bold shrink-0 min-w-16 rounded-lg">
                        {idx === 0 ? "Exact" : formatPrice(preset)}
                      </Button>
                    ))}
                  </div>

                  {/* Right: Keypad grid */}
                  <div className="grid grid-cols-3 gap-2 md:col-span-3">
                    {[
                      "7",
                      "8",
                      "9",
                      "4",
                      "5",
                      "6",
                      "1",
                      "2",
                      "3",
                      "0",
                      ".",
                    ].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant="secondary"
                        onClick={() => handleNumpadClick(num)}
                        className="h-11 text-sm font-bold rounded-lg">
                        {num}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleBackspace}
                      className="h-11 text-xs font-bold rounded-lg flex items-center justify-center">
                      <Delete className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="space-y-3.5 py-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Transaction Ref / Auth Code (Optional)
                  </label>
                  <Input
                    value={cardRef}
                    onChange={(e) => setCardRef(e.target.value)}
                    placeholder="Enter authorization code if available..."
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
                <div className="p-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium leading-normal space-y-2">
                  <p className="font-bold">Card Payment Options:</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    <li>Process payment on your external terminal</li>
                    <li>Enter auth code above (optional but recommended)</li>
                    <li>Or click "Complete Sale" to record payment without code</li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Auto-generate a reference code
                      const autoRef = `CARD-${Date.now().toString().slice(-8)}`;
                      setCardRef(autoRef);
                      toast.success("Auto-generated reference code");
                    }}
                    className="h-10 text-xs font-bold">
                    Generate Ref Code
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setCardRef("");
                    }}
                    className="h-10 text-xs font-bold">
                    Clear
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* Actions footer */}
          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button
              id="payment-cancel-btn"
              variant="outline"
              className="flex-1 h-11 rounded-xl font-bold"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              id="payment-complete-btn"
              disabled={
                loading ||
                (paymentMethod === "cash" && !isAmountSufficient) ||
                (() => {
                  // Single source of truth: global settings (Settings → Payments).
                  if (paymentMethod === "cash") return !isPaymentMethodEnabled(settings?.payment_cash);
                  if (paymentMethod === "card") return !isPaymentMethodEnabled(settings?.payment_card);
                  return true;
                })()
              }
              className="flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md bg-primary text-primary-foreground hover:bg-primary/95"
              onClick={async () => {
                handleCheckout();
              }}>
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4.5 h-4.5" />
                  <span>
                    {paymentMethod === "card"
                      ? "Complete Card Payment"
                      : "Complete Sale"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
