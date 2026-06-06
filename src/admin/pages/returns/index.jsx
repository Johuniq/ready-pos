import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PackageX,
  Search,
  Eye,
  RefreshCw,
  Filter,
  Calendar,
  CreditCard,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatPriceForExport, formatDateForExport } from "@/lib/export";

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  const fetchReturns = async (targetPage = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: targetPage,
        per_page: 20,
      });

      if (filterStatus !== "all") {
        params.append("status", filterStatus);
      }

      if (filterType !== "all") {
        params.append("type", filterType);
      }

      if (filterSearch) {
        params.append("search", filterSearch);
      }

      const data = await api.get(`/returns/get?${params.toString()}`);
      setReturns(data?.returns || []);
      setTotalPages(data?.pages || 1);
      setTotalReturns(data?.total || 0);
      setPage(targetPage);
    } catch (err) {
      const appError = handleError(err, { showToast: true });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns(1);
  }, [filterStatus, filterType]);

  // Export functionality
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => [
      "Return ID",
      "Order Number",
      "Customer",
      "Type",
      "Amount",
      "Reason",
      "Status",
      "Date",
    ],
    getRows: () =>
      returns.map((returnItem) => [
        returnItem.id,
        returnItem.order_number || returnItem.original_order_id,
        returnItem.customer_name || "Guest",
        returnItem.return_type || "",
        formatPriceForExport(returnItem.refund_amount || 0),
        returnItem.return_reason || "",
        returnItem.return_status || "",
        formatDateForExport(returnItem.created_at),
      ]),
    filename: "ready_pos_returns",
    title: "Returns & Exchanges",
  });

  const handleSearch = () => {
    fetchReturns(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "refund":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "exchange":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "store_credit":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
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

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ErrorState error={error} onRetry={() => fetchReturns(1)} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <PageHeader
        icon={PackageX}
        title="Returns & Exchanges"
        description="Manage customer returns, exchanges, and refunds"
      />

      <PageToolbar>
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <CreditCard className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="refund">Refunds</SelectItem>
              <SelectItem value="exchange">Exchanges</SelectItem>
              <SelectItem value="store_credit">Store Credit</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReturns(page)}
            className="h-9 px-3 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <ExportButton
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={loading || returns.length === 0}
          />
        </div>
      </PageToolbar>

      <DataPanel>
        {loading ? (
          <TableSkeleton columns={8} rows={10} />
        ) : returns.length === 0 ? (
          <EmptyState
            icon={PackageX}
            title="No returns found"
            description="Returns and exchanges will appear here."
          />
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Return ID</TableHead>
                    <TableHead className="font-semibold">Order</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((returnItem) => (
                    <TableRow key={returnItem.id} className="cursor-pointer hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">
                        #{returnItem.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        #{returnItem.order_number || returnItem.original_order_id}
                      </TableCell>
                      <TableCell>{returnItem.customer_name || "Guest"}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(returnItem.return_type)}>
                          {returnItem.return_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatPrice(returnItem.refund_amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {returnItem.return_reason || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(returnItem.return_status)}>
                          {returnItem.return_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(returnItem.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalReturns}
              onPageChange={fetchReturns}
            />
          </>
        )}
      </DataPanel>
    </div>
  );
}
