import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { sessionAtom, settingsAtom } from "@/admin/stores/posStore";
import {
  LayoutDashboard,
  LogOut,
  Clock,
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

export default function POSHeader({
  onOpenCloseSession,
}) {
  const [session, setSession] = useAtom(sessionAtom);
  const [settings] = useAtom(settingsAtom);
  const { theme, setTheme } = useTheme();
  const [time, setTime] = useState(new Date());
  const [cashAdjustOpen, setCashAdjustOpen] = useState(false);

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
      : "Staff";
  const userRole =
    typeof readypos_admin !== "undefined"
      ? readypos_admin.userInfo.roles.join(", ")
      : "Staff";

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
          </>
        )}

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
    </header>
  );
}
