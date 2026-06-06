import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Users,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Key,
  Trash2,
  Pencil,
  Lock,
  Unlock,
  UserCog,
  Mail,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/error/ErrorState";
import { StaffSkeleton, ListSkeleton } from "@/components/loading/PageSkeleton";
import { handleError } from "@/lib/errorHandler";
import { DataPanel, PageHeader, PageToolbar } from "@/admin/components/PageLayout";
import { useAlert } from "@/components/ui/alert-provider";
import { useTableExport } from "@/hooks/useTableExport";
import { ExportButton } from "@/components/export/ExportButton";

const ROLE_LABELS = {
  pos_manager: {
    label: "POS Manager",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    desc: "Back-office access + terminal",
  },
  pos_cashier: {
    label: "POS Cashier",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    desc: "Terminal only",
  },
};

export default function StaffPage() {
  const { showConfirm } = useAlert();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [pinFilter, setPinFilter] = useState("all");

  // Filtered staff list
  const filteredStaff = staff.filter((user) => {
    if (roleFilter !== "all") {
      const userRole = user.role.split(",")[0].trim();
      if (userRole !== roleFilter) return false;
    }
    if (pinFilter === "pin" && !user.has_pin) return false;
    if (pinFilter === "nopin" && user.has_pin) return false;
    return true;
  });

  // Export functionality
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useTableExport({
    getHeaders: () => [
      "Name",
      "Email",
      "Role",
      "PIN Status",
    ],
    getRows: () =>
      filteredStaff.map((user) => {
        const roleKey = user.role.split(",")[0].trim();
        const roleCfg = ROLE_LABELS[roleKey] || ROLE_LABELS.pos_cashier;
        return [
          user.name || "",
          user.email || "",
          roleCfg.label || "",
          user.has_pin ? "PIN Set" : "No PIN",
        ];
      }),
    filename: "ready_pos_staff",
    title: "Staff Directory",
  });

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit" | "pin"
  const [editingUser, setEditingUser] = useState(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("pos_cashier");
  const [formPin, setFormPin] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/cashier/list");
      setStaff(data || []);
    } catch (err) {
      const appError = handleError(err, {
        showToast: staff.length > 0,
        customMessage: "Failed to load staff",
      });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormRole("pos_cashier");
    setFormPin("");
    setFormPassword("");
    setShowModal(true);
  };

  const handleOpenPin = (user) => {
    setModalMode("pin");
    setEditingUser(user);
    setFormPin("");
    setShowModal(true);
  };

  const handleRemovePin = async (user) => {
    const confirmed = await showConfirm(
      `Remove PIN for ${user.name}? They won't be able to log into the terminal.`,
      "Remove PIN"
    );
    if (!confirmed) return;
    
    try {
      await api.post("/cashier/remove-pin", { userId: user.id });
      toast.success(`PIN removed for ${user.name}`);
      fetchStaff();
    } catch (err) {
      toast.error(err.message || "Failed to remove PIN");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (modalMode === "pin") {
        // Set PIN only
        if (
          !formPin ||
          formPin.length < 4 ||
          formPin.length > 6 ||
          !/^\d+$/.test(formPin)
        ) {
          toast.error("PIN must be 4-6 digits");
          setSaving(false);
          return;
        }
        await api.post("/cashier/set-pin", {
          userId: editingUser.id,
          pin: formPin,
        });
        toast.success(`PIN set for ${editingUser.name}`);
      } else if (modalMode === "add") {
        // Create new WP user with POS role + optional PIN
        if (!formName.trim() || !formEmail.trim()) {
          toast.error("Name and email are required");
          setSaving(false);
          return;
        }

        const res = await api.post("/cashier/create", {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          password: formPassword || undefined,
          pin: formPin || undefined,
        });

        if (res.success) {
          toast.success(`Staff member "${formName}" created`);
        }
      }

      setShowModal(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading && staff.length === 0) {
    return <StaffSkeleton />;
  }

  return (
    <div className="page-container bg-muted/20">
      <PageHeader
        title="Staff & Roles"
        description="Manage POS staff accounts, assign roles, and configure secure PIN login for the terminal."
        actions={
          <>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStaff}
            disabled={loading}
            className="h-9 text-xs font-semibold gap-1.5">
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="h-9 font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95">
            <Plus className="w-4 h-4" />
            Add Staff
          </Button>
          </>
        }
      />

      {/* Filters */}
      <PageToolbar summary={`${filteredStaff.length} staff`}>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Roles
            </SelectItem>
            <SelectItem value="pos_manager" className="text-xs">
              POS Manager
            </SelectItem>
            <SelectItem value="pos_cashier" className="text-xs">
              POS Cashier
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={pinFilter} onValueChange={setPinFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="PIN Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All
            </SelectItem>
            <SelectItem value="pin" className="text-xs">
              PIN Set
            </SelectItem>
            <SelectItem value="nopin" className="text-xs">
              No PIN
            </SelectItem>
          </SelectContent>
        </Select>
        
        <ExportButton
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          disabled={loading || filteredStaff.length === 0}
        />
      </PageToolbar>

      {/* Staff list */}
      <DataPanel>
          {loading && filteredStaff.length === 0 ? (
            <div className="p-6">
              <ListSkeleton items={5} />
            </div>
          ) : error && staff.length === 0 ? (
            <ErrorState
              title="Failed to load staff"
              message={error.message}
              onRetry={fetchStaff}
            />
          ) : filteredStaff.length === 0 ? (
            <EmptyState
              title="No POS staff found"
              message={
                roleFilter !== "all" || pinFilter !== "all"
                  ? "Try changing the role or PIN filters."
                  : "Add your first cashier to get started."
              }
              icon={Users}
              action={
                roleFilter !== "all" || pinFilter !== "all"
                  ? () => {
                      setRoleFilter("all");
                      setPinFilter("all");
                    }
                  : handleOpenAdd
              }
              actionLabel={
                roleFilter !== "all" || pinFilter !== "all"
                  ? "Clear Filters"
                  : "Add Staff"
              }
            />
          ) : (
            <div className="divide-y divide-border/50">
              {filteredStaff.map((user) => {
                const roleKey = user.role.split(",")[0].trim();
                const roleCfg = ROLE_LABELS[roleKey] || ROLE_LABELS.pos_cashier;

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/10 transition-colors">
                    {/* Avatar */}
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-11 h-11 rounded-full border-2 border-border shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground truncate">
                          {user.name}
                        </span>
                        <Badge
                          className={`text-[9px] font-bold uppercase border ${roleCfg.color}`}>
                          {roleCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                      </div>
                    </div>

                    {/* PIN status */}
                    <div className="flex items-center gap-2 shrink-0">
                      {user.has_pin ? (
                        <Badge className="text-[10px] font-bold gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                          <Lock className="w-3 h-3" />
                          PIN Set
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold gap-1 text-muted-foreground">
                          <Unlock className="w-3 h-3" />
                          No PIN
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleOpenPin(user)}
                        title={user.has_pin ? "Change PIN" : "Set PIN"}>
                        <Key className="w-3.5 h-3.5" />
                      </Button>
                      {user.has_pin && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-500/10"
                          onClick={() => handleRemovePin(user)}
                          title="Remove PIN">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </DataPanel>

      {/* Info card */}
      <Card className="rounded-2xl border-border/60 bg-muted/10">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p className="font-bold text-foreground text-sm">Role Hierarchy</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-[9px] font-bold shrink-0">
                  Manager
                </Badge>
                <span>
                  Can access reports, outlets, settings, staff management, and
                  the POS terminal. Can manage cashiers and set PINs.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[9px] font-bold shrink-0">
                  Cashier
                </Badge>
                <span>
                  Can ONLY access the POS terminal. Cannot see reports,
                  settings, or manage other staff. Locked to the checkout
                  screen.
                </span>
              </div>
            </div>
            <Separator className="opacity-40" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">PIN Login</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>
                  Staff with a PIN set will see the secure login screen when
                  opening the terminal
                </li>
                <li>
                  PINs are 4-6 digits, stored as bcrypt hashes (never plain
                  text)
                </li>
                <li>5 failed attempts triggers a 15-minute lockout</li>
                <li>
                  Admins and shop managers can also set a PIN to use the
                  terminal login
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Staff / Set PIN Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md rounded-xl select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {modalMode === "pin" ? (
                <>
                  <Key className="w-5 h-5 text-primary" />
                  <span>
                    {editingUser?.has_pin ? "Change" : "Set"} PIN for{" "}
                    {editingUser?.name}
                  </span>
                </>
              ) : (
                <>
                  <UserCog className="w-5 h-5 text-primary" />
                  <span>Add Staff Member</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {modalMode === "pin"
                ? "Enter a 4-6 digit numeric PIN. The staff member will use this to log into the POS terminal."
                : "Create a new POS staff member. They'll get a WordPress account with the selected POS role."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {modalMode === "add" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Full Name *
                  </label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="John Smith"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Email *
                  </label>
                  <Input
                    required
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="john@store.com"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Role
                  </label>
                  <Select value={formRole} onValueChange={setFormRole}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="pos_cashier" className="text-sm">
                        POS Cashier
                      </SelectItem>
                      <SelectItem value="pos_manager" className="text-sm">
                        POS Manager
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    <strong>Cashier:</strong> Terminal only.{" "}
                    <strong>Manager:</strong> Terminal + reports, outlets,
                    settings, staff.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Password (optional)
                  </label>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="h-10 text-sm"
                  />
                </div>

                <Separator />
              </>
            )}

            {/* PIN field (shown in both modes) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Terminal PIN {modalMode === "add" ? "(optional)" : "*"}
              </label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  value={formPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setFormPin(val);
                  }}
                  placeholder="4-6 digits"
                  className="h-11 text-lg font-mono tracking-[0.5em] text-center pr-10"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  required={modalMode === "pin"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-foreground">
                  {showPin ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex gap-1 justify-center pt-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all ${
                      i < formPin.length
                        ? "bg-primary"
                        : "bg-muted border border-border"
                    }`}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex gap-2">
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
                className="flex-1 text-xs h-10 font-bold">
                {saving
                  ? "Saving..."
                  : modalMode === "pin"
                  ? "Save PIN"
                  : "Create Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
