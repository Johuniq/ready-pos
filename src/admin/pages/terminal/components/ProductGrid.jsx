import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  Barcode,
  Grid,
  Layers,
  Layers3,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/admin/hooks/useCart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { dbOperations } from "@/admin/lib/db";
import { InlineError } from "@/components/error/ErrorState";
import { ProductGridSkeleton } from "@/components/loading/PageSkeleton";
import { useAtom } from "jotai";
import { sessionAtom } from "@/admin/stores/posStore";

export default function ProductGrid() {
  const { addToCart } = useCart();
  const [session] = useAtom(sessionAtom);
  const [products, setProducts] = useState([]);

  const getOutletOverridePrice = (p) => {
    const pricing = session?.session?.outlet?.pricing_config;
    if (!pricing) return p.price;

    // 1. Product-specific price override
    if (pricing.products && pricing.products[p.id]) {
      return pricing.products[p.id].price;
    }

    // 2. Category-based modifier
    if (pricing.categories && p.categories) {
      for (const cat of p.categories) {
        if (pricing.categories[cat.id]) {
          const modifier = pricing.categories[cat.id];
          const basePrice = parseFloat(p.regular_price || p.price);
          if (modifier.type === "percent") {
            return basePrice * (1 + modifier.value / 100);
          } else if (modifier.type === "fixed") {
            return basePrice + modifier.value;
          }
        }
      }
    }

    return p.price;
  };

  const displayProducts = products.map(p => ({
    ...p,
    price: getOutletOverridePrice(p)
  }));
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Favorites pinning state
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ready_pos_favorites") || "[]");
    } catch {
      return [];
    }
  });

  // Barcode scanner buffer handling
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const lastKeyTimeRef = useRef(0);

  // Variation selector state
  const [selectedProductForVariations, setSelectedProductForVariations] =
    useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem("ready_pos_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Fetch categories once on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when category changes
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  // Handle searching with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(search);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Barcode scanner listener (listening for rapid keystrokes ended by Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if focus is in search input
      if (
        document.activeElement.tagName === "INPUT" &&
        document.activeElement.id === "search-input"
      ) {
        return;
      }

      const currentTime = Date.now();

      // Scanner outputs characters very fast (typically < 30ms between keys)
      if (currentTime - lastKeyTimeRef.current > 100) {
        setBarcodeBuffer(""); // Clear if there's a delay (manual typing)
      }

      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.length > 2) {
          handleBarcodeScanned(barcodeBuffer);
          setBarcodeBuffer("");
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        setBarcodeBuffer((prev) => prev + e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeBuffer]);

  const fetchCategories = async () => {
    try {
      let data = [];
      if (navigator.onLine) {
        data = await api.get("/products/categories");
        // Save to local cache
        await dbOperations.putAll("categories", data);
      } else {
        data = await dbOperations.getAll("categories");
      }
      setCategories([
        { id: "all", name: "All Products", slug: "all" },
        { id: "favorites", name: "Favorites ⭐", slug: "favorites" },
        ...data,
      ]);
    } catch (err) {
      
      // Fallback to indexedDB if error occurs online
      const localData = await dbOperations.getAll("categories").catch(() => []);
      setCategories([
        { id: "all", name: "All Products", slug: "all" },
        { id: "favorites", name: "Favorites ⭐", slug: "favorites" },
        ...localData,
      ]);
    }
  };

  const fetchProducts = async (searchTerm = "") => {
    setLoading(true);
    setError(null);
    try {
      if (navigator.onLine) {
        const params = {
          limit: 100,
          page: 1,
        };
        if (searchTerm) params.search = searchTerm;
        if (
          selectedCategory &&
          selectedCategory !== "all" &&
          selectedCategory !== "favorites"
        ) {
          params.category = selectedCategory;
        }

        const data = await api.get("/products/get", params);
        const fetchedProducts = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : [];

        // If favorites, client filter only
        if (selectedCategory === "favorites") {
          setProducts(fetchedProducts.filter((p) => favorites.includes(p.id)));
        } else {
          setProducts(fetchedProducts);
        }

        // Cache them in background
        if (fetchedProducts.length > 0) {
          await dbOperations
            .putAll("products", fetchedProducts)
            .catch(() => {});
        }
      } else {
        // Offline fallback - read from local IndexedDB
        const cachedProducts = await dbOperations.getAll("products");
        let filtered = cachedProducts;

        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              (p.name && p.name.toLowerCase().includes(term)) ||
              (p.sku && p.sku.toLowerCase().includes(term)),
          );
        }

        if (selectedCategory && selectedCategory !== "all") {
          if (selectedCategory === "favorites") {
            filtered = filtered.filter((p) => favorites.includes(p.id));
          } else {
            filtered = filtered.filter(
              (p) =>
                p.categories &&
                p.categories.some((c) => c.slug === selectedCategory),
            );
          }
        }

        setProducts(filtered);
      }
    } catch (err) {
      const appError = handleError(err, {
        showToast: false,
        customMessage: "Failed to load products. Working with local cache.",
      });

      // Fallback to offline search on exception
      const cachedProducts = await dbOperations
        .getAll("products")
        .catch(() => []);
      let filtered = cachedProducts;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.sku && p.sku.toLowerCase().includes(term)),
        );
      }

      if (selectedCategory && selectedCategory !== "all") {
        if (selectedCategory === "favorites") {
          filtered = filtered.filter((p) => favorites.includes(p.id));
        } else {
          filtered = filtered.filter(
            (p) =>
              p.categories &&
              p.categories.some((c) => c.slug === selectedCategory),
          );
        }
      }
      setProducts(filtered);

      if (filtered.length === 0) {
        setError(appError);
      } else {
        toast.warning("Live product sync failed. Showing cached products.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = async (code) => {
    toast.info(`Scanning barcode: ${code}`);
    try {
      let product = null;
      if (navigator.onLine) {
        product = await api.get("/products/search", { code });
      } else {
        const cached = await dbOperations.getAll("products");
        product = cached.find((p) => p.sku === code || p.barcode === code);
      }

      if (product) {
        // Apply pricing override to barcode matched product
        const pricingOverriddenProduct = { ...product, price: getOutletOverridePrice(product) };
        if (pricingOverriddenProduct.variations && pricingOverriddenProduct.variations.length > 0) {
          // Variable product barcode matched parent, show selector
          setSelectedProductForVariations(pricingOverriddenProduct);
          setSelectedAttributes({});
        } else {
          addToCart(pricingOverriddenProduct, 1);
          toast.success(`Added ${pricingOverriddenProduct.name} to cart`);
        }
      } else {
        toast.error("No product found matching this barcode");
      }
    } catch (err) {
      toast.error("Error searching barcode product");
    }
  };

  const handleProductClick = (product) => {
    if (product.variations && product.variations.length > 0) {
      setSelectedProductForVariations(product);
      setSelectedAttributes({});
    } else {
      addToCart(product, 1);
    }
  };

  const handleSelectAttribute = (attrName, value) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attrName]: value,
    }));
  };

  const handleAddSelectedVariation = () => {
    if (!selectedProductForVariations) return;

    // Find the variation that matches all selected attributes
    const matchingVariation = selectedProductForVariations.variations.find(
      (v) => {
        return Object.entries(selectedAttributes).every(
          ([attrName, attrValue]) => {
            // WooCommerce returns attribute keys with 'attribute_' prefix or lowercase key names.
            // We normalize attributes check.
            const cleanKey = attrName.replace("pa_", "").toLowerCase();
            return (
              v.attributes[attrName] === attrValue ||
              v.attributes[cleanKey] === attrValue
            );
          },
        );
      },
    );

    if (matchingVariation) {
      const cartProductItem = {
        id: matchingVariation.id,
        name: `${selectedProductForVariations.name} - ${Object.values(
          selectedAttributes,
        ).join(", ")}`,
        price: getOutletOverridePrice(matchingVariation),
        regular_price: matchingVariation.regular_price,
        sku: matchingVariation.sku,
        image: matchingVariation.image || selectedProductForVariations.image,
        manage_stock: matchingVariation.manage_stock,
        stock_quantity: matchingVariation.stock_quantity,
        stock_status: matchingVariation.stock_status,
        tax_status: selectedProductForVariations.tax_status,
        tax_class: selectedProductForVariations.tax_class,
      };
      addToCart(cartProductItem, 1);
      toast.success("Variation added to cart");
      setSelectedProductForVariations(null);
    } else {
      toast.error("Please select a valid combination of options.");
    }
  };

  // Calculate unique attributes for variable products selector
  const getProductAttributesMap = () => {
    if (!selectedProductForVariations) return {};
    const map = {};

    selectedProductForVariations.variations.forEach((v) => {
      Object.entries(v.attributes).forEach(([name, val]) => {
        if (!map[name]) map[name] = new Set();
        if (val) map[name].add(val);
      });
    });

    const formatted = {};
    Object.entries(map).forEach(([name, set]) => {
      formatted[name] = Array.from(set);
    });
    return formatted;
  };

  return (
    <div className="flex flex-col h-full bg-muted/20 select-none">
      {/* Top Toolbar */}
      <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
          <Input
            id="search-input"
            placeholder="Search product name or SKU/barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/40 border-none rounded-lg focus-visible:ring-primary focus-visible:ring-1"
          />
        </div>

        <div className="flex gap-2 text-xs font-semibold text-muted-foreground bg-muted p-1 rounded-lg">
          <span className="flex items-center gap-1 bg-card text-foreground p-1 px-2.5 rounded-md shadow-xs">
            <Barcode className="w-3.5 h-3.5" /> Barcode Active
          </span>
        </div>
      </div>

      {/* Main Area: Categories list on left (sidebar) + Products grid on right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Categories Tab Sidebar */}
        <div className="w-48 border-r bg-card flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.slug ? "default" : "ghost"}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`w-full justify-start p-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                    selectedCategory === cat.slug
                      ? "font-semibold shadow-xs"
                      : ""
                  }`}>
                  <Grid className="w-4 h-4 shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 overflow-auto p-4">
              <ProductGridSkeleton count={15} />
            </div>
          ) : error && products.length === 0 ? (
            <div className="p-4">
              <InlineError
                title="Products could not load"
                message={error.message}
                onRetry={() => fetchProducts(search)}
              />
            </div>
          ) : products.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1">
                Try a different category or search term.
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {displayProducts.map((product) => {
                  const outOfStock =
                    product.manage_stock && product.stock_quantity <= 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => !outOfStock && handleProductClick(product)}
                      className={`group relative rounded-xl border bg-card p-2 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md active:scale-98 ${
                        outOfStock
                          ? "opacity-50 cursor-not-allowed select-none"
                          : ""
                      }`}>
                      {/* Product Image */}
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                        />

                        {/* Favorite Toggle Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFavorites((prev) =>
                              prev.includes(product.id)
                                ? prev.filter((id) => id !== product.id)
                                : [...prev, product.id],
                            );
                          }}
                          className="absolute top-1.5 right-1.5 p-1.5 h-7 w-7 rounded-full bg-background/80 hover:bg-background text-foreground transition-all shadow-xs z-10"
                          title={
                            favorites.includes(product.id)
                              ? "Remove from Favorites"
                              : "Add to Favorites"
                          }>
                          <Star
                            className={`w-3.5 h-3.5 ${
                              favorites.includes(product.id)
                                ? "fill-yellow-400 text-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>

                        {product.sale_price > 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Sale
                          </span>
                        )}
                        {product.variations &&
                          product.variations.length > 0 && (
                            <span className="absolute bottom-1.5 left-1.5 bg-primary/95 text-primary-foreground text-[10px] font-semibold p-1 px-1.5 rounded-md shadow-xs flex items-center gap-1">
                              <Layers3 className="w-3 h-3" /> Options
                            </span>
                          )}
                        {product.manage_stock &&
                          product.stock_quantity > 0 &&
                          product.stock_quantity <=
                            (product.low_stock_threshold !== undefined &&
                            product.low_stock_threshold !== null
                              ? product.low_stock_threshold
                              : 5) && (
                            <span className="absolute bottom-1.5 right-1.5 bg-warning/90 text-warning-foreground text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg backdrop-blur-md border border-warning/40 animate-pulse uppercase tracking-wider">
                              Low Stock
                            </span>
                          )}
                      </div>

                      {/* Product Info */}
                      <div className="mt-2.5 flex flex-col justify-between flex-1">
                        <div>
                          <h4 className="text-xs font-semibold line-clamp-2 text-foreground group-hover:text-primary transition-colors leading-tight">
                            {product.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            SKU: {product.sku || "N/A"}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2.5">
                          <span className="text-xs font-extrabold text-foreground">
                            {formatPrice(product.price)}
                          </span>
                          {product.manage_stock && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-all ${
                                product.stock_quantity <=
                                (product.low_stock_threshold !== undefined &&
                                product.low_stock_threshold !== null
                                  ? product.low_stock_threshold
                                  : 5)
                                  ? "text-destructive bg-destructive/10 border border-destructive/20 font-black animate-pulse"
                                  : "text-muted-foreground bg-muted border border-transparent"
                              }`}>
                              Qty: {product.stock_quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Variable Product Modal */}
      <Dialog
        open={!!selectedProductForVariations}
        onOpenChange={(open) => !open && setSelectedProductForVariations(null)}>
        <DialogContent className="max-w-md rounded-xl select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Select Options for {selectedProductForVariations?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedProductForVariations && (
            <div className="py-4 space-y-4">
              {Object.entries(getProductAttributesMap()).map(
                ([name, values]) => {
                  // Normalize attribute key name for user display (capitalize)
                  const displayName = name
                    .replace("pa_", "")
                    .replace("_", " ")
                    .toUpperCase();
                  return (
                    <div key={name} className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        {displayName}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {values.map((val) => (
                          <Button
                            key={val}
                            size="sm"
                            variant={
                              selectedAttributes[name] === val
                                ? "default"
                                : "outline"
                            }
                            onClick={() => handleSelectAttribute(name, val)}
                            className="text-xs py-1.5 h-auto rounded-lg font-medium">
                            {val}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedProductForVariations(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedVariation}
              disabled={
                Object.keys(selectedAttributes).length !==
                Object.keys(getProductAttributesMap()).length
              }>
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
