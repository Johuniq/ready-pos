import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Lock,
  Delete,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { handleError } from "@/lib/errorHandler";

/**
 * Cashier PIN Login Panel.
 *
 * A fullscreen secure login screen shown before the POS terminal loads.
 * Cashiers select their avatar and enter a 4-6 digit PIN to authenticate.
 *
 * Props:
 *  - onLogin(user, nonce)  Called on successful PIN auth with user data + fresh nonce.
 *  - onSkip()              Called when the current WP user wants to skip PIN login
 *                          (only available for admin/shop_manager who are already logged in).
 *  - onLogout()            Called when user wants to logout and return to WP login.
 */
export default function CashierLoginPanel({ onLogin, onSkip, onLogout }) {
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [shake, setShake] = useState(false);

  // Current WP user info for the "skip" option.
  const currentUser =
    typeof readypos_admin !== "undefined" ? readypos_admin.userInfo : null;
  const isAdmin =
    currentUser?.roles?.includes("administrator") ||
    currentUser?.roles?.includes("shop_manager");

  useEffect(() => {
    fetchCashiers();
  }, []);

  const fetchCashiers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get("/cashier/login-list");
      setCashiers(data || []);
    } catch (err) {
      const appError = handleError(err, { showToast: false });
      setLoadError(appError);
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = useCallback(
    (digit) => {
      if (pin.length >= 6) return;
      setError("");
      setPin((prev) => prev + digit);
    },
    [pin],
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  const handleClear = useCallback(() => {
    setPin("");
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedUser || pin.length < 4) {
      setError("Enter at least 4 digits");
      return;
    }

    setAuthenticating(true);
    setError("");

    try {
      const res = await api.post("/cashier/login", {
        userId: selectedUser.id,
        pin,
      });

      if (res.success) {
        toast.success(`Welcome, ${res.user.name}`);
        onLogin(res.user, res.nonce, res.license);
      }
    } catch (err) {
      const msg = err.message || "Authentication failed";
      setError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin("");
    } finally {
      setAuthenticating(false);
    }
  }, [selectedUser, pin, onLogin]);

  // Auto-submit when PIN reaches 6 digits.
  useEffect(() => {
    if (pin.length === 6 && selectedUser) {
      handleSubmit();
    }
  }, [pin, selectedUser, handleSubmit]);

  // Keyboard support.
  useEffect(() => {
    if (!selectedUser) return;

    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handlePinInput(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter" && pin.length >= 4) {
        handleSubmit();
      } else if (e.key === "Escape") {
        setSelectedUser(null);
        setPin("");
        setError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedUser, pin, handlePinInput, handleBackspace, handleSubmit]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">
            Loading cashiers...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-6">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-foreground">
            Cashier login unavailable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loadError.message}
          </p>
          <button
            onClick={fetchCashiers}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90">
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
          {isAdmin && (
            <button
              onClick={onSkip}
              className="mt-3 block w-full text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
              Continue as {currentUser?.username || "Admin"} without PIN
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background select-none overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Logout Button - Fixed top right */}
      {onLogout && (
        <button
          onClick={() => {
            if (window.confirm("Logout and return to WordPress login?")) {
              onLogout();
            }
          }}
          className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border/60 hover:bg-card hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-all group shadow-lg"
          title="Logout from WordPress">
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold">Logout</span>
        </button>
      )}

      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-card/50 border rounded-full px-4 py-1.5 mb-4">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Secure Terminal Login
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            {selectedUser ? "Enter your PIN" : "Select your profile"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedUser
              ? `Logging in as ${selectedUser.name}`
              : "Tap your name to begin"}
          </p>
        </div>

        {/* === USER SELECTION === */}
        {!selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {cashiers
                .filter((c) => c.has_pin)
                .map((cashier) => (
                  <button
                    key={cashier.id}
                    onClick={() => setSelectedUser(cashier)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border hover:bg-accent hover:border-primary/40 transition-all duration-200 group">
                    <img
                      src={cashier.avatar}
                      alt={cashier.name}
                      className="w-14 h-14 rounded-full border-2 border-border group-hover:border-primary/50 transition-all"
                    />
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground truncate max-w-[100px]">
                        {cashier.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {cashier.role.replace("pos_", "")}
                      </p>
                    </div>
                  </button>
                ))}
            </div>

            {cashiers.filter((c) => c.has_pin).length === 0 && (
              <div className="text-center py-8 space-y-2">
                <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground font-medium">
                  No cashiers have set a PIN yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Set PINs from Ready POS Pro → Settings or user profiles.
                </p>
              </div>
            )}

            {/* Skip option for admins */}
            {isAdmin && (
              <div className="text-center pt-4 border-t">
                <button
                  onClick={onSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                  Continue as {currentUser?.username || "Admin"} without PIN
                </button>
              </div>
            )}
          </div>
        )}

        {/* === PIN ENTRY === */}
        {selectedUser && (
          <div className="space-y-6">
            {/* Selected user avatar */}
            <div className="flex flex-col items-center gap-2">
              <img
                src={selectedUser.avatar}
                alt={selectedUser.name}
                className="w-16 h-16 rounded-full border-2 border-primary/50"
              />
              <p className="text-sm font-bold text-foreground">
                {selectedUser.name}
              </p>
            </div>

            {/* PIN dots */}
            <div
              className={`flex items-center justify-center gap-3 ${
                shake ? "animate-shake" : ""
              }`}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    i < pin.length
                      ? "bg-primary scale-110 shadow-lg shadow-primary/30"
                      : "bg-muted border"
                  }`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <p className="text-center text-xs font-semibold text-destructive animate-in fade-in">
                {error}
              </p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinInput(num)}
                  disabled={authenticating}
                  className="h-16 rounded-2xl bg-card border text-xl font-bold text-foreground hover:bg-accent active:scale-95 transition-all duration-150 disabled:opacity-50">
                  {num}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setPin("");
                  setError("");
                }}
                className="h-16 rounded-2xl bg-card border text-foreground hover:bg-accent active:scale-95 transition-all duration-150 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => handlePinInput("0")}
                disabled={authenticating}
                className="h-16 rounded-2xl bg-card border text-xl font-bold text-foreground hover:bg-accent active:scale-95 transition-all duration-150 disabled:opacity-50">
                0
              </button>
              <button
                onClick={handleBackspace}
                disabled={authenticating}
                className="h-16 rounded-2xl bg-card border text-foreground hover:bg-destructive/20 hover:border-destructive/30 active:scale-95 transition-all duration-150 flex items-center justify-center disabled:opacity-50">
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Submit button (for 4-5 digit PINs) */}
            {pin.length >= 4 && pin.length < 6 && (
              <button
                onClick={handleSubmit}
                disabled={authenticating}
                className="w-full max-w-[280px] mx-auto h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 block">
                {authenticating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {authenticating ? "Verifying..." : "Unlock"}
              </button>
            )}

            {authenticating && (
              <p className="text-center text-xs text-muted-foreground animate-pulse">
                Verifying PIN...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer branding */}
      <div className="absolute bottom-6 text-center">
        <p className="text-[10px] text-muted-foreground font-medium">
          Ready POS Pro · Secure Terminal
        </p>
      </div>
    </div>
  );
}
