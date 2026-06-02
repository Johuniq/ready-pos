import { atom } from "jotai";

/**
 * Multi-cart management store.
 *
 * Allows cashiers to have multiple carts open simultaneously (like browser tabs).
 * Each cart has its own items, customer, discount, coupons, and notes.
 *
 * The "active" cart is synced to the existing posStore atoms so all existing
 * components (CartPanel, PaymentModal, etc.) work without modification.
 */

// A single cart session shape
const createEmptyCart = (id, label) => ({
  id,
  label: label || `Cart ${id}`,
  items: [],
  customer: null,
  discount: { type: null, value: 0 },
  coupons: [],
  notes: "",
  createdAt: Date.now(),
});

// All cart sessions
export const cartSessionsAtom = atom([createEmptyCart(1, "Cart 1")]);

// Active cart ID
export const activeCartIdAtom = atom(1);

// Next cart ID counter
export const nextCartIdAtom = atom(2);

// Derived: active cart object
export const activeCartAtom = atom((get) => {
  const sessions = get(cartSessionsAtom);
  const activeId = get(activeCartIdAtom);
  return (
    sessions.find((c) => c.id === activeId) ||
    sessions[0] ||
    createEmptyCart(1, "Cart 1")
  );
});

// Derived: cart count
export const cartCountAtom = atom((get) => get(cartSessionsAtom).length);

export { createEmptyCart };
