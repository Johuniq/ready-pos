import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  TruckIcon,
  Plus,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  TableSkeleton,
} from "@/components/loading/PageSkeleton";
import { ErrorState, EmptyState } from "@/components/error/ErrorState";
import { handleError } from "@/lib/errorHandler";
import {
  DataPanel,
  PageHeader,
  PageToolbar,
  PaginationBar,
} from "@/admin/components/PageLayout";
import { useTableExport } from "@/hooks/useTableExport";
import { ExportButton } from "@/components/export/ExportButton";
import { formatDateForExport } from "@/lib/export";

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransfers, setTotalTransfers] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    from_outlet_id: "",
    to_outlet_id: "",
    reason: "stock_balancing",
    notes: "",
  });

  useEffect(() => {
    fetchTransfers(1);
    fetchOutlets();
  }, [filterStatus]);

  const fetchTransfers = async (targetPage = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        per_page: "20",
      });

      if (filterStatus !== "all") {
        params.append("status", filterStatus);
      }

      const data = await api.get(`/inventory/stock-transfers?${params.toString()}`);
      
      // Handle response
      if (!data) {
        throw new Error("No data received from server");
      }

      setTransfers(data?.transfers || []);
      setTotalPages(data?.pages || 1);
      setTotalTransfers(data?.total || 0);
      setPage(targetPage);
    } catch (err) {
      console.error("Stock transfers fetch error:", err);
      console.error("Error details:", {
        status: err.status,
        message: err.message,
        data: err.data
      });
      
      const appError = handleError(err, { showToast: false });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const data = await api.get("/settings/outlets");
      setOutlets(data?.outlets || []);
    } catch (err) {
      console.error("Failed to load outlets:", err);
    }
  };

  const searchProducts = async (query) => {
    if (!query || query.length < 2) {
      setProducts([]);
      return;
    }

    try {
      const data = await api.get(`/products/search?search=${encodeURIComponent(query)}`);
      setProducts(data?.products || []);
    } catch (err) {
      console.error("Failed to search products:", err);
    }
  };

  const addItem = (product) => {
    const exists = selectedItems.find((item) => item.product_id === product.id);
    if (exists) {
      toast.error("Product already added");
      return;
    }

    setSelectedItems([
      ...selectedItems,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
      },
    ]);
  };

  const updateItemQuantity = (productId, quantity) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter((item) => item.product_id !== productId));
  };

  const handleCreateTransfer = async () => {
    if (!formData.from_outlet_id || !formData.to_outlet_id) {
      toast.error("Please select source and destination outlets");
      return;
    }

    if (formData.from_outlet_id === formData.to_outlet_id) {
      toast.error("Source and destination outlets must be different");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    try {
      await api.post("/inventory/stock-transfers/create", {
        ...formData,
        items: selectedItems,
      });

      toast.success("Stock transfer created successfully");
      setShowCreateModal(false);
      fetchTransfers(page);
      resetForm();
    } catch (err) {
      toast.error(err.message || "Failed to create stock transfer");
    }
  };

  const resetForm = () => {
    setFormData({
      from_outlet_id: "",
      to_outlet_id: "",
      reason: "stock_balancing",
      notes: "",
    });
    setSelectedItems([]);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.post("/inventory/stock-transfers/update-status", { id, status });
      toast.success("Transfer status updated");
      fetchTransfers(page);
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "received":
        return "badge-status badge-success";
      case "approved":
        return "badge-status badge-info";
      case "in_transit":
        return "badge-status badge-warning animate-pulse-glow";
      case "pending":
        return "badge-status badge-warning";
      case "cancelled":
        return "badge-status badge-danger";
      default:
        return "badge-status";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Export functionality
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => [
      "Transfer #",
      "From Outlet",
      "To Outlet",
      "Items Count",
      "Reason",
      "Status",
      "Date",
    ],
    getRows: () =>
      transfers.map((transfer) => {
        const items = JSON.parse(transfer.items || "[]");
        return [
          transfer.transfer_number || `#${transfer.id}`,
          transfer.from_outlet?.name || `Outlet #${transfer.from_outlet_id}`,
          transfer.to_outlet?.name || `Outlet #${transfer.to_outlet_id}`,
          items.length,
          transfer.reason?.replace(/_/g, " ") || "",
          transfer.status || "",
          formatDateForExport(transfer.created_at),
        ];
      }),
    filename: "ready_pos_stock_transfers",
    title: "Stock Transfers Report",
  });

  return (
    <div className="space-y-6">
      <PageToolbar summary={loading ? "Loading..." : `${totalTransfers} transfer${totalTransfers !== 1 ? 's' : ''} found`}>
        <div className="flex flex-1 items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48 h-9 text-xs input-premium bg-background font-medium">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="approved" className="text-xs">Approved</SelectItem>
              <SelectItem value="in_transit" className="text-xs">In Transit</SelectItem>
              <SelectItem value="received" className="text-xs">Received</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransfers(page)}
            disabled={loading}
            className="h-9 px-3 gap-1.5 btn-premium bg-background hover:bg-muted/50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <ExportButton
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={loading || transfers.length === 0}
          />
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="h-9 px-4 gap-2 btn-premium bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs">
          <Plus className="h-4 w-4" />
          New Transfer
        </Button>
      </PageToolbar>

      <DataPanel>
        {loading ? (
          <TableSkeleton columns={8} rows={10} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Failed to load transfers</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {error.message || "An error occurred while loading stock transfers."}
              </p>
              {error.type === "server" && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-left">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Possible solutions:
                  </p>
                  <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                    <li>Try deactivating and reactivating the Ready POS plugin</li>
                    <li>Check if you have the required permissions (manage_pos capability)</li>
                    <li>Contact support if the issue persists</li>
                  </ul>
                </div>
              )}
            </div>
            <Button
              onClick={() => fetchTransfers(1)}
              variant="default"
              size="sm"
              className="gap-2 btn-premium bg-primary text-primary-foreground hover:bg-primary/95">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <EmptyState
              title="No stock transfers"
              message="Create a transfer to move inventory between outlets."
            />
          </div>
        ) : (
          <>
            <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
              <Table className="premium-table">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase py-3 pl-4">Transfer #</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">From Outlet</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">To Outlet</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Items</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Reason</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Status</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Date</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => {
                    const items = JSON.parse(transfer.items || "[]");
                    return (
                      <TableRow key={transfer.id} className="hover:bg-muted/10">
                        <TableCell className="font-mono text-xs font-semibold py-3.5 pl-4 text-foreground">
                          {transfer.transfer_number}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-semibold">{transfer.from_outlet?.name || `Outlet #${transfer.from_outlet_id}`}</TableCell>
                        <TableCell className="text-muted-foreground font-semibold">{transfer.to_outlet?.name || `Outlet #${transfer.to_outlet_id}`}</TableCell>
                        <TableCell className="font-bold text-foreground">{items.length} items</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {transfer.reason?.replace(/_/g, " ") || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(transfer.status)}>
                            {transfer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {formatDate(transfer.created_at)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex gap-1 justify-end">
                            {transfer.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(transfer.id, "approved")}
                                className="h-7 px-2.5 text-[10px] btn-premium bg-background hover:bg-muted/50 rounded-lg">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            )}
                            {transfer.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(transfer.id, "in_transit")}
                                className="h-7 px-2.5 text-[10px] btn-premium bg-background hover:bg-muted/50 rounded-lg">
                                <TruckIcon className="h-3 w-3 mr-1" />
                                Ship
                              </Button>
                            )}
                            {transfer.status === "in_transit" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(transfer.id, "received")}
                                className="h-7 px-2.5 text-[10px] btn-premium bg-background hover:bg-muted/50 rounded-lg">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Receive
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalLabel={`${totalTransfers} transfers`}
              loading={false}
              onPrevious={() => fetchTransfers(page - 1)}
              onNext={() => fetchTransfers(page + 1)}
            />
          </>
        )}
      </DataPanel>

      {/* Create Transfer Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Create Stock Transfer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">From Outlet *</Label>
                <Select
                  value={formData.from_outlet_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, from_outlet_id: value })
                  }>
                  <SelectTrigger className="input-premium bg-background font-medium">
                    <SelectValue placeholder="Select source outlet" />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id.toString()} className="text-xs">
                        {outlet.outlet_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">To Outlet *</Label>
                <Select
                  value={formData.to_outlet_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, to_outlet_id: value })
                  }>
                  <SelectTrigger className="input-premium bg-background font-medium">
                    <SelectValue placeholder="Select destination outlet" />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id.toString()} className="text-xs">
                        {outlet.outlet_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Reason</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}>
                <SelectTrigger className="input-premium bg-background font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100000]">
                  <SelectItem value="stock_balancing" className="text-xs">Stock Balancing</SelectItem>
                  <SelectItem value="emergency" className="text-xs">Emergency</SelectItem>
                  <SelectItem value="seasonal" className="text-xs">Seasonal</SelectItem>
                  <SelectItem value="new_outlet" className="text-xs">New Outlet</SelectItem>
                  <SelectItem value="other" className="text-xs">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Search Products</Label>
              <Input
                type="text"
                placeholder="Type to search products..."
                onChange={(e) => searchProducts(e.target.value)}
                className="input-premium bg-background font-medium"
              />
              {products.length > 0 && (
                <div className="mt-2 border border-border/60 rounded-xl max-h-40 overflow-y-auto shadow-xs bg-card divide-y divide-border/60">
                  {products.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addItem(product)}
                      className="p-2.5 hover:bg-muted/10 cursor-pointer text-xs transition-colors flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          SKU: {product.sku || "N/A"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Selected Items</Label>
              {selectedItems.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No items added yet
                </p>
              ) : (
                <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs divide-y divide-border/60 bg-card">
                  {selectedItems.map((item) => (
                    <div
                      key={item.product_id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-muted/5 transition-colors">
                      <div className="flex-1">
                        <p className="font-bold text-foreground">{item.product_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQuantity(
                              item.product_id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-20 h-8 input-premium bg-background font-semibold text-center"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.product_id)}
                          className="h-8 px-2 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes..."
                className="input-premium bg-background font-medium mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="btn-premium bg-background hover:bg-muted/50 text-foreground">
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer} className="btn-premium bg-primary text-primary-foreground hover:bg-primary/95">Create Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
