import { InlineError } from "@/components/error/ErrorState";
import { DashboardSkeleton } from "@/components/loading/PageSkeleton";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { handleError } from "@/lib/errorHandler";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Crown,
  DollarSign,
  LayoutDashboard,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  TerminalSquare,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useLicense } from "@/admin/hooks/useLicense";
import QuickRestockModal from "./components/QuickRestockModal";
import { PageHeader } from "@/admin/components/PageLayout";

// Utility Functions
/**
 * @param {string | number | Date} value
 * @returns {string}
 */
const formatCompactDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.toString();

  const month = date.toLocaleString(undefined, { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
};

export default function DashboardPage() {
  const license = useLicense();
  const isPro = license.isPro;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [payments, setPayments] = useState([]);

  // Low stock states
  const [lowStockList, setLowStockList] = useState([]);
  const [selectedRestockProduct, setSelectedRestockProduct] = useState(null);
  const [restockOpen, setRestockOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");

    const endpoints = [
      { key: "sales", url: "/reports/dashboard-sales-summary?days=30", pro: false },
      { key: "orders", url: "/orders/get?page=1&limit=6", pro: false },
      { key: "outlets", url: "/settings/outlets", pro: false },
      { key: "sessions", url: "/sessions/history", pro: false },
      { key: "products", url: "/reports/dashboard-product-performance?days=30", pro: false },
      { key: "cashiers", url: "/reports/dashboard-cashier-performance?days=30", pro: false },
      { key: "payments", url: "/reports/dashboard-payment-methods?days=30", pro: false },
      { key: "lowStock", url: "/inventory/low-stock", pro: false },
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map((e) => {
          if (e.pro && !isPro) {
            return Promise.reject(new Error("PRO_LOCKED"));
          }
          return api.get(e.url);
        }),
      );

      const getValue = (index, fallback = null) =>
        results[index].status === "fulfilled" ? results[index].value : fallback;

      const salesData = getValue(0, {});
      const ordersData = getValue(1, {});
      const outletsData = getValue(2, []);
      const sessionsData = getValue(3, []);
      const productsData = getValue(4, []);
      const cashiersData = getValue(5, []);
      const paymentsData = getValue(6, []);
      const lowStockData = getValue(7, []);

      setSummary({
        ...(salesData?.summary || {}),
        growth: salesData?.growth || {},
        previous: salesData?.previous || {},
      });
      setSalesChart(salesData?.chart || []);
      setRecentOrders(ordersData?.orders || []);
      setOutlets(outletsData || []);
      setSessions(sessionsData || []);
      setTopProducts(productsData || []);
      setCashiers(cashiersData || []);
      setPayments(paymentsData || []);
      setLowStockList(lowStockData || []);

      // Report partial failures with endpoint names + reasons
      const failures = results
        .map((r, i) => ({ ...r, endpoint: endpoints[i] }))
        .filter((r) => r.status === "rejected" && r.reason?.message !== "PRO_LOCKED");

      if (failures.length > 0) {
        // Surface details to the console for debugging
        failures.forEach((f) => {
          console.warn(
            `[Dashboard] ${f.endpoint.url} failed:`,
            f.reason?.message || f.reason,
          );
        });

        if (failures.length < results.length) {
          const names = failures.map((f) => f.endpoint.key).join(", ");
          setError(
            `${failures.length} of ${results.length} dashboard widgets failed to load: ${names}. Check console for details.`,
          );
        } else {
          setError(
            failures[0].reason?.message || "Failed to load dashboard data",
          );
          toast.error("Failed to load dashboard data");
        }
      }
    } catch (err) {
      const appError = handleError(err, {
        showToast: true,
        customMessage: "Failed to load dashboard data",
      });
      setError(appError.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const data = await api.get("/inventory/low-stock");
      setLowStockList(data || []);
    } catch (err) {
      console.error("Failed to refresh low stock alerts:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const registerStats = useMemo(() => {
    const registers = outlets.flatMap((/** @type {any} */ outlet) =>
      (outlet.registers || []).map((/** @type {any} */ register) => ({
        ...register,
        outletName: outlet.name,
      })),
    );

    return {
      registers,
      total: registers.length,
      open: registers.filter(
        (/** @type {any} */ register) => register.status === "open",
      ).length,
      closed: registers.filter(
        (/** @type {any} */ register) => register.status !== "open",
      ).length,
    };
  }, [outlets]);

  // Real growth percentages from the API (sales-summary endpoint returns
  // current vs previous period totals computed server-side).
  const growth = summary?.growth || {};
  const salesGrowth =
    typeof growth.gross_sales === "number" ? growth.gross_sales : 0;
  const ordersGrowth =
    typeof growth.total_orders === "number" ? growth.total_orders : 0;
  const avgTicketGrowth =
    typeof growth.avg_order === "number" ? growth.avg_order : 0;

  const metrics = [
    {
      title: "Total Revenue",
      value: formatPrice(summary?.gross_sales || 0),
      change: salesGrowth,
      changeLabel: "vs last period",
      icon: DollarSign,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      title: "Total Orders",
      value: summary?.total_orders || 0,
      change: ordersGrowth,
      changeLabel: "vs last period",
      icon: ShoppingCart,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Average Order Value",
      value:
        summary && summary.total_orders > 0
          ? formatPrice(summary.gross_sales / summary.total_orders)
          : formatPrice(0),
      change: avgTicketGrowth,
      changeLabel: "vs last period",
      icon: Receipt,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
    },
    {
      title: "Active Registers",
      value: `${registerStats.open}/${registerStats.total}`,
      change: 0,
      changeLabel: `${outlets.length} outlet${outlets.length !== 1 ? "s" : ""}`,
      icon: TerminalSquare,
      iconBg: registerStats.open > 0 ? "bg-cyan-500/10" : "bg-amber-500/10",
      iconColor: registerStats.open > 0 ? "text-cyan-600" : "text-amber-600",
    },
  ];

  /**
   * @param {any} product
   */
  const handleOpenRestock = (product) => {
    setSelectedRestockProduct(product);
    setRestockOpen(true);
  };

  if (loading && !summary && !error) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Dashboard"
        description="Here's an overview of your retail POS sales performance and registers."
        actions={
          <>
          <ModeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="h-9 font-semibold text-xs btn-premium">
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.hash = "#/reports")}
            className="h-9 font-semibold text-xs btn-premium">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Reports
          </Button>
          <Button
            onClick={() => (window.location.hash = "#/terminal")}
            size="sm"
            className="h-9 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/95 btn-premium">
            <Store className="mr-1.5 h-3.5 w-3.5" />
            Open POS
          </Button>
          </>
        }
      />

      {error && (
        <InlineError
          title={
            summary
              ? "Some dashboard widgets did not load"
              : "Failed to load dashboard data"
          }
          message={error}
          onRetry={fetchDashboardData}
        />
      )}

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.change > 0;
          const isNegative = metric.change < 0;

          return (
            <Card
              key={metric.title}
              className="stat-card p-6 rounded-2xl shadow-xs">
              <CardContent className="p-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {metric.title}
                    </p>
                    <div className="space-y-1">
                      <p className="text-2xl font-extrabold text-foreground tracking-tight">
                        {metric.value}
                      </p>
                      {metric.change !== 0 ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          {isPositive && (
                            <>
                              <ArrowUp className="h-3 w-3 text-emerald-600" />
                              <span className="font-semibold text-emerald-600">
                                +{metric.change}%
                              </span>
                            </>
                          )}
                          {isNegative && (
                            <>
                              <ArrowDown className="h-3 w-3 text-rose-600" />
                              <span className="font-semibold text-rose-600">
                                {metric.change}%
                              </span>
                            </>
                          )}
                          <span className="text-muted-foreground">
                            {metric.changeLabel}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          {metric.changeLabel}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl ${metric.iconBg}`}>
                    <Icon className={`h-4.5 w-4.5 ${metric.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Sales Chart - 2 cols on desktop */}
        <Card className="lg:col-span-2 shadow-sm border border-border/60 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>Revenue Overview</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Retail sales performance over the last 30 days.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            {salesChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No sales data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesChart}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.08}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatCompactDate}
                    tickLine={false}
                    axisLine={false}
                    style={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(/** @type {number} */ val) => `$${val}`}
                    style={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    formatter={(/** @type {number} */ value) => [
                      formatPrice(value),
                      "Revenue",
                    ]}
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions / Outlets Summary */}
        <Card className="shadow-sm border border-border/60 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              <span>Active Outlets</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Current register activity across store locations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outlets.length === 0 ? (
              <div className="text-xs text-muted-foreground py-8 text-center">
                No outlets configured
              </div>
            ) : (
              <div className="space-y-3">
                {outlets.map((/** @type {any} */ outlet) => {
                  const activeRegisters = (outlet.registers || []).filter(
                    (/** @type {any} */ r) => r.status === "open",
                  );
                  return (
                    <div
                      key={outlet.id}
                      className="p-3 border rounded-xl bg-muted/5 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          {outlet.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>{outlet.registers?.length || 0} registers</span>
                        </p>
                      </div>
                      <Badge
                        variant={
                          activeRegisters.length > 0 ? "default" : "secondary"
                        }
                        className="text-[9px] font-bold">
                        {activeRegisters.length} Open
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Redesigned bottom grid to accommodate the Critical Low Stock alerts panel */}
      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Recent Orders table */}
        <Card className="shadow-sm border border-border/60 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold text-foreground">
                Recent Transactions
              </CardTitle>
              <CardDescription className="text-xs">
                Live log of recent sales orders checked out.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.hash = "#/orders")}
              className="text-xs text-primary font-semibold hover:bg-primary/5 h-8 btn-premium">
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="text-xs text-muted-foreground py-12 text-center">
                No recent orders
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="premium-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24 pl-6">Order</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((/** @type {any} */ order) => (
                      <TableRow key={order.id} className="hover:bg-muted/10">
                        <TableCell className="font-semibold text-xs text-foreground pl-6">
                          #{order.order_number || order.id}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {order.cashier_name}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground text-right">
                          {formatPrice(order.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              order.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className={`badge-status ${
                              order.status === "completed"
                                ? "badge-success"
                                : "badge-danger"
                            }`}>
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products performance */}
        <Card className="shadow-sm border border-border/60 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold text-foreground">
                Top Selling Products
              </CardTitle>
              <CardDescription className="text-xs">
                Best performing inventory items in 30 days.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 min-h-[250px]">
            {topProducts.length === 0 ? (
              <div className="text-xs text-muted-foreground py-12 text-center">
                No product data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="premium-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Product</TableHead>
                      <TableHead className="text-center w-24">
                        Qty Sold
                      </TableHead>
                      <TableHead className="text-right pr-6 w-32">
                        Revenue
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts
                      .slice(0, 6)
                      .map(
                        (
                          /** @type {any} */ item,
                          /** @type {number} */ idx,
                        ) => (
                          <TableRow key={idx} className="hover:bg-muted/10">
                            <TableCell className="font-medium text-xs text-foreground pl-6 truncate max-w-[120px]">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground text-center font-semibold">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-foreground text-right pr-6">
                              {formatPrice(item.total)}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Low Stock Alerts Card (Premium Upgrade) */}
        <Card className="shadow-sm border border-border/60 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Low Stock Warnings</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Products falling under the set alert threshold.
              </CardDescription>
            </div>
            {lowStockList.length > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] font-bold">
                {lowStockList.length} Alert{lowStockList.length > 1 ? "s" : ""}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-y-auto">
            {lowStockList.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2 opacity-85" />
                <p className="text-xs font-bold text-foreground">
                  All Stock Levels Healthy
                </p>
                <p className="text-[10px] opacity-75 mt-0.5">
                  No products require immediate restocking intake.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {lowStockList.map((/** @type {any} */ item) => (
                  <div
                    key={item.id}
                    className="p-3.5 hover:bg-muted/10 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-9 h-9 rounded-lg object-cover bg-card border border-border filter grayscale"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          SKU
                        </div>
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold">
                          <span className="font-mono text-muted-foreground">
                            SKU: {item.sku}
                          </span>
                          <span>•</span>
                          <span className="text-rose-600 font-extrabold flex items-center gap-0.5">
                            <span>Count: {item.stock_quantity}</span>
                            <span className="opacity-75 font-normal">
                              (Min: {item.low_stock_threshold})
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenRestock(item)}
                      className="h-7 text-[10px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shrink-0 px-2.5 shadow-xs transition-all active:scale-95">
                      Quick Restock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickRestockModal
        open={restockOpen}
        onOpenChange={setRestockOpen}
        product={selectedRestockProduct}
        onRestockSuccess={fetchLowStock}
      />
    </div>
  );
}
