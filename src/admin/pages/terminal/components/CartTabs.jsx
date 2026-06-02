import React from "react";
import { useMultiCart } from "@/admin/hooks/useMultiCart";
import { Plus, X, ShoppingCart } from "lucide-react";

/**
 * Cart tab bar — sits above the CartPanel in the terminal sidebar.
 *
 * Shows one tab per open cart. Active tab is highlighted. Cashier can:
 * - Click a tab to switch carts
 * - Click "+" to add a new cart
 * - Click "×" on a tab to close it (if more than one exists)
 */
export default function CartTabs() {
  const { sessions, activeId, switchCart, addCart, removeCart } =
    useMultiCart();

  // Only show the tab bar when there's more than 1 cart (or always show for discoverability).
  // We'll always show it so the "+" button is accessible.

  return (
    <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 bg-card border-b overflow-x-auto scrollbar-thin">
      {sessions.map((session) => {
        const isActive = session.id === activeId;
        const itemCount = session.items?.length || 0;

        return (
          <div
            key={session.id}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
              isActive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
            }`}
            onClick={() => switchCart(session.id)}>
            <ShoppingCart className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[80px]">{session.label}</span>
            {itemCount > 0 && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                {itemCount}
              </span>
            )}

            {/* Close button — only show when more than 1 cart */}
            {sessions.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeCart(session.id);
                }}
                className="ml-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                title="Close cart">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {/* Add new cart button */}
      <button
        onClick={() => addCart()}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
        title="New cart">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
