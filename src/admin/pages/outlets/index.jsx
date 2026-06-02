import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAlert } from "@/components/ui/alert-provider";
import {
  Store,
  Plus,
  Edit2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Crown,
} from "lucide-react";
import InventoryTakeModal from "./components/InventoryTakeModal";
import { useLicense } from "@/admin/hooks/useLicense";
import { ProBadge } from "@/admin/components/ProGate";
import { OutletsSkeleton } from "@/components/loading/PageSkeleton";
import { EmptyState, ErrorState } from "@/components/error/ErrorState";
import { handleError } from "@/lib/errorHandler";
import { PageHeader } from "@/admin/components/PageLayout";

export default function Outlets() {
  const { showConfirm } = useAlert();
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const license = useLicense();

  // Inventory take state
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedOutletForInventory, setSelectedOutletForInventory] =
    useState(null);

  // Form fields
  const [currentId, setCurrentId] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [saving, setSaving] = useState(false);

  // Register management states
  const [showRegModal, setShowRegModal] = useState(false);
  const [regMode, setRegMode] = useState("create"); // "create" or "edit"
  const [selectedOutletId, setSelectedOutletId] = useState(null);
  const [currentRegId, setCurrentRegId] = useState(null);
  const [regName, setRegName] = useState("");
  const [regSaving, setRegSaving] = useState(false);

  const fetchOutlets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/settings/outlets");
      setOutlets(data || []);
    } catch (err) {
      const appError = handleError(err, {
        showToast: outlets.length > 0,
        customMessage: "Failed to load outlets",
      });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const handleOpenCreate = () => {
    // Quota check before opening
    if (!license.requireQuota("outlets")) return;
    setModalMode("create");
    setCurrentId(null);
    setName("");
    setAddress("");
    setPhone("");
    setEmail("");
    setReceiptHeader("");
    setReceiptFooter("");
    setShowModal(true);
  };

  const handleOpenEdit = (outlet) => {
    setModalMode("edit");
    setCurrentId(outlet.id);
    setName(outlet.name || "");
    setAddress(outlet.address || "");
    setPhone(outlet.phone || "");
    setEmail(outlet.email || "");
    setReceiptHeader(outlet.receipt_header || "");
    setReceiptFooter(outlet.receipt_footer || "");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === "create") {
        await api.post("/settings/outlets/create", {
          name,
          address,
          phone,
          email,
          receipt_header: receiptHeader,
          receipt_footer: receiptFooter,
        });
        toast.success("Outlet created successfully");
        // Refresh license data to update usage count
        await license.refresh();
      } else {
        await api.post("/settings/outlets/update", {
          id: currentId,
          name,
          address,
          phone,
          email,
          receipt_header: receiptHeader,
          receipt_footer: receiptFooter,
        });
        toast.success("Outlet updated successfully");
      }
      setShowModal(false);
      fetchOutlets();
    } catch (err) {
      toast.error(err.message || "Failed to save outlet");
    } finally {
      setSaving(false);
    }
  };

  if (loading && outlets.length === 0) {
    return <OutletsSkeleton />;
  }

  const handleOpenCreateReg = (outletId) => {
    if (!license.requireQuota("registers")) return;
    setRegMode("create");
    setSelectedOutletId(outletId);
    setCurrentRegId(null);
    setRegName("");
    setShowRegModal(true);
  };

  const handleOpenEditReg = (reg) => {
    setRegMode("edit");
    setCurrentRegId(reg.id);
    setRegName(reg.name || "");
    setShowRegModal(true);
  };

  const handleSaveRegister = async (e) => {
    e.preventDefault();
    if (empty(regName)) {
      toast.error("Register name is required");
      return;
    }
    setRegSaving(true);
    try {
      if (regMode === "create") {
        await api.post("/settings/registers/create", {
          outlet_id: selectedOutletId,
          name: regName,
        });
        toast.success("Register created successfully");
        await license.refresh();
      } else {
        await api.post("/settings/registers/update", {
          id: currentRegId,
          name: regName,
        });
        toast.success("Register updated successfully");
      }
      setShowRegModal(false);
      fetchOutlets();
    } catch (err) {
      toast.error(err.message || "Failed to save register");
    } finally {
      setRegSaving(false);
    }
  };

  const handleDeleteRegister = async (regId) => {
    const confirmed = await showConfirm(
      "Are you sure you want to delete this register?",
      "Delete Register"
    );
    if (!confirmed) return;
    
    try {
      await api.post("/settings/registers/delete", { id: regId });
      toast.success("Register deleted successfully");
      await license.refresh();
      fetchOutlets();
    } catch (err) {
      toast.error(err.message || "Failed to delete register");
    }
  };

  function empty(val) {
    return !val || val.toString().trim() === "";
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Store Outlets & Registers"
        description="Manage physical store outlets and configure cash registers."
        actions={
          <>
          {!license.isPro && (
            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md">
              {license.usage?.outlets || 0} / {license.limits?.outlets || 1}
            </span>
          )}
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="font-bold flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 btn-premium">
            <Plus className="w-4 h-4" /> Add Outlet
            {!license.isPro && !license.canCreate("outlets") && (
              <ProBadge className="ml-1" />
            )}
          </Button>
          </>
        }
      />

      {error && outlets.length === 0 ? (
        <ErrorState
          title="Failed to load outlets"
          message={error.message}
          onRetry={fetchOutlets}
        />
      ) : outlets.length === 0 ? (
        <EmptyState
          title="No outlets configured"
          message='Click "Add Outlet" to configure your first retail branch.'
          icon={Store}
          action={handleOpenCreate}
          actionLabel="Add Outlet"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {outlets.map((outlet) => (
            <Card
              key={outlet.id}
              className="card-elevated overflow-hidden flex flex-col justify-between">
              <CardHeader className="bg-muted/10 pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Store className="w-4 h-4 text-primary" />
                      {outlet.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold uppercase tracking-wider py-0 px-2">
                        ID: {outlet.id}
                      </Badge>
                      <Badge
                        className={`badge-status ${
                          outlet.status === "active"
                            ? "badge-success"
                            : "badge-warning"
                        }`}>
                        {outlet.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(outlet)}
                    className="h-8 w-8 rounded-full btn-premium"
                    title="Edit Outlet">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 flex-1">
                {/* Details list */}
                <div className="space-y-2 text-xs">
                  {outlet.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{outlet.address}</span>
                    </div>
                  )}
                  {outlet.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{outlet.phone}</span>
                    </div>
                  )}
                  {outlet.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{outlet.email}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Registers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Registers ({outlet.registers?.length || 0})
                    </h4>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleOpenCreateReg(outlet.id)}
                      className="h-7 text-[10px] font-bold flex items-center gap-1 text-primary hover:bg-primary/10">
                      <Plus className="w-3 h-3" /> Add Register
                      {!license.isPro && !license.canCreate("registers") && (
                        <ProBadge className="scale-75" />
                      )}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {outlet.registers && outlet.registers.length > 0 ? (
                      outlet.registers.map((reg) => (
                        <div
                          key={reg.id}
                          className="flex justify-between items-center bg-muted/30 p-2 rounded-lg text-xs border border-border/40 hover:bg-muted/50 transition-colors">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {reg.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                reg.status === "open" ? "default" : "secondary"
                              }
                              className={`text-[9px] font-extrabold uppercase px-2 ${
                                reg.status === "open"
                                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                  : ""
                              }`}>
                              {reg.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditReg(reg)}
                              className="h-6 w-6 rounded-full"
                              title="Edit Register">
                              <Edit2 className="w-2.5 h-2.5" />
                            </Button>
                            {outlet.registers.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRegister(reg.id)}
                                className="h-6 w-6 rounded-full text-destructive hover:bg-destructive/10"
                                title="Delete Register">
                                <Plus className="w-2.5 h-2.5 rotate-45" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-muted-foreground italic p-2 bg-muted/20 rounded-lg">
                        No registers linked to this outlet.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t px-6 py-3 flex justify-end gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-8 font-bold flex items-center gap-1.5 hover:bg-primary/5 hover:text-primary transition-all duration-150"
                  onClick={() => {
                    setSelectedOutletForInventory(outlet);
                    setShowInventoryModal(true);
                  }}>
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  <span>Inventory Audit Take</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md rounded-xl select-none overflow-hidden max-h-[90vh]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Store className="w-5 h-5 text-primary" />
              <span>
                {modalMode === "create"
                  ? "Add New Outlet"
                  : "Edit Outlet Details"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 pt-4 overflow-y-auto max-h-[60vh] pr-2">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Outlet Name
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Downtown Branch"
                className="h-10 text-xs font-semibold"
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="outlet@store.com"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Address
              </label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter street address..."
                className="text-xs min-h-16 resize-none"
              />
            </div>

            <Separator />

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Receipt Custom Header
              </label>
              <Textarea
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                placeholder="If empty, default header is used."
                className="text-xs min-h-16 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Receipt Custom Footer
              </label>
              <Textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="If empty, default footer is used."
                className="text-xs min-h-16 resize-none"
              />
            </div>

            <DialogFooter className="pt-4 border-t flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 text-xs h-10 font-semibold">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/95">
                {saving ? "Saving..." : "Save Outlet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Register Dialog */}
      <Dialog open={showRegModal} onOpenChange={setShowRegModal}>
        <DialogContent className="max-w-sm rounded-xl select-none overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Store className="w-5 h-5 text-primary" />
              <span>
                {regMode === "create" ? "Add New Register" : "Edit Register Details"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRegister} className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Register Name
              </label>
              <Input
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Cash Register A"
                className="h-10 text-xs font-semibold"
              />
            </div>

            <DialogFooter className="pt-4 border-t flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegModal(false)}
                className="flex-1 text-xs h-10 font-semibold">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={regSaving}
                className="flex-1 text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/95">
                {regSaving ? "Saving..." : "Save Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inventory Take Dialog */}
      <InventoryTakeModal
        open={showInventoryModal}
        onOpenChange={setShowInventoryModal}
        outlet={selectedOutletForInventory}
        onComplete={fetchOutlets}
      />
    </div>
  );
}
