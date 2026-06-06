import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  TruckIcon,
  Users,
  ShoppingCart,
  ClipboardList,
  AlertCircle,
  Calculator,
  History,
} from "lucide-react";
import { PageHeader } from "@/admin/components/PageLayout";
import StockTransfers from "./StockTransfers";
import Suppliers from "./Suppliers";
import PurchaseOrders from "./PurchaseOrders";
import StockAdjustments from "./StockAdjustments";
import ReorderAlerts from "./ReorderAlerts";
import InventoryCounting from "./InventoryCounting";
import InventoryHistory from "./InventoryHistory";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("transfers");
  const [prefilledPoData, setPrefilledPoData] = useState(null);

  return (
    <div className="page-container">
      <PageHeader
        icon={Package}
        title="Inventory"
        description="Manage suppliers, purchase orders, stock transfers, and adjustments"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 tabs-list-container">
          <TabsList className="grid grid-cols-2 md:grid-cols-7 max-w-5xl bg-muted/10 border p-1 rounded-xl shrink-0">
            <TabsTrigger
              value="transfers"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs gap-2 py-1.5 px-3">
              <TruckIcon className="h-4 w-4" />
              Transfers
            </TabsTrigger>
            <TabsTrigger
              value="suppliers"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs gap-2 py-1.5 px-3">
              <Users className="h-4 w-4" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger
              value="purchase-orders"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs gap-2 py-1.5 px-3">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="adjustments"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs gap-2 py-1.5 px-3">
              <ClipboardList className="h-4 w-4" />
              Adjustments
            </TabsTrigger>
            <TabsTrigger
              value="reorder-alerts"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs gap-2 py-1.5 px-3">
              <AlertCircle className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger
              value="counting"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs gap-2 py-1.5 px-3">
              <Calculator className="h-4 w-4" />
              Counting
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs gap-2 py-1.5 px-3">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transfers" className="mt-0">
          <StockTransfers />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-0">
          <Suppliers />
        </TabsContent>
        <TabsContent value="purchase-orders" className="mt-0">
          <PurchaseOrders
            prefilledData={prefilledPoData}
            clearPrefilledData={() => setPrefilledPoData(null)}
          />
        </TabsContent>
        <TabsContent value="adjustments" className="mt-0">
          <StockAdjustments />
        </TabsContent>
        <TabsContent value="reorder-alerts" className="mt-0">
          <ReorderAlerts
            onCreatePoClick={(alert) => {
              setPrefilledPoData({
                outletId: alert.outlet_id,
                productId: alert.product_id,
                productName: alert.product_name,
                price: alert.price,
                suggestedQty: alert.suggested_quantity,
                sku: alert.product_sku,
              });
              setActiveTab("purchase-orders");
            }}
          />
        </TabsContent>
        <TabsContent value="counting" className="mt-0">
          <InventoryCounting />
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <InventoryHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
