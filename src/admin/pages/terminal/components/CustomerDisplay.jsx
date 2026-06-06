import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/currency";
import { ShoppingCart, Package, Tag, Clock, User, Gift } from "lucide-react";

/**
 * Customer-Facing Display (CFD) Component
 * 
 * This is the second screen display that shows real-time cart updates
 * to the customer. It receives data via BroadcastChannel from the main
 * POS terminal and displays:
 * 
 * - Cart items with images, names, prices
 * - Subtotal, discounts, taxes, and total
 * - Customer information
 * - Promotional messages when idle
 * - Welcoming animations
 * 
 * Usage: Open in a new window/second monitor via the Terminal
 * 
 * SECURITY: This component renders in a separate window without WordPress admin UI
 * for security reasons - customers should not see admin interface elements.
 */
export default function CustomerDisplay() {
  // Hide WordPress admin sidebar and other UI elements for security
  useEffect(() => {
    // Hide WordPress admin elements
    const wpAdminBar = document.getElementById('wpadminbar');
    const wpAdminMenu = document.getElementById('adminmenumain');
    const wpAdminMenuWrap = document.getElementById('adminmenuback');
    const wpAdminFooter = document.getElementById('wpfooter');
    const wpContent = document.getElementById('wpcontent');
    const wpBody = document.body;
    
    // Store original styles
    const originalStyles = {
      wpAdminBar: wpAdminBar?.style.display,
      wpAdminMenu: wpAdminMenu?.style.display,
      wpAdminMenuWrap: wpAdminMenuWrap?.style.display,
      wpAdminFooter: wpAdminFooter?.style.display,
      bodyMargin: wpBody?.style.margin,
      bodyPadding: wpBody?.style.padding,
    };
    
    // Hide all WordPress UI
    if (wpAdminBar) wpAdminBar.style.display = 'none';
    if (wpAdminMenu) wpAdminMenu.style.display = 'none';
    if (wpAdminMenuWrap) wpAdminMenuWrap.style.display = 'none';
    if (wpAdminFooter) wpAdminFooter.style.display = 'none';
    if (wpContent) {
      wpContent.style.marginLeft = '0';
      wpContent.style.paddingLeft = '0';
    }
    if (wpBody) {
      wpBody.style.margin = '0';
      wpBody.style.padding = '0';
    }
    
    // Add fullscreen class to body
    wpBody?.classList.add('readypos-customer-display-fullscreen');
    
    // Cleanup: restore original styles when component unmounts
    return () => {
      if (wpAdminBar && originalStyles.wpAdminBar) wpAdminBar.style.display = originalStyles.wpAdminBar;
      if (wpAdminMenu && originalStyles.wpAdminMenu) wpAdminMenu.style.display = originalStyles.wpAdminMenu;
      if (wpAdminMenuWrap && originalStyles.wpAdminMenuWrap) wpAdminMenuWrap.style.display = originalStyles.wpAdminMenuWrap;
      if (wpAdminFooter && originalStyles.wpAdminFooter) wpAdminFooter.style.display = originalStyles.wpAdminFooter;
      if (wpContent) {
        wpContent.style.marginLeft = '';
        wpContent.style.paddingLeft = '';
      }
      if (wpBody) {
        wpBody.style.margin = originalStyles.bodyMargin || '';
        wpBody.style.padding = originalStyles.bodyPadding || '';
      }
      wpBody?.classList.remove('readypos-customer-display-fullscreen');
    };
  }, []);
  
  useEffect(() => {
    // Set page title for customer display window
    document.title = "Customer Display - Ready POS";
  }, []);
  const [state, setState] = useState({
    cart: [],
    customer: null,
    discountAmount: 0,
    taxAmount: 0,
    subtotal: 0,
    total: 0,
    coupons: [],
    settings: {
      currency_symbol: "$",
      site_name: "Ready POS",
      site_logo: "",
      customer_display_message: "Welcome to our store!",
    },
  });

  const [isIdle, setIsIdle] = useState(true);
  const [idleTimer, setIdleTimer] = useState(null);
  const [currentPromo, setCurrentPromo] = useState(0);

  // Build promotional messages from settings (filter out empty ones)
  const promos = [
    {
      icon: <Tag className="w-12 h-12" />,
      title: "Special Offers",
      message: state.settings.customer_display_promo_1 || "Ask our staff about today's deals!",
      color: "from-blue-500/20 to-purple-500/20",
    },
    {
      icon: <Gift className="w-12 h-12" />,
      title: "Loyalty Rewards",
      message: state.settings.customer_display_promo_2 || "Join our rewards program and save more",
      color: "from-green-500/20 to-teal-500/20",
    },
    {
      icon: <Clock className="w-12 h-12" />,
      title: "Extended Hours",
      message: state.settings.customer_display_promo_3 || "Now open every day until 9 PM",
      color: "from-amber-500/20 to-orange-500/20",
    },
    {
      icon: <ShoppingCart className="w-12 h-12" />,
      title: "Online Shopping",
      message: state.settings.customer_display_promo_4 || "Shop online and pick up in store",
      color: "from-pink-500/20 to-rose-500/20",
    },
  ].filter(promo => promo.message.trim() !== "");

  useEffect(() => {
    const channel = new BroadcastChannel("readypos_customer_display");

    // Request initial state
    channel.postMessage({ type: "REQUEST_STATE" });

    // Listen for state updates
    const handleMessage = (event) => {
      if (event.data?.type === "SYNC_STATE") {
        setState(event.data.data);

        // Reset idle state if cart has items
        if (event.data.data.cart.length > 0) {
          setIsIdle(false);

          // Set idle timer based on settings (default 30 seconds)
          if (idleTimer) clearTimeout(idleTimer);
          const timeout = (event.data.data.settings?.customer_display_idle_timeout || 30) * 1000;
          const timer = setTimeout(() => {
            setIsIdle(true);
          }, timeout);
          setIdleTimer(timer);
        }
      }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [idleTimer]);

  // Rotate promotional messages every 5 seconds when idle
  useEffect(() => {
    if (isIdle && promos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPromo((prev) => (prev + 1) % promos.length);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isIdle, promos.length]);

  const hasCart = state.cart.length > 0;
  const customerName = state.customer
    ? `${state.customer.first_name} ${state.customer.last_name}`.trim() ||
      state.customer.username
    : null;

  // Idle/Welcome Screen
  if (isIdle || !hasCart) {
    const currentPromoData = promos[currentPromo];

    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background text-foreground overflow-hidden relative">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center space-y-12 px-12 max-w-4xl animate-in fade-in duration-1000">
          {/* Logo/Store Name */}
          <div className="space-y-4">
            {state.settings.site_logo ? (
              <img
                src={state.settings.site_logo}
                alt={state.settings.site_name}
                className="h-32 mx-auto object-contain"
              />
            ) : (
              <div className="flex items-center justify-center gap-4">
                <div className="bg-primary text-primary-foreground p-6 rounded-2xl">
                  <ShoppingCart className="w-16 h-16" />
                </div>
              </div>
            )}
            <h1 className="text-6xl font-bold text-foreground tracking-tight">
              {state.settings.site_name || "Ready POS"}
            </h1>
          </div>

          {/* Welcome Message */}
          <p className="text-3xl text-muted-foreground font-medium">
            {state.settings.customer_display_message ||
              "Welcome to our store!"}
          </p>

          {/* Promotional Card */}
          {promos.length > 0 && (
            <>
              <div
                className={`bg-gradient-to-br ${currentPromoData.color} border border-border/50 rounded-3xl p-12 backdrop-blur-sm transition-all duration-500 animate-in fade-in slide-in-from-bottom-4`}
                key={currentPromo}>
                <div className="flex flex-col items-center gap-6 text-foreground">
                  <div className="text-primary">{currentPromoData.icon}</div>
                  <h2 className="text-4xl font-bold">{currentPromoData.title}</h2>
                  <p className="text-2xl text-muted-foreground text-center">
                    {currentPromoData.message}
                  </p>
                </div>
              </div>

              {/* Pulsing indicator dots */}
              {promos.length > 1 && (
                <div className="flex gap-3 justify-center">
                  {promos.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        idx === currentPromo
                          ? "bg-primary scale-125"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-center text-muted-foreground text-lg">
          <p>Please place your items on the counter to begin checkout</p>
        </div>
      </div>
    );
  }

  // Active Cart Display
  return (
    <div className="w-screen h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Store Logo/Name */}
          <div className="flex items-center gap-4">
            {state.settings.site_logo ? (
              <img
                src={state.settings.site_logo}
                alt={state.settings.site_name}
                className="h-12 object-contain"
              />
            ) : (
              <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                <ShoppingCart className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {state.settings.site_name || "Ready POS"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Thank you for shopping with us
              </p>
            </div>
          </div>

          {/* Customer Info */}
          {customerName && (
            <div className="flex items-center gap-3 bg-primary/10 text-primary px-6 py-3 rounded-xl border border-primary/20">
              <User className="w-6 h-6" />
              <div>
                <p className="text-xs font-medium opacity-80">Customer</p>
                <p className="text-lg font-bold">{customerName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="space-y-4 max-w-5xl mx-auto">
          {state.cart.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-center gap-6">
                {/* Product Image */}
                <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground/50" />
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-foreground truncate">
                    {item.name}
                  </h3>
                  {item.sku && (
                    <p className="text-sm text-muted-foreground font-mono">
                      SKU: {item.sku}
                    </p>
                  )}
                  {item.variation_attributes &&
                    Object.keys(item.variation_attributes).length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {Object.entries(item.variation_attributes).map(
                          ([key, value]) => (
                            <span
                              key={key}
                              className="text-xs bg-muted px-2 py-1 rounded-md">
                              {key}: {value}
                            </span>
                          )
                        )}
                      </div>
                    )}
                </div>

                {/* Quantity & Price */}
                <div className="text-right shrink-0">
                  <div className="flex items-baseline gap-3 justify-end">
                    <span className="text-lg text-muted-foreground">
                      × {item.quantity}
                    </span>
                    <span className="text-3xl font-bold text-foreground tabular-nums">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatPrice(item.price)} each
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals Footer */}
      <div className="bg-card border-t border-border px-8 py-6 shadow-2xl">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Applied Coupons */}
          {state.coupons.length > 0 && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Tag className="w-5 h-5" />
              <span className="text-sm font-medium">
                Coupons Applied: {state.coupons.map((c) => c.code).join(", ")}
              </span>
            </div>
          )}

          {/* Subtotal */}
          <div className="flex justify-between items-center text-xl">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold tabular-nums">
              {formatPrice(state.subtotal)}
            </span>
          </div>

          {/* Discount */}
          {state.discountAmount > 0 && (
            <div className="flex justify-between items-center text-xl text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Discount
              </span>
              <span className="font-semibold tabular-nums">
                -{formatPrice(state.discountAmount)}
              </span>
            </div>
          )}

          {/* Tax */}
          {state.taxAmount > 0 && (
            <div className="flex justify-between items-center text-xl">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-semibold tabular-nums">
                {formatPrice(state.taxAmount)}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border my-4" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-3xl font-bold text-foreground">Total</span>
            <span className="text-5xl font-bold text-primary tabular-nums">
              {formatPrice(state.total)}
            </span>
          </div>

          {/* Item Count */}
          <div className="text-center text-muted-foreground text-lg pt-2">
            <span className="font-medium">{state.cart.length}</span>{" "}
            {state.cart.length === 1 ? "item" : "items"} •{" "}
            <span className="font-medium">
              {state.cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>{" "}
            total units
          </div>
        </div>
      </div>
    </div>
  );
}
