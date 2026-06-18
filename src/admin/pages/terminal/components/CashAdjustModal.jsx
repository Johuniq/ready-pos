import React, { useState } from "react";
import { useAtom } from "jotai";
import { sessionAtom, settingsAtom } from "@/admin/stores/posStore";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  DollarSign,
  Wallet,
  FileText,
  Plus,
} from "lucide-react";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 200];

export default function CashAdjustModal({ open, onOpenChange }) {
  const [session, setSession] = useAtom(sessionAtom);
  const [settings] = useAtom(settingsAtom);

  const [type, setType] = useState("in"); // 'in' = Pay In, 'out' = Pay Out
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const activeSession = session?.session || {};
  const openingCash = parseFloat(activeSession.opening_cash) || 0;
  const netCashFlow = parseFloat(activeSession.cash_total) || 0;
  const currentDrawerTotal = openingCash + netCashFlow;

  // Parser for petty cash ledger log lines
  const parseAdjustments = (notesStr) => {
    if (!notesStr) return [];
    return notesStr
      .split("\n")
      .filter(
        (line) => line.startsWith("[Pay In]") || line.startsWith("[Pay Out]"),
      )
      .map((line, idx) => {
        const typeMatch = line.match(/^\[(Pay In|Pay Out)\]/);
        const amountMatch = line.match(/^\[.*?\]\s*([\d.]+)/);
        const reasonMatch = line.match(/Reason:\s*(.*?),\s*Cashier/);
        const cashierMatch = line.match(/Cashier ID:\s*(\d+)/);
        const timeMatch = line.match(/Time:\s*(.*?)\)/);

        return {
          id: idx,
          type: typeMatch ? typeMatch[1] : "Pay In",
          amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
          reason: reasonMatch ? reasonMatch[1] : "None",
          cashierId: cashierMatch ? cashierMatch[1] : "1",
          time: timeMatch ? timeMatch[1] : "N/A",
          raw: line,
        };
      })
      .reverse(); // Show latest adjustments first
  };

  const ledgerList = parseAdjustments(activeSession.notes);

  // Add a preset amount to the current input (replaces, doesn't stack, to
  // avoid accidental double-tap summing like 10 + 10 = 20 on quick taps).
  const handleQuickAmount = (preset) => {
    const current = parseFloat(amount);
    const next = isNaN(current) || current === 0 ? preset : current + preset;
    setAmount(next.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid cash amount");
      return;
    }

    if (type === "out" && parsedAmount > currentDrawerTotal) {
      toast.error(
        `Insufficient Cash! Drawer only contains ${formatPrice(
          currentDrawerTotal,
        )}`,
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/sessions/cash-adjustment", {
        sessionId: activeSession.id,
        type: type,
        amount: parsedAmount,
        reason: reason || "Standard cash adjustment",
      });

      if (res.success) {
        toast.success(
          `Logged Petty Cash ${
            type === "in" ? "Deposit" : "Withdrawal"
          } of ${formatPrice(parsedAmount)}`,
        );

        // Fetch the updated active session. Append a cache-busting `_t`
        // query so we never read a stale 60s `pos_sessions` entry that
        // was written before this Pay In / Pay Out was applied to
        // `cash_total`. The parameter is ignored server-side but
        // forces `cache_response()` to compute a different md5 key.
        const updatedSessionRes = await api.get(
          `/sessions/current?_t=${Date.now()}`,
        );
        setSession(updatedSessionRes);

        // Reset form fields
        setAmount("");
        setReason("");
      } else {
        toast.error("Failed to update cash ledger");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update cash ledger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-muted">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Wallet className="w-5 h-5 text-primary" />
            <span>Petty Cash Drawer Ledger</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Deposit exchange float cash (Pay In) or log standard business petty
            cash payouts (Pay Out).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1">
          {/* Form Controls Column */}
          <form
            onSubmit={handleSubmit}
            className="md:col-span-7 p-6 space-y-5 border-b md:border-b-0 md:border-r border-muted flex flex-col justify-between">
            <div className="space-y-4">
              {/* Drawer Summary */}
              <div className="bg-muted/30 border p-4 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Drawer Cash Float
                  </span>
                  <h3 className="text-xl font-extrabold text-foreground">
                    {formatPrice(currentDrawerTotal)}
                  </h3>
                </div>
                <span className="p-2.5 rounded-full bg-primary/10 text-primary">
                  <Wallet className="w-5 h-5" />
                </span>
              </div>

              {/* Type Toggle Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <Button
                    type="button"
                    variant={type === "in" ? "default" : "outline"}
                    className={`h-11 text-xs font-bold transition-all flex items-center justify-center gap-1.5 rounded-xl ${
                      type === "in"
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm"
                        : ""
                    }`}
                    onClick={() => setType("in")}>
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Cash In (Pay In)</span>
                  </Button>
                  <Button
                    type="button"
                    variant={type === "out" ? "default" : "outline"}
                    className={`h-11 text-xs font-bold transition-all flex items-center justify-center gap-1.5 rounded-xl ${
                      type === "out"
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm"
                        : ""
                    }`}
                    onClick={() => setType("out")}>
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Cash Out (Pay Out)</span>
                  </Button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Adjustment Cash Amount
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-muted-foreground pointer-events-none z-10">
                    {getCurrencySymbol()}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      // Allow only digits and a single decimal point
                      const raw = e.target.value;
                      const cleaned = raw.replace(/[^0-9.]/g, "");
                      const parts = cleaned.split(".");
                      const safe =
                        parts.length > 2
                          ? parts[0] + "." + parts.slice(1).join("")
                          : cleaned;
                      setAmount(safe);
                    }}
                    className="pl-12 h-11 text-sm font-bold rounded-xl"
                    required
                  />
                </div>

                {/* Quick preset chips — one tap adds to the amount */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {QUICK_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickAmount(preset)}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border/70 bg-background hover:bg-primary/5 hover:border-primary/40 text-xs font-bold text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                      aria-label={`Add ${formatPrice(preset)} to amount`}>
                      <Plus className="w-3 h-3 text-primary" />
                      <span>
                        {getCurrencySymbol()}
                        {preset}
                      </span>
                    </button>
                  ))}
                  {parseFloat(amount) > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount("")}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-xs font-bold text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Reason Text Area */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Reason / Remarks
                </label>
                <Textarea
                  placeholder={
                    type === "in"
                      ? "Replenishing change float"
                      : "Office snacks or courier shipping postage costs"
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-xs min-h-16 rounded-xl leading-relaxed mt-1"
                  required
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-muted">
              <Button
                type="submit"
                disabled={loading}
                className={`w-full h-11 font-bold rounded-xl flex items-center justify-center gap-1.5 ${
                  type === "in"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}>
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Processing Ledger Entry...</span>
                  </>
                ) : (
                  <>
                    {type === "in" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                    <span>
                      Confirm Cash {type === "in" ? "Pay In" : "Pay Out"}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Auditable Ledger Logs Column */}
          <div className="md:col-span-5 p-6 bg-muted/20 flex flex-col overflow-hidden max-h-[460px] md:max-h-none">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <History className="w-3.5 h-3.5" />
              <span>Shift Ledger Activity ({ledgerList.length})</span>
            </span>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {ledgerList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <FileText className="w-8 h-8 opacity-25 mb-2" />
                  <p className="text-[10px] font-bold">No Adjustments Made</p>
                  <p className="text-[9px] opacity-75 mt-0.5">
                    Petty cash actions registered during this open shift will
                    show up here.
                  </p>
                </div>
              ) : (
                ledgerList.map((log) => (
                  <div
                    key={log.id}
                    className="border border-border/60 bg-background rounded-xl p-3 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                          log.type === "Pay In"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}>
                        {log.type === "Pay In" ? (
                          <ArrowDownLeft className="w-2.5 h-2.5" />
                        ) : (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        )}
                        <span>{log.type}</span>
                      </span>
                      <span className="text-xs font-extrabold text-foreground">
                        {log.type === "Pay In" ? "+" : "-"}
                        {formatPrice(log.amount)}
                      </span>
                    </div>
                    <p className="text-[10px] text-foreground font-semibold line-clamp-2 leading-tight">
                      {log.reason}
                    </p>
                    <div className="flex justify-between text-[8px] text-muted-foreground font-bold border-t border-muted/50 pt-1.5 mt-1">
                      <span>Staff ID: #{log.cashierId}</span>
                      <span>{log.time.split(" ")[1] || log.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
