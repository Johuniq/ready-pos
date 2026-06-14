import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
  cartSessionsAtom,
  activeCartIdAtom,
  nextCartIdAtom,
  createEmptyCart,
} from "@/admin/stores/multiCart";
import {
  cartAtom,
  customerAtom,
  cartDiscountAtom,
  cartCouponsAtom,
  orderNotesAtom,
} from "@/admin/stores/posStore";
import { api } from "@/lib/api";

/**
 * Hook for managing multiple simultaneous carts.
 *
 * Syncs the active cart's data to/from the existing posStore atoms so all
 * existing components (CartPanel, PaymentModal, useCart, etc.) continue to
 * work without modification — they just read/write the "active" cart.
 */
export function useMultiCart() {
  const [sessions, setSessions] = useAtom(cartSessionsAtom);
  const [activeId, setActiveId] = useAtom(activeCartIdAtom);
  const [nextId, setNextId] = useAtom(nextCartIdAtom);

  // Setters for the "live" posStore atoms.
  const setCart = useSetAtom(cartAtom);
  const setCustomer = useSetAtom(customerAtom);
  const setDiscount = useSetAtom(cartDiscountAtom);
  const setCoupons = useSetAtom(cartCouponsAtom);
  const setNotes = useSetAtom(orderNotesAtom);

  // Read current posStore atoms into a snapshot.
  const [currentCart] = useAtom(cartAtom);
  const [currentCustomer] = useAtom(customerAtom);
  const [currentDiscount] = useAtom(cartDiscountAtom);
  const [currentCoupons] = useAtom(cartCouponsAtom);
  const [currentNotes] = useAtom(orderNotesAtom);

  /**
   * Save the current posStore state back into the active session.
   */
  const saveCurrentToSession = useCallback(() => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              items: currentCart,
              customer: currentCustomer,
              discount: currentDiscount,
              coupons: currentCoupons,
              notes: currentNotes,
            }
          : s,
      ),
    );
  }, [
    activeId,
    currentCart,
    currentCustomer,
    currentDiscount,
    currentCoupons,
    currentNotes,
    setSessions,
  ]);

  /**
   * Load a session's data into the posStore atoms.
   */
  const loadSession = useCallback(
    (session) => {
      setCart(session.items || []);
      setCustomer(session.customer || null);
      setDiscount(session.discount || { type: null, value: 0 });
      setCoupons(session.coupons || []);
      setNotes(session.notes || "");
    },
    [setCart, setCustomer, setDiscount, setCoupons, setNotes],
  );

  /**
   * Switch to a different cart tab.
   */
  const switchCart = useCallback(
    (targetId) => {
      if (targetId === activeId) return;

      // Save current state before switching.
      saveCurrentToSession();

      // Load the target session.
      const target = sessions.find((s) => s.id === targetId);
      if (target) {
        loadSession(target);
        setActiveId(targetId);
      }
    },
    [activeId, sessions, saveCurrentToSession, loadSession, setActiveId],
  );

  /**
   * Add a new empty cart tab.
   */
  const addCart = useCallback(
    (label) => {
      // Save current cart first.
      saveCurrentToSession();

      const newCart = createEmptyCart(nextId, label || `Cart ${nextId}`);
      setSessions((prev) => [...prev, newCart]);
      setNextId((prev) => prev + 1);

      // Switch to the new cart.
      loadSession(newCart);
      setActiveId(newCart.id);
    },
    [
      nextId,
      saveCurrentToSession,
      setSessions,
      setNextId,
      loadSession,
      setActiveId,
    ],
  );

  /**
   * Close/remove a cart tab. Cannot close the last remaining cart.
   */
  const removeCart = useCallback(
    (targetId) => {
      if (sessions.length <= 1) return; // Can't close the last cart.

      const remaining = sessions.filter((s) => s.id !== targetId);
      setSessions(remaining);

      // If we're closing the active cart, switch to the first remaining one.
      if (targetId === activeId) {
        const next = remaining[0];
        loadSession(next);
        setActiveId(next.id);
      }
    },
    [sessions, activeId, setSessions, loadSession, setActiveId],
  );

  /**
   * Rename a cart tab.
   */
  const renameCart = useCallback(
    (targetId, newLabel) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === targetId ? { ...s, label: newLabel } : s)),
      );
    },
    [setSessions],
  );

  /**
   * After a successful checkout, clear the active cart and remove it if
   * there are other carts. If it's the only cart, just reset it.
   */
  const clearActiveAfterCheckout = useCallback(() => {
    if (sessions.length > 1) {
      removeCart(activeId);
    } else {
      // Reset the single cart.
      const reset = createEmptyCart(activeId, sessions[0]?.label || "Cart 1");
      setSessions([reset]);
      loadSession(reset);
    }
  }, [sessions, activeId, removeCart, setSessions, loadSession]);

  /**
   * Save a cart to server for persistence (unlimited carts).
   */
  const saveCartToServer = useCallback(
    async (cartData) => {
      try {
        const response = await api.post("/carts/save", {
          cart: cartData,
        });
        return response;
      } catch (error) {
        
        throw error;
      }
    },
    [],
  );

  /**
   * Load all saved carts from server.
   */
  const loadCartsFromServer = useCallback(async () => {
    try {
      const response = await api.get("/carts/list");
      return response.carts || [];
    } catch (error) {
      
      return [];
    }
  }, []);

  /**
   * Delete a cart from server.
   */
  const deleteCartFromServer = useCallback(async (cartId) => {
    try {
      await api.delete(`/carts/delete/${cartId}`);
    } catch (error) {
      
      throw error;
    }
  }, []);

  return {
    sessions,
    activeId,
    activeSession: sessions.find((s) => s.id === activeId) || sessions[0],
    cartCount: sessions.length,
    switchCart,
    addCart,
    removeCart,
    renameCart,
    saveCurrentToSession,
    clearActiveAfterCheckout,
    saveCartToServer,
    loadCartsFromServer,
    deleteCartFromServer,
  };
}
