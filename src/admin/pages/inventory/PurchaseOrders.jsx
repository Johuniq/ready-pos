import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";
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
import { toast } from "sonner";
import { ShoppingCart, RefreshCw, CheckCircle, XCircle, Plus } from "lucide-react";
import { TableSkeleton } from "@/components/loading/PageSkeleton";
import { EmptyState } from "@/components/error/ErrorState";
import { useTableExport } from "@/hooks/useTableExport";
import { ExportButton } from "@/components/export/ExportButton";
import { formatPriceForExport, formatDateForExport } from "@/lib/export";

export default function PurchaseOrders({ prefilledData, clearPrefilledData }) {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal and creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  // Form data state
  const [formData, setFormData] = useState({
    supplier_id: "",
    outlet_id: "",
    expected_delivery_date: "",
    tax_amount: 0,
    shipping_cost: 0,
    notes: "",
  });

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchOutlets();
  }, []);

  useEffect(() => {
    if (prefilledData) {
      setFormData((prev) => ({
        ...prev,
        outlet_id: prefilledData.outletId ? prefilledData.outletId.toString() : "",
      }));
      setSelectedItems([
        {
          product_id: prefilledData.productId,
          product_name: prefilledData.productName,
          quantity: prefilledData.suggestedQty || 10,
          unit_cost: prefilledData.price || 0,
        },
      ]);
      setShowCreateModal(true);
      if (clearPrefilledData) {
        clearPrefilledData();
      }
    }
  }, [prefilledData]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const data = await api.get("/inventory/purchase-orders");
      setPos(data?.purchase_orders || []);
    } catch (err) {
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await api.get("/inventory/suppliers");
      setSuppliers(data?.suppliers || []);
    } catch (err) {
      
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
      const data = await api.get(`/products/get?search=${encodeURIComponent(query)}`);
      setProducts(data?.products || []);
    } catch (err) {
      
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
        unit_cost: product.price || 0,
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

  const updateItemUnitCost = (productId, unitCost) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.product_id === productId
          ? { ...item, unit_cost: Math.max(0, parseFloat(unitCost) || 0) }
          : item
      )
    );
  };

  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter((item) => item.product_id !== productId));
  };

  const handleCreatePurchaseOrder = async () => {
    if (!formData.supplier_id || !formData.outlet_id) {
      toast.error("Please select supplier and outlet");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    try {
      await api.post("/inventory/purchase-orders/create", {
        supplier_id: parseInt(formData.supplier_id),
        outlet_id: parseInt(formData.outlet_id),
        expected_delivery_date: formData.expected_delivery_date,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        shipping_cost: parseFloat(formData.shipping_cost) || 0,
        notes: formData.notes,
        items: selectedItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        })),
      });

      toast.success("Purchase order created successfully");
      setShowCreateModal(false);
      fetchPurchaseOrders();
      resetForm();
    } catch (err) {
      toast.error(err.message || "Failed to create purchase order");
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      outlet_id: "",
      expected_delivery_date: "",
      tax_amount: 0,
      shipping_cost: 0,
      notes: "",
    });
    setSelectedItems([]);
    setProducts([]);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.post("/inventory/purchase-orders/update-status", { id, status });
      toast.success("Purchase order updated");
      fetchPurchaseOrders();
    } catch (err) {
      toast.error(err.message || "Failed to update purchase order");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "received":
        return "badge-status badge-success";
      case "approved":
        return "badge-status badge-info";
      case "submitted":
        return "badge-status badge-warning animate-pulse-glow";
      case "draft":
        return "badge-status";
      default:
        return "badge-status";
    }
  };

  // Calculate totals
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );
  const grandTotal =
    subtotal + (parseFloat(formData.tax_amount) || 0) + (parseFloat(formData.shipping_cost) || 0);

  // Export functionality
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => [
      "PO Number",
      "Supplier",
      "Outlet",
      "Subtotal",
      "Tax",
      "Shipping",
      "Grand Total",
      "Expected Delivery",
      "Status",
    ],
    getRows: () =>
      pos.map((po) => [
        po.po_number || `#${po.id}`,
        po.supplier?.supplier_name || `Supplier #${po.supplier_id}`,
        po.outlet?.name || `Outlet #${po.outlet_id}`,
        formatPriceForExport(po.subtotal || 0),
        formatPriceForExport(po.tax_amount || 0),
        formatPriceForExport(po.shipping_cost || 0),
        formatPriceForExport(po.grand_total || 0),
        po.expected_delivery_date ? formatDateForExport(po.expected_delivery_date) : "",
        po.status || "",
      ]),
    filename: "ready_pos_purchase_orders",
    title: "Purchase Orders Report",
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPurchaseOrders}
            className="h-9 px-3 gap-1.5 btn-premium bg-background hover:bg-muted/50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <ExportButton
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={loading || pos.length === 0}
          />
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="h-9 px-4 gap-2 btn-premium bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs">
          <Plus className="h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={7} rows={8} />
      ) : pos.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchase orders"
          description="Create purchase orders from suppliers."
        />
      ) : (
        <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
          <Table className="premium-table">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold text-[10px] uppercase py-3 pl-4">PO Number</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Supplier</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Outlet</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Total</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Expected Delivery</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Status</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => (
                <TableRow key={po.id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-xs font-semibold py-3.5 pl-4 text-foreground">{po.po_number}</TableCell>
                  <TableCell className="font-bold text-foreground">
                    {po.supplier?.supplier_name || `Supplier #${po.supplier_id}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-semibold">{po.outlet?.name || `Outlet #${po.outlet_id}`}</TableCell>
                  <TableCell className="font-extrabold text-foreground">
                    {formatPrice(po.grand_total)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-semibold">
                    {po.expected_delivery_date
                      ? new Date(po.expected_delivery_date).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex gap-1 justify-end">
                      {po.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(po.id, "submitted")}
                          className="h-7 px-2.5 text-[10px] btn-premium bg-background hover:bg-muted/50 rounded-lg">
                          Submit
                        </Button>
                      )}
                      {po.status === "submitted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(po.id, "approved")}
                          className="h-7 px-2.5 text-[10px] btn-premium bg-background hover:bg-muted/50 rounded-lg">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      )}
                      {po.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(po.id, "received")}
                          className="h-7 px-2.5 text-[10px] btn-premium bg-background hover:bg-muted/50 rounded-lg">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Receive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Create Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Supplier *</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplier_id: value })
                  }>
                  <SelectTrigger className="input-premium bg-background font-medium">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                        {s.supplier_name} ({s.supplier_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Outlet *</Label>
                <Select
                  value={formData.outlet_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, outlet_id: value })
                  }>
                  <SelectTrigger className="input-premium bg-background font-medium">
                    <SelectValue placeholder="Select Target Outlet" />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {outlets.map((o) => (
                      <SelectItem key={o.id} value={o.id.toString()} className="text-xs">
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Expected Delivery</Label>
                <Input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_delivery_date: e.target.value })
                  }
                  className="input-premium bg-background font-medium text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Tax Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.tax_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })
                  }
                  className="input-premium bg-background font-medium text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Shipping Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.shipping_cost}
                  onChange={(e) =>
                    setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })
                  }
                  className="input-premium bg-background font-medium text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Search Products</Label>
              <Input
                type="text"
                placeholder="Type product name to search..."
                onChange={(e) => searchProducts(e.target.value)}
                className="input-premium bg-background font-medium text-xs h-9"
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
                          SKU: {product.sku || "N/A"} - Price: {formatPrice(product.price)}
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
                <p className="text-xs text-muted-foreground italic">No items added to the purchase order yet.</p>
              ) : (
                <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs divide-y divide-border/60 bg-card">
                  {selectedItems.map((item) => (
                    <div
                      key={item.product_id}
                      className="p-3 flex items-center gap-4 text-xs hover:bg-muted/5 transition-colors">
                      <div className="flex-1 font-bold text-foreground">
                        {item.product_name}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Qty</span>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(item.product_id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 h-8 input-premium bg-background font-semibold text-center text-xs"
                          />
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Cost per unit</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={(e) =>
                              updateItemUnitCost(item.product_id, e.target.value)
                            }
                            className="w-24 h-8 input-premium bg-background font-semibold text-center text-xs"
                          />
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-16 text-right justify-center">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Total</span>
                          <span className="font-extrabold text-foreground py-1">
                            {formatPrice(item.quantity * item.unit_cost)}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.product_id)}
                          className="h-8 px-2 mt-4 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedItems.length > 0 && (
              <div className="p-3 bg-muted/20 border border-border/40 rounded-xl flex justify-between text-xs font-semibold">
                <div>
                  <span className="text-muted-foreground mr-4">Subtotal: {formatPrice(subtotal)}</span>
                  <span className="text-muted-foreground mr-4">Tax: {formatPrice(formData.tax_amount)}</span>
                  <span className="text-muted-foreground">Shipping: {formatPrice(formData.shipping_cost)}</span>
                </div>
                <div className="font-extrabold text-sm text-foreground">
                  Grand Total: {formatPrice(grandTotal)}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any instructions, billing, or shipping terms..."
                className="input-premium bg-background font-medium mt-1 text-xs"
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
            <Button
              onClick={handleCreatePurchaseOrder}
              className="btn-premium bg-primary text-primary-foreground hover:bg-primary/95">
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
