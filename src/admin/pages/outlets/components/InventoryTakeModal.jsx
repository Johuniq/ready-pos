import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Barcode,
} from "lucide-react";
import { toast } from "sonner";

export default function InventoryTakeModal({
  open,
  onOpenChange,
  outlet,
  onComplete,
}) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form fields
  const [physicalCount, setPhysicalCount] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [reason, setReason] = useState("Recount");
  const [submitting, setSubmitting] = useState(false);

  // Fetch products to search
  const fetchProducts = async (term = "") => {
    setLoadingProducts(true);
    try {
      const params = { limit: 20, page: 1 };
      if (term) params.search = term;
      const data = await api.get("/products/get", params);
      setProducts(data.products || []);
    } catch (err) {
      console.error("Failed to load products for inventory take", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Debounce product searching
  useEffect(() => {
    if (!open) return;
    const delayDebounce = setTimeout(() => {
      fetchProducts(search);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, open]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedProduct(null);
      setPhysicalCount("");
      setLowStockThreshold("5");
      setReason("Recount");
      fetchProducts();
    }
  }, [open]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setPhysicalCount(
      product.stock_quantity !== null && product.stock_quantity !== undefined
        ? String(product.stock_quantity)
        : "0",
    );
    setLowStockThreshold(
      product.low_stock_threshold !== null &&
        product.low_stock_threshold !== undefined
        ? String(product.low_stock_threshold)
        : "5",
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Please select a product to audit");
      return;
    }
    if (physicalCount === "") {
      toast.error("Please enter a physical count");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/inventory/take", {
        outletId: outlet.id,
        productId: selectedProduct.id,
        stockQuantity: parseFloat(physicalCount),
        lowStockThreshold: parseInt(lowStockThreshold),
        reason: reason,
      });

      if (response.success) {
        toast.success(`Inventory updated for ${selectedProduct.name}`);
        if (onComplete) onComplete();
        onOpenChange(false);
      } else {
        toast.error("Failed to update inventory record");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update inventory record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-xl p-0 overflow-hidden flex flex-col h-[85vh] md:h-[650px] select-none font-sans">
        {/* Header */}
        <DialogHeader className="p-5 border-b shrink-0 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <RefreshCw
              className="w-5 h-5 text-primary animate-spin"
              style={{ animationDuration: "8s" }}
            />
            <span>
              Inventory Audit Take —{" "}
              <span className="text-primary">{outlet?.name}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left: Search & Select Product */}
          <div className="w-full md:w-64 border-r p-4 flex flex-col gap-3.5 min-h-0 bg-muted/5 shrink-0">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Select Product
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product..."
                  className="pl-8 h-9 text-xs rounded-lg bg-background"
                />
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {loadingProducts ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic text-center py-6">
                  No products found
                </p>
              ) : (
                products.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod)}
                    className={`w-full text-left p-2 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-2 border ${
                      selectedProduct?.id === prod.id
                        ? "bg-primary/10 border-primary/30 text-primary font-bold shadow-xs"
                        : "bg-background hover:bg-muted/60 border-border/40 text-foreground"
                    }`}>
                    <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0 border border-border/20">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] font-mono text-muted-foreground">
                          POS
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate leading-normal">{prod.name}</p>
                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                        SKU: {prod.sku || "N/A"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: Adjust Details */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-between min-h-0 bg-background">
            {selectedProduct ? (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Selected Product Banner */}
                  <div className="p-3 bg-muted/20 border border-border/40 rounded-xl flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-lg bg-muted border overflow-hidden shrink-0">
                      {selectedProduct.image && (
                        <img
                          src={selectedProduct.image}
                          alt={selectedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-foreground truncate">
                        {selectedProduct.name}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <span className="text-[9px] font-bold bg-muted/20 border border-border/40 text-muted-foreground px-1.5 py-0.5 rounded">
                          SKU: {selectedProduct.sku || "N/A"}
                        </span>
                        <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Current Stock:{" "}
                          {selectedProduct.stock_quantity !== null &&
                          selectedProduct.stock_quantity !== undefined
                            ? selectedProduct.stock_quantity
                            : "Unlimited"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="space-y-3.5">
                    {/* Physical Count */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Actual Physical Count
                      </label>
                      <Input
                        required
                        type="number"
                        step="any"
                        value={physicalCount}
                        onChange={(e) => setPhysicalCount(e.target.value)}
                        placeholder="e.g. 45"
                        className="h-10 text-xs font-bold"
                      />
                    </div>

                    {/* Low Stock Threshold */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Low Stock Alert Threshold
                      </label>
                      <Input
                        required
                        type="number"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        placeholder="e.g. 5"
                        className="h-10 text-xs font-bold"
                      />
                    </div>

                    {/* Reason Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Adjustment Reason
                      </label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100000]">
                          <SelectItem value="Recount" className="text-xs">
                            Standard Recount / Physical Audit
                          </SelectItem>
                          <SelectItem
                            value="Received Delivery"
                            className="text-xs">
                            Received Delivery / Supplier Intake
                          </SelectItem>
                          <SelectItem value="Damaged" className="text-xs">
                            Damaged / Written-off Stock
                          </SelectItem>
                          <SelectItem value="Stolen" className="text-xs">
                            Stolen / Discrepancy Shrinkage
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Submit button inside */}
                <div className="pt-4 border-t mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 text-xs h-10 font-semibold">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-1.5">
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Apply Adjustments</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3.5">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border/20">
                  <AlertCircle className="w-6 h-6 text-muted-foreground opacity-60" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    No Product Selected
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                    Please select a product from the left sidebar to audit
                    inventory counts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
