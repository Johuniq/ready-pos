import { atom } from "jotai";

// General POS settings
export const settingsAtom = atom({
  currency_symbol: "$",
  currency_code: "USD",
  tax_rates: [],
  receipt_logo: "",
  receipt_header: "",
  receipt_footer: "Thank you for shopping!",
  payment_cash: "yes",
  payment_card: "yes",
  keyboard_status: "yes",
});

// Selected customer for POS transaction
export const customerAtom = atom(null); // null or { id, username, first_name, last_name, email, phone, ... }

// Cart items array
// Each item: { id, name, price, quantity, regular_price, image, sku, manage_stock, stock_quantity, tax_status, tax_class }
export const cartAtom = atom([]);

// Cart discounts: { type: 'fixed' | 'percent' | null, value: 0 }
export const cartDiscountAtom = atom({
  type: null,
  value: 0,
});

// Applied coupons list
export const cartCouponsAtom = atom([]);

// Order notes / notes for receipt
export const orderNotesAtom = atom("");

// Shipping details: { method: null, cost: 0, address: null }
export const shippingAtom = atom({
  method: null, // { id, title, cost, method_id }
  cost: 0,
  address: null, // { first_name, last_name, address_1, address_2, city, state, postcode, country, phone }
});

// Active register session details
// { has_active: false } or { has_active: true, session: { id, outlet_id, register_id, opening_cash, ... } }
export const sessionAtom = atom({
  has_active: false,
  session: null,
});

// Derived atom: Cart Subtotal
export const cartSubtotalAtom = atom((get) => {
  const cart = get(cartAtom);
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

// Derived atom: Coupon Discount Amount
export const couponDiscountAmountAtom = atom((get) => {
  const cart = get(cartAtom);
  const subtotal = get(cartSubtotalAtom);
  const coupons = get(cartCouponsAtom);

  if (coupons.length === 0) return 0;

  let totalCouponDiscount = 0;

  coupons.forEach((coupon) => {
    // Check minimum/maximum spend constraints
    if (coupon.minimum_amount > 0 && subtotal < coupon.minimum_amount) return;
    if (coupon.maximum_amount > 0 && subtotal > coupon.maximum_amount) return;

    // Helper function to check if item qualifies for coupon
    const itemQualifies = (item) => {
      // Check if product is specifically included
      if (coupon.product_ids && coupon.product_ids.length > 0) {
        if (!coupon.product_ids.includes(item.id)) return false;
      }

      // Check if product is specifically excluded
      if (
        coupon.excluded_product_ids &&
        coupon.excluded_product_ids.length > 0
      ) {
        if (coupon.excluded_product_ids.includes(item.id)) return false;
      }

      // Get item category IDs (handle both array of IDs and array of objects)
      const itemCategoryIds = item.categories
        ? item.categories.map((cat) => (typeof cat === "object" ? cat.id : cat))
        : [];

      // Check if product category is included
      if (coupon.product_categories && coupon.product_categories.length > 0) {
        const hasMatchingCategory = itemCategoryIds.some((catId) =>
          coupon.product_categories.includes(catId),
        );
        if (!hasMatchingCategory) return false;
      }

      // Check if product category is excluded
      if (
        coupon.excluded_product_categories &&
        coupon.excluded_product_categories.length > 0
      ) {
        const hasExcludedCategory = itemCategoryIds.some((catId) =>
          coupon.excluded_product_categories.includes(catId),
        );
        if (hasExcludedCategory) return false;
      }

      return true;
    };

    if (coupon.discount_type === "percent") {
      const hasRestrictions =
        (coupon.product_ids && coupon.product_ids.length > 0) ||
        (coupon.excluded_product_ids &&
          coupon.excluded_product_ids.length > 0) ||
        (coupon.product_categories && coupon.product_categories.length > 0) ||
        (coupon.excluded_product_categories &&
          coupon.excluded_product_categories.length > 0);

      if (hasRestrictions) {
        let qualifyingSum = 0;
        cart.forEach((item) => {
          if (itemQualifies(item)) {
            qualifyingSum += item.price * item.quantity;
          }
        });
        totalCouponDiscount += (qualifyingSum * coupon.amount) / 100;
      } else {
        totalCouponDiscount += (subtotal * coupon.amount) / 100;
      }
    } else if (coupon.discount_type === "fixed_cart") {
      // Fixed cart discount applies to entire cart
      totalCouponDiscount += parseFloat(coupon.amount);
    } else if (coupon.discount_type === "fixed_product") {
      // Fixed product discount applies per qualifying item
      cart.forEach((item) => {
        if (itemQualifies(item)) {
          totalCouponDiscount += parseFloat(coupon.amount) * item.quantity;
        }
      });
    }
  });

  // Ensure discount doesn't exceed subtotal
  return Math.min(subtotal, totalCouponDiscount);
});

// Derived atom: Cart Discount Amount (Manual + Coupon)
export const cartDiscountAmountAtom = atom((get) => {
  const subtotal = get(cartSubtotalAtom);
  const manualDiscount = get(cartDiscountAtom);
  const couponDiscount = get(couponDiscountAmountAtom);

  let manualDiscountAmount = 0;
  if (manualDiscount.type && manualDiscount.value > 0) {
    if (manualDiscount.type === "percent") {
      manualDiscountAmount = (subtotal * manualDiscount.value) / 100;
    } else {
      manualDiscountAmount = manualDiscount.value;
    }
  }

  return Math.min(subtotal, manualDiscountAmount + couponDiscount);
});

// Derived atom: Cart Tax Amount
export const cartTaxAmountAtom = atom((get) => {
  const subtotal = get(cartSubtotalAtom);
  const discountAmount = get(cartDiscountAmountAtom);
  const settings = get(settingsAtom);
  const sessionData = get(sessionAtom);

  const discountedTotal = Math.max(0, subtotal - discountAmount);

  // Check if session has active outlet tax configuration
  const outletTaxConfig = sessionData?.session?.outlet?.tax_config;
  const outletRates = outletTaxConfig?.rates;

  if (outletRates && outletRates.length > 0) {
    const totalRate = outletRates.reduce((sum, r) => sum + r.rate, 0);
    return (discountedTotal * totalRate) / 100;
  }

  if (!settings.tax_rates || settings.tax_rates.length === 0) return 0;

  const totalRate = settings.tax_rates.reduce((sum, r) => sum + r.rate, 0);
  return (discountedTotal * totalRate) / 100;
});

// Derived atom: Cart Grand Total (includes shipping)
export const cartTotalAtom = atom((get) => {
  const subtotal = get(cartSubtotalAtom);
  const discountAmount = get(cartDiscountAmountAtom);
  const taxAmount = get(cartTaxAmountAtom);
  const shipping = get(shippingAtom);
  const shippingCost = shipping.cost || 0;
  return Math.max(0, subtotal - discountAmount + taxAmount + shippingCost);
});
