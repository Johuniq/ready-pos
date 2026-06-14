import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Star,
  AlertTriangle,
  Eye,
} from "lucide-react";
import CustomerFormModal from "./components/CustomerFormModal";
import CustomerDetailModal from "./components/CustomerDetailModal";
import {
  DataPanel,
  PageHeader,
  PageToolbar,
  PaginationBar,
} from "@/admin/components/PageLayout";
import { EmptyState, ErrorState } from "@/components/error/ErrorState";
import {
  CustomersSkeleton,
  TableSkeleton,
} from "@/components/loading/PageSkeleton";
import { handleError } from "@/lib/errorHandler";
import { useTableExport } from "@/hooks/useTableExport";
import { ExportButton } from "@/components/export/ExportButton";
import { formatPriceForExport } from "@/lib/export";

const PAGE_LIMIT = 20;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editing, setEditing] = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Detail modal state
  const [detailCustomer, setDetailCustomer] = useState(null);

  // Sort
  const [sortBy, setSortBy] = useState("recent");

  // Apply client-side sorting
  const sortedCustomers = useMemo(() => {
    const sorted = [...customers];
    switch (sortBy) {
      case "spent":
        sorted.sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
        break;
      case "visits":
        sorted.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));
        break;
      case "loyalty":
        sorted.sort(
          (a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0),
        );
        break;
      case "name":
        sorted.sort((a, b) =>
          (a.first_name || "").localeCompare(b.first_name || ""),
        );
        break;
      default: // "recent" — keep server order (already sorted by registration date desc)
        break;
    }
    return sorted;
  }, [customers, sortBy]);

  const searchTimer = useRef(null);

  const fetchCustomers = async (targetPage = page, term = search) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/customers/list", {
        page: targetPage,
        limit: PAGE_LIMIT,
        search: term,
      });
      setCustomers(data?.customers || []);
      setTotalPages(data?.total_pages || 1);
      setTotal(data?.total || 0);
      setPage(data?.page || targetPage);
    } catch (err) {
      const appError = handleError(err, { showToast: customers.length > 0 });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchCustomers(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchCustomers(1, search);
    }, 300);
    return () => clearTimeout(searchTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleOpenCreate = () => {
    setFormMode("create");
    setEditing(null);
    setShowForm(true);
  };

  const handleOpenEdit = (customer) => {
    setFormMode("edit");
    setEditing(customer);
    setShowForm(true);
  };

  const handleSaved = async () => {
    // Reload current page so totals stay accurate
    await fetchCustomers(page, search);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post("/customers/delete", { id: deleteTarget.id });
      toast.success(`Deleted ${deleteTarget.first_name || "customer"}`);
      setDeleteTarget(null);
      // If we just removed the last row on the page, step back one page.
      const nextPage = customers.length === 1 && page > 1 ? page - 1 : page;
      fetchCustomers(nextPage, search);
    } catch (err) {
      toast.error(err.message || "Failed to delete customer");
    } finally {
      setDeleting(false);
    }
  };

  const initialOf = (c) =>
    (c.first_name?.[0] || c.username?.[0] || "?").toUpperCase();

  const summary = useMemo(() => {
    if (loading) return "Loading customers…";
    if (total === 0) return "No customers yet";
    const start = (page - 1) * PAGE_LIMIT + 1;
    const end = Math.min(page * PAGE_LIMIT, total);
    return `Showing ${start}-${end} of ${total}`;
  }, [loading, total, page]);

  // Export functionality
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => [
      "Customer Name",
      "Username",
      "Email",
      "Phone",
      "Visits",
      "Total Spent",
      "Loyalty Points",
    ],
    getRows: () =>
      sortedCustomers.map((c) => [
        `${c.first_name || ""} ${c.last_name || ""}`.trim(),
        c.username || "",
        c.email || "",
        c.phone || "",
        c.visit_count || 0,
        formatPriceForExport(c.total_spent || 0),
        c.loyalty_points || 0,
      ]),
    filename: "ready_pos_customers",
    title: "Customer List",
  });

  if (loading && customers.length === 0) {
    return <CustomersSkeleton />;
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Customers"
        description="Manage POS customers. Records here are shared with the terminal and WooCommerce."
        actions={
          <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomers(page, search)}
            disabled={loading}
            className="h-9 text-xs font-semibold btn-premium">
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-9 font-bold flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 btn-premium">
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
          </>
        }
      />

      {/* Search bar + Sort */}
      <PageToolbar summary={summary}>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-semibold bg-background border border-input text-foreground">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="recent" className="text-xs">
                Most Recent
              </SelectItem>
              <SelectItem value="spent" className="text-xs">
                Highest Spent
              </SelectItem>
              <SelectItem value="visits" className="text-xs">
                Most Visits
              </SelectItem>
              <SelectItem value="loyalty" className="text-xs">
                Most Points
              </SelectItem>
              <SelectItem value="name" className="text-xs">
                Name A-Z
              </SelectItem>
            </SelectContent>
          </Select>
          <ExportButton
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={loading || customers.length === 0}
          />
        </div>
      </PageToolbar>

      {/* Table */}
      <DataPanel>
          {loading && customers.length === 0 ? (
            <div className="p-6">
              <TableSkeleton rows={8} columns={6} />
            </div>
          ) : error && customers.length === 0 ? (
            <ErrorState
              title="Failed to load customers"
              message={error.message}
              onRetry={() => fetchCustomers(page, search)}
            />
          ) : customers.length === 0 ? (
            <EmptyState
              title="No customers found"
              message={
                search
                  ? "Try a different search term."
                  : "Add your first customer or create one from the POS terminal."
              }
              icon={Users}
              action={search ? () => setSearch("") : handleOpenCreate}
              actionLabel={search ? "Clear Search" : "Add Customer"}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="premium-table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 font-bold uppercase text-[10px] tracking-wider">
                      Customer
                    </TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider">
                      Contact
                    </TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider text-center">
                      Visits
                    </TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider text-right">
                      Total Spent
                    </TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider text-center">
                      Loyalty
                    </TableHead>
                    <TableHead className="w-28 pr-6 font-bold uppercase text-[10px] tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCustomers.map((c) => (
                    <TableRow
                      key={c.id}
                      className="hover:bg-muted/10 border-b border-border/50">
                      <TableCell className="pl-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {initialOf(c)}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-foreground">
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              @{c.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="space-y-0.5">
                          {c.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3" />
                              <span>{c.email}</span>
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {!c.email && !c.phone && (
                            <span className="italic text-[10px]">
                              No contact info
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground text-center">
                        {c.visit_count || 0}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground text-right">
                        {formatPrice(c.total_spent || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold flex items-center gap-1 mx-auto w-fit">
                          <Star className="w-3 h-3 text-amber-500" />
                          {c.loyalty_points || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <div className="relative">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full btn-premium"
                              onClick={() => {
                                setDetailCustomer(c);
                              }}
                              title="View Details">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full btn-premium"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        {totalPages > 1 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            loading={loading}
            onPrevious={() => fetchCustomers(page - 1, search)}
            onNext={() => fetchCustomers(page + 1, search)}
          />
        )}
      </DataPanel>

      {/* Create / Edit modal (shared with POS terminal) */}
      <CustomerFormModal
        open={showForm}
        onOpenChange={setShowForm}
        mode={formMode}
        customer={editing}
        onSaved={handleSaved}
      />

      {/* Delete confirmation modal */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-xl select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete customer?</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will permanently remove{" "}
              <b className="text-foreground">
                {deleteTarget?.first_name} {deleteTarget?.last_name}
              </b>{" "}
              from WooCommerce and the POS database. Linked order history is
              preserved but the user account will be reassigned. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="flex-1 text-xs h-10 font-semibold">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 text-xs h-10 font-bold bg-rose-500 hover:bg-rose-600 text-white">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer detail / purchase history modal */}
      <CustomerDetailModal
        open={!!detailCustomer}
        onOpenChange={(open) => !open && setDetailCustomer(null)}
        customer={detailCustomer}
      />
    </div>
  );
}
