import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLicense } from "@/admin/hooks/useLicense";
import {
  Crown,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Infinity as InfinityIcon,
  AlertTriangle,
} from "lucide-react";

// Pretty labels for features
const FEATURE_INFO = {
  multi_outlet: { label: "Multiple Outlets", desc: "Manage unlimited stores" },
  multi_register: {
    label: "Multiple Registers",
    desc: "More than one checkout lane per outlet",
  },
  split_payment: {
    label: "Split Payment",
    desc: "Combine cash, card, and gift cards in one transaction",
  },
  gift_cards: {
    label: "Gift Cards & Store Credit",
    desc: "Issue, redeem, and reload customer balances",
  },
  emv_reader: {
    label: "EMV Card Reader",
    desc: "Integrated chip-card payment terminal",
  },
  loyalty_points: {
    label: "Loyalty Points",
    desc: "Reward customers and let them redeem at checkout",
  },
  purchase_history: {
    label: "Customer Purchase History",
    desc: "Full lifetime order timeline per customer",
  },
  advanced_reports: {
    label: "Advanced Reports",
    desc: "Sales, profit, tax and inventory analytics",
  },
  cashier_reports: {
    label: "Cashier Performance",
    desc: "Per-cashier revenue and order volume",
  },
  product_reports: {
    label: "Product Performance",
    desc: "Top sellers, slow movers, profit margins",
  },
  payment_reports: {
    label: "Payment Method Reports",
    desc: "Cash vs card vs digital breakdowns",
  },
  hardware_panel: {
    label: "Hardware Setup",
    desc: "Pair printers, drawers, scanners, scales",
  },
  thermal_printer: {
    label: "Thermal Receipt Printer",
    desc: "Direct ESC/POS printing",
  },
  cash_drawer: {
    label: "Cash Drawer Control",
    desc: "Auto-open drawer on cash sales",
  },
  weight_scale: {
    label: "Weight Scale",
    desc: "USB scales for produce and bulk items",
  },
  usb_scanner: {
    label: "USB Barcode Scanner",
    desc: "Direct HID/serial scanner pairing",
  },
  barcode_labels: {
    label: "Barcode Label Printing",
    desc: "Print product labels with barcode + price",
  },
  inventory_take: {
    label: "Inventory Stocktake",
    desc: "Outlet-level stock counting and reconciliation",
  },
  low_stock_alerts: {
    label: "Low Stock Alerts",
    desc: "Automated reorder warnings",
  },
  employee_shifts: {
    label: "Employee Shift Tracking",
    desc: "Clock-in/clock-out and labor reports",
  },
  offline_sync: {
    label: "Offline Mode",
    desc: "Continue selling without internet",
  },
  conflict_resolution: {
    label: "Sync Conflict Resolution",
    desc: "Idempotency keys and retry queues",
  },
  custom_receipt: {
    label: "Custom Receipt Designer",
    desc: "Custom header, footer, logo on receipts",
  },
  tax_classes: {
    label: "Tax Classes",
    desc: "Multiple tax rates and product tax groups",
  },
  pos_order_prefix: {
    label: "POS Order Prefix",
    desc: "Custom prefix for POS-generated orders",
  },
};

const RESOURCE_INFO = {
  outlets: { label: "Outlets", noun: "outlet" },
  registers: { label: "Registers", noun: "register" },
  cashiers: { label: "Cashier Accounts", noun: "cashier" },
  customers: { label: "Customers", noun: "customer" },
  products: { label: "Products", noun: "product" },
};

const FREE_INCLUDES = [
  "1 outlet, 1 register",
  "Up to 2 cashier accounts",
  "Up to 50 customers",
  "Cash & manual card payments",
  "Basic sales reporting",
  "Receipt printing (browser)",
  "Single-device usage",
];

const PRO_INCLUDES = [
  "Unlimited outlets & registers",
  "Unlimited cashiers & customers",
  "Split payment, gift cards, store credit",
  "Loyalty points & customer history",
  "Advanced reports (cashier, product, payment, profit)",
  "Direct hardware: thermal printer, drawer, scanner, scale",
  "Full offline mode with sync",
  "Barcode label printing",
  "Inventory stocktake & low-stock alerts",
  "Employee shift tracking",
  "Custom receipt designer",
  "Priority email support",
];

