import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import {
  sessionAtom,
  settingsAtom,
  cartTotalAtom,
} from "@/admin/stores/posStore";
import { useCart } from "@/admin/hooks/useCart";
import { api } from "@/lib/api";
import { printReceipt } from "@/lib/receipt";
import { formatPrice } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Banknote,
  Delete,
  Check,
  Sparkles,
  Loader2,
  Gift,
  Split,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useOfflineSync } from "@/admin/hooks/useOfflineSync";
import { useHardware } from "@/admin/hooks/useHardware";
import { useLicense } from "@/admin/hooks/useLicense";
import { useMultiCart } from "@/admin/hooks/useMultiCart";
import { ProBadge } from "@/admin/components/ProGate";
import EMVReaderPanel from "./EMVReaderPanel";

export default function PaymentModal({ open, onOpenChange }) {
  const [session] = useAtom(sessionAtom);
  const [settings] = useAtom(settingsAtom);
  const [total] = useAtom(cartTotalAtom);
  const { cart, customer, discount, notes, shipping, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [cardRef, setCardRef] = useState("");
  const [loading, setLoading] = useState(false);

  // Gift card / store credit states
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardInfo, setGiftCardInfo] = useState(null);
  const [giftCardChecking, setGiftCardChecking] = useState(false);

  // Split payment states - array of { method, amount, ref? }
  const [splitPayments, setSplitPayments] = useState([
    { method: "cash", amount: "", ref: "" },
  ]);

  // EMV reader states
  const [emvTransactionResult, setEmvTransactionResult] = useState(null);

  // Reset fields when modal opens
  useEffect(() => {
    if (open) {
      setPaymentMethod("cash");
      setCashReceived("");
      setCardRef("");
      setGiftCardCode("");
      setGiftCardInfo(null);
      setGiftCardChecking(false);
      setSplitPayments([{ method: "cash", amount: "", ref: "" }]);
      setEmvTransactionResult(null);
    }
  }, [open]);

  // Derived values
  const numTotal = parseFloat(total) || 0;
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeGiven = Math.max(0, numCashReceived - numTotal);
  const isAmountSufficient = numCashReceived >= numTotal;

  // Split payment derived values
  const splitTotal = splitPayments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0,
  );
  const splitRemaining = Math.max(0, numTotal - splitTotal);
  const splitOverpaid = Math.max(0, splitTotal - numTotal);
  const isSplitComplete = Math.abs(splitTotal - numTotal) < 0.01;

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

  const { saveOfflineOrder } = useOfflineSync();
  const hw = useHardware();
  const { can, openUpgrade } = useLicense();
  const { clearActiveAfterCheckout } = useMultiCart();

  /**
   * Print receipt: prefer connected thermal printer (ESC/POS), fall back to
   * the browser-print HTML receipt window. Also kicks the drawer for cash
   * sales when the printer is connected.
   */
  const handlePrintReceipt = async (orderDetail) => {
    if (hw.printerConnected) {
      try {
        await hw.printReceipt({
          header: settings.receipt_header || "",
          footer: settings.receipt_footer || "",
          orderNumber: orderDetail.order_number || orderDetail.id,
          date: orderDetail.date || new Date().toLocaleString(),
          cashier: orderDetail.cashier_name || "",
          items: orderDetail.items || [],
          subtotal: orderDetail.subtotal || 0,
          discount: orderDetail.discount || 0,
          tax: orderDetail.tax || 0,
          total: orderDetail.total || 0,
          cashReceived: orderDetail.cash_received || 0,
          changeGiven: orderDetail.change_given || 0,
          paymentMethod: orderDetail.payment_method || "",
          currency: settings.currency_symbol || "$",
          paperWidth: settings.receipt_paper_width === "58mm" ? 58 : 80,
          kickDrawer:
            orderDetail.payment_method === "cash" ||
            orderDetail.payment_method === "split",
        });
        return;
      } catch (err) {
        console.warn(
          "[Payment] thermal printer failed, falling back to browser print:",
          err,
        );
        toast.warning("Thermal printer error — using browser print instead");
      }
    }
    // Fallback to browser HTML receipt
    printReceipt(orderDetail, settings);

    // Independent drawer kick if printer not connected but drawer is direct
    if (
      (orderDetail.payment_method === "cash" ||
        orderDetail.payment_method === "split") &&
      settings.cash_drawer_pulse !== "none"
    ) {
      try {
        if (hw.printerConnected || hw.scaleConnected) {
          await hw.openDrawer();
        }
      } catch {
        // Silent — drawer is optional
      }
    }
  };

  const handleCheckout = async (forcedCardRef = "") => {
    if (paymentMethod === "cash" && !isAmountSufficient) {
      toast.error("Tendered cash is less than the total amount");
      return;
    }
    if (paymentMethod === "split" && !isSplitComplete) {
      if (splitOverpaid > 0) {
        toast.error(
          `Overpaid by ${formatPrice(splitOverpaid)}. Adjust amounts.`,
        );
      } else {
        toast.error(
          `Still need ${formatPrice(splitRemaining)} to complete payment.`,
        );
      }
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
        paymentMethod === "card_emv"
          ? emvTransactionResult?.authorizationCode || ""
          : paymentMethod === "card"
          ? cardRef || forcedCardRef || `CARD-${Date.now().toString().slice(-8)}`
          : "";

      // Build payload
      let effectivePaymentMethod =
        paymentMethod === "card_emv" ? "card" : paymentMethod;
      let cashPortion = paymentMethod === "cash" ? numCashReceived : 0;
      let changePortion = paymentMethod === "cash" ? changeGiven : 0;
      let splitBreakdown = null;

      if (paymentMethod === "split") {
        effectivePaymentMethod = "split";
        splitBreakdown = splitPayments.map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0,
          ref: p.ref || "",
        }));
        // Sum cash portions for the cash drawer / receipt
        cashPortion = splitBreakdown
          .filter((p) => p.method === "cash")
          .reduce((sum, p) => sum + p.amount, 0);
        changePortion = 0;
      }

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
        splitPayments: splitBreakdown,
        shipping: shipping.method
          ? {
              method_id: shipping.method.method_id || shipping.method.id,
              method_title: shipping.method.title,
              cost: shipping.cost,
              address: shipping.address,
            }
          : null,
      };

      if (navigator.onLine) {
        // Online checkout
        const response = await api.post("/orders/create", payload);

        if (response.success) {
          toast.success("Transaction completed successfully!");

          // Fetch full order details to print receipt properly
          try {
            const orderDetail = await api.get(
              `/orders/get/${response.order_id}`,
            );
            await handlePrintReceipt(orderDetail);
          } catch (receiptErr) {
            console.error(
              "Failed to load receipt details, printing backup template",
              receiptErr,
            );
            // Backup print structure
            await handlePrintReceipt({
              id: response.order_id,
              items: cart,
              subtotal: numTotal + (discount.value || 0),
              total: numTotal,
              discount: discount.value || 0,
              tax: 0,
              payment_method:
                paymentMethod === "card_emv" ? "card" : paymentMethod,
              cash_received: payload.cashReceived,
              change_given: payload.changeGiven,
              notes: notes,
            });
          }

          clearCart();
          clearActiveAfterCheckout();
          onOpenChange(false);
        } else {
          toast.error("Checkout failed");
        }
      } else {
        // Offline checkout
        const offlineOrder = await saveOfflineOrder(payload);

        // Print receipt immediately from local state
        await handlePrintReceipt({
          id: offlineOrder.localId,
          items: cart,
          subtotal: numTotal + (discount.value || 0),
          total: numTotal,
          discount: discount.value || 0,
          tax: 0,
          payment_method: paymentMethod === "card_emv" ? "card" : paymentMethod,
          cash_received: payload.cashReceived,
          change_given: payload.changeGiven,
          notes: notes,
          is_offline: true,
        });

        clearCart();
        clearActiveAfterCheckout();
        onOpenChange(false);
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
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-muted/40 rounded-xl">
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
              <button
                type="button"
                onClick={() => {
                  if (!can("emv_reader")) {
                    openUpgrade("emv_reader");
                    return;
                  }
                  setPaymentMethod("card_emv");
                }}
                className={`relative h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all ${
                  paymentMethod === "card_emv"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}>
                <Sparkles
                  className={`w-4 h-4 ${
                    paymentMethod === "card_emv" ? "" : "text-amber-500"
                  }`}
                />
                <span>Reader</span>
                {!can("emv_reader") && (
                  <ProBadge className="absolute -top-1 -right-1" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!can("gift_cards")) {
                    openUpgrade("gift_cards");
                    return;
                  }
                  setPaymentMethod("gift_card");
                }}
                className={`relative h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all ${
                  paymentMethod === "gift_card"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}>
                <Gift
                  className={`w-4 h-4 ${
                    paymentMethod === "gift_card" ? "" : "text-purple-500"
                  }`}
                />
                <span>Gift</span>
                {!can("gift_cards") && (
                  <ProBadge className="absolute -top-1 -right-1" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!can("split_payment")) {
                    openUpgrade("split_payment");
                    return;
                  }
                  setPaymentMethod("split");
                }}
                className={`relative h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all ${
                  paymentMethod === "split"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}>
                <Split
                  className={`w-4 h-4 ${
                    paymentMethod === "split" ? "" : "text-emerald-500"
                  }`}
                />
                <span>Split</span>
                {!can("split_payment") && (
                  <ProBadge className="absolute -top-1 -right-1" />
                )}
              </button>
            </div>

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
                    <div className="h-11 border bg-muted/30 rounded-lg flex items-center px-3 font-extrabold text-base text-emerald-600">
                      {formatPrice(changeGiven)}
                    </div>
                  </div>
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
                <div className="p-3.5 bg-blue-500/10 text-blue-600 rounded-lg text-xs font-medium leading-normal space-y-2">
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

            {paymentMethod === "card_emv" && (
              <div className="space-y-4 py-4 animate-in fade-in duration-300">
                <EMVReaderPanel
                  amount={numTotal}
                  onSuccess={(result) => {
                    setEmvTransactionResult(result);
                    // Auto-proceed to checkout with the transaction result
                    handleCheckout();
                  }}
                  onCancel={() => {
                    setPaymentMethod("cash");
                    toast.info("EMV payment cancelled");
                  }}
                />
              </div>
            )}

            {paymentMethod === "gift_card" && (
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Gift Card / Store Credit Code
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={giftCardCode}
                      onChange={(e) =>
                        setGiftCardCode(e.target.value.toUpperCase())
                      }
                      placeholder="GC-XXXX-XXXX or SC-XXXX-XXXX"
                      className="h-11 text-xs font-mono uppercase flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!giftCardCode.trim() || giftCardChecking}
                      className="h-11 px-4 text-xs font-bold"
                      onClick={async () => {
                        setGiftCardChecking(true);
                        setGiftCardInfo(null);
                        try {
                          const res = await api.get("/gift-cards/check", {
                            code: giftCardCode.trim(),
                          });
                          setGiftCardInfo(res);
                        } catch (err) {
                          toast.error(
                            err.message || "Card not found or invalid",
                          );
                          setGiftCardInfo(null);
                        } finally {
                          setGiftCardChecking(false);
                        }
                      }}>
                      {giftCardChecking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Check"
                      )}
                    </Button>
                  </div>
                </div>

                {giftCardInfo && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-purple-500" />
                        {giftCardInfo.type === "store_credit"
                          ? "Store Credit"
                          : "Gift Card"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {giftCardInfo.code}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Available Balance
                      </span>
                      <span className="text-lg font-black text-purple-600">
                        {formatPrice(giftCardInfo.balance)}
                      </span>
                    </div>
                    {giftCardInfo.balance < numTotal && (
                      <p className="text-[10px] text-amber-600 font-semibold bg-amber-500/10 rounded-md p-2">
                        Balance is less than total. The remaining{" "}
                        {formatPrice(numTotal - giftCardInfo.balance)} will need
                        to be paid by another method.
                      </p>
                    )}
                    {giftCardInfo.balance >= numTotal && (
                      <p className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 rounded-md p-2">
                        Sufficient balance.{" "}
                        {formatPrice(giftCardInfo.balance - numTotal)} will
                        remain after this transaction.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "split" && (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Split className="w-3.5 h-3.5 text-emerald-500" />
                    Split Payment
                  </h4>
                  <div
                    className={`text-[11px] font-bold px-2 py-1 rounded-md ${
                      isSplitComplete
                        ? "bg-emerald-500/10 text-emerald-600"
                        : splitOverpaid > 0
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}>
                    {isSplitComplete
                      ? `Balanced ${formatPrice(splitTotal)}`
                      : splitOverpaid > 0
                      ? `Overpaid by ${formatPrice(splitOverpaid)}`
                      : `Remaining ${formatPrice(splitRemaining)}`}
                  </div>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {splitPayments.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 border rounded-lg p-2 bg-muted/5">
                      <Select
                        value={p.method}
                        onValueChange={(value) => {
                          const next = [...splitPayments];
                          next[idx] = { ...next[idx], method: value };
                          setSplitPayments(next);
                        }}>
                        <SelectTrigger className="h-9 text-xs w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100000]">
                          <SelectItem value="cash" className="text-xs">
                            Cash
                          </SelectItem>
                          <SelectItem value="card" className="text-xs">
                            Card
                          </SelectItem>
                          <SelectItem value="gift_card" className="text-xs">
                            Gift Card
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={p.amount}
                        onChange={(e) => {
                          const next = [...splitPayments];
                          next[idx] = { ...next[idx], amount: e.target.value };
                          setSplitPayments(next);
                        }}
                        placeholder="0.00"
                        className="h-9 text-xs font-bold flex-1"
                      />

                      <Input
                        value={p.ref}
                        onChange={(e) => {
                          const next = [...splitPayments];
                          next[idx] = { ...next[idx], ref: e.target.value };
                          setSplitPayments(next);
                        }}
                        placeholder={
                          p.method === "gift_card"
                            ? "GC code"
                            : p.method === "card"
                            ? "Auth ref"
                            : "—"
                        }
                        disabled={p.method === "cash"}
                        className="h-9 text-xs flex-1"
                      />

                      {splitPayments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setSplitPayments(
                              splitPayments.filter((_, i) => i !== idx),
                            )
                          }
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 shrink-0"
                          title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSplitPayments([
                        ...splitPayments,
                        {
                          method: "card",
                          amount:
                            splitRemaining > 0 ? splitRemaining.toFixed(2) : "",
                          ref: "",
                        },
                      ])
                    }
                    className="text-xs font-semibold gap-1 flex-1">
                    <Plus className="w-3.5 h-3.5" />
                    Add Payment
                  </Button>
                  {splitRemaining > 0 && splitPayments.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next = [...splitPayments];
                        const last = next.length - 1;
                        const currentAmount =
                          parseFloat(next[last].amount) || 0;
                        next[last] = {
                          ...next[last],
                          amount: (currentAmount + splitRemaining).toFixed(2),
                        };
                        setSplitPayments(next);
                      }}
                      className="text-xs font-semibold flex-1">
                      Fill Remaining
                    </Button>
                  )}
                </div>

                <div className="bg-muted/20 rounded-lg p-3 text-xs space-y-1 border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Due</span>
                    <span className="font-bold text-foreground">
                      {formatPrice(numTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Tendered
                    </span>
                    <span className="font-bold text-foreground">
                      {formatPrice(splitTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions footer */}
          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl font-bold"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                loading ||
                (paymentMethod === "cash" && !isAmountSufficient) ||
                (paymentMethod === "gift_card" &&
                  (!giftCardInfo || giftCardInfo.balance <= 0)) ||
                (paymentMethod === "split" && !isSplitComplete) ||
                (paymentMethod === "card_emv" && !emvTransactionResult)
              }
              className={`flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md ${
                paymentMethod === "card_emv"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/95"
              }`}
              onClick={async () => {
                if (paymentMethod === "gift_card" && giftCardInfo) {
                  // Redeem gift card first, then checkout
                  setLoading(true);
                  try {
                    const deductAmount = Math.min(
                      giftCardInfo.balance,
                      numTotal,
                    );
                    await api.post("/gift-cards/redeem", {
                      code: giftCardInfo.code,
                      amount: deductAmount,
                    });
                    await handleCheckout();
                  } catch (err) {
                    toast.error(err.message || "Gift card redemption failed");
                    setLoading(false);
                  }
                } else if (paymentMethod === "split") {
                  // Redeem any gift card portions first
                  setLoading(true);
                  try {
                    for (const p of splitPayments) {
                      if (
                        p.method === "gift_card" &&
                        p.ref &&
                        parseFloat(p.amount) > 0
                      ) {
                        await api.post("/gift-cards/redeem", {
                          code: p.ref.toUpperCase(),
                          amount: parseFloat(p.amount),
                        });
                      }
                    }
                    await handleCheckout();
                  } catch (err) {
                    toast.error(err.message || "Split payment failed");
                    setLoading(false);
                  }
                } else {
                  handleCheckout();
                }
              }}>
              {paymentMethod === "card_emv" && !emvTransactionResult ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Processing EMV...</span>
                </>
              ) : (
                <>
                  <Check className="w-4.5 h-4.5" />
                  <span>
                    {loading
                      ? "Processing..."
                      : paymentMethod === "card"
                      ? "Complete Card Payment"
                      : paymentMethod === "card_emv"
                      ? "Complete EMV Payment"
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
