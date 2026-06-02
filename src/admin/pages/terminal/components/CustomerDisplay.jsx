import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Sparkles,
  User,
  Tag,
  Percent,
  Receipt,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

export default function CustomerDisplay() {
  const [state, setState] = useState({
    cart: [],
    customer: null,
    discount: { type: null, value: 0 },
    coupons: [],
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 0,
    settings: {},
  });

  useEffect(() => {
    // Initialize BroadcastChannel
    const channel = new BroadcastChannel("readypos_customer_display");

    const handleMessage = (event) => {
      const { type, data } = event.data || {};
      if (type === "SYNC_STATE") {
        setState(data);
      }
    };

    channel.addEventListener("message", handleMessage);

    // Request initial state from active terminals on mount
    channel.postMessage({ type: "REQUEST_STATE" });

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, []);

  const {
    cart,
    customer,
    discountAmount,
    taxAmount,
    subtotal,
    total,
    coupons,
  } = state;

  const isEmpty = cart.length === 0;

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-background via-muted to-background text-foreground flex flex-col justify-between overflow-hidden p-6 font-sans select-none">
      {/* Header Area */}
      <header className="flex justify-between items-center border-b pb-4 h-16 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 border border-primary/30 rounded-xl shadow-lg shadow-primary/10 animate-pulse">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              READY POS
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Customer Portal
            </p>
          </div>
        </div>

        {customer ? (
          <div className="flex items-center gap-2.5 bg-card/50 border rounded-xl px-4 py-2 text-xs font-semibold backdrop-blur-md">
            <User className="w-4 h-4 text-primary" />
            <span>
              Welcome,{" "}
              <span className="text-primary font-bold">
                {customer.first_name} {customer.last_name || ""}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Sparkles
              className="w-4 h-4 text-warning animate-spin"
              style={{ animationDuration: "6s" }}
            />
            <span>Enjoy Your Shopping</span>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden py-6 gap-6 min-h-0">
        {isEmpty ? (
          /* EMPTY STATE splash screen */
          <div className="flex-1 flex flex-col items-center justify-center text-center relative">
            {/* Background glowing decorations */}
            <div className="absolute w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl -top-20 -left-20 animate-pulse" />
            <div
              className="absolute w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse"
              style={{ animationDelay: "2s" }}
            />

            <div className="relative p-8 bg-card/50 border backdrop-blur-xl rounded-3xl max-w-lg shadow-2xl flex flex-col items-center">
              <div
                className="w-20 h-20 bg-gradient-to-tr from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6 animate-bounce"
                style={{ animationDuration: "3s" }}>
                <ShoppingBag className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-3">
                Welcome to Our Store
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-6">
                Please scan items at the counter. Your transaction details will
                be mirrored here in real-time.
              </p>
              <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-full border text-[11px] font-bold text-primary tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                Ready to checkout
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE CART VIEW */
          <>
            {/* Left Side: Items List */}
            <div className="flex-1 bg-card/50 border rounded-2xl backdrop-blur-md p-5 flex flex-col min-w-0">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                <Receipt className="w-4 h-4 text-primary" />
                <span>
                  Scanning Items (
                  {cart.reduce((sum, item) => sum + item.quantity, 0)})
                </span>
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 custom-scrollbar">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/30 border rounded-xl hover:bg-muted/50 hover:border-primary/20 transition-all duration-150">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-lg bg-muted border overflow-hidden shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate max-w-[280px]">
                          {item.name}
                        </h4>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1">
                          {formatPrice(item.price)}{" "}
                          <span className="font-medium">each</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 shrink-0">
                      <div className="flex items-center justify-center bg-muted border text-foreground rounded-lg px-2.5 py-1 text-xs font-black min-w-10">
                        Qty {item.quantity}
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-foreground">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Totals Summary */}
            <div className="w-96 bg-card/50 border rounded-2xl backdrop-blur-md p-5 flex flex-col justify-between shrink-0">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Total Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-bold text-foreground">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-sm font-semibold text-success bg-success/10 p-2.5 rounded-xl border border-success/20">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 shrink-0" />
                        <span>Coupon & Discounts</span>
                      </span>
                      <span className="font-bold">
                        -{formatPrice(discountAmount)}
                      </span>
                    </div>
                  )}

                  {coupons && coupons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {coupons.map((coupon) => (
                        <span
                          key={coupon.code}
                          className="inline-flex items-center gap-1 bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold px-2 py-0.5 rounded-md">
                          <Percent className="w-2.5 h-2.5" />
                          {coupon.code.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-medium text-muted-foreground border-t pt-3">
                    <span>Sales Tax</span>
                    <span className="font-bold text-foreground">
                      {formatPrice(taxAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t space-y-4">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 flex justify-between items-center shadow-lg">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-muted-foreground">
                    Amount Due
                  </span>
                  <span
                    className="text-3xl font-black text-foreground tracking-tight animate-pulse"
                    style={{ animationDuration: "2s" }}>
                    {formatPrice(total)}
                  </span>
                </div>

                <div className="text-center text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">
                  Thank you for shopping with us!
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Area */}
      <footer className="text-center text-muted-foreground text-[10px] font-bold tracking-widest uppercase border-t pt-4 shrink-0">
        Powered by Ready POS
      </footer>
    </div>
  );
}
