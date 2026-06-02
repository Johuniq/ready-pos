import React, { useState, useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  cartAtom,
  customerAtom,
  cartDiscountAtom,
  orderNotesAtom,
  heldOrdersCountAtom,
} from "@/admin/stores/posStore";
import { formatPrice } from "@/lib/currency";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2, Clock, User, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useAlert } from "@/components/ui/alert-provider";

export default function HeldCartsModal({ open, onOpenChange }) {
  const { showConfirm } = useAlert();
  const [heldCarts, setHeldCarts] = useState([]);
  const [loading, setLoading] = useState(false);

  const setCart = useSetAtom(cartAtom);
  const setCustomer = useSetAtom(customerAtom);
  const setDiscount = useSetAtom(cartDiscountAtom);
  const setNotes = useSetAtom(orderNotesAtom);
  const setHeldCount = useSetAtom(heldOrdersCountAtom);

  const fetchHeldCarts = async () => {
    setLoading(true);
    try {
      const data = await api.get("/orders/held");
      // API returns array of held orders
      setHeldCarts(data || []);
      setHeldCount(data?.length || 0);
    } catch (err) {
      toast.error("Failed to load held carts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHeldCarts();
    }
  }, [open]);

  const handleResume = async (holdId) => {
    try {
      const response = await api.post("/orders/resume", { holdId });
      if (response && response.cart) {
        const {
          cart_items,
          customer_id,
          discount_type,
          discount_value,
          notes,
        } = response.cart;

        // Load cart items
        setCart(cart_items || []);

        // Load discount
        setDiscount({
          type: discount_type || null,
          value: parseFloat(discount_value) || 0,
        });

        // Load notes
        setNotes(notes || "");

        // Load customer details if present
        if (customer_id && customer_id > 0) {
          try {
            const custDetails = await api.get(`/customers/get/${customer_id}`);
            setCustomer(custDetails);
          } catch (custErr) {
            console.error(
              "Failed to fetch customer details for resumed cart",
              custErr,
            );
            setCustomer({
              id: customer_id,
              first_name: "Customer #" + customer_id,
            });
          }
        } else {
          setCustomer(null);
        }

        toast.success("Cart resumed successfully");
        // Refresh counts
        const remaining = await api.get("/orders/held");
        setHeldCount(remaining?.length || 0);
        onOpenChange(false);
      } else {
        toast.error("Could not resume cart");
      }
    } catch (err) {
      toast.error(err.message || "Failed to resume cart");
    }
  };

  const handleDiscard = async (holdId) => {
    const confirmed = await showConfirm(
      "Are you sure you want to discard this held cart?",
      "Discard Cart"
    );
    if (!confirmed) return;
    
    try {
      // Calling resume endpoint deletes it from the transient database
      await api.post("/orders/resume", { holdId });
      toast.success("Held cart discarded");
      fetchHeldCarts();
    } catch (err) {
      toast.error("Failed to discard held cart");
    }
  };

  // Calculate cart total for display in table
  const getCartTotal = (cartData) => {
    if (!cartData || !cartData.cart_items) return 0;
    const subtotal = cartData.cart_items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    let discountAmt = 0;
    if (cartData.discount_type === "percent") {
      discountAmt =
        (subtotal * (parseFloat(cartData.discount_value) || 0)) / 100;
    } else if (cartData.discount_type === "fixed") {
      discountAmt = parseFloat(cartData.discount_value) || 0;
    }
    return Math.max(0, subtotal - discountAmt);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-xl overflow-hidden flex flex-col max-h-[85vh] p-6 select-none">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span>Parked Carts / Held Orders</span>
            <Badge variant="secondary" className="font-bold">
              {heldCarts.length} Active
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              Loading held carts...
            </div>
          ) : heldCarts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Clock className="w-10 h-10 opacity-30" />
              <p className="font-semibold text-sm">No held carts found</p>
              <p className="text-xs">
                Carts put on hold will appear here for up to 7 days.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase">
                      Time Parked
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Customer ID
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Items Count
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">
                      Total Value
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heldCarts.map((item) => {
                    const totalItems =
                      item.cart?.cart_items?.reduce(
                        (sum, i) => sum + i.quantity,
                        0,
                      ) || 0;
                    const totalVal = getCartTotal(item.cart);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-xs">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            {new Date(item.parked_at).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            {item.cart?.customer_id > 0 ? (
                              <span className="font-semibold text-primary">
                                User #{item.cart.customer_id}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Guest
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">
                          {totalItems} {totalItems === 1 ? "item" : "items"}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground text-right">
                          {formatPrice(totalVal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold hover:bg-primary hover:text-primary-foreground border-primary/20 text-primary"
                              onClick={() => handleResume(item.id)}>
                              <Play className="w-3 h-3 mr-1" />
                              Resume
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDiscard(item.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
