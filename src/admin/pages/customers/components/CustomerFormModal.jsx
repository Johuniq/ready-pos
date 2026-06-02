import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, UserCog } from "lucide-react";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
};

/**
 * Reusable modal for creating or editing a POS customer.
 *
 * Used both by the Customer Management page and the POS Terminal's CustomerSelect
 * so the create/edit experience stays identical no matter where the user starts.
 *
 * Props:
 *  - open                Boolean
 *  - onOpenChange(open)  Function
 *  - mode                "create" | "edit"
 *  - customer            Customer object when editing
 *  - onSaved(customer)   Called after successful save with the persisted customer.
 *  - compact             When true, renders a smaller layout suitable for the
 *                        POS terminal sidebar (omits notes field & description).
 */
export default function CustomerFormModal({
  open,
  onOpenChange,
  mode = "create",
  customer = null,
  onSaved,
  compact = false,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Sync form when opening or switching customer
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && customer) {
      setForm({
        firstName: customer.first_name || "",
        lastName: customer.last_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        notes: customer.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, mode, customer]);

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    setSaving(true);
    try {
      let saved;
      if (mode === "edit" && customer?.id) {
        saved = await api.post("/customers/update", {
          id: customer.id,
          ...form,
        });
        toast.success(`Updated customer: ${saved.first_name}`);
      } else {
        saved = await api.post("/customers/create", form);
        toast.success(`Created customer: ${saved.first_name}`);
      }

      onSaved?.(saved);
      onOpenChange?.(false);
    } catch (err) {
      toast.error(err.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const Icon = mode === "edit" ? UserCog : UserPlus;
  const title = mode === "edit" ? "Edit Customer" : "Create New Customer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          compact ? "max-w-sm" : "max-w-md"
        } rounded-xl select-none`}>
        <DialogHeader className={compact ? "" : "pb-3 border-b"}>
          <DialogTitle
            className={`${
              compact ? "text-sm" : "text-base"
            } font-bold flex items-center gap-2`}>
            <Icon
              className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-primary`}
            />
            <span>{title}</span>
          </DialogTitle>
          {!compact && (
            <DialogDescription className="text-xs">
              Customers are stored as WooCommerce users so they remain available
              across the storefront and POS.
            </DialogDescription>
          )}
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className={`space-y-3.5 ${compact ? "py-2" : "pt-4"}`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                First Name
              </label>
              <Input
                required
                placeholder="John"
                value={form.firstName}
                onChange={update("firstName")}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Last Name
              </label>
              <Input
                placeholder="Doe"
                value={form.lastName}
                onChange={update("lastName")}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Email
            </label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={update("email")}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="+1 555-0199"
              value={form.phone}
              onChange={update("phone")}
              className="h-9 text-xs"
            />
          </div>

          {!compact && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Internal Notes
              </label>
              <Textarea
                placeholder="Optional notes only visible to staff"
                value={form.notes}
                onChange={update("notes")}
                className="text-xs min-h-16 resize-none"
              />
            </div>
          )}

          <DialogFooter
            className={`${compact ? "pt-2" : "pt-3 border-t"} flex gap-2`}>
            <Button
              type="button"
              variant="outline"
              size={compact ? "sm" : "default"}
              onClick={() => onOpenChange?.(false)}
              className={compact ? "" : "flex-1 text-xs h-10 font-semibold"}>
              Cancel
            </Button>
            <Button
              type="submit"
              size={compact ? "sm" : "default"}
              disabled={saving}
              className={
                compact
                  ? ""
                  : "flex-1 text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/95"
              }>
              {saving
                ? "Saving..."
                : mode === "edit"
                ? "Save Changes"
                : compact
                ? "Save & Select"
                : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
