import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { sessionAtom, settingsAtom } from "@/admin/stores/posStore";
import { formatPrice } from "@/lib/currency";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  Unlock,
  Banknote,
  CreditCard,
  Receipt,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export default function RegisterSessionModal({
  open,
  onOpenChange,
  mode = "open",
  onShiftChange,
}) {
  const [session, setSession] = useAtom(sessionAtom);
  const [settings] = useAtom(settingsAtom);

  // Opening state
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  // Closing state
  const [closingCash, setClosingCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const [loading, setLoading] = useState(false);

  // Fetch outlets on mount / open
  useEffect(() => {
    if (open && mode === "open") {
      const fetchOutlets = async () => {
        try {
          const data = await api.get("/settings/outlets");
          setOutlets(data || []);
          if (data && data.length > 0) {
            setSelectedOutletId(data[0].id.toString());
          }
        } catch (err) {
          toast.error("Failed to load store outlets");
        }
      };
      fetchOutlets();
    }
  }, [open, mode]);

  // Handle register select options when selected outlet changes
  const activeOutlet = outlets.find(
    (o) => o.id.toString() === selectedOutletId,
  );
  const registers = activeOutlet?.registers || [];

  useEffect(() => {
    if (registers.length > 0) {
      setSelectedRegisterId(registers[0].id.toString());
    } else {
      setSelectedRegisterId("");
    }
  }, [selectedOutletId, outlets]);

  // Handle Open Register
  const handleOpenRegister = async (e) => {
    e.preventDefault();
    if (!selectedOutletId || !selectedRegisterId) {
      toast.error("Please select an outlet and register");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/sessions/open", {
        outletId: parseInt(selectedOutletId),
        registerId: parseInt(selectedRegisterId),
        openingCash: parseFloat(openingCash) || 0,
        notes: openingNotes,
      });

      if (res.success) {
        toast.success("Register opened successfully!");
        // Fetch the newly opened session details
        const currentSessionRes = await api.get("/sessions/current");
        setSession(currentSessionRes);
        onOpenChange(false);
      } else {
        toast.error("Failed to open register");
      }
    } catch (err) {
      toast.error(err.message || "Failed to open register");
    } finally {
      setLoading(false);
    }
  };

  // Handle Close Register
  const handleCloseRegister = async (e) => {
    e.preventDefault();
    if (!session.has_active || !session.session) {
      toast.error("No active session found");
      return;
    }

    setLoading(true);
    try {
      // First, try to auto clock-out the shift
      try {
        const shiftRes = await api.post("/shifts/clock-out", {
          sessionId: session.session.id,
          notes: "Automatic clock-out on register closing.",
        });
        if (shiftRes.success && onShiftChange) {
          onShiftChange(null);
        }
      } catch (shiftErr) {
        // Log but don't block register closing if shift clock-out fails
        
      }

      // Then close the register
      const res = await api.post("/sessions/close", {
        sessionId: session.session.id,
        closingCash: parseFloat(closingCash) || 0,
        notes: closingNotes,
      });

      if (res.success) {
        toast.success("Register closed successfully!");
        setSession({ has_active: false, session: null });
        onOpenChange(false);
      } else {
        toast.error("Failed to close register");
      }
    } catch (err) {
      toast.error(err.message || "Failed to close register");
    } finally {
      setLoading(false);
    }
  };

  // Summary calculations for closing
  const sessionDetails = session?.session || {};
  const opCash = parseFloat(sessionDetails.opening_cash) || 0;
  const cashSales = parseFloat(sessionDetails.cash_total) || 0;
  const cardSales = parseFloat(sessionDetails.card_total) || 0;
  const totalSales = parseFloat(sessionDetails.total_sales) || 0;
  const totalOrders = parseInt(sessionDetails.total_orders) || 0;
  const expectedCashInDrawer = opCash + cashSales;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        // Prevent closing the open register modal if session is not active
        if (mode === "open" && !session.has_active) {
          toast.warning("You must open the register to use the POS terminal.");
          return;
        }
        onOpenChange(val);
      }}>
      <DialogContent className="max-w-md rounded-xl p-6 select-none overflow-hidden max-h-[90vh]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            {mode === "open" ? (
              <>
                <Unlock className="w-5 h-5 text-emerald-500" />
                <span>Open Register Session</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-rose-500" />
                <span>Close Register & Reconcile</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "open" ? (
          <form onSubmit={handleOpenRegister} className="space-y-4 pt-4">
            {/* Outlet Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Select Outlet
              </label>
              <Select
                value={selectedOutletId}
                onValueChange={setSelectedOutletId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select Outlet..." />
                </SelectTrigger>
                <SelectContent className="z-[100000]">
                  {outlets.map((outlet) => (
                    <SelectItem
                      key={outlet.id}
                      value={outlet.id.toString()}
                      className="text-xs">
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Register Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Select Register
              </label>
              <Select
                value={selectedRegisterId}
                onValueChange={setSelectedRegisterId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select Register..." />
                </SelectTrigger>
                <SelectContent className="z-[100000]">
                  {registers.map((reg) => (
                    <SelectItem
                      key={reg.id}
                      value={reg.id.toString()}
                      className="text-xs"
                      disabled={reg.status === "open"}>
                      {reg.name} {reg.status === "open" ? "(Already Open)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opening Cash */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Opening Cash ({settings.currency_symbol || "$"})
              </label>
              <Input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="h-10 text-xs font-semibold"
              />
            </div>

            {/* Opening Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Opening Notes
              </label>
              <Textarea
                placeholder="Enter shift notes or notes on cash drawer status..."
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                className="text-xs min-h-16 resize-none"
              />
            </div>

            <DialogFooter className="pt-4 border-t flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => (window.location.href = "#/dashboard")}
                className="flex-1 text-xs h-10 font-semibold">
                Cancel & Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/95">
                {loading ? "Opening..." : "Open Register"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleCloseRegister} className="space-y-4 pt-4">
            {/* Session Statistics */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/40 space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" /> Opening Cash
                </span>
                <span className="font-semibold text-foreground">
                  {formatPrice(opCash)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-500" /> Cash
                  Payments
                </span>
                <span className="font-semibold text-foreground">
                  {formatPrice(cashSales)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-sky-500" /> Card
                  Payments
                </span>
                <span className="font-semibold text-foreground">
                  {formatPrice(cardSales)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" /> Total Orders (
                  {totalOrders})
                </span>
                <span className="font-bold text-foreground">
                  {formatPrice(totalSales)}
                </span>
              </div>
              <div className="border-t my-2 pt-2 flex justify-between items-center text-sm font-extrabold text-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4 text-primary" /> Expected Cash in
                  Drawer
                </span>
                <span className="text-primary font-black">
                  {formatPrice(expectedCashInDrawer)}
                </span>
              </div>
            </div>

            {/* Actual Cash Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Actual Cash in Drawer ({settings.currency_symbol || "$"})
              </label>
              <Input
                type="number"
                step="any"
                required
                placeholder="Enter cash counted in drawer..."
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="h-10 text-xs font-semibold"
              />
              {closingCash !== "" && (
                <div className="text-[10px] font-bold flex justify-between px-1">
                  <span>Cash Discrepancy:</span>
                  <span
                    className={
                      parseFloat(closingCash) - expectedCashInDrawer >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                    }>
                    {formatPrice(
                      parseFloat(closingCash) - expectedCashInDrawer,
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Closing Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Closing Notes
              </label>
              <Textarea
                placeholder="Explain any cash discrepancy, register handoff notes..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="text-xs min-h-16 resize-none"
              />
            </div>

            <DialogFooter className="pt-4 border-t flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 text-xs h-10 font-semibold">
                Back to Terminal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 text-xs h-10 font-bold bg-rose-500 hover:bg-rose-600 text-white">
                {loading ? "Closing..." : "Close Register"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
