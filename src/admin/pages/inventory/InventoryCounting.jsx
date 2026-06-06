import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus,
  Barcode,
  CheckCircle,
  XCircle,
  FileText,
  RefreshCw,
  Edit,
  Calculator,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  DataPanel,
  PageToolbar,
} from "@/admin/components/PageLayout";
import { TableSkeleton } from "@/components/loading/PageSkeleton";
import { EmptyState } from "@/components/error/ErrorState";
import { handleError } from "@/lib/errorHandler";

export default function InventoryCounting() {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [currentOutlet, setCurrentOutlet] = useState("");
  const [activeCount, setActiveCount] = useState(null);
  const [showNewCountModal, setShowNewCountModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [varianceReport, setVarianceReport] = useState(null);
  const [scannerInput, setScannerInput] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showUpdateItemModal, setShowUpdateItemModal] = useState(false);
  const [activeTab, setActiveTab] = useState("in_progress");

  // New count form state
  const [newCountForm, setNewCountForm] = useState({
    name: "",
    countType: "full",
    notes: "",
  });

  // Update item form state
  const [updateItemForm, setUpdateItemForm] = useState({
    countedQuantity: 0,
    varianceReason: "",
  });

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    if (currentOutlet) {
      fetchCounts();
    }
  }, [currentOutlet, activeTab]);

  const fetchOutlets = async () => {
    try {
      const data = await api.get("/settings/outlets");
      setOutlets(data?.outlets || []);
      if (data?.outlets && data.outlets.length > 0) {
        setCurrentOutlet(data.outlets[0].id.toString());
      }
    } catch (err) {
      handleError(err, { showToast: true });
    }
  };

  const fetchCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { outletId: currentOutlet };
      if (activeTab !== "all") {
        params.status = activeTab;
      }

      const data = await api.get("/inventory/counts/list", { params });
      setCounts(data || []);
    } catch (err) {
      const appError = handleError(err, { showToast: true });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  const startNewCount = async () => {
    if (!newCountForm.name) {
      toast.error("Please enter a count name");
      return;
    }

    try {
      const response = await api.post("/inventory/counts/start", {
        outletId: parseInt(currentOutlet),
        ...newCountForm,
      });

      if (response?.success) {
        toast.success("Inventory count started successfully");
        setShowNewCountModal(false);
        setNewCountForm({ name: "", countType: "full", notes: "" });
        fetchCounts();
        if (response.count) {
          setActiveCount(response.count);
          setShowCountModal(true);
        }
      }
    } catch (err) {
      handleError(err, { showToast: true });
    }
  };

  const openCount = async (countId) => {
    try {
      const data = await api.get(`/inventory/counts/get/${countId}`);
      setActiveCount(data);
      setShowCountModal(true);
    } catch (err) {
      handleError(err, { showToast: true });
    }
  };

  const handleScan = async (e) => {
    e?.preventDefault();
    if (!scannerInput || !activeCount) return;

    try {
      const response = await api.post("/inventory/counts/scan", {
        countId: activeCount.id,
        barcode: scannerInput,
        scannerId: "main-scanner",
      });

      if (response?.success) {
        toast.success(`Scanned: ${response.item.product_name}`);
        setScannerInput("");
        openCount(activeCount.id);
      }
    } catch (err) {
      handleError(err, { showToast: true });
    }
  };

  const handleManualUpdate = (item) => {
    setSelectedItem(item);
    setUpdateItemForm({
      countedQuantity: item.counted_quantity || 0,
      varianceReason: item.variance_reason || "",
    });
    setShowUpdateItemModal(true);
  };

  const updateCountItem = async () => {
    try {
      const response = await api.post("/inventory/counts/update-item", {
        itemId: selectedItem.id,
        ...updateItemForm,
      });

      if (response?.success) {
        toast.success("Item updated successfully");
        setShowUpdateItemModal(false);
        setUpdateItemForm({ countedQuantity: 0, varianceReason: "" });
        openCount(activeCount.id);
      }
    } catch (err) {
      handleError(err, { showToast: true });
    }
  };

  const completeCount = async (applyChanges = false) => {
    try {
      const response = await api.post("/inventory/counts/complete", {
        countId: activeCount.id,
        applyChanges,
      });

      if (response?.success) {
        toast.success(
          applyChanges
            ? "Count completed and stock updated"
            : "Count completed without updating stock"
        );
        setShowCountModal(false);
        setActiveCount(null);
        fetchCounts();
      }
    } catch (err) {
      handleError(err, { showToast: true });
    }
  };

  const cancelCount = async () => {
    try {
      const response = await api.post("/inventory/counts/cancel", {
        countId: activeCount.id,
      });

      if (response?.success) {
        toast.success("Count cancelled successfully");
        setShowCountModal(false);
        setActiveCount(null);
        fetchCounts();
      }
    } catch (err) {
      handleError(err, { showToast: true });
    }
  };

  const viewVarianceReport = async (countId) => {
    try {
      const data = await api.get("/inventory/counts/variance-report", {
        params: { countId },
      });
      setVarianceReport(data);
      setShowVarianceModal(true);
    } catch (err) {
      handleError(err, { showToast: true });
    }
  };

  const getStatusBadge = (status) => {
    if (status === "completed") return <Badge className="badge-status badge-success">Completed</Badge>;
    if (status === "in_progress") return <Badge className="badge-status badge-info">In Progress</Badge>;
    return <Badge className="badge-status badge-danger">Cancelled</Badge>;
  };

  const getCountTypeBadge = (type) => {
    if (type === "full") return <Badge className="badge-status badge-info">Full Count</Badge>;
    if (type === "cycle") return <Badge className="badge-status badge-success">Cycle Count</Badge>;
    return <Badge className="badge-status">Spot Count</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredCounts = counts.filter((c) => {
    if (activeTab === "all") return true;
    return c.status === activeTab;
  });

  return (
    <div className="space-y-6">
      <PageToolbar>
        <div className="flex flex-1 items-center gap-3">
          <Select value={currentOutlet} onValueChange={setCurrentOutlet}>
            <SelectTrigger className="w-48 h-9 text-xs input-premium bg-background font-medium">
              <SelectValue placeholder="Select Outlet" />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              {outlets.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id.toString()}>
                  {outlet.outlet_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCounts()}
            className="h-9 px-3 gap-1.5 btn-premium bg-background hover:bg-muted/50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        <Button
          size="sm"
          onClick={() => setShowNewCountModal(true)}
          className="h-9 px-4 gap-2 btn-premium bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs">
          <Plus className="h-4 w-4" />
          Start New Count
        </Button>
      </PageToolbar>

      <DataPanel>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <TableSkeleton columns={7} rows={10} />
            ) : filteredCounts.length === 0 ? (
              <EmptyState
                icon={Calculator}
                title="No inventory counts"
                description="Start a new count to track your inventory"
              />
            ) : (
              <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
                <Table className="premium-table">
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase py-3 pl-4">Name</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3">Type</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3">Status</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3">Progress</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3">Items</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3">Started</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCounts.map((count) => (
                      <TableRow key={count.id} className="hover:bg-muted/10">
                        <TableCell className="font-semibold py-3.5 pl-4 text-foreground">
                          {count.name}
                        </TableCell>
                        <TableCell>{getCountTypeBadge(count.count_type)}</TableCell>
                        <TableCell>{getStatusBadge(count.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={count.progress_percentage} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground font-semibold">
                              {count.progress_percentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {count.counted_items} / {count.total_items}
                            </span>
                            {count.items_with_variance > 0 && (
                              <Badge className="badge-status badge-danger text-[10px]">
                                {count.items_with_variance}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {formatDate(count.started_at)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-2">
                            {count.status === "in_progress" && (
                              <Button
                                size="sm"
                                onClick={() => openCount(count.id)}
                                className="h-8 px-3 text-xs">
                                Continue
                              </Button>
                            )}
                            {count.status === "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewVarianceReport(count.id)}
                                className="h-8 px-3 text-xs gap-1">
                                <FileText className="h-3 w-3" />
                                Report
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DataPanel>

      {/* New Count Modal */}
      <Dialog open={showNewCountModal} onOpenChange={setShowNewCountModal}>
        <DialogContent className="max-w-2xl rounded-2xl border border-border/60 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Start New Inventory Count
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Count Name *</Label>
              <Input
                placeholder="e.g., Monthly Stock Count - June 2026"
                value={newCountForm.name}
                onChange={(e) =>
                  setNewCountForm({ ...newCountForm, name: e.target.value })
                }
                className="input-premium bg-background font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Count Type *</Label>
              <Select
                value={newCountForm.countType}
                onValueChange={(value) =>
                  setNewCountForm({ ...newCountForm, countType: value })
                }>
                <SelectTrigger className="input-premium bg-background font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100000]">
                  <SelectItem value="full" className="text-xs">Full Count - All Products</SelectItem>
                  <SelectItem value="cycle" className="text-xs">Cycle Count - Selected Products</SelectItem>
                  <SelectItem value="spot" className="text-xs">Spot Count - Scan as You Go</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this count..."
                value={newCountForm.notes}
                onChange={(e) =>
                  setNewCountForm({ ...newCountForm, notes: e.target.value })
                }
                className="input-premium bg-background font-medium"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewCountModal(false)}
              className="btn-premium bg-background hover:bg-muted/50 text-foreground">
              Cancel
            </Button>
            <Button 
              onClick={startNewCount}
              className="btn-premium bg-primary text-primary-foreground hover:bg-primary/95">
              Start Count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Count Modal */}
      <Dialog open={showCountModal} onOpenChange={setShowCountModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Inventory Count: {activeCount?.name}
            </DialogTitle>
          </DialogHeader>
          {activeCount && (
            <div className="space-y-6 mt-4">
              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Total Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activeCount.total_items}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Counted
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {activeCount.counted_items}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Variances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {activeCount.items_with_variance}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {activeCount.progress_percentage}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Scanner Input */}
              {activeCount.status === "in_progress" && (
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <form onSubmit={handleScan} className="flex gap-2">
                      <div className="relative flex-1">
                        <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Scan barcode or enter SKU..."
                          value={scannerInput}
                          onChange={(e) => setScannerInput(e.target.value)}
                          className="pl-10 input-premium bg-background font-medium"
                        />
                      </div>
                      <Button type="submit" className="px-6">Scan</Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Items Table */}
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table className="premium-table">
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase py-3 pl-4">Product</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Expected</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Counted</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Variance</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3">Status</TableHead>
                      {activeCount.status === "in_progress" && (
                        <TableHead className="font-bold text-[10px] uppercase py-3 text-right pr-4">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCount.items?.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/10">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.product_name}
                              className="h-10 w-10 rounded object-cover border"
                            />
                            <div>
                              <div className="font-semibold text-sm">{item.product_name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {item.sku}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.expected_quantity}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.counted_quantity ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.variance !== 0 && (
                            <Badge
                              className={
                                item.variance > 0
                                  ? "badge-status badge-success"
                                  : "badge-status badge-danger"
                              }>
                              {item.variance > 0 && "+"}
                              {item.variance}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.is_counted ? (
                            <Badge className="badge-status badge-success gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Counted
                            </Badge>
                          ) : (
                            <Badge className="badge-status badge-info gap-1">
                              <RefreshCw className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        {activeCount.status === "in_progress" && (
                          <TableCell className="text-right pr-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleManualUpdate(item)}
                              className="h-7 px-2">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Actions */}
              {activeCount.status === "in_progress" && (
                <DialogFooter className="gap-2">
                  <Button 
                    variant="outline" 
                    onClick={cancelCount}
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="h-4 w-4" />
                    Cancel Count
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => completeCount(false)}
                    className="gap-2">
                    Complete (Don't Apply)
                  </Button>
                  <Button 
                    onClick={() => completeCount(true)}
                    className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Complete & Update Stock
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Item Modal */}
      <Dialog open={showUpdateItemModal} onOpenChange={setShowUpdateItemModal}>
        <DialogContent className="rounded-2xl border border-border/60 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Update Count Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Counted Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                value={updateItemForm.countedQuantity}
                onChange={(e) =>
                  setUpdateItemForm({
                    ...updateItemForm,
                    countedQuantity: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-premium bg-background font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Variance Reason (Optional)</Label>
              <Textarea
                placeholder="Optional: Explain the variance..."
                value={updateItemForm.varianceReason}
                onChange={(e) =>
                  setUpdateItemForm({
                    ...updateItemForm,
                    varianceReason: e.target.value,
                  })
                }
                className="input-premium bg-background font-medium"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUpdateItemModal(false)}
              className="btn-premium bg-background hover:bg-muted/50">
              Cancel
            </Button>
            <Button 
              onClick={updateCountItem}
              className="btn-premium bg-primary text-primary-foreground">
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variance Report Modal */}
      <Dialog open={showVarianceModal} onOpenChange={setShowVarianceModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Variance Report</DialogTitle>
          </DialogHeader>
          {varianceReport && (
            <div className="space-y-6 mt-4">
              {/* Summary Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Total Variance Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${
                        varianceReport.total_variance_value >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                      {formatPrice(varianceReport.total_variance_value)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Positive Variance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(varianceReport.total_positive_variance)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Negative Variance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatPrice(varianceReport.total_negative_variance)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Variance Items Table */}
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table className="premium-table">
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase py-3 pl-4">Product</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Expected</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Counted</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Variance</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Unit Price</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 text-right">Value</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase py-3 pr-4">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varianceReport.variance_items?.map((item) => (
                      <TableRow key={item.product_id} className="hover:bg-muted/10">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.product_name}
                              className="h-10 w-10 rounded object-cover border"
                            />
                            <div>
                              <div className="font-semibold text-sm">{item.product_name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {item.sku}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.expected_quantity}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.counted_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={
                              item.variance > 0
                                ? "badge-status badge-success gap-1"
                                : "badge-status badge-danger gap-1"
                            }>
                            {item.variance > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {item.variance > 0 && "+"}
                            {item.variance}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPrice(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-extrabold ${
                              item.variance_value >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}>
                            {formatPrice(item.variance_value)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground pr-4">
                          {item.variance_reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => setShowVarianceModal(false)}
              className="btn-premium bg-primary text-primary-foreground">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
