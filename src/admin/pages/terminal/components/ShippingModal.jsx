import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import {
  shippingAtom,
  customerAtom,
  settingsAtom,
} from "@/admin/stores/posStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, MapPin, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";

export default function ShippingModal({ open, onOpenChange }) {
  const [shipping, setShipping] = useAtom(shippingAtom);
  const [customer] = useAtom(customerAtom);
  const [settings] = useAtom(settingsAtom);

  // Radix Dialog unmounts its children when closed, so the local state
  // (step, address, etc.) is destroyed and re-created on every reopen.
  // Lazy-initialize both from the shipping atom so the first render after
  // reopen already reflects any shipping the user has already saved,
  // instead of briefly flashing the address step.
  const [step, setStep] = useState(() =>
    shipping.address ? "method" : "address",
  );
  const [loading, setLoading] = useState(false);
  const [shippingMethods, setShippingMethods] = useState([]);

  // Address form state
  const [address, setAddress] = useState(() => shipping.address || {
    first_name: "",
    last_name: "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    postcode: "",
    country: "US",
    phone: "",
  });

  // Keep the method step's address in sync with the saved shipping address
  // when the modal is reopened. Only re-sync when opening or when the saved
  // address actually changes — never while the user is typing, otherwise
  // their in-progress edits would be wiped out on every keystroke.
  useEffect(() => {
    if (!open) return;

    if (shipping.address) {
      // Resume on the method step with saved address (+ saved method, if any)
      setAddress((prev) => {
        // Avoid clobbering local edits if the saved address is the same object
        // the user is currently editing.
        if (prev === shipping.address) return prev;
        return shipping.address;
      });
      setStep("method");
      fetchShippingMethods(shipping.address);
    } else if (customer) {
      // No saved shipping — prefill from customer and start on address step
      setAddress({
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        address_1:
          customer.billing_address_1 || customer.shipping_address_1 || "",
        address_2:
          customer.billing_address_2 || customer.shipping_address_2 || "",
        city: customer.billing_city || customer.shipping_city || "",
        state: customer.billing_state || customer.shipping_state || "",
        postcode:
          customer.billing_postcode || customer.shipping_postcode || "",
        country:
          customer.billing_country || customer.shipping_country || "US",
        phone: customer.phone || "",
      });
      setStep("address");
    } else {
      // No customer, no saved shipping — start with empty form on address step
      setAddress({
        first_name: "",
        last_name: "",
        address_1: "",
        address_2: "",
        city: "",
        state: "",
        postcode: "",
        country: "US",
        phone: "",
      });
      setStep("address");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer, shipping.address]);

  const fetchShippingMethods = async (shippingAddress) => {
    setLoading(true);
    try {
      const response = await api.post("/shipping/calculate", {
        address: shippingAddress,
      });

      if (response.methods && response.methods.length > 0) {
        setShippingMethods(response.methods);
      } else {
        setShippingMethods([]);
        toast.warning("No shipping methods available for this address");
      }
    } catch (err) {
      
      toast.error(err.message || "Failed to load shipping methods");
      setShippingMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToMethods = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (
      !address.first_name ||
      !address.last_name ||
      !address.address_1 ||
      !address.city ||
      !address.postcode ||
      !address.country
    ) {
      toast.error("Please fill in all required address fields");
      return;
    }

    await fetchShippingMethods(address);
    setStep("method");
  };

  const handleSelectMethod = (method) => {
    setShipping({
      method: method,
      cost: parseFloat(method.cost) || 0,
      address: address,
    });
    toast.success(`Shipping method selected: ${method.title}`);
    onOpenChange(false);
  };

  const handleRemoveShipping = () => {
    setShipping({
      method: null,
      cost: 0,
      address: null,
    });
    toast.success("Shipping removed from order");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-xl select-none h-[90vh] max-h-[90vh] !flex !flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <span>Add Shipping to Order</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-3 border-b">
          <div
            className={`flex items-center gap-2 ${
              step === "address" ? "text-primary" : "text-muted-foreground"
            }`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === "address"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
              {shipping.address ? <Check className="w-3.5 h-3.5" /> : "1"}
            </div>
            <span className="text-xs font-semibold">Shipping Address</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div
            className={`flex items-center gap-2 ${
              step === "method" ? "text-primary" : "text-muted-foreground"
            }`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === "method"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
              {shipping.method ? <Check className="w-3.5 h-3.5" /> : "2"}
            </div>
            <span className="text-xs font-semibold">Shipping Method</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {step === "address" && (
            <form
              onSubmit={handleContinueToMethods}
              className="h-full min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto pr-4">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">First Name *</Label>
                      <Input
                        required
                        value={address.first_name}
                        onChange={(e) =>
                          setAddress({ ...address, first_name: e.target.value })
                        }
                        placeholder="John"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Last Name *</Label>
                      <Input
                        required
                        value={address.last_name}
                        onChange={(e) =>
                          setAddress({ ...address, last_name: e.target.value })
                        }
                        placeholder="Doe"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                      Address Line 1 *
                    </Label>
                    <Input
                      required
                      value={address.address_1}
                      onChange={(e) =>
                        setAddress({ ...address, address_1: e.target.value })
                      }
                      placeholder="123 Main Street"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Address Line 2</Label>
                    <Input
                      value={address.address_2}
                      onChange={(e) =>
                        setAddress({ ...address, address_2: e.target.value })
                      }
                      placeholder="Apartment, suite, unit, etc. (optional)"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">City *</Label>
                      <Input
                        required
                        value={address.city}
                        onChange={(e) =>
                          setAddress({ ...address, city: e.target.value })
                        }
                        placeholder="New York"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">
                        State / Province *
                      </Label>
                      <Input
                        required
                        value={address.state}
                        onChange={(e) =>
                          setAddress({ ...address, state: e.target.value })
                        }
                        placeholder="NY"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">
                        Postal / ZIP Code *
                      </Label>
                      <Input
                        required
                        value={address.postcode}
                        onChange={(e) =>
                          setAddress({ ...address, postcode: e.target.value })
                        }
                        placeholder="10001"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Country *</Label>
                      <Input
                        required
                        value={address.country}
                        onChange={(e) =>
                          setAddress({ ...address, country: e.target.value })
                        }
                        placeholder="US"
                        className="h-9 text-xs"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Phone</Label>
                    <Input
                      value={address.phone}
                      onChange={(e) =>
                        setAddress({ ...address, phone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-4 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Continue to Shipping Methods
                </Button>
              </DialogFooter>
            </form>
          )}

          {step === "method" && (
            <div className="h-full min-h-0 flex flex-col">
              <div className="bg-muted/30 rounded-lg p-3 mb-4 border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">
                      Shipping To:
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {address.first_name} {address.last_name}
                      <br />
                      {address.address_1}
                      {address.address_2 && `, ${address.address_2}`}
                      <br />
                      {address.city}, {address.state} {address.postcode}
                      <br />
                      {address.country}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("address")}
                    className="h-7 text-xs">
                    Edit
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    Calculating shipping rates...
                  </p>
                </div>
              ) : shippingMethods.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Truck className="w-12 h-12 opacity-20" />
                  <p className="text-xs font-semibold">
                    No shipping methods available
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("address")}
                    className="mt-2">
                    Change Address
                  </Button>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto pr-4">
                  <div className="space-y-2 pr-4">
                    {shippingMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => handleSelectMethod(method)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:border-primary/50 hover:bg-primary/5 ${
                          shipping.method?.id === method.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card"
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-primary" />
                              <span className="text-sm font-bold text-foreground">
                                {method.title}
                              </span>
                            </div>
                            {method.description && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {method.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-sm font-extrabold text-primary">
                              {parseFloat(method.cost) === 0
                                ? "FREE"
                                : formatPrice(method.cost)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="border-t pt-4 mt-4 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveShipping}
                  className="text-destructive hover:bg-destructive/10">
                  Remove Shipping
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
