import React from "react";
import { useLicense } from "@/admin/hooks/useLicense";
import { Crown, Lock } from "lucide-react";

/**
 * <ProGate feature="...">...</ProGate>
 *
 * Wraps any clickable element. If the feature is locked:
 *   - Renders the children at reduced opacity
 *   - Adds a small crown badge in the top-right corner
 *   - Intercepts the click and opens the upgrade modal instead
 *
 * Pass `mode="hide"` to render nothing when locked (instead of showing a teaser).
 *
 * Pass `mode="block"` to disable interaction and visually fade out, but still show.
 *
 * Default mode is "teaser" — visible, dimmed, click opens upgrade modal.
 */
export default function ProGate({
  feature,
  children,
  mode = "teaser",
  className = "",
  fallback = null,
}) {
  const { can, openUpgrade } = useLicense();

  if (can(feature)) {
    return <>{children}</>;
  }

  if (mode === "hide") {
    return fallback;
  }

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openUpgrade(feature);
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onClickCapture={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openUpgrade(feature);
        }
      }}>
      <div
        className={`${
          mode === "block" ? "opacity-50 pointer-events-none" : "opacity-70"
        } select-none`}>
        {children}
      </div>
      <span
        className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm border-2 border-card pointer-events-none"
        title="Pro feature">
        <Crown className="w-2.5 h-2.5" />
      </span>
    </div>
  );
}

/**
 * Inline "Pro" badge to mark menu items, settings rows, etc.
 */
export function ProBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs ${className}`}
      title="Pro feature">
      <Crown className="w-2.5 h-2.5" />
      Pro
    </span>
  );
}

/**
 * Small lock icon used inside table rows or list items where space is tight.
 */
export function ProLock({ className = "" }) {
  return (
    <Lock
      className={`w-3 h-3 text-amber-500 ${className}`}
      aria-label="Pro feature"
    />
  );
}
