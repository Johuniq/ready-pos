import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Type,
  Image,
  Minus,
  BarChart3,
  Receipt,
  ArrowUp,
  ArrowDown,
  Printer,
  QrCode,
} from "lucide-react";

/**
 * Default receipt template blocks.
 * Each block has: id, type, enabled, and type-specific config.
 */
const DEFAULT_BLOCKS = [
  { id: "logo", type: "logo", enabled: true, config: { url: "", width: 120 } },
  {
    id: "header",
    type: "text",
    enabled: true,
    config: { content: "", align: "center", bold: true, size: "lg" },
  },
  {
    id: "separator_1",
    type: "separator",
    enabled: true,
    config: { style: "dashed" },
  },
  {
    id: "order_info",
    type: "order_info",
    enabled: true,
    config: { showDate: true, showCashier: true, showOrderNumber: true },
  },
  {
    id: "separator_2",
    type: "separator",
    enabled: true,
    config: { style: "solid" },
  },
  {
    id: "items",
    type: "items",
    enabled: true,
    config: { showSku: false, showQty: true, showUnitPrice: true },
  },
  {
    id: "separator_3",
    type: "separator",
    enabled: true,
    config: { style: "solid" },
  },
  {
    id: "totals",
    type: "totals",
    enabled: true,
    config: {
      showSubtotal: true,
      showDiscount: true,
      showTax: true,
      showTotal: true,
    },
  },
  {
    id: "payment_info",
    type: "payment_info",
    enabled: true,
    config: { showMethod: true, showCash: true, showChange: true },
  },
  {
    id: "separator_4",
    type: "separator",
    enabled: true,
    config: { style: "dashed" },
  },
  {
    id: "barcode",
    type: "barcode",
    enabled: true,
    config: { showOrderBarcode: true },
  },
  {
    id: "footer",
    type: "text",
    enabled: true,
    config: {
      content: "Thank you for shopping with us!",
      align: "center",
      bold: false,
      size: "sm",
    },
  },
  { id: "qr_code", type: "qr_code", enabled: false, config: { content: "" } },
];

const BLOCK_TYPES = {
  logo: { label: "Store Logo", icon: Image },
  text: { label: "Custom Text", icon: Type },
  separator: { label: "Divider Line", icon: Minus },
  order_info: { label: "Order Info", icon: Receipt },
  items: { label: "Cart Items", icon: BarChart3 },
  totals: { label: "Totals", icon: Receipt },
  payment_info: { label: "Payment Details", icon: Receipt },
  barcode: { label: "Barcode", icon: QrCode },
  qr_code: { label: "QR Code", icon: QrCode },
};

/**
 * Advanced Receipt Builder with drag-and-drop block ordering.
 *
 * Props:
 *  - blocks: array of block objects (from settings state)
 *  - onChange(blocks): called when blocks change
 *  - paperWidth: "80mm" | "58mm"
 */
