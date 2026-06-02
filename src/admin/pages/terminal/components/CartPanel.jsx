import React, { useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  Tag,
  CreditCard,
  Play,
  Pause,
  X,
  Star,
  Gift,
  Truck,
} from "lucide-react";
import { useCart } from "@/admin/hooks/useCart";
import { formatPrice } from "@/lib/currency";
import { useAtom } from "jotai";
import {
  cartSubtotalAtom,
  cartDiscountAmountAtom,
  couponDiscountAmountAtom,
  cartTaxAmountAtom,
  cartTotalAtom,
  cartDiscountAtom,
  orderNotesAtom,
  settingsAtom,
  shippingAtom,
} from "@/admin/stores/posStore";
import CustomerSelect from "./CustomerSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import ShippingModal from "./ShippingModal";

export default function CartPanel({ onOpenPayment, onOpenHeldCarts }) {
  const {
    cart,
    discount,
    coupons,
    notes,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyDiscount,
    applyCoupon,
    removeCoupon,
    setNotes,
    customer,
    setCustomer,
  } = useCart();

  const [subtotal] = useAtom(cartSubtotalAtom);
  const [discountAmount] = useAtom(cartDiscountAmountAtom);
  const [couponDiscount] = useAtom(couponDiscountAmountAtom);
  const [taxAmount] = useAtom(cartTaxAmountAtom);
  const [total] = useAtom(cartTotalAtom);
  const [settings] = useAtom(settingsAtom);
  const [shipping] = useAtom(shippingAtom);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [discountType, setDiscountType] = useState(discount.type || "percent");
  const [discountValue, setDiscountValue] = useState(discount.value || "");
  const [tempNotes, setTempNotes] = useState(notes || "");
  const [couponCodeInput, setCouponCodeInput] = useState("");

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCodeInput) return;
    const success = await applyCoupon(couponCodeInput);
    if (success) {
      setCouponCodeInput("");
    }
  };

  const handleApplyDiscount = (e) => {
    e.preventDefault();
    applyDiscount(discountType, parseFloat(discountValue) || 0);
    setShowDiscountModal(false);
    toast.success("Discount applied successfully");
  };

  const handleSaveNotes = (e) => {
    e.preventDefault();
    setNotes(tempNotes);
    setShowNotesModal(false);
    toast.success("Order notes saved");
  };

  const handleHoldCart = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const payload = {
        cart_items: cart,
        customer_id: customer?.id || 0,
        discount_type: discount.type,
        discount_value: discount.value,
        notes: notes,
      };

      await api.post("/orders/hold", { cart: payload });
      clearCart();
      toast.success("Cart put on hold");
      if (onOpenHeldCarts) {
        // Refresh counts or list if needed
      }
    } catch (err) {
      toast.error(err.message || "Failed to hold cart");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-card text-card-foreground border-l select-none">
      {/* Customer Selector */}
      <CustomerSelect />

      {/* Cart Items Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 opacity-40" />
            </div>
            <p className="font-semibold text-sm">Your cart is empty</p>
            <p className="text-xs text-center mt-1">
              Scan barcodes or tap products to add them here.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3.5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/40 relative group">
                  {/* Item Image */}
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Item Info & Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h5 className="text-xs font-bold text-foreground truncate pr-6 leading-tight">
                        {item.name}
                      </h5>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                        {formatPrice(item.price)} each
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Adjuster */}
                      <div className="flex items-center gap-1 bg-card rounded-md border p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-5 h-5 rounded-sm"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-xs font-bold w-6 text-center text-foreground">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-5 h-5 rounded-sm"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Line Total */}
                      <span className="text-xs font-extrabold text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>

                  {/* Remove Item Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    onClick={() => removeFromCart(item.id)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Summary and Payment Footer */}
      <div className="p-4 border-t bg-muted/20 space-y-3.5 shrink-0">
        {/* Actions row */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDiscountType(discount.type || "percent");
              setDiscountValue(discount.value || "");
              setShowDiscountModal(true);
            }}
            className="flex-1 text-xs font-semibold h-9 rounded-lg">
            <Tag className="w-3.5 h-3.5 mr-1.5 text-primary" />
            {discount.value > 0 ? "Discount Applied" : "Discount"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShippingModal(true)}
            className="flex-1 text-xs font-semibold h-9 rounded-lg">
            <Truck className="w-3.5 h-3.5 mr-1.5 text-primary" />
            {shipping.method ? "Shipping Added" : "Shipping"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTempNotes(notes || "");
              setShowNotesModal(true);
            }}
            className="flex-1 text-xs font-semibold h-9 rounded-lg">
            <Trash2 className="w-3.5 h-3.5 mr-1.5 rotate-180 text-primary" />
            Notes
          </Button>
        </div>

        {/* Coupon Input Form */}
        <div className="pt-0.5 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code..."
              value={couponCodeInput}
              onChange={(e) => setCouponCodeInput(e.target.value)}
              className="h-8 text-xs shrink"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleApplyCoupon}
              className="h-8 text-xs px-3 font-bold">
              Apply
            </Button>
          </div>

          {/* Applied Coupons List */}
          {coupons && coupons.length > 0 && (
            <div className="space-y-1">
              {coupons.map((coupon) => (
                <div
                  key={coupon.code}
                  className="flex justify-between items-center bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-lg border border-primary/20">
                  <span className="font-bold flex items-center gap-1.5">
                    <Tag className="w-3 h-3" />
                    {coupon.code} (
                    {coupon.discount_type === "percent"
                      ? `${coupon.amount}%`
                      : formatPrice(coupon.amount)}
                    )
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-4 h-4 hover:bg-primary/25 rounded-full"
                    onClick={() => removeCoupon(coupon.code)}>
                    <X className="w-3 h-3 text-primary" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Loyalty Points Display - shows when customer is selected and has points */}
        {customer && customer.loyalty_points > 0 && (
          <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <div>
                <span className="font-bold text-foreground">
                  {customer.loyalty_points} pts
                </span>
                <span className="text-muted-foreground ml-1.5 text-[10px]">
                  ≈ {formatPrice(customer.loyalty_points / 100)} available
                </span>
              </div>
            </div>
            {customer.loyalty_points >= 100 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const maxRedeemable = Math.min(
                    Math.floor(customer.loyalty_points / 100) * 100,
                    Math.floor(total * 100),
                  );
                  if (maxRedeemable < 100) {
                    toast.error("Need at least 100 points to redeem");
                    return;
                  }
                  try {
                    const res = await api.post("/customers/redeem-points", {
                      id: customer.id,
                      points: maxRedeemable,
                    });
                    if (res.success) {
                      applyDiscount("fixed", res.discount_amount);
                      setCustomer({
                        ...customer,
                        loyalty_points: res.remaining_points,
                      });
                      toast.success(
                        `Redeemed ${res.points_redeemed} pts → ${formatPrice(
                          res.discount_amount,
                        )} off`,
                      );
                    }
                  } catch (err) {
                    toast.error(err.message || "Failed to redeem points");
                  }
                }}
                className="h-7 text-[10px] font-bold gap-1 hover:bg-amber-500/10 text-amber-700">
                <Gift className="w-3 h-3" />
                Redeem
              </Button>
            )}
          </div>
        )}

        {/* Subtotals */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-semibold text-foreground">
              {formatPrice(subtotal)}
            </span>
          </div>

          {discountAmount - couponDiscount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Manual Discount</span>
              <span className="font-semibold">
                - {formatPrice(discountAmount - couponDiscount)}
              </span>
            </div>
          )}

          {couponDiscount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Coupon Discount</span>
              <span className="font-semibold">
                - {formatPrice(couponDiscount)}
              </span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-semibold text-foreground">
                {formatPrice(taxAmount)}
              </span>
            </div>
          )}

          {shipping.cost > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping ({shipping.method?.title || "Standard"})</span>
              <span className="font-semibold text-foreground">
                {formatPrice(shipping.cost)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm font-extrabold pt-1">
            <span className="text-foreground">Total</span>
            <span className="text-primary text-base font-black">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Checkout CTA */}
        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={clearCart}
            disabled={cart.length === 0}
            className="w-12 h-11 shrink-0 rounded-xl hover:bg-destructive/10 hover:text-destructive border-border"
            title="Clear Cart">
            <Trash2 className="w-4.5 h-4.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleHoldCart}
            disabled={cart.length === 0}
            className="w-12 h-11 shrink-0 rounded-xl border-border"
            title="Hold Order">
            <Pause className="w-4.5 h-4.5 text-amber-500" />
          </Button>

          <Button
            type="button"
            onClick={onOpenPayment}
            disabled={cart.length === 0}
            className="flex-1 h-11 text-xs font-bold rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-2">
            <CreditCard className="w-4.5 h-4.5" />
            <span>Pay {formatPrice(total)}</span>
          </Button>
        </div>
      </div>

      {/* Discount Modal */}
      <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              Apply Order Discount
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApplyDiscount} className="space-y-4 py-2">
            <div className="flex rounded-lg border overflow-hidden">
              <Button
                type="button"
                variant={discountType === "percent" ? "default" : "ghost"}
                className="flex-1 rounded-none text-xs font-semibold h-8"
                onClick={() => setDiscountType("percent")}>
                Percentage (%)
              </Button>
              <Button
                type="button"
                variant={discountType === "fixed" ? "default" : "ghost"}
                className="flex-1 rounded-none text-xs font-semibold h-8"
                onClick={() => setDiscountType("fixed")}>
                Fixed Amount ({settings.currency_symbol || "$"})
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground">
                Discount Value
              </label>
              <Input
                type="number"
                step="any"
                required
                min="0"
                max={discountType === "percent" ? "100" : undefined}
                placeholder="Enter value..."
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDiscountModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Apply
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notes Modal */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              Add Order Notes
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNotes} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground">
                Notes (prints on receipt)
              </label>
              <Textarea
                placeholder="Enter order comments, cashier instructions..."
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                className="text-xs min-h-24 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNotesModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Notes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shipping Modal */}
      <ShippingModal
        open={showShippingModal}
        onOpenChange={setShowShippingModal}
      />
    </div>
  );
}