export default function UpgradeModal() {
  const lic = useLicense();
  const { upgradeOpen, upgradeReason, closeUpgrade, usage } = lic;

  const upgradeUrl =
    lic.portalUrl ||
    (typeof readyPosAdmin !== "undefined" && readyPosAdmin.upgradeUrl
      ? readyPosAdmin.upgradeUrl
      : "");

  const featureInfo = upgradeReason.feature
    ? FEATURE_INFO[upgradeReason.feature]
    : null;
  const resourceInfo = upgradeReason.resource
    ? RESOURCE_INFO[upgradeReason.resource]
    : null;
  const isQuotaError = !!upgradeReason.resource;

  return (
    <Dialog open={upgradeOpen} onOpenChange={closeUpgrade}>
      <DialogContent className="max-w-3xl rounded-xl select-none p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-500/10 via-primary/5 to-purple-500/10 border-b p-6 text-center shrink-0">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 mb-3">
            <Crown className="w-7 h-7 text-amber-500" />
          </div>
          <DialogHeader className="space-y-2 text-center sm:text-center">
            <DialogTitle className="text-xl font-extrabold tracking-tight text-center">
              {isQuotaError
                ? "You've reached your Free plan limit"
                : "Upgrade to Ready POS Pro"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-md mx-auto text-center">
              {isQuotaError && resourceInfo
                ? `Free plan allows ${upgradeReason.limit} ${
                    resourceInfo.noun
                  }${
                    upgradeReason.limit === 1 ? "" : "s"
                  }. Upgrade to Pro for unlimited.`
                : featureInfo
                ? `Unlock "${featureInfo.label}" and the full retail-grade POS experience.`
                : "Unlock the full retail-grade POS experience."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body — pricing comparison */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Specific reason callout */}
          {(featureInfo || resourceInfo) && (
            <div
              className={`border rounded-xl p-4 flex items-start gap-3 ${
                isQuotaError
                  ? "bg-rose-500/5 border-rose-500/20"
                  : "bg-muted/30 border-border"
              }`}>
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isQuotaError ? "bg-rose-500/10" : "bg-primary/10"
                }`}>
                {isQuotaError ? (
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                {featureInfo && (
                  <>
                    <p className="text-sm font-bold text-foreground">
                      {featureInfo.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {featureInfo.desc}
                    </p>
                  </>
                )}
                {resourceInfo && (
                  <>
                    <p className="text-sm font-bold text-foreground">
                      {resourceInfo.label} limit reached
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You're using {usage[upgradeReason.resource] || 0} of{" "}
                      {upgradeReason.limit}. Upgrade for unlimited.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free tier */}
            <div className="border rounded-2xl p-5 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">Free</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    Current plan
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold">
                  Free
                </Badge>
              </div>
              <ul className="space-y-1.5">
                {FREE_INCLUDES.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro tier */}
            <div className="border-2 border-amber-500/30 rounded-2xl p-5 bg-gradient-to-br from-amber-500/5 via-card to-card space-y-4 relative shadow-md">
              <div className="absolute -top-2.5 left-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <Crown className="w-2.5 h-2.5" />
                Recommended
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    Ready POS Pro
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                  </h3>
                  <p className="text-[10px] text-amber-700 uppercase tracking-wider font-bold">
                    Unlock everything
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {PRO_INCLUDES.slice(0, 8).map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-xs text-muted-foreground italic">
                  <InfinityIcon className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span>+{PRO_INCLUDES.length - 8} more features</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sticky footer with upgrade CTA */}
        <div className="border-t p-4 flex flex-col sm:flex-row gap-2 bg-muted/10 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={closeUpgrade}
            className="text-xs font-semibold gap-1.5">
            <X className="w-3.5 h-3.5" />
            Maybe later
          </Button>
          <Button
            size="sm"
            disabled={!upgradeUrl}
            onClick={() =>
              upgradeUrl &&
              window.open(upgradeUrl, "_blank", "noopener,noreferrer")
            }
            className="flex-1 text-xs font-bold gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md h-10">
            <Crown className="w-3.5 h-3.5" />
            Upgrade to Pro
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
