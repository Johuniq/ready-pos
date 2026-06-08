import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Check,
  LogOut,
  FileText,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ShiftTrackerModal({
  open,
  onOpenChange,
  activeShift,
  onShiftChange,
  sessionId,
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  // Live clock for active shifts
  useEffect(() => {
    if (!activeShift) return;

    const updateClock = () => {
      const start = new Date(activeShift.clock_in_at);
      const now = new Date();
      const diffMs = Math.max(0, now - start);

      const hours = Math.floor(diffMs / 3600000)
        .toString()
        .padStart(2, "0");
      const minutes = Math.floor((diffMs % 3600000) / 60000)
        .toString()
        .padStart(2, "0");
      const seconds = Math.floor((diffMs % 60000) / 1000)
        .toString()
        .padStart(2, "0");

      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const handleClockIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/shifts/clock-in", {
        sessionId: sessionId || null,
        notes: notes,
      });

      if (res.success) {
        toast.success("Clocked in successfully! Have a productive shift.");
        setNotes("");

        // Fetch the new shift state
        const currentShiftRes = await api.get("/shifts/current");
        onShiftChange(currentShiftRes.shift || null);
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err.message || "Failed to clock in");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/shifts/clock-out", {
        sessionId: sessionId || null,
        notes: notes,
      });

      if (res.success) {
        toast.success("Clocked out successfully! Shift logged.");
        setNotes("");
        onShiftChange(null);
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err.message || "Failed to clock out");
    } finally {
      setLoading(false);
    }
  };

  const username =
    typeof readypos_admin !== "undefined"
      ? readypos_admin.userInfo.username
      : "Cashier";

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        // Force cashier to clock in if they have no active shift
        if (!activeShift) {
          toast.warning(
            "You must clock in for a shift to operate the POS terminal.",
          );
          return;
        }
        onOpenChange(val);
      }}>
      <DialogContent className="max-w-md rounded-xl p-6 select-none overflow-hidden max-h-[90vh]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Clock
              className={`w-5 h-5 ${
                activeShift ? "text-amber-500 animate-pulse" : "text-primary"
              }`}
            />
            <span>
              {activeShift
                ? "Shift Tracker (Clocked In)"
                : "Shift Clock-In Required"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {!activeShift ? (
          /* Clock-In Panel */
          <form onSubmit={handleClockIn} className="space-y-4 pt-4">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-foreground block">
                  Welcome back, {username}!
                </span>
                <span className="text-muted-foreground mt-0.5 block">
                  Please clock in to begin logging your hours, sales, and shift
                  operations.
                </span>
              </div>
            </div>

            {/* Shift Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Shift Notes (Optional)</span>
              </label>
              <Textarea
                placeholder="Enter opening shift notes, cash register status, or comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-20 resize-none"
              />
            </div>

            <DialogFooter className="pt-4 border-t flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => (window.location.href = "#/dashboard")}
                className="flex-1 text-xs h-10 font-semibold">
                Back to Dashboard
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-1.5 shadow-md">
                <Check className="w-4 h-4" />
                <span>{loading ? "Clocking In..." : "Clock In Shift"}</span>
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Clock-Out Panel */
          <form onSubmit={handleClockOut} className="space-y-4 pt-4">
            {/* Live Counter Widget */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-5 border border-amber-500/20 text-center space-y-1 shadow-xs">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 block">
                Shift Duration
              </span>
              <span className="text-3xl font-black text-foreground tracking-tight font-mono block">
                {elapsedTime}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-1">
                Started:{" "}
                {new Date(activeShift.clock_in_at).toLocaleTimeString()}{" "}
                (
                {new Date(activeShift.clock_in_at).toLocaleDateString()}
                )
              </span>
            </div>

            {/* Shift Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Closing Notes (Optional)</span>
              </label>
              <Textarea
                placeholder="Enter handover details, discrepancies, closing shift comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-20 resize-none"
              />
            </div>

            <DialogFooter className="pt-4 border-t flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 text-xs h-10 font-semibold">
                Continue Working
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 text-xs h-10 font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-1.5">
                <LogOut className="w-4 h-4" />
                <span>{loading ? "Clocking Out..." : "Clock Out Shift"}</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