export default function ReceiptBuilder({
  blocks: initialBlocks,
  onChange,
  paperWidth = "80mm",
}) {
  const [blocks, setBlocks] = useState(
    initialBlocks?.length > 0 ? initialBlocks : DEFAULT_BLOCKS,
  );
  const [dragIndex, setDragIndex] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const updateBlocks = useCallback(
    (newBlocks) => {
      setBlocks(newBlocks);
      onChange?.(newBlocks);
    },
    [onChange],
  );

  const moveBlock = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    updateBlocks(newBlocks);
  };

  const toggleBlock = (index) => {
    const newBlocks = [...blocks];
    newBlocks[index] = {
      ...newBlocks[index],
      enabled: !newBlocks[index].enabled,
    };
    updateBlocks(newBlocks);
  };

  const updateBlockConfig = (index, config) => {
    const newBlocks = [...blocks];
    newBlocks[index] = {
      ...newBlocks[index],
      config: { ...newBlocks[index].config, ...config },
    };
    updateBlocks(newBlocks);
  };

  const removeBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    updateBlocks(newBlocks);
    if (selectedBlock === index) setSelectedBlock(null);
  };

  const addBlock = (type) => {
    const id = `${type}_${Date.now()}`;
    let config = {};
    switch (type) {
      case "text":
        config = {
          content: "New text block",
          align: "center",
          bold: false,
          size: "sm",
        };
        break;
      case "separator":
        config = { style: "dashed" };
        break;
      case "logo":
        config = { url: "", width: 120 };
        break;
      default:
        config = {};
    }
    const newBlock = { id, type, enabled: true, config };
    updateBlocks([...blocks, newBlock]);
  };

  // Drag and drop handlers
  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(index, 0, moved);
    setDragIndex(index);
    setBlocks(newBlocks);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    onChange?.(blocks);
  };

  const is80mm = paperWidth === "80mm";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Block list + editor */}
      <div className="lg:col-span-7 space-y-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary" />
                Receipt Layout Builder
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold">
                {blocks.filter((b) => b.enabled).length} active blocks
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 p-3">
            {blocks.map((block, index) => {
              const typeInfo = BLOCK_TYPES[block.type] || {
                label: block.type,
                icon: Type,
              };
              const Icon = typeInfo.icon;
              const isSelected = selectedBlock === index;

              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-move ${
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : dragIndex === index
                      ? "border-primary/30 bg-primary/5 opacity-50"
                      : "border-border/40 bg-card hover:border-border hover:bg-muted/20"
                  } ${!block.enabled ? "opacity-50" : ""}`}
                  onClick={() => setSelectedBlock(isSelected ? null : index)}>
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0 cursor-grab active:cursor-grabbing" />

                  <div
                    className={`p-1.5 rounded-md shrink-0 ${
                      block.enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate block">
                      {typeInfo.label}
                    </span>
                    {block.type === "text" && block.config.content && (
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {block.config.content.substring(0, 40)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(index, -1);
                      }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Move up">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(index, 1);
                      }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Move down">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBlock(index);
                      }}
                      className="p-1 rounded hover:bg-muted"
                      title={block.enabled ? "Hide" : "Show"}>
                      {block.enabled ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBlock(index);
                      }}
                      className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"
                      title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add block buttons */}
            <div className="flex flex-wrap gap-1.5 pt-3 border-t mt-3">
              {["text", "separator", "logo"].map((type) => {
                const info = BLOCK_TYPES[type];
                const Icon = info.icon;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => addBlock(type)}
                    className="text-[10px] font-semibold gap-1 h-7">
                    <Plus className="w-3 h-3" />
                    <Icon className="w-3 h-3" />
                    {info.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Block config editor */}
        {selectedBlock !== null && blocks[selectedBlock] && (
          <Card className="border border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">
                Edit: {BLOCK_TYPES[blocks[selectedBlock].type]?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <BlockEditor
                block={blocks[selectedBlock]}
                onChange={(config) => updateBlockConfig(selectedBlock, config)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Live preview */}
      <div className="lg:col-span-5 sticky top-6">
        <ReceiptPreview blocks={blocks} paperWidth={paperWidth} />
      </div>
    </div>
  );
}

/* =====================================================
   Block Editor — renders config fields per block type
   ===================================================== */
function BlockEditor({ block, onChange }) {
  const { type, config } = block;

  switch (type) {
    case "text":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Content
            </label>
            <Textarea
              value={config.content || ""}
              onChange={(e) => onChange({ content: e.target.value })}
              className="text-xs min-h-16 font-mono resize-none"
              placeholder="Enter text..."
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Align
              </label>
              <Select
                value={config.align || "center"}
                onValueChange={(value) => onChange({ align: value })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left" className="text-xs">
                    Left
                  </SelectItem>
                  <SelectItem value="center" className="text-xs">
                    Center
                  </SelectItem>
                  <SelectItem value="right" className="text-xs">
                    Right
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Size
              </label>
              <Select
                value={config.size || "sm"}
                onValueChange={(value) => onChange({ size: value })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs" className="text-xs">
                    Extra Small
                  </SelectItem>
                  <SelectItem value="sm" className="text-xs">
                    Small
                  </SelectItem>
                  <SelectItem value="md" className="text-xs">
                    Medium
                  </SelectItem>
                  <SelectItem value="lg" className="text-xs">
                    Large
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Bold
              </label>
              <div className="h-8 flex items-center">
                <Switch
                  checked={!!config.bold}
                  onCheckedChange={(v) => onChange({ bold: v })}
                />
              </div>
            </div>
          </div>
        </div>
      );

    case "logo":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Logo URL
            </label>
            <Input
              value={config.url || ""}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Width (px)
            </label>
            <Input
              type="number"
              value={config.width || 120}
              onChange={(e) =>
                onChange({ width: parseInt(e.target.value) || 120 })
              }
              className="h-8 text-xs w-24"
            />
          </div>
        </div>
      );

    case "separator":
      return (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">
            Style
          </label>
          <Select
            value={config.style || "dashed"}
            onValueChange={(value) => onChange({ style: value })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid" className="text-xs">
                Solid Line
              </SelectItem>
              <SelectItem value="dashed" className="text-xs">
                Dashed Line
              </SelectItem>
              <SelectItem value="dotted" className="text-xs">
                Dotted Line
              </SelectItem>
              <SelectItem value="double" className="text-xs">
                Double Line
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "order_info":
      return (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">
            Show Fields
          </label>
          <div className="space-y-2">
            {[
              ["showOrderNumber", "Order Number"],
              ["showDate", "Date & Time"],
              ["showCashier", "Cashier Name"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{label}</span>
                <Switch
                  checked={config[key] !== false}
                  onCheckedChange={(v) => onChange({ [key]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case "items":
      return (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">
            Item Display
          </label>
          <div className="space-y-2">
            {[
              ["showQty", "Quantity"],
              ["showUnitPrice", "Unit Price"],
              ["showSku", "SKU"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{label}</span>
                <Switch
                  checked={config[key] !== false}
                  onCheckedChange={(v) => onChange({ [key]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case "totals":
      return (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">
            Show Totals
          </label>
          <div className="space-y-2">
            {[
              ["showSubtotal", "Subtotal"],
              ["showDiscount", "Discount"],
              ["showTax", "Tax"],
              ["showTotal", "Grand Total"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{label}</span>
                <Switch
                  checked={config[key] !== false}
                  onCheckedChange={(v) => onChange({ [key]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case "payment_info":
      return (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">
            Payment Fields
          </label>
          <div className="space-y-2">
            {[
              ["showMethod", "Payment Method"],
              ["showCash", "Cash Received"],
              ["showChange", "Change Given"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{label}</span>
                <Switch
                  checked={config[key] !== false}
                  onCheckedChange={(v) => onChange({ [key]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case "barcode":
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">Show Order Barcode</span>
          <Switch
            checked={config.showOrderBarcode !== false}
            onCheckedChange={(v) => onChange({ showOrderBarcode: v })}
          />
        </div>
      );

    default:
      return (
        <p className="text-xs text-muted-foreground italic">
          No configuration available.
        </p>
      );
  }
}

/* =====================================================
   Live Receipt Preview
   ===================================================== */
function ReceiptPreview({ blocks, paperWidth }) {
  const is80mm = paperWidth === "80mm";
  const width = is80mm ? 310 : 240;

  const sample = {
    orderNumber: "RP-1042",
    date: new Date().toLocaleString(),
    cashier: "John Smith",
    items: [
      {
        name: "Organic Espresso Beans (1kg)",
        qty: 1,
        price: 24.99,
        total: 24.99,
      },
      { name: "Double Espresso Shot", qty: 2, price: 3.5, total: 7.0 },
      { name: "Butter Croissant", qty: 3, price: 4.5, total: 13.5 },
    ],
    subtotal: 45.49,
    discount: 5.0,
    tax: 3.24,
    total: 43.73,
    method: "Cash",
    cashReceived: 50.0,
    change: 6.27,
  };

  const renderBlock = (block) => {
    if (!block.enabled) return null;
    const { type, config } = block;

    switch (type) {
      case "logo":
        return config.url ? (
          <div className="text-center py-1">
            <img
              src={config.url}
              alt="Logo"
              style={{ width: config.width || 120, margin: "0 auto" }}
              className="grayscale contrast-150"
            />
          </div>
        ) : (
          <div className="text-center py-1 text-[9px] text-muted-foreground italic">
            No logo configured
          </div>
        );

      case "text":
        const sizeClass = {
          xs: "text-[8px]",
          sm: "text-[9px]",
          md: "text-[10px]",
          lg: "text-[11px]",
        }[config.size || "sm"];
        return (
          <div
            className={`${sizeClass} ${config.bold ? "font-bold" : ""} text-${
              config.align || "center"
            } py-0.5 whitespace-pre-wrap`}>
            {config.content || ""}
          </div>
        );

      case "separator":
        const borderStyle =
          config.style === "dotted"
            ? "dotted"
            : config.style === "double"
            ? "double"
            : config.style === "solid"
            ? "solid"
            : "dashed";
        return <hr className="my-1.5 border-border" style={{ borderStyle }} />;

      case "order_info":
        return (
          <div className="text-[9px] space-y-0.5 py-1">
            {config.showOrderNumber !== false && (
              <div>Order: {sample.orderNumber}</div>
            )}
            {config.showDate !== false && <div>Date: {sample.date}</div>}
            {config.showCashier !== false && (
              <div>Cashier: {sample.cashier}</div>
            )}
          </div>
        );

      case "items":
        return (
          <div className="text-[9px] py-1 space-y-1">
            {sample.items.map((item, i) => (
              <div key={i}>
                <div className="font-medium truncate">{item.name}</div>
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {config.showQty !== false && `${item.qty}x `}
                    {config.showUnitPrice !== false && formatPrice(item.price)}
                  </span>
                  <span className="font-bold text-foreground">
                    {formatPrice(item.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      case "totals":
        return (
          <div className="text-[9px] py-1 space-y-0.5">
            {config.showSubtotal !== false && (
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(sample.subtotal)}</span>
              </div>
            )}
            {config.showDiscount !== false && sample.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatPrice(sample.discount)}</span>
              </div>
            )}
            {config.showTax !== false && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatPrice(sample.tax)}</span>
              </div>
            )}
            {config.showTotal !== false && (
              <div className="flex justify-between font-bold text-[10px] pt-1 border-t border-border">
                <span>TOTAL</span>
                <span>{formatPrice(sample.total)}</span>
              </div>
            )}
          </div>
        );

      case "payment_info":
        return (
          <div className="text-[9px] py-1 space-y-0.5">
            {config.showMethod !== false && (
              <div className="flex justify-between">
                <span>Paid via</span>
                <span>{sample.method}</span>
              </div>
            )}
            {config.showCash !== false && (
              <div className="flex justify-between">
                <span>Cash</span>
                <span>{formatPrice(sample.cashReceived)}</span>
              </div>
            )}
            {config.showChange !== false && (
              <div className="flex justify-between">
                <span>Change</span>
                <span>{formatPrice(sample.change)}</span>
              </div>
            )}
          </div>
        );

      case "barcode":
        return config.showOrderBarcode !== false ? (
          <div className="text-center py-2">
            <div className="inline-block bg-muted px-4 py-1 rounded text-[8px] font-mono tracking-widest text-foreground">
              ||||| {sample.orderNumber} |||||
            </div>
          </div>
        ) : null;

      case "qr_code":
        return (
          <div className="text-center py-2">
            <div className="inline-block w-16 h-16 bg-muted rounded border border-border flex items-center justify-center text-[8px] text-muted-foreground">
              QR
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-muted/30 border border-border rounded-2xl shadow-inner min-h-[500px]">
      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live Preview ({paperWidth})
      </span>

      <div
        className="relative bg-card text-card-foreground shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-border transition-all duration-300 select-none"
        style={{
          width: `${width}px`,
          fontFamily: "'Courier New', Courier, monospace",
          padding: is80mm ? "20px 16px" : "16px 12px",
        }}>
        {/* Paper tear top */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 bg-repeat-x opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1.5px)",
            backgroundSize: "5px 6px",
          }}
        />

        {/* Render blocks */}
        <div className="space-y-0">
          {blocks.map((block) => (
            <div key={block.id}>{renderBlock(block)}</div>
          ))}
        </div>

        {/* Paper tear bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 bg-repeat-x opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1.5px)",
            backgroundSize: "5px 6px",
          }}
        />
      </div>
    </div>
  );
}

export { DEFAULT_BLOCKS };
