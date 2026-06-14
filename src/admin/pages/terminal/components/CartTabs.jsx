import React, { useState } from "react";
import { useMultiCart } from "@/admin/hooks/useMultiCart";
import { Plus, X, ShoppingCart, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * Cart tab bar — sits above the CartPanel in the terminal sidebar.
 *
 * Shows one tab per open cart. Active tab is highlighted. User can:
 * - Click a tab to switch carts
 * - Click "+" to add a new cart
 * - Click "×" on a tab to close it (if more than one exists)
 * - Right-click or long-press to rename
 */
export default function CartTabs() {
  const { sessions, activeId, switchCart, addCart, removeCart, renameCart } =
    useMultiCart();

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedCartId, setSelectedCartId] = useState(null);
  const [newCartName, setNewCartName] = useState("");

  const handleRenameClick = (cartId, currentLabel) => {
    setSelectedCartId(cartId);
    setNewCartName(currentLabel);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (newCartName.trim()) {
      renameCart(selectedCartId, newCartName.trim());
      toast.success("Cart renamed successfully");
      setShowRenameModal(false);
    }
  };

  return (
    <>
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
              onClick={() => switchCart(session.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleRenameClick(session.id, session.label);
              }}>
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

              {/* Action buttons - show on hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                {/* Edit/Rename button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameClick(session.id, session.label);
                  }}
                  className="p-0.5 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                  title="Rename cart">
                  <Edit2 className="w-3 h-3" />
                </button>

                {/* Close button — only show when more than 1 cart */}
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCart(session.id);
                    }}
                    className="p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Close cart">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
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

      {/* Rename Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Rename Cart</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground">
                Cart Name
              </label>
              <Input
                type="text"
                required
                placeholder="e.g., John's Order, Table 5..."
                value={newCartName}
                onChange={(e) => setNewCartName(e.target.value)}
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRenameModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
