import { useAtom } from "jotai";
import {
  cartAtom,
  cartDiscountAtom,
  cartCouponsAtom,
  customerAtom,
  orderNotesAtom,
  shippingAtom,
} from "../stores/posStore";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const useCart = () => {
  const [cart, setCart] = useAtom(cartAtom);
  const [discount, setDiscount] = useAtom(cartDiscountAtom);
  const [coupons, setCoupons] = useAtom(cartCouponsAtom);
  const [customer, setCustomer] = useAtom(customerAtom);
  const [notes, setNotes] = useAtom(orderNotesAtom);
  const [shipping, setShipping] = useAtom(shippingAtom);

  const addToCart = (product, quantity = 1) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.id === product.id,
      );
      if (existingItemIndex > -1) {
        // Item exists, update quantity
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += quantity;
        return newCart;
      } else {
        // Item doesn't exist, add it
        return [...prevCart, { ...product, quantity }];
      }
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount({ type: null, value: 0 });
    setCoupons([]);
    setCustomer(null);
    setNotes("");
    setShipping({ method: null, cost: 0, address: null });
  };

  const applyDiscount = (type, value) => {
    setDiscount({ type, value: parseFloat(value) || 0 });
  };

  const applyCoupon = async (code) => {
    if (!code) {
      toast.error("Please enter a coupon code.");
      return false;
    }

    const cleanCode = code.trim().toUpperCase();

    if (coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
      toast.error("Coupon is already applied.");
      return false;
    }

    try {
      const response = await api.get("/coupons/validate", { code: cleanCode });

      if (response.success) {
        if (response.individual_use && coupons.length > 0) {
          toast.error("This coupon cannot be combined with other coupons.");
          return false;
        }

        if (coupons.some((c) => c.individual_use)) {
          toast.error("An existing individual-use coupon is already applied.");
          return false;
        }

        setCoupons((prev) => [...prev, response]);
        toast.success(`Coupon "${response.code}" applied successfully!`);
        return true;
      } else {
        toast.error(response.message || "Failed to validate coupon.");
        return false;
      }
    } catch (error) {
      
      toast.error(
        error.message ||
          "Error validating coupon. Please check your connection.",
      );
      return false;
    }
  };

  const removeCoupon = (code) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
    toast.info(`Coupon "${code}" removed.`);
  };

  return {
    cart,
    discount,
    coupons,
    customer,
    notes,
    shipping,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyDiscount,
    applyCoupon,
    removeCoupon,
    setCustomer,
    setNotes,
    setShipping,
  };
};
