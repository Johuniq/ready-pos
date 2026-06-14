import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Receipt,
  CreditCard,
  Plus,
  Trash2,
  Save,
  Settings2,
  Info,
  Percent,
  Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Outlet Configuration Modal
 * Manages pricing, taxes, and payment methods per outlet
 */
export function OutletConfigurationModal({ outlet, open, onOpenChange, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pricing");

  // Pricing configuration state
  const [productPrices, setProductPrices] = useState({});
  const [categoryModifiers, setCategoryModifiers] = useState({});
  const [newProductId, setNewProductId] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("percent");
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

  // Tax configuration state
  const [taxRates, setTaxRates] = useState([]);
  const [taxIncludedInPrices, setTaxIncludedInPrices] = useState(false);
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("");
  const [newTaxType, setNewTaxType] = useState("percent");
  const [newTaxCompound, setNewTaxCompound] = useState(false);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const availablePaymentMethods = [
    { id: "cash", label: "Cash", desc: "Physical cash payments" },
    { id: "card", label: "Card", desc: "Credit/Debit card" },
  ];

  // State for selectors
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    if (open && outlet) {
      fetchConfiguration();
      fetchProductsAndCategories();
    }
  }, [open, outlet]);

  const fetchProductsAndCategories = async () => {
    try {
      const prodData = await api.get("/products/get", { limit: 100 });
      setAllProducts(prodData?.products || []);

      const catData = await api.get("/products/categories");
      setAllCategories(catData || []);
    } catch (err) {
      // Quietly ignore or log
    }
  };

  const fetchConfiguration = async () => {
    if (!outlet?.id) return;
    
    setLoading(true);
    try {
      const config = await api.get(`/settings/outlets/config/${outlet.id}`);
      
      // Load pricing config
      const pricingConfig = config.pricing_config || {};
      setProductPrices(pricingConfig.products || {});
      setCategoryModifiers(pricingConfig.categories || {});
      
      // Load tax config
      const taxConfig = config.tax_config || {};
      setTaxRates(taxConfig.rates || []);
      setTaxIncludedInPrices(taxConfig.tax_included_in_prices || false);
      
      // Load payment methods
      setPaymentMethods(config.payment_methods || []);
    } catch (err) {
      toast.error(err.message || "Failed to load outlet configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!outlet?.id) return;

    setSaving(true);
    try {
      const payload = {
        id: outlet.id,
        pricing_config: {
          products: productPrices,
          categories: categoryModifiers,
        },
        tax_config: {
          rates: taxRates,
          tax_included_in_prices: taxIncludedInPrices,
        },
        payment_methods: paymentMethods,
      };
      
      await api.post("/settings/outlets/update-config", payload);
      toast.success("Outlet configuration saved successfully");
      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  // Pricing functions
  const handleAddProductPrice = () => {
    if (!newProductId || !newProductPrice) {
      toast.error("Please enter product ID and price");
      return;
    }
    
    setProductPrices({
      ...productPrices,
      [newProductId]: {
        price: parseFloat(newProductPrice),
        effective_date: null,
      },
    });
    setNewProductId("");
    setNewProductPrice("");
  };

  const handleRemoveProductPrice = (productId) => {
    const updated = { ...productPrices };
    delete updated[productId];
    setProductPrices(updated);
  };

  const handleAddCategoryModifier = () => {
    if (!newCategoryId || !newCategoryValue) {
      toast.error("Please enter category ID and value");
      return;
    }
    
    setCategoryModifiers({
      ...categoryModifiers,
      [newCategoryId]: {
        type: newCategoryType,
        value: parseFloat(newCategoryValue),
        description: newCategoryDesc || `${newCategoryType === 'percent' ? 'Percentage' : 'Fixed'} adjustment`,
      },
    });
    setNewCategoryId("");
    setNewCategoryValue("");
    setNewCategoryDesc("");
  };

  const handleRemoveCategoryModifier = (categoryId) => {
    const updated = { ...categoryModifiers };
    delete updated[categoryId];
    setCategoryModifiers(updated);
  };

  // Tax functions
  const handleAddTaxRate = () => {
    if (!newTaxName || !newTaxRate) {
      toast.error("Please enter tax name and rate");
      return;
    }
    
    setTaxRates([
      ...taxRates,
      {
        name: newTaxName,
        rate: parseFloat(newTaxRate),
        type: newTaxType,
        compound: newTaxCompound,
      },
    ]);
    setNewTaxName("");
    setNewTaxRate("");
    setNewTaxType("percent");
    setNewTaxCompound(false);
  };

  const handleRemoveTaxRate = (index) => {
    setTaxRates(taxRates.filter((_, i) => i !== index));
  };

  // Payment method functions
  const togglePaymentMethod = (methodId) => {
    if (paymentMethods.includes(methodId)) {
      setPaymentMethods(paymentMethods.filter((m) => m !== methodId));
    } else {
      setPaymentMethods([...paymentMethods, methodId]);
    }
  };

  if (!outlet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <span>Configure {outlet.name}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Customize pricing, taxes, and payment methods for this outlet
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 w-full flex-shrink-0">
            <TabsTrigger value="pricing" className="text-xs font-semibold gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="taxes" className="text-xs font-semibold gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              Taxes
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs font-semibold gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              Payments
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pt-4 min-h-0">
            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-6 mt-0 h-full">
              <div className="flex items-start gap-2 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                <Info className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-sky-900 dark:text-sky-100">
                  <p className="font-semibold">Pricing Priority:</p>
                  <p className="text-[10px] mt-1">
                    Product-specific prices take highest priority, followed by category modifiers, then default WooCommerce prices.
                  </p>
                </div>
              </div>

                {/* Product-Specific Pricing */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Product-Specific Pricing</h3>
                        <p className="text-xs text-muted-foreground">Set custom prices for individual products</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {Object.keys(productPrices).length} products
                      </Badge>
                    </div>

                    <Separator />

                    {/* Add Product Price Form */}
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5 space-y-1">
                        <Label className="text-[10px] font-bold">Product</Label>
                        <Select value={newProductId} onValueChange={setNewProductId}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[10px] font-bold">Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="29.99"
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="col-span-4">
                        <Button
                          type="button"
                          onClick={handleAddProductPrice}
                          size="sm"
                          className="w-full h-9 gap-1.5 text-xs font-bold">
                          <Plus className="w-3.5 h-3.5" />
                          Add Price
                        </Button>
                      </div>
                    </div>

                    {/* Product Prices List */}
                    {Object.keys(productPrices).length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(productPrices).map(([productId, config]) => (
                          <div
                            key={productId}
                            className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  {allProducts.find((p) => p.id.toString() === productId)?.name || `Product #${productId}`}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Custom Price: ${config.price}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveProductPrice(productId)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Category-Based Pricing */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Category-Based Modifiers</h3>
                        <p className="text-xs text-muted-foreground">Apply percentage or fixed adjustments to categories</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {Object.keys(categoryModifiers).length} categories
                      </Badge>
                    </div>

                    <Separator />

                    {/* Add Category Modifier Form */}
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[10px] font-bold">Category</Label>
                        <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[10px] font-bold">Type</Label>
                        <Select value={newCategoryType} onValueChange={setNewCategoryType}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] font-bold">Value</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="15"
                          value={newCategoryValue}
                          onChange={(e) => setNewCategoryValue(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] font-bold">Description</Label>
                        <Input
                          placeholder="Premium"
                          value={newCategoryDesc}
                          onChange={(e) => setNewCategoryDesc(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          type="button"
                          onClick={handleAddCategoryModifier}
                          size="sm"
                          className="w-full h-9 gap-1.5 text-xs font-bold">
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Category Modifiers List */}
                    {Object.keys(categoryModifiers).length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(categoryModifiers).map(([categoryId, config]) => (
                          <div
                            key={categoryId}
                            className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border">
                            <div className="flex items-center gap-2">
                              {config.type === 'percent' ? (
                                <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  {allCategories.find((c) => c.id.toString() === categoryId)?.name || `Category #${categoryId}`}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {config.type === 'percent' ? `${config.value > 0 ? '+' : ''}${config.value}%` : `${config.value > 0 ? '+$' : '-$'}${Math.abs(config.value)}`}
                                  {config.description && ` - ${config.description}`}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCategoryModifier(categoryId)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Taxes Tab */}
              <TabsContent value="taxes" className="space-y-6 mt-0 h-full">
                <div className="flex items-start gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-indigo-900 dark:text-indigo-100">
                    <p className="font-semibold">Location-Specific Taxes:</p>
                    <p className="text-[10px] mt-1">
                      These tax rates will override global WooCommerce settings for this outlet only.
                    </p>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Tax Rates</h3>
                        <p className="text-xs text-muted-foreground">Configure outlet-specific tax rates</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {taxRates.length} rates
                      </Badge>
                    </div>

                    <Separator />

                    {/* Tax Included Toggle */}
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <p className="text-xs font-bold text-foreground">Tax Included in Prices</p>
                        <p className="text-[10px] text-muted-foreground">Prices already include tax (display-only)</p>
                      </div>
                      <Switch
                        checked={taxIncludedInPrices}
                        onCheckedChange={setTaxIncludedInPrices}
                      />
                    </div>

                    {/* Add Tax Rate Form */}
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4 space-y-1">
                        <Label className="text-[10px] font-bold">Tax Name</Label>
                        <Input
                          placeholder="State Tax"
                          value={newTaxName}
                          onChange={(e) => setNewTaxName(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] font-bold">Rate</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="7.5"
                          value={newTaxRate}
                          onChange={(e) => setNewTaxRate(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] font-bold">Type</Label>
                        <Select value={newTaxType} onValueChange={setNewTaxType}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percent</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] font-bold flex items-center gap-1">
                          Compound
                        </Label>
                        <div className="h-9 flex items-center justify-center">
                          <Switch
                            checked={newTaxCompound}
                            onCheckedChange={setNewTaxCompound}
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Button
                          type="button"
                          onClick={handleAddTaxRate}
                          size="sm"
                          className="w-full h-9 gap-1.5 text-xs font-bold">
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Tax Rates List */}
                    {taxRates.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {taxRates.map((tax, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-bold text-foreground flex items-center gap-2">
                                  {tax.name}
                                  {tax.compound && (
                                    <Badge variant="secondary" className="text-[9px] h-4">
                                      Compound
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {tax.type === 'percent' ? `${tax.rate}%` : `$${tax.rate}`}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTaxRate(index)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {taxRates.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground italic">
                        No custom tax rates configured. Global WooCommerce taxes will apply.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment Methods Tab */}
              <TabsContent value="payments" className="space-y-6 mt-0 h-full">
                <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <Info className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-emerald-900 dark:text-emerald-100">
                    <p className="font-semibold">Payment Method Control:</p>
                    <p className="text-[10px] mt-1">
                      Enable or disable specific payment methods for this outlet. If none selected, all globally enabled methods are available.
                    </p>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Available Payment Methods</h3>
                        <p className="text-xs text-muted-foreground">Select payment methods enabled for this outlet</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {paymentMethods.length || "All"} enabled
                      </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      {availablePaymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-bold text-foreground">{method.label}</p>
                              <p className="text-[10px] text-muted-foreground">{method.desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={paymentMethods.length === 0 || paymentMethods.includes(method.id)}
                            onCheckedChange={() => togglePaymentMethod(method.id)}
                          />
                        </div>
                      ))}
                    </div>

                    {paymentMethods.length === 0 && (
                      <div className="text-center py-4 px-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                        <p className="text-xs font-semibold text-sky-900 dark:text-sky-100">
                          All globally enabled payment methods are available
                        </p>
                        <p className="text-[10px] text-sky-700 dark:text-sky-200 mt-1">
                          Toggle off methods to restrict them for this outlet
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-9 text-xs font-bold">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSaveConfiguration}
            disabled={saving || loading}
            className="h-9 gap-1.5 text-xs font-bold">
            {saving ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
