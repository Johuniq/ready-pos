import React from "react";
import { useLicense } from "@/admin/hooks/useLicense";
import { AlertTriangle, Crown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Global license status banner.
 *
 * Renders above page content when the license is in grace period or expired.
 * Stays out of the way when everything is healthy or on Free.
 */
export default function LicenseBanner() {
  const { status, isGrace, isExpired, openUpgrade, portalUrl } = useLicense();

  if (status === "active" || status === "free") {
    return null;
  }

  const upgradeUrl =
    portalUrl ||
    (typeof readyPosAdmin !== "undefined" && readyPosAdmin.upgradeUrl
      ? readyPosAdmin.upgradeUrl
      : "");

  const handleAction = () => {
    if (upgradeUrl) {
      window.open(upgradeUrl, "_blank", "noopener,noreferrer");
    } else {
      openUpgrade();
    }
  };

  let config;
  if (isGrace) {
    config = {
      tone: "warning",
      icon: AlertTriangle,
      title: "Your license has expired",
      description:
        "You're in a 7-day grace period. Pro features still work, but renew soon to avoid interruption.",
      ctaLabel: "Renew license",
    };
  } else if (isExpired) {
    config = {
      tone: "danger",
      icon: AlertTriangle,
      title: "Pro features locked",
      description:
        "Your license has expired and Pro features are now disabled. Renew to restore access.",
      ctaLabel: "Renew now",
    };
  } else {
    return null;
  }

  const toneClasses = {
    warning:
      "bg-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-400",
    danger: "bg-rose-500/5 border-rose-500/30 text-rose-700 dark:text-rose-400",
  };
  const iconBgClasses = {
    warning: "bg-amber-500/15 text-amber-600",
    danger: "bg-rose-500/15 text-rose-600",
  };
  const buttonClasses = {
    warning: "bg-amber-600 hover:bg-amber-700",
    danger: "bg-rose-600 hover:bg-rose-700",
  };

  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 border-b ${
        toneClasses[config.tone]
      }`}>
      <div
        className={`p-1.5 rounded-md shrink-0 ${iconBgClasses[config.tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold leading-tight">{config.title}</p>
        <p className="text-[11px] opacity-80 leading-tight mt-0.5">
          {config.description}
        </p>
      </div>
      <Button
        onClick={handleAction}
        size="sm"
        className={`text-[11px] font-bold text-white px-3 py-1.5 h-auto rounded-md flex items-center gap-1.5 shrink-0 transition-all ${
          buttonClasses[config.tone]
        }`}>
        <Crown className="w-3 h-3" />
        {config.ctaLabel}
        <ExternalLink className="w-2.5 h-2.5" />
      </Button>
    </div>
  );
}
