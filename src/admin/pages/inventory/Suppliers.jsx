import { useState, useEffect } from "react";
import { api } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Plus, Search, RefreshCw, Edit, CheckCircle } from "lucide-react";
import { TableSkeleton } from "@/components/loading/PageSkeleton";
import { EmptyState } from "@/components/error/ErrorState";
import { PageToolbar, DataPanel } from "@/admin/components/PageLayout";
import { useTableExport } from "@/hooks/useTableExport";
import { ExportButton } from "@/components/export/ExportButton";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    supplier_code: "",
    supplier_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    payment_terms: "NET30",
    lead_time_days: 7,
    notes: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await api.get("/inventory/suppliers");
      setSuppliers(data?.suppliers || []);
    } catch (err) {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingSupplier) {
        await api.post("/inventory/suppliers/update", {
          id: editingSupplier.id,
          ...formData,
        });
        toast.success("Supplier updated successfully");
      } else {
        await api.post("/inventory/suppliers/create", formData);
        toast.success("Supplier created successfully");
      }
      setShowModal(false);
      fetchSuppliers();
      resetForm();
    } catch (err) {
      toast.error(err.message || "Failed to save supplier");
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      supplier_code: supplier.supplier_code,
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      zip_code: supplier.zip_code || "",
      country: supplier.country || "",
      payment_terms: supplier.payment_terms || "NET30",
      lead_time_days: supplier.lead_time_days || 7,
      notes: supplier.notes || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      supplier_code: "",
      supplier_name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
      payment_terms: "NET30",
      lead_time_days: 7,
      notes: "",
    });
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplier_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export functionality
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => [
      "Code",
      "Supplier Name",
      "Contact Person",
      "Email",
      "Phone",
      "Address",
      "Payment Terms",
      "Lead Time (Days)",
      "Status",
    ],
    getRows: () =>
      filteredSuppliers.map((supplier) => [
        supplier.supplier_code || "",
        supplier.supplier_name || "",
        supplier.contact_person || "",
        supplier.email || "",
        supplier.phone || "",
        [supplier.address, supplier.city, supplier.state, supplier.country]
          .filter(Boolean)
          .join(", ") || "",
        supplier.payment_terms || "",
        supplier.lead_time_days || 0,
        supplier.status || "active",
      ]),
    filename: "ready_pos_suppliers",
    title: "Suppliers Directory",
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs input-premium bg-background font-medium"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuppliers}
            className="h-9 px-3 gap-1.5 btn-premium bg-background hover:bg-muted/50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <ExportButton
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={loading || filteredSuppliers.length === 0}
          />
        </div>

        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="h-9 px-4 gap-2 btn-premium bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs">
          <Plus className="h-4 w-4" />
          New Supplier
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={9} rows={10} />
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No suppliers found"
          description="Add suppliers to manage purchase orders."
        />
      ) : (
        <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
          <Table className="premium-table">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold text-[10px] uppercase py-3 pl-4">Code</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Supplier Name</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Contact</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Email</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Phone</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Payment Terms</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Lead Time</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3">Status</TableHead>
                <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-xs font-semibold py-3.5 pl-4 text-foreground">
                    {supplier.supplier_code}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    {supplier.supplier_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-medium">{supplier.contact_person || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">{supplier.email || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">{supplier.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground font-semibold">{supplier.payment_terms || "—"}</TableCell>
                  <TableCell className="text-muted-foreground font-semibold">{supplier.lead_time_days || 0} days</TableCell>
                  <TableCell>
                    <Badge
                      className={`badge-status ${
                        supplier.status === "active"
                          ? "badge-success"
                          : "badge-danger"
                      }`}>
                      {supplier.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(supplier)}
                      className="h-7 px-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg btn-premium">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingSupplier ? "Edit Supplier" : "New Supplier"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Supplier Code *</Label>
              <Input
                value={formData.supplier_code}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_code: e.target.value })
                }
                disabled={editingSupplier}
                placeholder="SUP001"
                className="input-premium bg-background font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Supplier Name *</Label>
              <Input
                value={formData.supplier_name}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_name: e.target.value })
                }
                placeholder="ABC Wholesale"
                className="input-premium bg-background font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Contact Person</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person: e.target.value })
                }
                placeholder="John Doe"
                className="input-premium bg-background font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@supplier.com"
                className="input-premium bg-background font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                className="input-premium bg-background font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Payment Terms</Label>
              <Input
                value={formData.payment_terms}
                onChange={(e) =>
                  setFormData({ ...formData, payment_terms: e.target.value })
                }
                placeholder="NET30"
                className="input-premium bg-background font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Lead Time (Days)</Label>
              <Input
                type="number"
                value={formData.lead_time_days}
                onChange={(e) =>
                  setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })
                }
                className="input-premium bg-background font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Country</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="USA"
                className="input-premium bg-background font-medium"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold text-foreground">Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street..."
                className="input-premium bg-background font-medium mt-1"
                rows={2}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold text-foreground">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information..."
                className="input-premium bg-background font-medium mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="btn-premium bg-background hover:bg-muted/50 text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="btn-premium bg-primary text-primary-foreground hover:bg-primary/95">
              {editingSupplier ? "Update" : "Create"} Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
