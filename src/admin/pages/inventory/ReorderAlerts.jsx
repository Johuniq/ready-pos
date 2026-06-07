import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, ShoppingCart, Package } from "lucide-react";
import { TableSkeleton } from "@/components/loading/PageSkeleton";
import { ErrorState, EmptyState } from "@/components/error/ErrorState";
import { handleError } from "@/lib/errorHandler";
import { DataPanel, PageToolbar } from "@/admin/components/PageLayout";
import { useTableExport } from "@/hooks/useTableExport";
import { ExportButton } from "@/components/export/ExportButton";

export default function ReorderAlerts({ onCreatePoClick }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState("all");

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    fetchReorderAlerts();
  }, [selectedOutlet]);

  const fetchOutlets = async () => {
    try {
      const data = await api.get("/settings/outlets");
      setOutlets(data || []);
    } catch (err) {
      
    }
  };

  const fetchReorderAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedOutlet !== "all") {
        params.append("outlet_id", selectedOutlet);
      }

      const data = await api.get(`/inventory/reorder-alerts?${params.toString()}`);
      setAlerts(data?.alerts || []);
    } catch (err) {
      const appError = handleError(err, { showToast: true });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyLevel = (currentStock, reorderPoint) => {
    const percentage = (currentStock / reorderPoint) * 100;
    if (percentage <= 25) return { level: "critical", color: "bg-red-500" };
    if (percentage <= 50) return { level: "high", color: "bg-orange-500" };
    if (percentage <= 75) return { level: "medium", color: "bg-yellow-500" };
    return { level: "low", color: "bg-blue-500" };
  };

  const getUrgencyBadge = (currentStock, reorderPoint) => {
    const urgency = getUrgencyLevel(currentStock, reorderPoint);
    const colors = {
      critical: "badge-danger animate-pulse-glow",
      high: "badge-danger",
      medium: "badge-warning",
      low: "badge-info",
    };

    return (
      <Badge className={`badge-status ${colors[urgency.level]}`}>
        {urgency.level}
      </Badge>
    );
  };

  const handleCreatePO = (alert) => {
    if (onCreatePoClick) {
      onCreatePoClick(alert);
    } else {
      toast.info(`To create a Purchase Order for "${alert.product_name}", go to the Orders tab and click "New Purchase Order".`);
    }
  };

  // Export functionality
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => [
      "Product",
      "SKU",
      "Outlet",
      "Current Stock",
      "Reorder Point",
      "Suggested Qty",
      "Urgency",
    ],
    getRows: () =>
      alerts.map((alert) => {
        const urgency = getUrgencyLevel(alert.current_stock, alert.reorder_point);
        return [
          alert.product_name || "",
          alert.product_sku || "",
          alert.outlet_name || `Outlet #${alert.outlet_id}`,
          parseFloat(alert.current_stock).toFixed(2),
          alert.reorder_point || 0,
          alert.suggested_quantity || 0,
          urgency.level || "",
        ];
      }),
    filename: "ready_pos_reorder_alerts",
    title: "Reorder Alerts Report",
  });

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ErrorState error={error} onRetry={fetchReorderAlerts} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Reorder Point Alerts</p>
          <p className="text-xs text-muted-foreground mt-1">
            Products below their reorder threshold need restocking. Review and create purchase
            orders to replenish inventory.
          </p>
        </div>
      </div>

      <PageToolbar>
        <div className="flex flex-1 items-center gap-3">
          <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
            <SelectTrigger className="w-48 h-9 text-xs input-premium bg-background font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="all" className="text-xs">All Outlets</SelectItem>
              {outlets.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id.toString()} className="text-xs">
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchReorderAlerts}
            className="h-9 px-3 gap-1.5 btn-premium bg-background hover:bg-muted/50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <ExportButton
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={loading || alerts.length === 0}
          />

          {alerts.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-background font-semibold">
                {alerts.length} {alerts.length === 1 ? "Alert" : "Alerts"}
              </Badge>
            </div>
          )}
        </div>
      </PageToolbar>

      <DataPanel>
        {loading ? (
          <TableSkeleton columns={9} rows={10} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No reorder alerts"
            description="All products are above their reorder thresholds. Great stock management!"
          />
        ) : (
          <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
            <Table className="premium-table">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-12 py-3"></TableHead>
                  <TableHead className="font-bold text-[10px] uppercase py-3 pl-2">Product</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase py-3">SKU</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase py-3">Outlet</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                    Current Stock
                  </TableHead>
                  <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                    Reorder Point
                  </TableHead>
                  <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                    Suggested Qty
                  </TableHead>
                  <TableHead className="font-bold text-[10px] uppercase py-3">Urgency</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert, index) => {
                  const urgency = getUrgencyLevel(alert.current_stock, alert.reorder_point);
                  return (
                    <TableRow key={`${alert.product_id}-${alert.outlet_id}`} className="hover:bg-muted/10">
                      <TableCell className="py-3">
                        <div
                          className={`w-1.5 h-8 rounded-full ${urgency.color}`}
                          title={`${urgency.level} priority`}
                        />
                      </TableCell>
                      <TableCell className="pl-2 py-3">
                        <div className="flex items-center gap-3">
                          {alert.image && (
                            <img
                              src={alert.image}
                              alt={alert.product_name}
                              className="w-10 h-10 object-cover rounded-lg border border-border/60 shadow-xs filter grayscale"
                            />
                          )}
                          <div>
                            <p className="font-bold text-foreground text-sm">{alert.product_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              ID: {alert.product_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {alert.product_sku}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">{alert.outlet_name || `Outlet #${alert.outlet_id}`}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        <span
                          className={
                            alert.current_stock === 0
                              ? "text-red-600 font-extrabold"
                              : alert.current_stock < alert.reorder_point / 2
                              ? "text-orange-600 font-extrabold"
                              : ""
                          }>
                          {parseFloat(alert.current_stock).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-semibold">
                        {alert.reorder_point}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-emerald-600">
                        {alert.suggested_quantity}
                      </TableCell>
                      <TableCell>
                        {getUrgencyBadge(alert.current_stock, alert.reorder_point)}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreatePO(alert)}
                          className="h-7 px-2.5 text-[10px] gap-1 btn-premium bg-background hover:bg-muted/50 rounded-lg">
                          <ShoppingCart className="h-3 w-3" />
                          Create PO
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DataPanel>

      {alerts.length > 0 && (
        <div className="bg-muted/5 border border-border/60 rounded-xl p-4 space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Urgency Levels</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span>
                Critical: <span className="text-muted-foreground font-medium">0-25% of reorder point</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>
                High: <span className="text-muted-foreground font-medium">26-50% of reorder point</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span>
                Medium: <span className="text-muted-foreground font-medium">51-75% of reorder point</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>
                Low: <span className="text-muted-foreground font-medium">76-100% of reorder point</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
