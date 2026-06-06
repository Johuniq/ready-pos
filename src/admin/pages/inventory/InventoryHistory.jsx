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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Minus,
  ArrowRightLeft,
  FileEdit,
  Calculator,
  ShoppingCart,
  Package,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  DataPanel,
  PageToolbar,
  PaginationBar,
} from "@/admin/components/PageLayout";
import { TableSkeleton } from "@/components/loading/PageSkeleton";
import { EmptyState } from "@/components/error/ErrorState";
import { handleError } from "@/lib/errorHandler";

export default function InventoryHistory() {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchHistory();
      fetchSummary();
    }
  }, [selectedProduct, selectedOutlet, filterType, page]);

  const fetchOutlets = async () => {
    try {
      const data = await api.get("/settings/outlets");
      setOutlets(data?.outlets || []);
    } catch (err) {
      handleError(err, { showToast: true });
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

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setProducts([]);
    setSearchTerm(product.name);
    setPage(1);
  };

  const fetchHistory = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const params = {
        productId: selectedProduct.id,
        page,
        per_page: 20,
      };

      if (selectedOutlet && selectedOutlet !== "all") {
        params.outletId = selectedOutlet;
      }

      if (filterType !== "all") {
        params.type = filterType;
      }

      const data = await api.get("/inventory/history", { params });
      setHistory(data?.history || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.pages || 1);
    } catch (err) {
      handleError(err, { showToast: true });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!selectedProduct) return;

    try {
      const params = { productId: selectedProduct.id };
      if (selectedOutlet && selectedOutlet !== "all") {
        params.outletId = selectedOutlet;
      }

      const data = await api.get("/inventory/history/summary", { params });
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "purchase_order":
        return <Package className="h-3.5 w-3.5" />;
      case "sale":
        return <ShoppingCart className="h-3.5 w-3.5" />;
      case "transfer_in":
        return <TrendingUp className="h-3.5 w-3.5" />;
      case "transfer_out":
        return <TrendingDown className="h-3.5 w-3.5" />;
      case "adjustment":
        return <FileEdit className="h-3.5 w-3.5" />;
      case "count":
        return <Calculator className="h-3.5 w-3.5" />;
      default:
        return <ArrowRightLeft className="h-3.5 w-3.5" />;
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "purchase_order":
      case "transfer_in":
        return "badge-status badge-success";
      case "sale":
      case "transfer_out":
        return "badge-status badge-danger";
      case "adjustment":
      case "count":
        return "badge-status badge-info";
      default:
        return "badge-status";
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      purchase_order: "Purchase Order",
      sale: "POS Sale",
      transfer_in: "Transfer In",
      transfer_out: "Transfer Out",
      adjustment: "Adjustment",
      count: "Inventory Count",
    };
    return labels[type] || type;
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

  return (
    <div className="space-y-6">
      <PageToolbar>
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product by name or SKU..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchProducts(e.target.value);
              }}
              className="pl-10 input-premium bg-background font-medium"
            />
            {products.length > 0 && (
              <div className="absolute z-50 mt-2 w-full border border-border/60 rounded-xl max-h-60 overflow-y-auto shadow-lg bg-card divide-y divide-border/60">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => selectProduct(product)}
                    className="p-3 hover:bg-muted/10 cursor-pointer transition-colors">
                    <p className="font-semibold text-sm text-foreground">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      SKU: {product.sku || "N/A"} | Stock: {product.stock_quantity || 0}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Select value={selectedOutlet || "all"} onValueChange={(val) => setSelectedOutlet(val === "all" ? "" : val)}>
            <SelectTrigger className="w-48 h-9 text-xs input-premium bg-background font-medium">
              <SelectValue placeholder="All Outlets" />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="all">All Outlets</SelectItem>
              {outlets.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id.toString()}>
                  {outlet.outlet_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48 h-9 text-xs input-premium bg-background font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase_order">Purchase Orders</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
              <SelectItem value="transfer_in">Transfers In</SelectItem>
              <SelectItem value="transfer_out">Transfers Out</SelectItem>
              <SelectItem value="adjustment">Adjustments</SelectItem>
              <SelectItem value="count">Counts</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHistory()}
            className="h-9 px-3 gap-1.5 btn-premium bg-background hover:bg-muted/50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </PageToolbar>

      {selectedProduct && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Purchase Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{summary.purchase_orders.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5" />
                Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{summary.sales.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Transfers In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{summary.transfers_in.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-3.5 w-3.5" />
                Transfers Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{summary.transfers_out.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <FileEdit className="h-3.5 w-3.5" />
                Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.adjustments >= 0 ? "text-green-600" : "text-red-600"}`}>
                {summary.adjustments >= 0 ? "+" : ""}{summary.adjustments.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Calculator className="h-3.5 w-3.5" />
                Net Movement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary.total_in - summary.total_out) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {(summary.total_in - summary.total_out) >= 0 ? "+" : ""}
                {(summary.total_in - summary.total_out).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <DataPanel>
        {!selectedProduct ? (
          <EmptyState
            icon={Search}
            title="No product selected"
            description="Search and select a product to view its inventory history"
          />
        ) : loading ? (
          <TableSkeleton columns={8} rows={10} />
        ) : history.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory history"
            description="No transactions found for this product"
          />
        ) : (
          <>
            <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
              <Table className="premium-table">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase py-3 pl-4">Date</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Type</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">Outlet</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Before</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Change</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">After</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">User</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 pr-4">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/10">
                      <TableCell className="text-xs text-muted-foreground font-medium pl-4">
                        {formatDate(entry.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTypeBadgeClass(entry.transaction_type)} gap-1`}>
                          {getTypeIcon(entry.transaction_type)}
                          {getTypeLabel(entry.transaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {entry.outlet_name}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-muted-foreground">
                        {entry.quantity_before.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-extrabold ${entry.quantity_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {entry.quantity_change >= 0 ? "+" : ""}
                          {entry.quantity_change.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-foreground">
                        {entry.quantity_after.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-semibold">
                        {entry.user_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground pr-4">
                        {entry.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalLabel={`${total} transactions`}
              loading={false}
              onPrevious={() => setPage(page - 1)}
              onNext={() => setPage(page + 1)}
            />
          </>
        )}
      </DataPanel>
    </div>
  );
}
