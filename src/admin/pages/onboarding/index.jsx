import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { getCurrencySymbol } from "@/lib/currency";
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
  Info,
  Cable,
  PackagePlus,
  DollarSign,
  ShoppingCart,
  Barcode,
  Monitor,
  Wallet,
} from "lucide-react";

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Rocket, description: "Get started" },
  {
    id: "outlet",
    title: "Store Setup",
    icon: Store,
    description: "Basic details",
  },
  {
    id: "register",
    title: "Register",
    icon: Monitor,
    description: "First register",
  },
  {
    id: "hardware",
    title: "Hardware",
    icon: Cable,
    description: "Devices",
  },
  {
    id: "payments",
    title: "Payments",
    icon: CreditCard,
    description: "Methods",
  },
  {
    id: "receipt",
    title: "Receipt",
    icon: Printer,
    description: "Customize",
  },
  {
    id: "products",
    title: "Products",
    icon: PackagePlus,
    description: "Initial stock",
  },
  { id: "done", title: "Ready!", icon: Check, description: "Launch" },
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

  // Register form
  const [register, setRegister] = useState({
    name: "Main Register",
    openingCash: "0",
  });

  // Hardware settings
  const [hardware, setHardware] = useState({
    printer: "none",
    printerName: "",
    cashDrawer: false,
    barcodeScanner: "keyboard",
    scale: "none",
  });

  // Payment settings
  const [payments, setPayments] = useState({
    cash: true,
    card: true,
    mobile: false,
    giftCard: false,
  });

  // Receipt settings
  const [receipt, setReceipt] = useState({
    header: "",
    footer: "Thank you for shopping with us!",
    paperWidth: "80mm",
    showLogo: false,
    showBarcode: true,
  });

  // Product import
  const [productImport, setProductImport] = useState({
    method: "skip", // 'skip', 'import', 'sample'
    importCount: 0,
  });

  // Reset all cached data when onboarding starts
  React.useEffect(() => {
    const resetCachedData = async () => {
      try {
        await resetOfflineStorage();

        // Check if there's existing data before doing a full reset
        // This prevents data loss during reinstall scenarios
        let hasExistingData = false;
        try {
          const existingOutlets = await api.get("/settings/outlets");
          if (existingOutlets?.data?.length > 0) {
            hasExistingData = true;
          }
        } catch (e) {
          // If checking for existing data fails, proceed with reset
          
        }

        // Only do full reset if there's no existing data
        if (!hasExistingData) {
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
        } else {
          // Just clear the onboarding flag if data exists
          await api.post("/settings/update", { onboarding_complete: "no" });
        }
      } catch (error) {
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
    if (currentStep.id === "register") {
      return register.name.trim().length > 0;
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
      let outletId = 1;

      // First, always try to get existing outlets (for reinstall scenarios)
      try {
        const existingOutlets = await api.get("/settings/outlets");
        if (existingOutlets?.data?.length > 0) {
          // Use existing outlet from previous installation
          outletId = existingOutlets.data[0].id;
        } else {
          // No existing outlets, try to create a new one
          try {
            const outletResponse = await api.post("/settings/outlets/create", {
              name: outlet.name,
              address: outlet.address,
              phone: outlet.phone,
              email: outlet.email,
              receipt_header: receipt.header,
              receipt_footer: receipt.footer,
            });
            outletId = outletResponse?.data?.id || 1;
          } catch (createError) {
            // If creation fails (e.g., license limit or quota), try one more time to get existing outlets
            const retryOutlets = await api.get("/settings/outlets");
            if (retryOutlets?.data?.length > 0) {
              outletId = retryOutlets.data[0].id;
            } else {
              throw new Error("Failed to create or find an outlet. Please check your database and license status.");
            }
          }
        }
      } catch (e) {
        throw new Error("Unable to set up outlet. Please ensure your database is accessible and try again.");
      }

      // 2. Create the register (or update if exists)
      try {
        await api.post("/settings/registers/create", {
          name: register.name,
          outlet_id: outletId,
          opening_cash: parseFloat(register.openingCash) || 0,
          status: "open",
        });
      } catch (registerError) {
        // Continue even if register creation fails
      }

      // 3. Save hardware settings
      await api.post("/settings/update", {
        hardware_printer_type: hardware.printer,
        hardware_printer_name: hardware.printerName,
        hardware_cash_drawer: hardware.cashDrawer ? "yes" : "no",
        hardware_barcode_scanner: hardware.barcodeScanner,
        hardware_scale: hardware.scale,
      });

      // 4. Save payment settings
      await api.post("/settings/update", {
        payment_cash: payments.cash ? "yes" : "no",
        payment_card: payments.card ? "yes" : "no",
        payment_mobile: payments.mobile ? "yes" : "no",
        payment_giftcard: payments.giftCard ? "yes" : "no",
      });

      // 5. Save receipt settings
      await api.post("/settings/update", {
        receipt_header: receipt.header,
        receipt_footer: receipt.footer,
        receipt_paper_width: receipt.paperWidth,
        receipt_show_logo: receipt.showLogo ? "yes" : "no",
        receipt_show_barcode: receipt.showBarcode ? "yes" : "no",
        onboarding_complete: "yes",
      });

      // 6. Handle product import if selected
      if (productImport.method === "sample") {
        // Create a few sample products (optional - implement if needed)
        toast.success("Sample products will be available soon");
      } else if (productImport.method === "import") {
        toast.success(
          `${productImport.importCount} products ready from WooCommerce`,
        );
      }

      // 7. Update the in-memory flag so LayoutOne won't redirect back
      if (typeof readyPosAdmin !== "undefined") {
        readyPosAdmin.onboardingComplete = true;
      }

      toast.success("🎉 Setup complete! Your POS is ready to use.");
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
        <div className="mb-8">
          <div className="flex items-center justify-center gap-1 mb-3 flex-wrap">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-4 h-0.5 rounded-full transition-all duration-300 ${
                      i < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">
              {currentStep.title}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Card */}
        <Card className="rounded-2xl shadow-lg overflow-hidden">
          <CardContent className="p-8 md:p-10 min-h-[450px] flex flex-col">
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
                  Let's configure your point of sale system in a few minutes.
                  We'll guide you through store setup, hardware, payments, and
                  more.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-4 text-xs text-muted-foreground max-w-sm">
                  <span className="flex items-center gap-1.5 p-3 bg-muted/30 rounded-lg">
                    <Store className="w-4 h-4 text-primary" /> Store & Register
                  </span>
                  <span className="flex items-center gap-1.5 p-3 bg-muted/30 rounded-lg">
                    <Cable className="w-4 h-4 text-primary" /> Hardware
                  </span>
                  <span className="flex items-center gap-1.5 p-3 bg-muted/30 rounded-lg">
                    <CreditCard className="w-4 h-4 text-primary" /> Payments
                  </span>
                  <span className="flex items-center gap-1.5 p-3 bg-muted/30 rounded-lg">
                    <Printer className="w-4 h-4 text-primary" /> Receipts
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground pt-2">
                  ⚡ Takes about 3-5 minutes • All settings can be changed later
                </p>
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
                    This creates your primary outlet. You can add more locations
                    later.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      Store Name *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              This name will appear on receipts and reports
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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

            {/* Register Setup */}
            {currentStep.id === "register" && (
              <div className="flex-1 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    Create your first register
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Each physical checkout station needs its own register. You
                    can add more later.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      Register Name *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              Examples: "Front Counter", "Register 1", "Express
                              Lane"
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Main Register"
                      value={register.name}
                      onChange={(e) =>
                        setRegister((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="h-11 text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Wallet className="w-3 h-3" /> Opening Cash Balance
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              Starting cash amount in the drawer (for change).
                              Usually 50-200 in your currency.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                        {getCurrencySymbol()}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={register.openingCash}
                        onChange={(e) =>
                          setRegister((prev) => ({
                            ...prev,
                            openingCash: e.target.value,
                          }))
                        }
                        className="h-11 text-sm font-semibold pl-12"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Optional - You can start with zero and add cash later
                    </p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Register Quick Tips
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] ml-5">
                      <li>Each cashier can open their own shift session</li>
                      <li>Opening cash helps track starting balance</li>
                      <li>
                        Multiple registers can operate simultaneously at one
                        outlet
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Hardware Setup */}
            {currentStep.id === "hardware" && (
              <div className="flex-1 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Cable className="w-5 h-5 text-primary" />
                    Connect your hardware
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Configure printers, scanners, and other POS devices. You can
                    skip and set up later.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Printer className="w-3 h-3" /> Receipt Printer
                    </label>
                    <Select
                      value={hardware.printer}
                      onValueChange={(value) =>
                        setHardware((prev) => ({ ...prev, printer: value }))
                      }>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          None - Print from browser
                        </SelectItem>
                        <SelectItem value="esc-pos">ESC/POS Printer</SelectItem>
                        <SelectItem value="star">Star Printer</SelectItem>
                        <SelectItem value="epson">Epson TM Series</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hardware.printer !== "none" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">
                        Printer Device Name
                      </label>
                      <Input
                        placeholder="e.g. TM-T20, TSP100"
                        value={hardware.printerName}
                        onChange={(e) =>
                          setHardware((prev) => ({
                            ...prev,
                            printerName: e.target.value,
                          }))
                        }
                        className="h-10 text-xs"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between border p-4 rounded-xl bg-muted/5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Cable className="w-3.5 h-3.5" />
                        Cash Drawer
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Automatically open when printing receipts
                      </p>
                    </div>
                    <Switch
                      checked={hardware.cashDrawer}
                      onCheckedChange={(checked) =>
                        setHardware((prev) => ({ ...prev, cashDrawer: checked }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Barcode className="w-3 h-3" /> Barcode Scanner
                    </label>
                    <Select
                      value={hardware.barcodeScanner}
                      onValueChange={(value) =>
                        setHardware((prev) => ({
                          ...prev,
                          barcodeScanner: value,
                        }))
                      }>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keyboard">
                          Keyboard Wedge (Recommended)
                        </SelectItem>
                        <SelectItem value="usb">USB HID Scanner</SelectItem>
                        <SelectItem value="bluetooth">
                          Bluetooth Scanner
                        </SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Most scanners work as "Keyboard Wedge" - no special setup
                      needed
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Scale Integration
                    </label>
                    <Select
                      value={hardware.scale}
                      onValueChange={(value) =>
                        setHardware((prev) => ({ ...prev, scale: value }))
                      }>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="toledo">Toledo Scale</SelectItem>
                        <SelectItem value="mettler">Mettler Toledo</SelectItem>
                        <SelectItem value="cas">CAS Scale</SelectItem>
                      </SelectContent>
                    </Select>
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
                    Enable payment types your business accepts. You can modify
                    these anytime in Settings.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between border p-5 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-green-600" />
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
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-600" />
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

                  <div className="flex items-center justify-between border p-5 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-purple-600" />
                        Mobile Payments
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Apple Pay, Google Pay, Samsung Pay and other contactless
                        wallets.
                      </p>
                    </div>
                    <Switch
                      checked={payments.mobile}
                      onCheckedChange={(checked) =>
                        setPayments((prev) => ({ ...prev, mobile: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border p-5 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <ShoppingCart className="w-4 h-4 text-orange-600" />
                        Gift Cards
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Accept and sell store gift cards with balance tracking.
                      </p>
                    </div>
                    <Switch
                      checked={payments.giftCard}
                      onCheckedChange={(checked) =>
                        setPayments((prev) => ({ ...prev, giftCard: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-semibold flex items-center gap-1.5 mb-1">
                    <Info className="w-3.5 h-3.5" />
                    Split Payments
                  </p>
                  <p className="text-[11px]">
                    Customers can pay with multiple methods in a single
                    transaction (e.g. $50 cash + $30 card).
                  </p>
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
                    Customize what appears on printed receipts. Fine-tune later
                    in the Receipt Designer.
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
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      Header Text
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              Appears at the top. Include store name, address,
                              phone
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <Textarea
                      placeholder={`${outlet.name || "Store Name"}\n${outlet.address || "123 Address St, City"}\nPhone: ${outlet.phone || "(555) 019-2831"}`}
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

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border p-4 rounded-xl bg-muted/5">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground">
                          Show Logo
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Print store logo at top (configure in Settings)
                        </p>
                      </div>
                      <Switch
                        checked={receipt.showLogo}
                        onCheckedChange={(checked) =>
                          setReceipt((prev) => ({ ...prev, showLogo: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between border p-4 rounded-xl bg-muted/5">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground">
                          Order Barcode
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Print scannable barcode for easy order lookup
                        </p>
                      </div>
                      <Switch
                        checked={receipt.showBarcode}
                        onCheckedChange={(checked) =>
                          setReceipt((prev) => ({
                            ...prev,
                            showBarcode: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Product Import */}
            {currentStep.id === "products" && (
              <div className="flex-1 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <PackagePlus className="w-5 h-5 text-primary" />
                    Initial product setup
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Start selling faster by importing existing products or adding
                    them later.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      setProductImport((prev) => ({ ...prev, method: "skip" }))
                    }
                    className={`w-full text-left border-2 p-5 rounded-xl transition-all ${
                      productImport.method === "skip"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            productImport.method === "skip"
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}>
                          {productImport.method === "skip" && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        Skip for now
                      </p>
                      <p className="text-xs text-muted-foreground ml-6">
                        I'll add products manually later in the Inventory
                        section
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // Check WooCommerce product count
                        const response = await api.get("/products/count");
                        const count = response?.data?.count || 0;
                        setProductImport({
                          method: "import",
                          importCount: count,
                        });
                        if (count === 0) {
                          toast.info(
                            "No WooCommerce products found. They'll sync automatically when added.",
                          );
                        } else {
                          toast.success(
                            `Found ${count} products ready to import`,
                          );
                        }
                      } catch (err) {
                        setProductImport({ method: "import", importCount: 0 });
                      }
                    }}
                    className={`w-full text-left border-2 p-5 rounded-xl transition-all ${
                      productImport.method === "import"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            productImport.method === "import"
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}>
                          {productImport.method === "import" && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        Import from WooCommerce
                      </p>
                      <p className="text-xs text-muted-foreground ml-6">
                        Use existing WooCommerce products{" "}
                        {productImport.importCount > 0 &&
                          `(${productImport.importCount} found)`}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setProductImport((prev) => ({ ...prev, method: "sample" }))
                    }
                    className={`w-full text-left border-2 p-5 rounded-xl transition-all ${
                      productImport.method === "sample"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            productImport.method === "sample"
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}>
                          {productImport.method === "sample" && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        Create sample products
                      </p>
                      <p className="text-xs text-muted-foreground ml-6">
                        Add a few demo items to test the system (coming soon)
                      </p>
                    </div>
                  </button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-semibold flex items-center gap-1.5 mb-1">
                    <Info className="w-3.5 h-3.5" />
                    Product Sync
                  </p>
                  <p className="text-[11px]">
                    Ready POS automatically syncs with WooCommerce. Any products
                    added or modified in WooCommerce will appear in your POS.
                  </p>
                </div>
              </div>
            )}

            {/* Done */}
            {currentStep.id === "done" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  You're all set!
                </h1>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Your POS system is configured and ready to process
                  transactions. All settings can be adjusted anytime.
                </p>
                <div className="bg-muted/30 border rounded-xl p-5 text-left w-full max-w-md space-y-3 mt-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Configuration Summary
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Store className="w-3 h-3" /> Store:
                        </span>
                        <span className="font-semibold text-foreground">
                          {outlet.name}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Monitor className="w-3 h-3" /> Register:
                        </span>
                        <span className="font-semibold text-foreground">
                          {register.name}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Printer className="w-3 h-3" /> Printer:
                        </span>
                        <span className="font-semibold text-foreground">
                          {hardware.printer === "none"
                            ? "Browser"
                            : hardware.printer.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <CreditCard className="w-3 h-3" /> Payments:
                        </span>
                        <span className="font-semibold text-foreground">
                          {[
                            payments.cash && "Cash",
                            payments.card && "Card",
                            payments.mobile && "Mobile",
                            payments.giftCard && "Gift Card",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Printer className="w-3 h-3" /> Paper:
                        </span>
                        <span className="font-semibold text-foreground">
                          {receipt.paperWidth}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-[10px] text-muted-foreground pt-2">
                  {hardware.cashDrawer && (
                    <span className="px-2 py-1 bg-muted rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3" /> Cash Drawer
                    </span>
                  )}
                  {hardware.barcodeScanner !== "none" && (
                    <span className="px-2 py-1 bg-muted rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3" /> Barcode Scanner
                    </span>
                  )}
                  {receipt.showBarcode && (
                    <span className="px-2 py-1 bg-muted rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3" /> Order Barcodes
                    </span>
                  )}
                  {productImport.method === "import" &&
                    productImport.importCount > 0 && (
                      <span className="px-2 py-1 bg-muted rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" /> {productImport.importCount}{" "}
                        Products
                      </span>
                    )}
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
