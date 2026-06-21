import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/currency";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Star,
  ShoppingBag,
  Calendar,
  Receipt,
  Loader2,
} from "lucide-react";

/**
 * Customer detail modal showing profile info, loyalty points, and purchase history.
 *
 * Props:
 *  - open
 *  - onOpenChange
 *  - customer       The customer object (from the list)
 */
export default function CustomerDetailModal({ open, onOpenChange, customer }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Loyalty display
  const [currentPoints, setCurrentPoints] = useState(0);

  const fetchHistory = async (targetPage = 1) => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const data = await api.get(`/customers/history/${customer.id}`, {
        page: targetPage,
        limit: 8,
      });
      setOrders(data?.orders || []);
      setTotalPages(data?.total_pages || 1);
      setPage(data?.page || targetPage);
    } catch (err) {
      toast.error(err.message || "Failed to load purchase history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && customer?.id) {
      setCurrentPoints(customer.loyalty_points || 0);
      fetchHistory(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-xl select-none overflow-hidden max-h-[90vh] flex flex-col p-0">
        {!customer ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
        {/* Header with customer profile */}
        <div className="p-6 pb-4 border-b bg-muted/10">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                {(customer.first_name?.[0] || "?").toUpperCase()}
              </div>
              <div>
                <span className="block">
                  {customer.first_name} {customer.last_name}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  @{customer.username}
                </span>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Customer profile and purchase history
            </DialogDescription>
          </DialogHeader>

          {/* Contact + Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {customer.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{customer.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{customer.visit_count || 0} visits</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Receipt className="w-3.5 h-3.5 text-primary" />
              <span>{formatPrice(customer.total_spent || 0)} spent</span>
            </div>
          </div>
        </div>

        {/* Loyalty Points Card */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10">
              <Star className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Loyalty Points
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {currentPoints}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Redeem at checkout via the POS terminal
              </p>
            </div>
          </div>
        </div>

        {/* Purchase History */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Purchase History
            </h4>
          </div>

          {loading && orders.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-1">
              <ShoppingBag className="w-8 h-8 opacity-30" />
              <p className="text-xs font-semibold">No purchase history</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase py-2 pl-4">
                        Order
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-2">
                        Date
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-2 text-center">
                        Items
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-2 text-right">
                        Total
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-2 text-center pr-4">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/10">
                        <TableCell className="text-xs font-semibold text-foreground pl-4">
                          #{order.order_number || order.id}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(order.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-center text-muted-foreground">
                          {order.items_count}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground text-right">
                          {formatPrice(order.total)}
                        </TableCell>
                        <TableCell className="text-center pr-4">
                          <Badge
                            className={`badge-status ${
                              order.status === "completed"
                                ? "badge-success"
                                : order.status === "refunded" || order.status === "partially-refunded"
                                ? "badge-danger"
                                : "badge-info"
                            }`}>
                            {order.status === "partially-refunded" ? "Partial Refund" : order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => fetchHistory(page - 1)}
                      className="h-7 text-[10px] font-semibold">
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || loading}
                      onClick={() => fetchHistory(page + 1)}
                      className="h-7 text-[10px] font-semibold">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="font-semibold text-xs h-9 px-4">
            Close
          </Button>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
