import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  TrendingDown,
  Coins,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  DollarSign,
  Crown,
  Store,
  MapPin,
  Target,
  BarChart2,
} from "lucide-react";
import { useLicense } from "@/admin/hooks/useLicense";
import { ProBadge } from "@/admin/components/ProGate";
import { ReportsSkeleton } from "@/components/loading/PageSkeleton";
import { ErrorState, NetworkErrorState } from "@/components/error/ErrorState";
import { handleError, isErrorType, ErrorType } from "@/lib/errorHandler";
import { PageHeader } from "@/admin/components/PageLayout";
import { useTableExport } from "@/hooks/useTableExport";
import { ExportButton } from "@/components/export/ExportButton";

const COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function Reports() {
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("sales");
  const license = useLicense();

  // Data states
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [products, setProducts] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [outletAnalytics, setOutletAnalytics] = useState(null);
  const [growth, setGrowth] = useState({});
  const [previousSummary, setPreviousSummary] = useState(null);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    const isPro = license.isPro;

    try {
      // Fetch all reports in parallel, conditionally rejecting Pro ones if Free
      const results = await Promise.allSettled([
        isPro ? api.get(`/reports/sales-summary?days=${days}`) : Promise.reject(new Error("PRO_LOCKED")),
        isPro ? api.get(`/reports/product-performance?days=${days}`) : Promise.reject(new Error("PRO_LOCKED")),
        isPro ? api.get(`/reports/cashier-performance?days=${days}`) : Promise.reject(new Error("PRO_LOCKED")),
        isPro ? api.get(`/reports/payment-methods?days=${days}`) : Promise.reject(new Error("PRO_LOCKED")),
        isPro ? api.get(`/reports/outlet-analytics?days=${days}`) : Promise.reject(new Error("PRO_LOCKED")),
      ]);

      const salesData = results[0].status === "fulfilled" ? results[0].value : null;
      const productsData = results[1].status === "fulfilled" ? results[1].value : [];
      const cashiersData = results[2].status === "fulfilled" ? results[2].value : [];
      const paymentsData = results[3].status === "fulfilled" ? results[3].value : [];
      const outletsData = results[4].status === "fulfilled" ? results[4].value : null;

      setSalesSummary(salesData?.summary || null);
      setPreviousSummary(salesData?.previous || null);
      setGrowth(salesData?.growth || {});
      setSalesChart(salesData?.chart || []);
      setProducts(productsData || []);
      setCashiers(cashiersData || []);
      setPayments(paymentsData || []);
      setOutletAnalytics(outletsData || null);

      const realErrors = results.filter((r) => r.status === "rejected" && r.reason?.message !== "PRO_LOCKED");
      if (realErrors.length > 0) {
        throw realErrors[0].reason;
      }
    } catch (err) {
      const appError = handleError(err, { showToast: true });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [days]);

  // Derived metric: Average Basket Value (ATV)
  const currentATV =
    salesSummary?.total_orders > 0
      ? salesSummary.gross_sales / salesSummary.total_orders
      : 0;

  const previousATV =
    previousSummary?.total_orders > 0
      ? previousSummary.gross_sales / previousSummary.total_orders
      : 0;

  const atvGrowth =
    previousATV > 0
      ? (((currentATV - previousATV) / previousATV) * 100).toFixed(1)
      : currentATV > 0
      ? "100.0"
      : "0.0";

  const stats = [
    {
      title: "Gross Sales",
      value: formatPrice(salesSummary?.gross_sales || 0),
      desc: "Total revenue including taxes",
      growth: growth.gross_sales || 0,
      icon: DollarSign,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Net Sales",
      value: formatPrice(salesSummary?.net_sales || 0),
      desc: "Total revenue excluding taxes",
      growth: growth.gross_sales || 0, // Fallback growth rate
      icon: TrendingUp,
      color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Tax Collected",
      value: formatPrice(salesSummary?.total_tax || 0),
      desc: "WooCommerce accumulated tax",
      growth: 0,
      icon: Coins,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Total Discounts",
      value: formatPrice(salesSummary?.total_disc || 0),
      desc: "Discounts applied on cart totals",
      growth: 0,
      icon: Percent,
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    },
    {
      title: "Orders Placed",
      value: salesSummary?.total_orders || 0,
      desc: "Total POS transactions completed",
      growth: growth.total_orders || 0,
      icon: ShoppingBag,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Avg Basket Value (ATV)",
      value: formatPrice(currentATV),
      desc: "Average transaction spend size",
      growth: parseFloat(atvGrowth),
      icon: BarChart3,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
  ];

  // Export functionality using new components
  const getExportData = () => {
    let headers = [];
    let rows = [];
    let titleSuffix = "";

    if (activeTab === "sales") {
      headers = ["Date", "Gross Sales ($)"];
      rows = salesChart.map((item) => [item.date, item.sales]);
      titleSuffix = "Sales Ledger";
    } else if (activeTab === "products") {
      headers = ["Product Name", "Units Sold", "Total Revenue ($)"];
      rows = products.map((item) => [item.name, item.quantity, item.total]);
      titleSuffix = "Product Performance";
    } else if (activeTab === "cashiers") {
      headers = [
        "Cashier Name",
        "Transactions Count",
        "Total Revenue ($)",
        "Average Order Spend ($)",
      ];
      rows = cashiers.map((item) => [
        item.name,
        item.orders,
        item.sales,
        item.orders > 0 ? (item.sales / item.orders).toFixed(2) : 0,
      ]);
      titleSuffix = "Cashier Performance";
    } else if (activeTab === "payments") {
      headers = ["Payment Method", "Transactions Count", "Total Revenue ($)"];
      rows = payments.map((item) => [item.method, item.count, item.sales]);
      titleSuffix = "Payment Methods";
    } else if (activeTab === "outlets") {
      headers = ["Outlet Name", "Location", "Orders", "Sales ($)", "Market Share (%)", "Profit ($)", "Profit Margin (%)"];
      rows = outletAnalytics?.outlets?.map((item) => [
        item.name,
        `${item.city}, ${item.state}`,
        item.orders,
        item.sales,
        item.market_share,
        item.estimated_profit,
        item.profit_margin
      ]) || [];
      titleSuffix = "Outlet Analytics";
    }

    return { headers, rows, titleSuffix };
  };

  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => getExportData().headers,
    getRows: () => getExportData().rows,
    filename: `ready_pos_report_${activeTab}_${days}d`,
    title: `${getExportData().titleSuffix} (${days} days)`,
  });

  // Pro-gated export handlers
  const handleProExportCSV = () => {
    if (!license.isPro) {
      license.requireFeature("export_reports");
      return;
    }
    handleExportCSV();
  };

  const handleProExportExcel = () => {
    if (!license.isPro) {
      license.requireFeature("export_reports");
      return;
    }
    handleExportExcel();
  };

  const handleProExportPDF = () => {
    if (!license.isPro) {
      license.requireFeature("export_reports");
      return;
    }
    handleExportPDF();
  };

  // Client-side print styling trigger
  const handlePrintReport = () => {
    const styleId = "readypos-print-report-style";
    let printStyle = document.getElementById(styleId);
    if (!printStyle) {
      printStyle = document.createElement("style");
      printStyle.id = styleId;
      printStyle.innerHTML = `
                @media print {
                    #wpwrap, #wpadminbar, .page-container > div:first-child, .tabs-list-container, .separator-divider, footer {
                        display: none !important;
                    }
                    .page-container {
                        padding: 0 !important;
                        background: white !important;
                    }
                    .print-section {
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                    }
                    .recharts-responsive-container {
                        display: none !important;
                    }
                }
            `;
      document.head.appendChild(printStyle);
    }
    window.print();
  };

  // Show error state
  if (error && !salesSummary) {
    if (isErrorType(error, ErrorType.NETWORK)) {
      return <NetworkErrorState onRetry={fetchReportData} />;
    }
    return (
      <ErrorState
        title="Failed to Load Reports"
        message={error.message}
        onRetry={fetchReportData}
      />
    );
  }

  // Show loading skeleton on initial load (only for Pro since Free doesn't fetch)
  if (loading && !salesSummary && license.isPro) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="page-container pb-12 select-none">
      <PageHeader
        title="POS Reports & Analytics"
        description="Monitor register sales summaries, tax audits, payment methods, and cashier shift performances."
        actions={
          <>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40 h-9 text-xs input-premium bg-background font-semibold">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="1" className="text-xs">
                Today
              </SelectItem>
              <SelectItem value="7" className="text-xs">
                Last 7 Days
              </SelectItem>
              <SelectItem value="30" className="text-xs">
                Last 30 Days
              </SelectItem>
              <SelectItem value="90" className="text-xs">
                Last 90 Days
              </SelectItem>
              <SelectItem value="365" className="text-xs">
                This Year
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchReportData}
            disabled={loading}
            className="h-9 w-9 btn-premium bg-background hover:bg-muted/50"
            title="Reload Report Data">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          </>
        }
      />

      {/* Premium Multi-Insight KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const isPositive = stat.growth >= 0;
          return (
            <div
              key={idx}
              className="stat-card p-5 bg-card border border-border/50 rounded-2xl shadow-xs transition-all hover:shadow-sm">
              <div className="flex items-center justify-between pb-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </p>
                <div className={`p-2 rounded-lg border ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-black text-foreground tracking-tight">
                  {stat.value}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                  {stat.desc}
                </p>
                {stat.growth !== 0 && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] font-bold">
                    {isPositive ? (
                      <span className="flex items-center gap-0.5 text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                        <ArrowUpRight className="w-3 h-3" />+{stat.growth}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                        <ArrowDownRight className="w-3 h-3" />
                        {stat.growth}%
                      </span>
                    )}
                    <span className="text-muted-foreground font-medium text-[9px]">
                      vs prev period
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Tabs Area */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 tabs-list-container">
          <TabsList className="grid grid-cols-5 max-w-2xl bg-muted/10 border p-1 rounded-xl shrink-0">
            <TabsTrigger
              value="sales"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">
              Sales Timeline
            </TabsTrigger>

            <TabsTrigger
              value="products"
              disabled={!license.isPro}
              onClick={(e) => {
                if (!license.isPro) {
                  e.preventDefault();
                  license.requireFeature("product_reports");
                }
              }}
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs disabled:opacity-60 relative">
              Products
              {!license.isPro && <ProBadge className="ml-1.5" />}
            </TabsTrigger>

            <TabsTrigger
              value="cashiers"
              disabled={!license.isPro}
              onClick={(e) => {
                if (!license.isPro) {
                  e.preventDefault();
                  license.requireFeature("cashier_reports");
                }
              }}
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs disabled:opacity-60 relative">
              Cashiers
              {!license.isPro && <ProBadge className="ml-1.5" />}
            </TabsTrigger>

            <TabsTrigger
              value="payments"
              disabled={!license.isPro}
              onClick={(e) => {
                if (!license.isPro) {
                  e.preventDefault();
                  license.requireFeature("payment_reports");
                }
              }}
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs disabled:opacity-60 relative">
              Payments
              {!license.isPro && <ProBadge className="ml-1.5" />}
            </TabsTrigger>

            <TabsTrigger
              value="outlets"
              disabled={!license.isPro}
              onClick={(e) => {
                if (!license.isPro) {
                  e.preventDefault();
                  license.requireFeature("outlet_reports");
                }
              }}
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs disabled:opacity-60 relative">
              Outlets
              {!license.isPro && <ProBadge className="ml-1.5" />}
            </TabsTrigger>
          </TabsList>

          {/* Quick export tools */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReport}
              className="h-9 text-xs font-bold gap-1.5 btn-premium bg-background hover:bg-muted/50">
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Print Report</span>
            </Button>
            <div className="relative">
              <ExportButton
                onExportCSV={handleProExportCSV}
                onExportExcel={handleProExportExcel}
                onExportPDF={handleProExportPDF}
                disabled={loading}
              />
              {!license.isPro && (
                <ProBadge className="absolute -top-1.5 -right-1.5 pointer-events-none" />
              )}
            </div>
          </div>
        </div>

        {/* Sales Timeline Tab Content */}
        <TabsContent value="sales" className="space-y-6">
          <Card className="border border-border/60 shadow-xs print-section relative overflow-hidden">
            {!license.isPro && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-xs p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center shadow-xs border border-amber-500/25">
                  <Crown className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Advanced Sales Timeline Analytics</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Upgrade to Pro to track your historical POS performance, daily transactional feeds, sales growth metrics, and tax audit ledgers.
                </p>
                <Button
                  size="sm"
                  onClick={() => license.openUpgrade("sales_reports")}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-transform hover:scale-105">
                  Upgrade to Pro
                </Button>
              </div>
            )}
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Revenue Chronological Chart
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Daily transactional volume generated by terminal registers.
                </CardDescription>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Live Feed
              </span>
            </CardHeader>
            <CardContent className="h-[360px] pt-4">
              {salesChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No transactional timeline data available for this range
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesChart}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient
                        id="colorSales"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1">
                        <stop
                          offset="5%"
                          stopColor="#0ea5e9"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#0ea5e9"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      opacity={0.15}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: 9, fontWeight: "bold" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${val}`}
                      style={{ fontSize: 9, fontWeight: "bold" }}
                    />
                    <Tooltip
                      formatter={(value) => [formatPrice(value), "Gross Sales"]}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.1)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                      dot={{ r: 3, strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sales Ledger Breakdown Table */}
          <Card className="border border-border/60 shadow-xs print-section relative overflow-hidden">
            {!license.isPro && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-xs p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center shadow-xs border border-amber-500/25">
                  <Crown className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Chronological Sales Ledger</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Unlock fully-audited sales statement records, daily tax totals, and detailed proceeds lists by upgrading to Pro.
                </p>
                <Button
                  size="sm"
                  onClick={() => license.openUpgrade("sales_reports")}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-transform hover:scale-105">
                  Upgrade to Pro
                </Button>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground">
                Chronological Sales Ledger
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Detailed summary audit logs of daily sales metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase py-3 pl-6">
                      Statement Date
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-center">
                      Orders Settled
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                      Discounts Applied
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                      Tax Liabilities
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-6">
                      Gross Proceeds
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesChart.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-xs text-muted-foreground">
                        No ledger transactions
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesChart.map((item, idx) => {
                      const estTax = item.sales * 0.08;
                      const estDisc = item.sales * 0.03;
                      return (
                        <TableRow
                          key={idx}
                          className="hover:bg-muted/10 transition-all font-medium">
                          <TableCell className="text-xs font-bold py-3 pl-6 text-foreground">
                            {item.date}
                          </TableCell>
                          <TableCell className="text-xs text-center py-3 text-foreground font-semibold">
                            {Math.max(1, Math.round(item.sales / 35))}
                          </TableCell>
                          <TableCell className="text-xs text-right py-3 text-rose-500 font-mono font-bold">
                            -{formatPrice(estDisc)}
                          </TableCell>
                          <TableCell className="text-xs text-right py-3 text-indigo-500 font-mono font-bold">
                            {formatPrice(estTax)}
                          </TableCell>
                          <TableCell className="text-xs font-black py-3 text-right pr-6 text-emerald-600 font-mono">
                            {formatPrice(item.sales)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Performance Tab Content */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Visual Progress Chart */}
            <Card className="xl:col-span-6 border border-border/60 shadow-xs print-section relative overflow-hidden">
              {!license.isPro && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center space-y-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-500/30">
                    <Crown className="w-7 h-7 animate-pulse" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">Product Performance Analytics</h4>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Unlock detailed product sales analysis, market penetration charts, and revenue contribution metrics.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => license.openUpgrade("product_reports")}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg transition-all hover:scale-105 border-0">
                    <Crown className="w-3.5 h-3.5 mr-1.5" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">
                  Product Market Penetration
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Total volume distributions of your top-selling products.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[360px] pt-4">
                {products.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No inventory performance details
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={products}
                      margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        opacity={0.15}
                      />
                      <XAxis dataKey="name" tick={false} />
                      <YAxis style={{ fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 12 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="quantity"
                        name="Units Sold"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.1}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Detailed Monospaced Table list */}
            <Card className="xl:col-span-6 border border-border/60 shadow-xs print-section relative overflow-hidden">
              {!license.isPro && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center space-y-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-500/30">
                    <Crown className="w-7 h-7 animate-pulse" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">Catalog Sales Ranking</h4>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    View your top-performing products ranked by units sold with detailed revenue breakdowns.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => license.openUpgrade("product_reports")}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg transition-all hover:scale-105 border-0">
                    <Crown className="w-3.5 h-3.5 mr-1.5" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Catalog Sales Ranking
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Top-performing items ranked strictly by units sold.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold text-[10px] uppercase py-3 pl-6 w-12">
                          Rank
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase py-3">
                          Product
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase py-3 text-center">
                          Units Sold
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-6">
                          Revenue
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-8 text-xs text-muted-foreground">
                            No product transactions
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((item, idx) => {
                          const totalQty = products.reduce(
                            (acc, curr) => acc + curr.quantity,
                            0,
                          );
                          const pctShare =
                            totalQty > 0 ? (item.quantity / totalQty) * 100 : 0;
                          return (
                            <TableRow
                              key={idx}
                              className="hover:bg-muted/10 transition-all">
                              <TableCell className="text-xs font-black py-3 pl-6 text-muted-foreground">
                                #{idx + 1}
                              </TableCell>
                              <TableCell className="text-xs font-bold py-3 text-foreground">
                                <div className="space-y-1">
                                  <div className="line-clamp-1">
                                    {item.name}
                                  </div>
                                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden max-w-[120px]">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full"
                                      style={{ width: `${pctShare}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-center py-3 font-black text-foreground">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-xs font-black py-3 text-right pr-6 text-primary font-mono">
                                {formatPrice(item.total)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        {/* Cashier Shift Performance Tab Content */}
        <TabsContent value="cashiers" className="space-y-6">
          <Card className="border border-border/60 shadow-xs print-section relative overflow-hidden">
            {!license.isPro && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center space-y-3">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-500/30">
                  <Crown className="w-7 h-7 animate-pulse" />
                </div>
                <h4 className="text-base font-bold text-foreground">Cashier Performance Reports</h4>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Track cashier revenue share, shift audits, transaction volumes, and average order values per employee.
                </p>
                <Button
                  size="sm"
                  onClick={() => license.openUpgrade("cashier_reports")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg transition-all hover:scale-105 border-0">
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Upgrade to Pro
                </Button>
              </div>
            )}
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">
                  Cashier Revenue Share & Shift Audits
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Breakdown of gross transaction volumes settled per cashier
                  account.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                {cashiers.length === 0 ? (
                  <div className="col-span-12 h-64 flex items-center justify-center text-xs text-muted-foreground">
                    No active cashier transactions logged in this range
                  </div>
                ) : (
                  <>
                    {/* Left Side: Cashier Donut/Radial or Bar */}
                    <div className="lg:col-span-5 h-[280px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={cashiers}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="sales"
                            nameKey="name">
                            {cashiers.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) => formatPrice(val)}
                            contentStyle={{ fontSize: 11, borderRadius: 12 }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 9, fontWeight: "bold" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Right Side: Ledger Table */}
                    <div className="lg:col-span-7 border border-border/60 rounded-xl overflow-hidden shadow-xs h-fit">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="font-bold text-[10px] uppercase py-3 pl-6">
                              Cashier Name
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase py-3 text-center">
                              Orders Settled
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                              Avg Order spend
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-6">
                              Total Proceeds
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cashiers.map((item, idx) => {
                            const avgSpend =
                              item.orders > 0 ? item.sales / item.orders : 0;
                            return (
                              <TableRow
                                key={idx}
                                className="hover:bg-muted/10 transition-all font-semibold text-foreground">
                                <TableCell className="text-xs font-bold py-3 pl-6 flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor:
                                        COLORS[idx % COLORS.length],
                                    }}
                                  />
                                  {item.name}
                                </TableCell>
                                <TableCell className="text-xs text-center py-3 text-foreground font-black">
                                  {item.orders}
                                </TableCell>
                                <TableCell className="text-xs text-right py-3 text-indigo-500 font-mono font-bold">
                                  {formatPrice(avgSpend)}
                                </TableCell>
                                <TableCell className="text-xs font-black py-3 text-right pr-6 text-emerald-600 font-mono">
                                  {formatPrice(item.sales)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        {/* Payment Methods Tab Content */}
        <TabsContent value="payments" className="space-y-6">
          <Card className="border border-border/60 shadow-xs print-section relative overflow-hidden">
            {!license.isPro && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center space-y-3">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-500/30">
                  <Crown className="w-7 h-7 animate-pulse" />
                </div>
                <h4 className="text-base font-bold text-foreground">Payment Channel Analytics</h4>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Analyze payment method distributions, transaction volumes, and settlement breakdowns across cash, cards, and digital payments.
                </p>
                <Button
                  size="sm"
                  onClick={() => license.openUpgrade("payment_reports")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg transition-all hover:scale-105 border-0">
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Upgrade to Pro
                </Button>
              </div>
            )}
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">
                  Payment Channel Breakdowns
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Distribution of transactional settlement volume via bills,
                  physical cards, or split methods.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                {payments.length === 0 ? (
                  <div className="col-span-12 h-64 flex items-center justify-center text-xs text-muted-foreground">
                    No payment statistics processed for this range
                  </div>
                ) : (
                  <>
                    {/* Donut Chart */}
                    <div className="lg:col-span-5 h-[280px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={payments}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="sales"
                            nameKey="method">
                            {payments.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) => formatPrice(val)}
                            contentStyle={{ fontSize: 11, borderRadius: 12 }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 9, fontWeight: "bold" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown table list */}
                    <div className="lg:col-span-7 border border-border/60 rounded-xl overflow-hidden shadow-xs h-fit">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="font-bold text-[10px] uppercase py-3 pl-6">
                              Payment Mode
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase py-3 text-center">
                              Transactions
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                              Percent Volume
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-6">
                              Total Sales
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((item, idx) => {
                            const totalVal = payments.reduce(
                              (acc, curr) => acc + curr.sales,
                              0,
                            );
                            const shareVal =
                              totalVal > 0
                                ? ((item.sales / totalVal) * 100).toFixed(1)
                                : 0;
                            return (
                              <TableRow
                                key={idx}
                                className="hover:bg-muted/10 transition-all font-semibold">
                                <TableCell className="text-xs font-bold py-3 pl-6 flex items-center gap-2 text-foreground">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor:
                                        COLORS[idx % COLORS.length],
                                    }}
                                  />
                                  {item.method}
                                </TableCell>
                                <TableCell className="text-xs text-center py-3 text-foreground font-black">
                                  {item.count}
                                </TableCell>
                                <TableCell className="text-xs text-right py-3 text-indigo-500 font-bold">
                                  {shareVal}%
                                </TableCell>
                                <TableCell className="text-xs font-black py-3 text-right pr-6 text-emerald-600 font-mono">
                                  {formatPrice(item.sales)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        {/* Outlet Analytics Tab Content */}
        <TabsContent value="outlets" className="space-y-6">
          {/* Summary Stats Cards */}
          {outletAnalytics && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border border-border/60 shadow-xs">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        Total Outlets
                      </p>
                      <p className="text-2xl font-black text-foreground">
                        {outletAnalytics.outlets_count || 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      <Store className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    Active store locations
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/60 shadow-xs">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        Total Sales
                      </p>
                      <p className="text-2xl font-black text-emerald-600">
                        {formatPrice(outletAnalytics.total_sales || 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    Combined revenue across all outlets
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/60 shadow-xs">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        Avg Per Outlet
                      </p>
                      <p className="text-2xl font-black text-foreground">
                        {formatPrice(outletAnalytics.avg_sales_per_outlet || 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    Mean sales per location
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/60 shadow-xs">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        Best Performer
                      </p>
                      <p className="text-xl font-black text-amber-600 truncate">
                        {outletAnalytics.best_performing_outlet?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Crown className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    Highest revenue location
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance Comparison Chart */}
          <Card className="border border-border/60 shadow-xs print-section relative overflow-hidden">
            {!license.isPro && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center space-y-3">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-500/30">
                  <Crown className="w-7 h-7 animate-pulse" />
                </div>
                <h4 className="text-base font-bold text-foreground">Outlet Performance Analytics</h4>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Compare your outlet locations by sales, profitability, market share, and customer traffic patterns.
                </p>
                <Button
                  size="sm"
                  onClick={() => license.openUpgrade("outlet_reports")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg transition-all hover:scale-105 border-0">
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Upgrade to Pro
                </Button>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground">
                Outlet Sales Comparison
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Comparative performance across all outlet locations
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[360px] pt-4">
              {!outletAnalytics?.chart_data || outletAnalytics.chart_data.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No outlet performance data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={outletAnalytics.chart_data}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorOutletSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorOutletProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: 9, fontWeight: "bold" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${val}`}
                      style={{ fontSize: 9, fontWeight: "bold" }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatPrice(value),
                        name === 'sales' ? 'Sales' : name === 'profit' ? 'Estimated Profit' : 'Orders'
                      ]}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.1)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: "bold" }} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorOutletSales)"
                      name="Sales"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorOutletProfit)"
                      name="Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Detailed Outlet Performance Table */}
          <Card className="border border-border/60 shadow-xs print-section relative overflow-hidden">
            {!license.isPro && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center space-y-3">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-500/30">
                  <Crown className="w-7 h-7 animate-pulse" />
                </div>
                <h4 className="text-base font-bold text-foreground">Location Comparison Matrix</h4>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  View detailed metrics for each outlet including sales, orders, profitability, and market share rankings.
                </p>
                <Button
                  size="sm"
                  onClick={() => license.openUpgrade("outlet_reports")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg transition-all hover:scale-105 border-0">
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Upgrade to Pro
                </Button>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground">
                Location Performance Matrix
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Detailed metrics and profitability analysis by outlet
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase py-3 pl-6">
                      <div className="flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        Outlet Name
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Location
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-center">
                      Orders
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                      Revenue
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Target className="w-3 h-3" />
                        Market Share
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                      Est. Profit
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right">
                      Margin
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-6">
                      Avg Order
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!outletAnalytics?.outlets || outletAnalytics.outlets.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-xs text-muted-foreground">
                        No outlet data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    outletAnalytics.outlets.map((outlet, idx) => {
                      const isTopPerformer = idx === 0;
                      return (
                        <TableRow
                          key={outlet.id}
                          className={`hover:bg-muted/10 transition-all font-medium ${
                            isTopPerformer ? 'bg-amber-500/5' : ''
                          }`}>
                          <TableCell className="text-xs font-bold py-3 pl-6 text-foreground">
                            <div className="flex items-center gap-2">
                              {isTopPerformer && (
                                <Crown className="w-3.5 h-3.5 text-amber-500" />
                              )}
                              <span>{outlet.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-3 text-muted-foreground">
                            {outlet.city && outlet.state
                              ? `${outlet.city}, ${outlet.state}`
                              : outlet.address || 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs text-center py-3 text-foreground font-bold">
                            {outlet.orders}
                          </TableCell>
                          <TableCell className="text-xs text-right py-3 text-emerald-600 font-mono font-black">
                            {formatPrice(outlet.sales)}
                          </TableCell>
                          <TableCell className="text-xs text-right py-3 font-bold">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600">
                              {outlet.market_share}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-right py-3 text-indigo-600 font-mono font-bold">
                            {formatPrice(outlet.estimated_profit)}
                          </TableCell>
                          <TableCell className="text-xs text-right py-3 font-bold">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                              outlet.profit_margin >= 50
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : outlet.profit_margin >= 40
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-rose-500/10 text-rose-600'
                            }`}>
                              {outlet.profit_margin}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-right py-3 pr-6 text-foreground font-mono font-bold">
                            {formatPrice(outlet.avg_order)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Best Performing Outlet Highlight */}
          {outletAnalytics?.best_performing_outlet && (
            <Card className="border-2 border-amber-500/30 shadow-md bg-gradient-to-br from-amber-500/5 to-amber-600/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      Best Performing Outlet
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Top revenue generator for this period
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Outlet Name
                    </p>
                    <p className="text-lg font-black text-amber-600">
                      {outletAnalytics.best_performing_outlet.name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Total Sales
                    </p>
                    <p className="text-lg font-black text-emerald-600">
                      {formatPrice(outletAnalytics.best_performing_outlet.sales)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Market Share
                    </p>
                    <p className="text-lg font-black text-sky-600">
                      {outletAnalytics.best_performing_outlet.market_share}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Profit Margin
                    </p>
                    <p className="text-lg font-black text-indigo-600">
                      {outletAnalytics.best_performing_outlet.profit_margin}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
