/**
 * Single source of truth for payment method configuration.
 *
 * Onboarding, the Settings page, and the POS terminal all read and write
 * the same `payment_cash` / `payment_card` fields. Centralising the
 * "is this method enabled?" check here guarantees the three surfaces
 * can never disagree about the value of a setting.
 */

/**
 * Normalise a raw option value coming from the backend (or a UI form)
 * into the canonical `"yes" | "no"` vocabulary we persist.
 *
 * Accepts:
 *   - boolean       (true → "yes", false → "no")
 *   - "yes" / "no"
 *   - truthy / falsy (non-empty strings except "no" → "yes")
 *   - null / undefined → fallback
 *
 * @param {*} value
 * @param {string} fallback  Used when value is null/undefined.
 */
export function normalizeYesNo(value, fallback = "yes") {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  const str = String(value).trim().toLowerCase();
  if (str === "yes" || str === "true" || str === "1" || str === "on") {
    return "yes";
  }
  if (str === "no" || str === "false" || str === "0" || str === "off" || str === "") {
    return "no";
  }
  return fallback;
}

/**
 * Resolve whether a payment method is enabled, using the exact same
 * semantics the backend uses when serving the default settings.
 *
 * Returning `true` for `undefined` keeps the first-paint behaviour
 * identical to a fresh install where the option has never been saved.
 *
 * @param {string|undefined|null} value
 * @returns {boolean}
 */
export function isPaymentMethodEnabled(value) {
  // Match the server-side default (`'yes'`) so an unsaved option
  // reads as enabled everywhere.
  if (value === undefined || value === null) {
    return true;
  }
  return normalizeYesNo(value) === "yes";
}

/**
 * Convenience helper for the two-method shape we currently ship.
 *
 * @param {{payment_cash?: string, payment_card?: string} | null | undefined} settings
 */
export function getEnabledPaymentMethods(settings) {
  if (!settings) {
    return { cash: true, card: true };
  }
  return {
    cash: isPaymentMethodEnabled(settings.payment_cash),
    card: isPaymentMethodEnabled(settings.payment_card),
  };
}

/**
 * Build the request body fragment for `/settings/update` that toggles a
 * payment method. Centralising this keeps the API contract obvious and
 * makes the next payment method (e.g. mobile wallet) a one-line change.
 *
 * @param {"cash"|"card"} method
 * @param {boolean} enabled
 */
export function buildPaymentMethodPatch(method, enabled) {
  return { [`payment_${method}`]: normalizeYesNo(enabled) };
}
