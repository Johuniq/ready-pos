import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLicense } from "@/admin/hooks/useLicense";
import { toast } from "sonner";
import { useAlert } from "@/components/ui/alert-provider";
import {
  Crown,
  Check,
  X,
  Loader2,
  ExternalLink,
  Key,
  Shield,
  RefreshCw,
  Globe,
  Calendar,
  History,
  Mail,
  User,
  Sparkles,
  Zap,
  Lock,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { PageHeader } from "@/admin/components/PageLayout";
import { cn } from "@/lib/utils";

const FEATURE_GROUPS = [
  { title: "Store", items: ["Unlimited outlets", "Unlimited registers"] },
  {
    title: "Payments",
    items: ["Split payment", "Gift cards & store credit", "EMV card reader"],
  },
  { title: "Customers", items: ["Loyalty points", "Purchase history"] },
  {
    title: "Reports",
    items: ["Cashier performance", "Product performance", "Payment reports"],
  },
  {
    title: "Hardware",
    items: ["Thermal printer", "Cash drawer", "Weight scale", "USB scanner"],
  },
  {
    title: "Operations",
    items: [
      "Barcode labels",
      "Inventory stocktake",
      "Low stock alerts",
      "Employee shifts",
    ],
  },
  { title: "Reliability", items: ["Offline mode", "Sync conflict resolution"] },
];

export default function LicensePage() {
  const { showConfirm } = useAlert();
  const lic = useLicense();
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState({});

  const upgradeUrl =
    lic.portalUrl ||
    (typeof readypos_admin !== "undefined" && readypos_admin.upgradeUrl
      ? readypos_admin.upgradeUrl
      : "");

  const isPro = lic.isPro;
  const planLabel = formatPlanLabel(lic);
  const expiryLabel = formatExpiryLabel(lic);
  const renewalLabel = formatRenewalLabel(lic);
  const trialLabel = formatTrialLabel(lic);

  const setBusyKey = (k, v) => setBusy((b) => ({ ...b, [k]: v }));

  const handleActivate = async (e) => {
    e?.preventDefault();
    if (!keyInput.trim()) {
      toast.error("Please enter your license key");
      return;
    }
    setBusyKey("activate", true);
    try {
      const ok = await lic.activate(keyInput.trim());
      if (ok) {
        toast.success("License activated successfully");
        setKeyInput("");
      } else {
        toast.error("Activation failed");
      }
    } catch (err) {
      toast.error(err.message || "Activation failed");
    } finally {
      setBusyKey("activate", false);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = await showConfirm(
      "Deactivate your license? Pro features will be locked.",
      "Deactivate License"
    );
    if (!confirmed) return;
    
    setBusyKey("deactivate", true);
    try {
      await lic.deactivate();
      toast.info("License deactivated");
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setBusyKey("deactivate", false);
    }
  };

  const handleRevalidate = async () => {
    setBusyKey("revalidate", true);
    try {
      await lic.revalidate();
      toast.success("License validated");
    } catch (err) {
      toast.error(err.message || "Validation failed");
    } finally {
      setBusyKey("revalidate", false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="License Management"
        description="Manage your Ready POS license, view feature access, and monitor usage."
        actions={
          <>
            {isPro && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevalidate}
                  disabled={busy.revalidate}
                  className="h-9 text-xs font-semibold gap-1.5">
                  {busy.revalidate ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Validate License
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeactivate}
                  disabled={busy.deactivate}
                  className="h-9 text-xs font-semibold gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30">
                  {busy.deactivate ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  Deactivate
                </Button>
              </div>
            )}
          </>
        }
      />

      {/* Status Card */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-lg font-bold">
                  {isPro ? "Ready POS Pro" : "Ready POS Free"}
                </CardTitle>
                <StatusBadge status={lic.status} />
              </div>
              <CardDescription className="text-sm">
                {isPro && lic.maskedKey ? (
                  <span className="font-mono font-semibold">{lic.maskedKey}</span>
                ) : (
                  "Upgrade to unlock all premium features and priority support"
                )}
              </CardDescription>
            </div>
            
            {!isPro && upgradeUrl && (
              <Button
                size="sm"
                onClick={() => window.open(upgradeUrl, "_blank")}
                className="h-9 text-xs font-bold gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                Upgrade to Pro
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        {isPro && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 pt-4 border-t border-border/50">
              <LicenseInfoCell
                label="Plan Type"
                value={planLabel}
              />
              <LicenseInfoCell 
                label="Trial Status" 
                value={trialLabel} 
              />
              <LicenseInfoCell 
                label="Expires" 
                value={expiryLabel} 
              />
              <LicenseInfoCell 
                label="Renewal" 
                value={renewalLabel} 
              />
              <LicenseInfoCell
                label="Site Usage"
                value={`${lic.sitesUsed} / ${
                  lic.sitesMax === -1 ? "Unlimited" : lic.sitesMax
                }`}
              />
              <LicenseInfoCell
                label="Licensed To"
                value={lic.customer?.name || "—"}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Activation form */}
      {!isPro && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Activate License</CardTitle>
            <CardDescription className="text-xs">
              Enter your license key to unlock Pro features. Your key starts with "RP".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleActivate}
              className="flex flex-col sm:flex-row gap-2">
              <Input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="RP-XXXX-XXXX-XXXX-XXXX"
                className="h-10 text-sm font-mono flex-1"
                disabled={busy.activate}
              />
              <Button
                type="submit"
                disabled={busy.activate || !keyInput.trim()}
                className="h-10 text-xs font-bold gap-1.5 px-5">
                {busy.activate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Activate
              </Button>
            </form>
            {upgradeUrl && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Don't have a license?{" "}
                  <a
                    href={upgradeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-semibold hover:underline">
                    Purchase Ready POS Pro
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Plan Usage</CardTitle>
          <CardDescription className="text-xs">
            Current resource consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(lic.usage).map(([key, used]) => {
              const limit = lic.limits[key];
              const isUnlimited = limit === undefined || limit < 0;
              const pct = isUnlimited
                ? 0
                : Math.min(100, (used / Math.max(1, limit)) * 100);
              const full = !isUnlimited && used >= limit;
              
              return (
                <div
                  key={key}
                  className={cn(
                    "border rounded-xl p-3 space-y-1.5",
                    full ? "border-rose-500/30 bg-rose-500/5" : "bg-card"
                  )}>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider capitalize">
                    {key}
                  </p>
                  <p className="text-xl font-extrabold text-foreground tabular-nums">
                    {used}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      / {isUnlimited ? "∞" : limit}
                    </span>
                  </p>
                  {!isUnlimited && (
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          full
                            ? "bg-rose-500"
                            : pct > 80
                            ? "bg-amber-500"
                            : "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Pro Features</CardTitle>
            <CardDescription className="text-xs">
              All features included in the Pro plan
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold">
            {FEATURE_GROUPS.reduce((sum, g) => sum + g.items.length, 0)} features
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-xs text-foreground">
                      <Check
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          isPro
                            ? "text-emerald-500"
                            : "text-muted-foreground/40"
                        )}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatPlanLabel(lic) {
  if (lic.isTrial) {
    return "Trial";
  }

  switch (lic.billingInterval) {
    case "yearly":
      return "Yearly";
    case "monthly":
      return "Monthly";
    case "lifetime":
      return "Lifetime";
    default:
      return lic.expiresAt ? "Expiring" : "Lifetime";
  }
}

function formatExpiryLabel(lic) {
  if (lic.isTrial && lic.trialEnd) {
    return `Trial ends ${new Date(lic.trialEnd).toLocaleDateString()}`;
  }
  if (lic.billingInterval === "lifetime" || !lic.expiresAt) {
    return "Lifetime";
  }
  return new Date(lic.expiresAt).toLocaleDateString();
}

function formatRenewalLabel(lic) {
  if (lic.isTrial && lic.trialEnd) {
    const days = Number.isFinite(lic.trialDaysRemaining)
      ? lic.trialDaysRemaining
      : daysUntil(lic.trialEnd);
    return `${days} day${days === 1 ? "" : "s"} left`;
  }

  if (lic.renewalStatus === "cancels_at_period_end") {
    return lic.renewsAt
      ? `Cancels ${new Date(lic.renewsAt).toLocaleDateString()}`
      : "Cancels";
  }
  if (lic.renewsAt) {
    return `Renews ${new Date(lic.renewsAt).toLocaleDateString()}`;
  }
  if (lic.renewalStatus === "expires" && lic.expiresAt) {
    return `Expires ${new Date(lic.expiresAt).toLocaleDateString()}`;
  }
  return lic.billingInterval === "lifetime" ? "No renewal" : "From Polar";
}

function formatTrialLabel(lic) {
  if (!lic.isTrial) {
    return "Not active";
  }

  const days = Number.isFinite(lic.trialDaysRemaining)
    ? lic.trialDaysRemaining
    : daysUntil(lic.trialEnd);
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function daysUntil(value) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 86400000));
}

function InfoCell({ icon: Icon, label, value }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className="text-xs font-bold text-foreground truncate">{value}</p>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }) {
  const config = {
    active: {
      label: "Active",
      className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    },
    grace: {
      label: "Grace Period",
      className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    },
    expired: {
      label: "Expired",
      className: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400",
    },
    invalid: {
      label: "Invalid",
      className: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400",
    },
    free: {
      label: "Free",
      className: "bg-muted text-muted-foreground border-border",
    },
  };

  const { label, className } = config[status] || config.free;

  return (
    <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", className)}>
      {label}
    </Badge>
  );
}

function LicenseInfoCell({ label, value }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
        {label}
      </p>
      <p className="text-xs font-bold text-foreground truncate">{value}</p>
    </div>
  );
}
