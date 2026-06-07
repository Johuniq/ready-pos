import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import {
  CreditCard,
  Loader2,
  Check,
  AlertCircle,
  Usb,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useHardware } from "@/admin/hooks/useHardware";

/**
 * EMV Card Reader Panel Component
 * Handles actual EMV reader hardware integration for card payments
 */
export default function EMVReaderPanel({ amount, onSuccess, onCancel }) {
  const hw = useHardware();
  const [step, setStep] = useState("connect"); // connect, waiting, reading, authorizing, approved, declined, error
  const [statusMessage, setStatusMessage] = useState("");
  const [transactionResult, setTransactionResult] = useState(null);
  const [error, setError] = useState(null);

  // Auto-connect on mount if reader is already paired
  useEffect(() => {
    if (hw.cardReaderConnected) {
      setStep("ready");
      setStatusMessage("Card reader connected and ready");
    }
  }, [hw.cardReaderConnected]);

  // Listen to card reader events
  useEffect(() => {
    if (!hw.cardReaderConnected) return;

    const unsubscribers = [
      hw.onCardReaderEvent("waiting_for_card", () => {
        setStep("waiting");
        setStatusMessage("Please present card...");
      }),

      hw.onCardReaderEvent("card_read", (data) => {
        setStep("reading");
        setStatusMessage(`Card detected: ${data.cardType || "Unknown"}`);
      }),

      hw.onCardReaderEvent("emv_step", (data) => {
        switch (data.step) {
          case "application_selection":
            setStatusMessage("Selecting payment application...");
            break;
          case "read_application_data":
            setStatusMessage("Reading card data...");
            break;
          case "cardholder_verification":
            setStep("pin_entry");
            setStatusMessage("Enter PIN on device...");
            break;
          case "authorization":
            setStep("authorizing");
            setStatusMessage("Authorizing transaction...");
            break;
          case "completion":
            setStatusMessage("Completing transaction...");
            break;
        }
      }),

      hw.onCardReaderEvent("pin_required", () => {
        setStep("pin_entry");
        setStatusMessage("PIN verification required");
        toast.info("Please enter PIN on the card reader");
      }),

      hw.onCardReaderEvent("transaction_completed", (result) => {
        if (result.approved) {
          setStep("approved");
          setTransactionResult(result);
          setStatusMessage("Payment approved!");
          toast.success("Card payment approved");
          // Call success callback with transaction details
          setTimeout(() => {
            onSuccess(result);
          }, 1500);
        } else {
          setStep("declined");
          setError(result.responseMessage || "Transaction declined");
          setStatusMessage(result.responseMessage || "Payment declined");
          toast.error(result.responseMessage || "Transaction declined");
        }
      }),

      hw.onCardReaderEvent("transaction_failed", (data) => {
        setStep("error");
        setError(data.error);
        setStatusMessage("Transaction failed");
        toast.error(data.error || "Transaction failed");
      }),

      hw.onCardReaderEvent("error", (err) => {
        setStep("error");
        setError(err.message);
        toast.error(err.message || "Card reader error");
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [hw.cardReaderConnected, onSuccess]);

  const handleConnect = async (type = "serial") => {
    try {
      setStep("connecting");
      setStatusMessage("Connecting to card reader...");
      await hw.connectCardReader(type);
      setStep("ready");
      setStatusMessage("Card reader connected successfully");
      toast.success("Card reader connected");
    } catch (err) {
      setStep("error");
      setError(err.message);
      setStatusMessage("Connection failed");
      toast.error(err.message || "Failed to connect card reader");
    }
  };

  const handleStartTransaction = async () => {
    try {
      setStep("waiting");
      setStatusMessage("Initializing payment...");

      // Convert amount to cents (smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      await hw.processCardPayment(amountInCents, {
        invoiceNumber: `POS-${Date.now()}`,
      });
    } catch (err) {
      setStep("error");
      setError(err.message);
      setStatusMessage("Failed to start transaction");
      toast.error(err.message || "Failed to start payment");
    }
  };

  const handleCancel = async () => {
    try {
      if (step === "waiting" || step === "reading" || step === "authorizing") {
        await hw.cancelCardPayment();
        toast.info("Transaction cancelled");
      }
      onCancel();
    } catch (err) {
      
      onCancel();
    }
  };

  const renderContent = () => {
    switch (step) {
      case "connect":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300 w-full">
            <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-center mx-auto shadow-md">
              <CreditCard className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-foreground">
                Connect EMV Card Reader
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] mx-auto leading-relaxed">
                Connect your physical EMV card reader via USB or Serial port
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-150"
                onClick={() => handleConnect("serial")}>
                <Wifi className="w-4 h-4 mr-2" />
                Serial / RS-232
              </Button>
              <Button
                type="button"
                className="flex-1 h-11 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/25 transition-all duration-150"
                onClick={() => handleConnect("usb")}>
                <Usb className="w-4 h-4 mr-2" />
                USB Direct
              </Button>
            </div>
            {!hw.cardReaderSupported && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600">
                Your browser doesn't support hardware card readers. Please use
                Chrome, Edge, or Opera.
              </div>
            )}
          </div>
        );

      case "connecting":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-indigo-400 animate-pulse">
                Connecting to Reader...
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                {statusMessage}
              </p>
            </div>
          </div>
        );

      case "ready":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300 w-full">
            <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center mx-auto shadow-md">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-foreground">
                Reader Connected
              </h4>
              <div className="mt-2 bg-indigo-500/10 border border-indigo-500/25 rounded-lg px-3 py-1 inline-block text-xs font-black text-indigo-400">
                Amount: {formatPrice(amount)}
              </div>
            </div>
            <Button
              type="button"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-150"
              onClick={handleStartTransaction}>
              Start Payment Transaction
            </Button>
          </div>
        );

      case "waiting":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300 w-full">
            <div
              className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center mx-auto animate-bounce"
              style={{ animationDuration: "2s" }}>
              <CreditCard className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-foreground">
                Waiting for Card
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                Please tap, insert, or swipe card on the reader
              </p>
              <div className="mt-2 bg-indigo-500/10 border border-indigo-500/25 rounded-lg px-3 py-1 inline-block text-xs font-black text-indigo-400">
                Amount: {formatPrice(amount)}
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        );

      case "reading":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-foreground">
                Reading Card Data...
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                {statusMessage}
              </p>
            </div>
          </div>
        );

      case "pin_entry":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center mx-auto animate-pulse">
              <CreditCard className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-foreground">
                PIN Required
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                Please enter PIN on the card reader device
              </p>
            </div>
          </div>
        );

      case "authorizing":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-primary animate-pulse">
                Authorizing Payment...
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                {statusMessage}
              </p>
            </div>
          </div>
        );

      case "approved":
        return (
          <div className="space-y-3 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
              <Check className="w-6 h-6 text-emerald-400 font-bold" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-emerald-400">
                Payment Approved!
              </h4>
              {transactionResult && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-0.5 text-foreground inline-block font-mono">
                    Auth: {transactionResult.authorizationCode}
                  </p>
                  {transactionResult.cardNumberMasked && (
                    <p className="text-[10px] text-muted-foreground">
                      Card: {transactionResult.cardNumberMasked} (
                      {transactionResult.cardType})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case "declined":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300 w-full">
            <div className="w-12 h-12 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center justify-center mx-auto">
              <X className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-red-400">
                Payment Declined
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                onClick={handleStartTransaction}>
                Try Again
              </Button>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300 w-full">
            <div className="w-12 h-12 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-red-400">
                Transaction Error
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                {error || "An error occurred"}
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                onClick={() => {
                  setStep("connect");
                  setError(null);
                }}>
                Reconnect
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900/60 to-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-xl shadow-inner flex flex-col items-center justify-center min-h-[280px] text-center transition-all duration-300">
      {/* Glowing accent ambient blobs */}
      <div className="absolute w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl -top-8 -left-8 animate-pulse pointer-events-none" />
      <div
        className="absolute w-36 h-36 bg-primary/10 rounded-full blur-2xl -bottom-8 -right-8 animate-pulse pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      {renderContent()}
    </div>
  );
}
