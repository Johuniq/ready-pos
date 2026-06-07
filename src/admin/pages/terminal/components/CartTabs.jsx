import React, { useState, useEffect } from "react";
import { useMultiCart } from "@/admin/hooks/useMultiCart";
import { Plus, X, ShoppingCart, Edit2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

/**
 * Cart tab bar — sits above the CartPanel in the terminal sidebar.
 *
 * Shows one tab per open cart. Active tab is highlighted. Cashier can:
 * - Click a tab to switch carts
 * - Click "+" to add a new cart
 * - Click "×" on a tab to close it (if more than one exists)
 * - Right-click or long-press to rename
 * - Transfer cart to another cashier
 */
export default function CartTabs() {
  const { sessions, activeId, switchCart, addCart, removeCart, renameCart, transferCart } =
    useMultiCart();

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedCartId, setSelectedCartId] = useState(null);
  const [newCartName, setNewCartName] = useState("");
  const [cashiers, setCashiers] = useState([]);
  const [selectedCashierId, setSelectedCashierId] = useState("");
  const [loadingCashiers, setLoadingCashiers] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (showTransferModal) {
      loadCashiers();
    }
  }, [showTransferModal]);

  const loadCashiers = async () => {
    setLoadingCashiers(true);
    try {
      const response = await api.get("/carts/cashiers");
      setCashiers(response.cashiers || []);
    } catch (error) {
      
      toast.error("Failed to load cashier list");
    } finally {
      setLoadingCashiers(false);
    }
  };

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

  const handleTransferClick = (cartId) => {
    // Find the cart session to check if it has items
    const cartSession = sessions.find((s) => s.id === cartId);
    const itemCount = cartSession?.items?.length || 0;

    if (itemCount === 0) {
      toast.error("Cannot transfer an empty cart. Add items to the cart first.");
      return;
    }

    setSelectedCartId(cartId);
    setSelectedCashierId("");
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCashierId) {
      toast.error("Please select a cashier");
      return;
    }

    setTransferring(true);
    try {
      const response = await api.post("/carts/transfer", {
        cartId: selectedCartId,
        targetUserId: parseInt(selectedCashierId),
      });

      if (response.success) {
        // Update local cart owner info
        transferCart(selectedCartId, response.owner_id, response.owner_name);
        toast.success(`Cart transferred to ${response.owner_name}`);
        setShowTransferModal(false);
      }
    } catch (error) {
      
      toast.error(error.message || "Failed to transfer cart");
    } finally {
      setTransferring(false);
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

                {/* Transfer button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTransferClick(session.id);
                  }}
                  className="p-0.5 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-all"
                  title="Transfer cart">
                  <Send className="w-3 h-3" />
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

      {/* Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              Transfer Cart to Cashier
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransferSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground">
                Select Cashier
              </label>
              {loadingCashiers ? (
                <div className="h-9 flex items-center justify-center text-xs text-muted-foreground">
                  Loading cashiers...
                </div>
              ) : (
                <Select value={selectedCashierId} onValueChange={setSelectedCashierId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose cashier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cashiers.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        No other cashiers available
                      </div>
                    ) : (
                      cashiers.map((cashier) => (
                        <SelectItem key={cashier.id} value={cashier.id.toString()}>
                          {cashier.name} (@{cashier.login})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[10px] text-muted-foreground">
                The cart will be transferred to the selected cashier's terminal.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTransferModal(false)}
                disabled={transferring}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={transferring || !selectedCashierId}>
                {transferring ? "Transferring..." : "Transfer Cart"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
