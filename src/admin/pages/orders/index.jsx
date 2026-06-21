import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { printReceipt } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAlert } from "@/components/ui/alert-provider";
import {
  Receipt,
  Search,
  Eye,
  RefreshCw,
  AlertCircle,
  Calendar,
  Banknote,
  Filter,
  X,
  Printer,
  User,
  Mail,
  Phone,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OrdersSkeleton,
  TableSkeleton,
} from "@/components/loading/PageSkeleton";
import { ErrorState, EmptyState } from "@/components/error/ErrorState";
import { handleError } from "@/lib/errorHandler";
import { useAtom } from "jotai";
import { settingsAtom, sessionAtom } from "@/admin/stores/posStore";
import {
  DataPanel,
  PageHeader,
  PageToolbar,
  PaginationBar,
} from "@/admin/components/PageLayout";

export default function Orders() {
  const { showConfirm } = useAlert();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [settings] = useAtom(settingsAtom);
  const [, setSession] = useAtom(sessionAtom);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  // Detail modal state
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Refund form state
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const fetchOrders = async (targetPage = 1) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get(`/orders/get?page=${targetPage}&limit=12`);
      setOrders(data?.orders || []);
      setTotalPages(data?.total_pages || 1);
      setTotalOrders(data?.total || 0);
      setPage(targetPage);
    } catch (err) {
      const appError = handleError(err, { showToast: true });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  // Client-side filtering (orders are already fetched)
  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    if (filterSearch) {
      const term = filterSearch.toLowerCase();
      const matchId = (order.order_number || String(order.id))
        .toLowerCase()
        .includes(term);
      if (!matchId) return false;
    }
    return true;
  });

  const handleOpenDetail = async (orderId) => {
    setSelectedOrderId(orderId);
    setLoadingDetail(true);
    setShowDetailModal(true);
    setOrderDetail(null);
    setRefundAmount("");
    setRefundReason("");
    try {
      const data = await api.get(`/orders/get/${orderId}`);
      setOrderDetail(data);
      if (data) {
        // Default refund amount is the remaining refundable amount
        const refundable = data.refundable_amount ?? data.total;
        setRefundAmount(refundable.toString());
      }
    } catch (err) {
      toast.error("Failed to load order details");
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    const amt = parseFloat(refundAmount) || 0;
    const maxRefund = orderDetail?.refundable_amount ?? orderDetail?.total;
    if (amt <= 0 || amt > maxRefund) {
      toast.error(
        "Please enter a valid refund amount up to " +
          formatPrice(maxRefund),
      );
      return;
    }

    const confirmed = await showConfirm(
      `Are you sure you want to refund ${formatPrice(amt)}?`,
      "Confirm Refund"
    );
    if (!confirmed) return;

    setRefunding(true);
    try {
      const res = await api.post("/orders/refund", {
        orderId: selectedOrderId,
        amount: amt,
        reason: refundReason,
      });

      if (res.success) {
        toast.success("Refund processed successfully!");
        setRefundReason("");
        // Update the modal in place from the response so we never display
        // stale data. handleOpenDetail would re-fetch, which could hit the
        // orders cache and show the pre-refund amount + "completed" status.
        if (orderDetail) {
          const nextRefundable =
            res.refundable_amount ??
            Math.max(
              0,
              Number(orderDetail.total || 0) -
                Number(res.refunded_amount ?? orderDetail.refunded_amount ?? 0),
            );
          setOrderDetail({
            ...orderDetail,
            status: res.status ?? orderDetail.status,
            refunded_amount:
              res.refunded_amount ?? orderDetail.refunded_amount,
            refundable_amount: nextRefundable,
            refund_history:
              res.refund_history ?? orderDetail.refund_history,
          });
          // Default the next refund input to the remaining refundable
          // amount (or clear it if fully refunded).
          setRefundAmount(nextRefundable > 0 ? String(nextRefundable) : "");
        }
        // Refresh the orders list (cache was invalidated server-side, so
        // this returns fresh status/totals).
        fetchOrders(page);

        // Refresh the active POS session so the terminal header's
        // "Drawer Cash Float" badge (opening_cash + cash_total) and the
        // petty-cash ledger reflect the cash that just left the drawer
        // for a cash refund. Server already atomically decremented
        // cash_total/card_total based on the original payment_method.
        // Cache-bust so we don't read a stale `pos_sessions` entry.
        try {
          const refreshedSession = await api.get(
            `/sessions/current?_t=${Date.now()}`,
          );
          if (refreshedSession && refreshedSession.has_active) {
            setSession(refreshedSession);
          }
        } catch (refreshErr) {
          // Non-fatal: the header will self-heal on the next focus /
          // route change once the server cache TTL expires.
        }
      } else {
        toast.error("Failed to process refund");
      }
    } catch (err) {
      toast.error(err.message || "Failed to process refund");
    } finally {
      setRefunding(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!orderDetail) {
      toast.error("No order details available");
      return;
    }

    try {
      printReceipt(orderDetail, settings);
    } catch (err) {
      toast.error("Failed to print receipt");
    }
  };

  if (loading && orders.length === 0) {
    return <OrdersSkeleton />;
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Order History"
        description="Browse, view, and refund orders checked out from the POS terminals."
        actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders(page)}
          disabled={loading}
          className="h-9 text-xs font-semibold btn-premium">
          <RefreshCw
            className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        }
      />

      {/* Filters */}
      <PageToolbar summary={`${filteredOrders.length} of ${totalOrders} orders`}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
          {filterSearch && (
            <button
              onClick={() => setFilterSearch("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Statuses
              </SelectItem>
              <SelectItem value="completed" className="text-xs">
                Completed
              </SelectItem>
              <SelectItem value="processing" className="text-xs">
                Processing
              </SelectItem>
              <SelectItem value="refunded" className="text-xs">
                Refunded
              </SelectItem>
              <SelectItem value="partially-refunded" className="text-xs">
                Partially Refunded
              </SelectItem>
              <SelectItem value="on-hold" className="text-xs">
                On Hold
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageToolbar>

      {/* Orders Table */}
      <DataPanel>
          {loading && orders.length === 0 ? (
            <div className="p-6">
              <TableSkeleton rows={8} columns={7} />
            </div>
          ) : error && orders.length === 0 ? (
            <ErrorState
              title="Failed to Load Orders"
              message={error.message}
              onRetry={() => fetchOrders(page)}
            />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="No orders found"
              message={
                filterSearch || filterStatus !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Checkout orders in the POS terminal to populate this history."
              }
              icon={Receipt}
              action={
                filterSearch || filterStatus !== "all"
                  ? () => {
                      setFilterSearch("");
                      setFilterStatus("all");
                    }
                  : null
              }
              actionLabel={
                filterSearch || filterStatus !== "all" ? "Clear Filters" : null
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="premium-table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-32 pl-6 font-bold uppercase text-[10px] tracking-wider">
                      Order ID
                    </TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider">
                      Date
                    </TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider">
                      Method
                    </TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider text-right">
                      Total
                    </TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider text-center">
                      Status
                    </TableHead>
                    <TableHead className="w-24 pr-6 font-bold uppercase text-[10px] tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/10 border-b border-border/50">
                      <TableCell className="font-bold text-xs text-foreground pl-6">
                        #{order.order_number || order.id}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.date).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs capitalize text-muted-foreground font-medium">
                        {order.payment_method}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground text-right">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell className="text-center">
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
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full btn-premium"
                          onClick={() => handleOpenDetail(order.id)}
                          title="View Details">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            loading={loading}
            totalLabel={
              <>
                Showing page <b>{page}</b> of <b>{totalPages}</b> ({totalOrders} orders)
              </>
            }
            onPrevious={() => fetchOrders(page - 1)}
            onNext={() => fetchOrders(page + 1)}
          />
        )}
      </DataPanel>

      {/* Details Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl rounded-xl select-none overflow-hidden max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <span>
                Order #{orderDetail?.order_number || selectedOrderId} Details
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Transaction audit log and payment reconciliation.
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-muted-foreground">
                Loading order details...
              </p>
            </div>
          ) : orderDetail ? (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-4">
              {/* Meta Grid */}
              <div className="grid grid-cols-3 gap-4 bg-muted/20 p-3 rounded-lg border text-xs">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    Date & Time
                  </span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(orderDetail.date).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    Payment Method
                  </span>
                  <span className="font-semibold text-foreground flex items-center gap-1 capitalize">
                    <Banknote className="w-3.5 h-3.5" />
                    {orderDetail.payment_method}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    Status
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 mt-0.5 ${
                      orderDetail.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20"
                        : orderDetail.status === "refunded" || orderDetail.status === "partially-refunded"
                        ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20"
                        : ""
                    }`}>
                    {orderDetail.status === "partially-refunded" ? "Partial Refund" : orderDetail.status}
                  </Badge>
                </div>
              </div>

              {/* Customer Info */}
              {orderDetail.customer_name && orderDetail.customer_name !== "POS Guest" && (
                <div className="flex items-center gap-4 bg-muted/20 p-3 rounded-lg border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">
                        {orderDetail.customer_name}
                      </p>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        {orderDetail.customer_email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {orderDetail.customer_email}
                          </span>
                        )}
                        {orderDetail.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {orderDetail.customer_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">
                  Items Purchased
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold text-[10px] uppercase py-2">
                          Item Name
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase py-2 text-center">
                          Qty
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase py-2 text-right">
                          Price
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetail.items?.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/10">
                          <TableCell className="text-xs font-semibold py-2 text-foreground">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-xs text-center py-2">
                            x{item.quantity}
                          </TableCell>
                          <TableCell className="text-xs font-bold py-2 text-right text-foreground">
                            {formatPrice(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary & Totals */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground">
                    Payment Summary
                  </h4>
                  <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/15 p-3 rounded-lg border">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(orderDetail.subtotal)}
                      </span>
                    </div>
                    {orderDetail.discount > 0 && (
                      <div className="flex justify-between text-rose-500 dark:text-rose-400">
                        <span>Discount:</span>
                        <span className="font-semibold">
                          - {formatPrice(orderDetail.discount)}
                        </span>
                      </div>
                    )}
                    {orderDetail.tax > 0 && (
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span className="font-semibold text-foreground">
                          {formatPrice(orderDetail.tax)}
                        </span>
                      </div>
                    )}
                    <div className="border-t my-1 pt-1.5 flex justify-between font-bold text-foreground">
                      <span>Total Paid:</span>
                      <span className="text-primary font-black">
                        {formatPrice(orderDetail.total)}
                      </span>
                    </div>
                  </div>

                  {/* Refund reason summary — surfaces the latest refund reason
                      alongside the payment summary so the cashier doesn't have
                      to scroll into the Refund History list. Mirrors what the
                      printed receipt now shows under REFUND INFORMATION. */}
                  {(orderDetail.status === "refunded" ||
                    orderDetail.status === "partially-refunded" ||
                    (orderDetail.refund_history &&
                      orderDetail.refund_history.length > 0)) && (
                    <div className="p-2.5 border rounded-lg bg-rose-500/5 border-rose-500/20 text-xs space-y-1">
                      <p className="text-[9px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
                        Refund Reason
                      </p>
                      {(() => {
                        const history =
                          orderDetail.refund_history &&
                          orderDetail.refund_history.length > 0
                            ? [...orderDetail.refund_history].sort(
                                (a, b) =>
                                  new Date(b.date || 0) -
                                  new Date(a.date || 0),
                              )
                            : [];
                        const latest = history[0];
                        const reason = latest
                          ? latest.reason && latest.reason.trim()
                            ? latest.reason
                            : "No reason provided"
                          : orderDetail.refund_reason && orderDetail.refund_reason.trim()
                          ? orderDetail.refund_reason
                          : "No reason provided";
                        return (
                          <>
                            <p className="font-semibold text-foreground leading-snug">
                              {reason}
                            </p>
                            {latest && (
                              <p className="text-[10px] text-muted-foreground">
                                {formatPrice(latest.amount || 0)}
                                {latest.date
                                  ? ` • ${new Date(latest.date).toLocaleString()}`
                                  : ""}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {orderDetail.payment_method === "cash" && (
                    <div className="p-2.5 border rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex justify-between">
                      <span>
                        Cash Received: {formatPrice(orderDetail.cash_received)}
                      </span>
                      <span>
                        Change Given: {formatPrice(orderDetail.change_given)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Refund Form */}
                <div className="space-y-2 border-l pl-6">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    <span>Manual POS Refund</span>
                  </h4>

                  {/* Refund History */}
                  {orderDetail.refund_history && orderDetail.refund_history.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">
                        Refund History
                      </p>
                      <div className="space-y-1.5 text-xs bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg">
                        {orderDetail.refund_history.map((refund) => (
                          <div key={refund.id} className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <span className="font-semibold text-rose-500 dark:text-rose-400">
                                {formatPrice(refund.amount)}
                              </span>
                              {refund.reason && (
                                <span className="text-muted-foreground ml-1.5">
                                  — {refund.reason}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(refund.date).toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-rose-500/10 pt-1.5 flex justify-between font-bold">
                          <span className="text-foreground">Total Refunded:</span>
                          <span className="text-rose-500 dark:text-rose-400">
                            {formatPrice(orderDetail.refunded_amount)}
                          </span>
                        </div>
                        {orderDetail.refundable_amount > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Remaining Refundable:</span>
                            <span className="font-semibold text-foreground">
                              {formatPrice(orderDetail.refundable_amount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {orderDetail.status === "refunded" ? (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 dark:text-rose-400 text-xs font-semibold leading-normal flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>
                        This transaction has been fully refunded. No further refund
                        actions can be taken.
                      </span>
                    </div>
                  ) : orderDetail.refundable_amount <= 0 ? (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 dark:text-rose-400 text-xs font-semibold leading-normal flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>
                        This transaction has been fully refunded. No further refund
                        actions can be taken.
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleRefund} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Refund Amount
                        </label>
                        <Input
                          type="number"
                          step="any"
                          required
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder="0.00"
                          className="h-9 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Reason for Refund
                        </label>
                        <Input
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="e.g. Damaged goods / customer request"
                          className="h-9 text-xs"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={refunding}
                        className="w-full text-xs h-9 font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-xs">
                        {refunding ? "Processing..." : "Issue Refund"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="border-t pt-3.5 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReceipt}
              disabled={!orderDetail || loadingDetail}
              className="font-semibold text-xs h-9 px-4 gap-1.5">
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailModal(false)}
              className="font-semibold text-xs h-9 px-4">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
