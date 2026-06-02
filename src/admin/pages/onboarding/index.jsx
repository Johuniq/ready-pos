import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { resetOfflineStorage } from "@/admin/lib/db";
import { toast } from "sonner";
import {
  Store,
  CreditCard,
  Printer,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Rocket },
  { id: "outlet", title: "Store Setup", icon: Store },
  { id: "payments", title: "Payments", icon: CreditCard },
  { id: "receipt", title: "Receipt", icon: Printer },
  { id: "done", title: "Ready!", icon: Check },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Outlet form
  const [outlet, setOutlet] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  // Payment settings
  const [payments, setPayments] = useState({
    cash: true,
    card: true,
  });

  // Receipt settings
  const [receipt, setReceipt] = useState({
    header: "",
    footer: "Thank you for shopping with us!",
    paperWidth: "80mm",
  });

  // Reset all cached data when onboarding starts
  React.useEffect(() => {
    const resetCachedData = async () => {
      try {
        await resetOfflineStorage();

        // Call the reset endpoint to clear all cached license and data
        await api.post("/license/reset");
        await resetOfflineStorage();

        if (typeof readyPosAdmin !== "undefined") {
          readyPosAdmin.license = {
            ...(readyPosAdmin.license || {}),
            plan: "free",
            status: "free",
            isPro: false,
            maskedKey: "",
            customer: {},
          };
        }
        console.log("[ReadyPOS] Cache reset completed during onboarding");
      } catch (error) {
        console.warn("[ReadyPOS] Cache reset failed:", error);
        // Don't block onboarding if reset fails
      } finally {
        setInitializing(false);
      }
    };

    resetCachedData();
  }, []);

  const currentStep = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  // Show loading state while initializing
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Initializing setup...</p>
        </div>
      </div>
    );
  }

  const canProceed = () => {
    if (currentStep.id === "outlet") {
      return outlet.name.trim().length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Create the outlet
      await api.post("/settings/outlets/create", {
        name: outlet.name,
        address: outlet.address,
        phone: outlet.phone,
        email: outlet.email,
        receipt_header: receipt.header,
        receipt_footer: receipt.footer,
      });

      // 2. Save settings
      await api.post("/settings/update", {
        payment_cash: payments.cash ? "yes" : "no",
        payment_card: payments.card ? "yes" : "no",
        receipt_header: receipt.header,
        receipt_footer: receipt.footer,
        receipt_paper_width: receipt.paperWidth,
        onboarding_complete: "yes",
      });

      // 3. Update the in-memory flag so LayoutOne won't redirect back
      if (typeof readyPosAdmin !== "undefined") {
        readyPosAdmin.onboardingComplete = true;
      }

      toast.success("Setup complete! Your POS is ready to use.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Setup failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 select-none">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 rounded-full transition-all duration-300 ${
                    i < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <Card className="rounded-2xl shadow-lg overflow-hidden">
          <CardContent className="p-8 md:p-10 min-h-[380px] flex flex-col">
            {/* Welcome */}
            {currentStep.id === "welcome" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome to Ready POS
                </h1>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Let's get your point of sale system configured in under 2
                  minutes. We'll set up your store, payment methods, and receipt
                  layout.
                </p>
                <div className="flex items-center gap-4 pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" /> Store info
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Payments
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5" /> Receipts
                  </span>
                </div>
              </div>
            )}

            {/* Outlet Setup */}
            {currentStep.id === "outlet" && (
              <div className="flex-1 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    Set up your first store
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    This creates your primary outlet and register. You can add
                    more later.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Store Name *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Downtown Branch"
                      value={outlet.name}
                      onChange={(e) =>
                        setOutlet((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="h-11 text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Address
                    </label>
                    <Input
                      placeholder="123 Retail Road, City"
                      value={outlet.address}
                      onChange={(e) =>
                        setOutlet((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Phone
                      </label>
                      <Input
                        type="tel"
                        placeholder="+1 555-0199"
                        value={outlet.phone}
                        onChange={(e) =>
                          setOutlet((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </label>
                      <Input
                        type="email"
                        placeholder="store@example.com"
                        value={outlet.email}
                        onChange={(e) =>
                          setOutlet((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {currentStep.id === "payments" && (
              <div className="flex-1 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Payment methods
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Choose which payment types your cashiers can accept. You can
                    change these anytime in Settings.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between border p-5 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">
                        Cash Payments
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Accept bills and coins. Enables change calculation and
                        cash drawer triggers.
                      </p>
                    </div>
                    <Switch
                      checked={payments.cash}
                      onCheckedChange={(checked) =>
                        setPayments((prev) => ({ ...prev, cash: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border p-5 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">
                        Card Payments
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Accept credit and debit cards via external terminal or
                        integrated reader.
                      </p>
                    </div>
                    <Switch
                      checked={payments.card}
                      onCheckedChange={(checked) =>
                        setPayments((prev) => ({ ...prev, card: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Receipt Setup */}
            {currentStep.id === "receipt" && (
              <div className="flex-1 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Printer className="w-5 h-5 text-primary" />
                    Receipt layout
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Customize what appears on printed receipts. You can refine
                    this later in the Receipt Designer.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Paper Width
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-w-xs">
                      <Button
                        type="button"
                        variant={
                          receipt.paperWidth === "80mm" ? "default" : "outline"
                        }
                        className="h-10 text-xs font-bold"
                        onClick={() =>
                          setReceipt((prev) => ({
                            ...prev,
                            paperWidth: "80mm",
                          }))
                        }>
                        Standard 80mm
                      </Button>
                      <Button
                        type="button"
                        variant={
                          receipt.paperWidth === "58mm" ? "default" : "outline"
                        }
                        className="h-10 text-xs font-bold"
                        onClick={() =>
                          setReceipt((prev) => ({
                            ...prev,
                            paperWidth: "58mm",
                          }))
                        }>
                        Compact 58mm
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Header Text
                    </label>
                    <Textarea
                      placeholder={
                        "Store Name\n123 Address St, City\nPhone: (555) 019-2831"
                      }
                      value={receipt.header}
                      onChange={(e) =>
                        setReceipt((prev) => ({
                          ...prev,
                          header: e.target.value,
                        }))
                      }
                      className="text-xs min-h-20 font-mono resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Footer Text
                    </label>
                    <Input
                      placeholder="Thank you for shopping with us!"
                      value={receipt.footer}
                      onChange={(e) =>
                        setReceipt((prev) => ({
                          ...prev,
                          footer: e.target.value,
                        }))
                      }
                      className="h-10 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Done */}
            {currentStep.id === "done" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  You're all set!
                </h1>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Your POS is configured and ready to process transactions. A
                  default register has been created for your store.
                </p>
                <div className="bg-muted/30 border rounded-xl p-4 text-left w-full max-w-sm space-y-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Store:</span>
                    <span className="font-semibold text-foreground">
                      {outlet.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Cash:</span>
                    <span className="font-semibold text-foreground">
                      {payments.cash ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Card:</span>
                    <span className="font-semibold text-foreground">
                      {payments.card ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Paper:</span>
                    <span className="font-semibold text-foreground">
                      {receipt.paperWidth}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {/* Footer navigation */}
          <div className="border-t px-8 py-5 flex items-center justify-between bg-muted/5">
            <div>
              {!isFirst && !isLast && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  className="text-xs font-semibold gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isLast && (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="text-xs font-bold gap-1.5 px-5 h-10">
                  {isFirst ? "Get Started" : "Continue"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
              {isLast && (
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="text-xs font-bold gap-1.5 px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-3.5 h-3.5" />
                      Launch POS
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Skip link */}
        {!isLast && (
          <p className="text-center mt-4 text-xs text-muted-foreground">
            <button
              onClick={() => {
                api
                  .post("/settings/update", { onboarding_complete: "yes" })
                  .catch(() => {});
                if (typeof readyPosAdmin !== "undefined") {
                  readyPosAdmin.onboardingComplete = true;
                }
                navigate("/dashboard");
              }}
              className="underline hover:text-foreground transition-colors">
              Skip setup and configure later
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
