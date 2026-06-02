import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  PackageOpen,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
} from "lucide-react";

export default function QuickRestockModal({
  open,
  onOpenChange,
  product,
  onRestockSuccess,
}) {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [reason, setReason] = useState("Supplier Delivery Intake");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchOutlets = async () => {
        try {
          const data = await api.get("/settings/outlets");
          setOutlets(data || []);
          if (data && data.length > 0) {
            setSelectedOutletId(data[0].id.toString());
          }
        } catch (err) {
          toast.error("Failed to load outlets for restocking");
        }
      };
      fetchOutlets();

      if (product) {
        setStockQuantity((product.stock_quantity || 0).toString());
        setLowStockThreshold((product.low_stock_threshold || 5).toString());
      }
    }
  }, [open, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    const parsedStock = parseFloat(stockQuantity);
    const parsedThreshold = parseInt(lowStockThreshold);

    if (isNaN(parsedStock) || parsedStock < 0) {
      toast.error("Please enter a valid stock quantity");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/inventory/take", {
        outletId: parseInt(selectedOutletId),
        productId: product.id,
        stockQuantity: parsedStock,
        lowStockThreshold: isNaN(parsedThreshold) ? 5 : parsedThreshold,
        reason: `${reason} (Recounted from Dashboard Alerts Panel)`,
      });

      if (res.success) {
        toast.success(`Inventory updated for ${product.name}!`);
        if (onRestockSuccess) {
          onRestockSuccess();
        }
        onOpenChange(false);
      } else {
        toast.error("Failed to update inventory stock");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update inventory stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <PackageOpen className="w-5 h-5 text-primary" />
            <span>Quick Restock Inventory</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adjust and replenish stock levels immediately inside WooCommerce POS
            catalog.
          </DialogDescription>
        </DialogHeader>

        {product && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-10 h-10 rounded-lg object-cover bg-card border border-border filter grayscale"
                />
              ) : (
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-[10px] font-bold text-primary">
                  SKU
                </div>
              )}
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-foreground line-clamp-1">
                  {product.name}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                  <span>SKU: {product.sku || "N/A"}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-amber-500 font-extrabold uppercase">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>
                      Stock: {product.stock_quantity} (Min:{" "}
                      {product.low_stock_threshold})
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Outlet Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                Storage Outlet / Warehouse
              </label>
              <Select
                value={selectedOutletId}
                onValueChange={(value) => setSelectedOutletId(value)}
                required>
                <SelectTrigger className="w-full h-10 text-xs rounded-xl font-semibold bg-background border border-input text-foreground">
                  <SelectValue placeholder="Select Outlet" />
                </SelectTrigger>
                <SelectContent className="z-[100000]">
                  {outlets.map((o) => (
                    <SelectItem
                      key={o.id}
                      value={o.id.toString()}
                      className="text-xs">
                      {o.name} ({o.address || "Main Outlet"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Stock Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                  New In-Stock Count
                </label>
                <Input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                  required
                />
              </div>

              {/* Low Stock Alert Threshold */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                  Min Threshold Alert
                </label>
                <Input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Restock Reason */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                Intake Adjustment Reason
              </label>
              <Select
                value={reason}
                onValueChange={(value) => setReason(value)}
                required>
                <SelectTrigger className="w-full h-10 text-xs rounded-xl font-semibold bg-background border border-input text-foreground">
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent className="z-[100000]">
                  <SelectItem
                    value="Supplier Delivery Intake"
                    className="text-xs">
                    Supplier Delivery Intake (Restock)
                  </SelectItem>
                  <SelectItem
                    value="Physical Recount Audit"
                    className="text-xs">
                    Physical Recount Audit (Corrections)
                  </SelectItem>
                  <SelectItem
                    value="Customer Return Stocking"
                    className="text-xs">
                    Customer Return Stocking
                  </SelectItem>
                  <SelectItem
                    value="Damaged Stock Write-off"
                    className="text-xs">
                    Damaged Stock Write-off
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 text-xs font-bold rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-10 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1">
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Update Stock</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
