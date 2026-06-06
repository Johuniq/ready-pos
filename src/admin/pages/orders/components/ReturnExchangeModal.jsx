import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Package,
  RefreshCw,
  CreditCard,
  AlertCircle,
  CheckCircle,
  DollarSign,
} from "lucide-react";

export default function ReturnExchangeModal({
  open,
  onClose,
  order,
  onSuccess,
}) {
  const [returnType, setReturnType] = useState("refund"); // refund, exchange, store_credit
  const [selectedItems, setSelectedItems] = useState([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [restock, setRestock] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  // Exchange state
  const [exchangeItems, setExchangeItems] = useState([]);

  useEffect(() => {
    if (open && order) {
      checkEligibility();
      fetchSettings();
      initializeItems();
    }
  }, [open, order]);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/returns/settings");
      setSettings(res);
    } catch (err) {
      console.error("Failed to load return settings:", err);
    }
  };

  const checkEligibility = async () => {
    setLoadingEligibility(true);
    try {
      const res = await api.post("/returns/check-eligibility", {
        orderId: order.id,
      });
      setEligibility(res);
    } catch (err) {
      toast.error("Failed to check return eligibility");
      console.error(err);
    } finally {
      setLoadingEligibility(false);
    }
  };

  const initializeItems = () => {
    if (!order || !order.line_items) return;

    const items = order.line_items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      variation_id: item.variation_id || 0,
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.total) / item.quantity,
      total: parseFloat(item.total),
      selected: false,
      returnQuantity: item.quantity,
    }));

    setSelectedItems(items);
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateReturnQuantity = (itemId, quantity) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              returnQuantity: Math.min(Math.max(1, quantity), item.quantity),
            }
          : item
      )
    );
  };

  const calculateReturnAmount = () => {
    return selectedItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.price * item.returnQuantity, 0);
  };

  const calculateRestockingFee = (returnAmount) => {
    if (!settings || settings.restocking_fee_enabled !== "yes") return 0;

    if (settings.restocking_fee_type === "percentage") {
      return (returnAmount * settings.restocking_fee_value) / 100;
    } else {
      return parseFloat(settings.restocking_fee_value);
    }
  };

  const getReturnTotal = () => {
    const returnAmount = calculateReturnAmount();
    const restockingFee = calculateRestockingFee(returnAmount);
    return returnAmount - restockingFee;
  };

  const handleProcessReturn = async () => {
    const selectedForReturn = selectedItems.filter((item) => item.selected);

    if (selectedForReturn.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    if (!returnReason) {
      toast.error("Please select a return reason");
      return;
    }

    if (!eligibility?.eligible) {
      toast.error("This order is not eligible for returns");
      return;
    }

    setProcessing(true);
    try {
      const returnItems = selectedForReturn.map((item) => ({
        product_id: item.product_id,
        variation_id: item.variation_id,
        name: item.name,
        quantity: item.returnQuantity,
        price: item.price,
      }));

      const res = await api.post("/returns/process", {
        orderId: order.id,
        returnType,
        items: returnItems,
        reason: returnReason,
        notes: returnNotes,
        restock,
      });

      if (res.success) {
        toast.success(
          `${
            returnType.charAt(0).toUpperCase() + returnType.slice(1)
          } processed successfully!`
        );
        onSuccess && onSuccess(res);
        onClose();
      } else {
        toast.error("Failed to process return");
      }
    } catch (err) {
      toast.error(err.message || "Failed to process return");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Return / Exchange - Order #{order.number}</DialogTitle>
        </DialogHeader>

        {/* Eligibility Check */}
        {loadingEligibility ? (
          <div className="py-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg">
            Checking eligibility...
          </div>
        ) : eligibility && !eligibility.eligible ? (
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-destructive">
                Order Not Eligible for Return
              </p>
              <ul className="mt-2 space-y-1 text-sm text-destructive/90">
                {eligibility.reasons.map((reason, idx) => (
                  <li key={idx}>• {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : eligibility?.eligible ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                Order Eligible for Return
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                {eligibility.days_since} days since purchase. Return window:{" "}
                {eligibility.time_limit} days.
              </p>
            </div>
          </div>
        ) : null}

        {eligibility?.eligible && (
          <>
            {/* Return Type Selection */}
            <Tabs
              value={returnType}
              onValueChange={setReturnType}
              className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="refund"
                  disabled={settings?.enable_returns !== "yes"}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Refund
                </TabsTrigger>
                <TabsTrigger
                  value="exchange"
                  disabled={settings?.enable_exchanges !== "yes"}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Exchange
                </TabsTrigger>
                <TabsTrigger
                  value="store_credit"
                  disabled={settings?.enable_store_credit !== "yes"}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Store Credit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="refund" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Process a refund for the selected items. The customer will
                  receive their money back.
                </p>
              </TabsContent>

              <TabsContent value="exchange" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Exchange selected items for different products. A new order
                  will be created.
                </p>
              </TabsContent>

              <TabsContent value="store_credit" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Issue store credit that can be used for future purchases.
                </p>
              </TabsContent>
            </Tabs>

            {/* Items Selection */}
            <div className="mt-4">
              <Label className="text-base font-semibold mb-3 block">
                Select Items to Return
              </Label>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`qty-${item.id}`}
                              className="text-xs text-muted-foreground">
                              Quantity:
                            </Label>
                            <Input
                              id={`qty-${item.id}`}
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={item.returnQuantity}
                              onChange={(e) =>
                                updateReturnQuantity(
                                  item.id,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              disabled={!item.selected}
                              className="w-20 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">
                              / {item.quantity}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Price:{" "}
                            </span>
                            <span className="font-semibold">
                              {formatPrice(item.price * item.returnQuantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Return Reason */}
            <div>
              <Label htmlFor="return-reason">Return Reason *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger id="return-reason" className="mt-1.5">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {settings?.return_reasons &&
                    Object.entries(settings.return_reasons).map(
                      ([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      )
                    )}
                </SelectContent>
              </Select>
            </div>

            {/* Return Notes */}
            <div>
              <Label htmlFor="return-notes">Additional Notes (Optional)</Label>
              <Textarea
                id="return-notes"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Enter any additional information about this return..."
                className="mt-1.5"
                rows={3}
              />
            </div>

            {/* Restock Option */}
            {settings?.auto_restock_inventory === "yes" && (
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="restock"
                  checked={restock}
                  onCheckedChange={setRestock}
                />
                <Label htmlFor="restock" className="cursor-pointer">
                  Automatically restock returned items to inventory
                </Label>
              </div>
            )}

            {/* Return Summary */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return Amount:</span>
                <span className="font-semibold text-foreground">
                  {formatPrice(calculateReturnAmount())}
                </span>
              </div>
              {settings?.restocking_fee_enabled === "yes" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Restocking Fee (
                    {settings.restocking_fee_type === "percentage"
                      ? `${settings.restocking_fee_value}%`
                      : formatPrice(settings.restocking_fee_value)}
                    ):
                  </span>
                  <span className="font-semibold text-destructive">
                    -{formatPrice(calculateRestockingFee(calculateReturnAmount()))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                <span className="text-foreground">Total {returnType === "refund" ? "Refund" : "Credit"}:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatPrice(getReturnTotal())}
                </span>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          {eligibility?.eligible && (
            <Button
              onClick={handleProcessReturn}
              disabled={
                processing ||
                selectedItems.filter((i) => i.selected).length === 0 ||
                !returnReason
              }
              className="gap-2">
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Process{" "}
                  {returnType.charAt(0).toUpperCase() + returnType.slice(1)}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
