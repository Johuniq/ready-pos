import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  TableSkeleton,
} from "@/components/loading/PageSkeleton";
import { ErrorState, EmptyState } from "@/components/error/ErrorState";
import { handleError } from "@/lib/errorHandler";
import {
  DataPanel,
  PageToolbar,
  PaginationBar,
} from "@/admin/components/PageLayout";
import { useTableExport } from "@/hooks/useTableExport";
import { ExportButton } from "@/components/export/ExportButton";
import { formatPriceForExport, formatDateForExport } from "@/lib/export";

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAdjustments, setTotalAdjustments] = useState(0);

  // Filters
  const [filterReason, setFilterReason] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    outlet_id: "",
    product_id: "",
    adjustment_type: "set",
    adjustment_quantity: 0,
    reason: "recount",
    notes: "",
  });

  const adjustmentReasons = [
    { value: "damaged", label: "Damaged" },
    { value: "lost", label: "Lost" },
    { value: "found", label: "Found (Uncounted)" },
    { value: "expired", label: "Expired" },
    { value: "theft", label: "Theft" },
    { value: "recount", label: "Physical Recount" },
    { value: "returned_to_supplier", label: "Returned to Supplier" },
    { value: "promotional_sample", label: "Promotional Sample" },
    { value: "employee_purchase", label: "Employee Purchase" },
    { value: "breakage", label: "Breakage" },
  ];

  useEffect(() => {
    fetchAdjustments(1);
    fetchOutlets();
  }, [filterReason]);

  const fetchAdjustments = async (targetPage = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: targetPage,
        per_page: 20,
      });

      if (filterReason !== "all") {
        params.append("reason", filterReason);
      }

      const data = await api.get(`/inventory/stock-adjustments?${params.toString()}`);
      setAdjustments(data?.adjustments || []);
      setTotalPages(data?.pages || 1);
      setTotalAdjustments(data?.total || 0);
      setPage(targetPage);
    } catch (err) {
      const appError = handleError(err, { showToast: true });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const data = await api.get("/settings/outlets");
      setOutlets(data || []);
    } catch (err) {
      
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
      
    }
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setFormData({ ...formData, product_id: product.id });
    setProducts([]);
  };

  const handleCreateAdjustment = async () => {
    if (!formData.outlet_id || !formData.product_id) {
      toast.error("Please select outlet and product");
      return;
    }

    if (!formData.adjustment_quantity || formData.adjustment_quantity === 0) {
      toast.error("Please enter adjustment quantity");
      return;
    }

    try {
      await api.post("/inventory/stock-adjustments/create", formData);
      toast.success("Stock adjustment created successfully");
      setShowCreateModal(false);
      fetchAdjustments(page);
      resetForm();
    } catch (err) {
      toast.error(err.message || "Failed to create stock adjustment");
    }
  };

  const resetForm = () => {
    setFormData({
      outlet_id: "",
      product_id: "",
      adjustment_type: "set",
      adjustment_quantity: 0,
      reason: "recount",
      notes: "",
    });
    setSelectedProduct(null);
  };

  const getAdjustmentTypeIcon = (type) => {
    switch (type) {
      case "increase":
        return <TrendingUp className="h-3.5 w-3.5 mr-1" />;
      case "decrease":
        return <TrendingDown className="h-3.5 w-3.5 mr-1" />;
      case "set":
        return <Minus className="h-3.5 w-3.5 mr-1" />;
      default:
        return null;
    }
  };

  const getAdjustmentTypeColor = (type) => {
    switch (type) {
      case "increase":
        return "badge-status badge-success";
      case "decrease":
        return "badge-status badge-danger";
      case "set":
        return "badge-status badge-info";
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Export functionality
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => [
      "Adjustment #",
      "Product",
      "Outlet",
      "Type",
      "Previous Qty",
      "Adjustment",
      "New Qty",
      "Reason",
      "Cost Impact",
      "Adjusted By",
      "Date",
    ],
    getRows: () =>
      adjustments.map((adj) => [
        adj.id,
        adj.product_name || "",
        adj.outlet_name || "",
        adj.adjustment_type || "",
        adj.previous_quantity || 0,
        adj.adjustment_quantity || 0,
        adj.new_quantity || 0,
        adj.reason?.replace(/_/g, " ") || "",
        formatPriceForExport(adj.cost_impact || 0),
        adj.adjusted_by_name || "",
        formatDateForExport(adj.created_at),
      ]),
    filename: "ready_pos_stock_adjustments",
    title: "Stock Adjustments Report",
  });

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ErrorState error={error} onRetry={() => fetchAdjustments(1)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageToolbar>
        <div className="flex flex-1 items-center gap-3">
          <Select value={filterReason} onValueChange={setFilterReason}>
            <SelectTrigger className="w-48 h-9 text-xs input-premium bg-background font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="all" className="text-xs">All Reasons</SelectItem>
              {adjustmentReasons.map((reason) => (
                <SelectItem key={reason.value} value={reason.value} className="text-xs">
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAdjustments(page)}
            className="h-9 px-3 gap-1.5 btn-premium bg-background hover:bg-muted/50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <ExportButton
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={loading || adjustments.length === 0}
          />
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="h-9 px-4 gap-2 btn-premium bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs">
          <Plus className="h-4 w-4" />
          New Adjustment
        </Button>
      </PageToolbar>

      <DataPanel>
        {loading ? (
          <TableSkeleton columns={11} rows={10} />
        ) : adjustments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No stock adjustments"
            description="Stock adjustments will appear here when you adjust inventory."
          />
        ) : (
          <>
            <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
              <Table className="premium-table">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase py-3 pl-4">Adjustment #</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Product</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Outlet</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Type</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Previous Qty</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Adjustment</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">New Qty</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Reason</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Cost Impact</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Adjusted By</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-4">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => (
                    <TableRow key={adj.id} className="hover:bg-muted/10">
                      <TableCell className="font-mono text-xs font-semibold py-3.5 pl-4 text-foreground">
                        {adj.adjustment_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-foreground text-sm">{adj.product_name || `Product #${adj.product_id}`}</p>
                          {adj.product_sku && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              SKU: {adj.product_sku}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-semibold">{adj.outlet_name || adj.outlet?.name || `Outlet #${adj.outlet_id}`}</TableCell>
                      <TableCell>
                        <Badge className={getAdjustmentTypeColor(adj.adjustment_type)}>
                          <span className="flex items-center">
                            {getAdjustmentTypeIcon(adj.adjustment_type)}
                            {adj.adjustment_type}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-semibold">
                        {parseFloat(adj.previous_quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-foreground">
                        {adj.adjustment_type === "increase" && "+"}
                        {adj.adjustment_type === "decrease" && "-"}
                        {parseFloat(adj.adjustment_quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-foreground">
                        {parseFloat(adj.new_quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-semibold">
                        {adjustmentReasons.find((r) => r.value === adj.reason)?.label || adj.reason}
                      </TableCell>
                      <TableCell className={
                        parseFloat(adj.cost_impact) > 0
                          ? "text-green-600 font-extrabold"
                          : parseFloat(adj.cost_impact) < 0
                          ? "text-red-600 font-extrabold"
                          : "text-muted-foreground font-semibold"
                      }>
                        {parseFloat(adj.cost_impact) < 0 ? "-" : ""}
                        {formatPrice(Math.abs(adj.cost_impact))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-semibold">
                        {adj.adjusted_by_name || `User #${adj.adjusted_by}`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium text-right pr-4">
                        {formatDate(adj.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalLabel={`${totalAdjustments} adjustments`}
              loading={false}
              onPrevious={() => fetchAdjustments(page - 1)}
              onNext={() => fetchAdjustments(page + 1)}
            />
          </>
        )}
      </DataPanel>

      {/* Create Adjustment Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl rounded-2xl border border-border/60 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Create Stock Adjustment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Outlet *</Label>
                <Select
                  value={formData.outlet_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, outlet_id: value })
                  }>
                  <SelectTrigger className="input-premium bg-background font-medium">
                    <SelectValue placeholder="Select outlet" />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id.toString()} className="text-xs">
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Adjustment Type *</Label>
                <Select
                  value={formData.adjustment_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, adjustment_type: value })
                  }>
                  <SelectTrigger className="input-premium bg-background font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    <SelectItem value="increase" className="text-xs">Increase Stock</SelectItem>
                    <SelectItem value="decrease" className="text-xs">Decrease Stock</SelectItem>
                    <SelectItem value="set" className="text-xs">Set Exact Quantity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Search Product *</Label>
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
                      onClick={() => selectProduct(product)}
                      className="p-2.5 hover:bg-muted/10 cursor-pointer text-xs transition-colors flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          SKU: {product.sku || "N/A"} | Stock: {product.stock_quantity || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-2 p-3 bg-muted/5 rounded-xl border border-border/60">
                  <p className="text-xs font-bold text-foreground">{selectedProduct.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Current Stock: <span className="font-bold text-foreground">{selectedProduct.stock_quantity || 0}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                {formData.adjustment_type === "set"
                  ? "New Quantity *"
                  : "Adjustment Quantity *"}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.adjustment_quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    adjustment_quantity: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder={
                  formData.adjustment_type === "set"
                    ? "Enter exact quantity"
                    : "Enter quantity to adjust"
                }
                className="input-premium bg-background font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Reason *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}>
                <SelectTrigger className="input-premium bg-background font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100000]">
                  {adjustmentReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value} className="text-xs">
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add detailed notes about this adjustment..."
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
            <Button onClick={handleCreateAdjustment} className="btn-premium bg-primary text-primary-foreground hover:bg-primary/95">Create Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
