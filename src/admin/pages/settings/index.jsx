import { ErrorState } from "@/components/error/ErrorState";
import { SettingsSkeleton } from "@/components/loading/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { handleError } from "@/lib/errorHandler";
import {
  Building2,
  ChevronRight,
  CreditCard,
  Keyboard,
  Monitor,
  Printer,
  Save,
  Store,
  Tags,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSetAtom } from "jotai";
import { toast } from "sonner";
import ReceiptBuilder from "./components/ReceiptBuilder";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { PageHeader } from "@/admin/components/PageLayout";
import { HardwareTestPanel } from "@/admin/components/HardwareTestPanel";
import { settingsAtom } from "@/admin/stores/posStore";

const SETTINGS_SECTIONS = [
  {
    id: "identity",
    label: "Store Identity",
    icon: Store,
    description: "Store name, logo, and contact information",
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: Keyboard,
    description: "Checkout behavior and terminal features",
  },
  {
    id: "customer-display",
    label: "Customer Display",
    icon: Monitor,
    description: "Second screen display and promotional messages",
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    description: "Payment methods and gateway mappings",
  },
  {
    id: "receipts",
    label: "Receipts",
    icon: Printer,
    description: "Receipt layout, text, and printing options",
  },
  {
    id: "returns",
    label: "Returns & Exchanges",
    icon: Tags,
    description: "Return policy and exchange settings",
  },
];

const DEFAULT_SETTINGS = {
  site_name: "",
  site_tagline: "",
  site_logo: "",
  site_address: "",
  site_phone: "",
  site_email: "",
  currency_symbol: "$",
  currency_code: "USD",
  customer_display_enabled: "yes",
  customer_display_message: "Welcome to our store!",
  customer_display_idle_timeout: 30,
  customer_display_promo_1: "Special offers available - Ask our staff!",
  customer_display_promo_2: "Join our loyalty program and save more",
  customer_display_promo_3: "Now open every day until 9 PM",
  customer_display_promo_4: "Shop online and pick up in store",
  receipt_logo: "",
  receipt_header: "",
  receipt_footer: "Thank you for shopping with us!",
  receipt_paper_width: "80mm",
  print_barcode: "yes",
  // Printer Hardware Settings
  receipt_printing_method: "auto",
  printer_connection_type: "serial",
  printer_auto_reconnect: "yes",
  printer_network_address: "",
  star_webprnt_url: "",
  payment_cash: "yes",
  payment_card: "yes",
  pos_cash_gateway: "cod",
  pos_card_gateway: "stripe",
  keyboard_status: "yes",
  cash_drawer_pulse: "none",
  max_discount_limit: 100,
  pos_order_prefix: "",
  receipt_blocks: [],
  // Return/Exchange Settings
  enable_returns: "yes",
  enable_exchanges: "yes",
  enable_store_credit: "yes",
  return_time_limit_days: 30,
  require_receipt: "no",
  restocking_fee_enabled: "no",
  restocking_fee_type: "percentage",
  restocking_fee_value: 10,
  auto_restock_inventory: "yes",
};

/**
 * @param {{ label: string; children: React.ReactNode; hint?: string }} props
 */
function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold text-foreground">{label}</Label>
      {children}
      {hint && (
        <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/**
 * @param {{ icon: React.ComponentType<any>; title: string; children: React.ReactNode }} props
 */
function CompactCard({ icon: Icon, title, children }) {
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }} props
 */
function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/5 p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[10px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {any} */ (null));
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [gateways, setGateways] = useState([]);
  const [activeSection, setActiveSection] = useState("identity");
  const setGlobalSettings = useSetAtom(settingsAtom);

  /**
   * @param {any} patch
   */
  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);

      try {
        const [data, methods] = await Promise.all([
          api.get("/settings/get"),
          api.get("/settings/payment-methods"),
        ]);
        const next = { ...DEFAULT_SETTINGS, ...(data || {}) };
        setSettings(next);
        setGlobalSettings(next);
        setGateways(methods || []);
      } catch (err) {
        setError(handleError(err, { showToast: false }));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Smooth scroll to top when section changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeSection]);

  /**
   * @param {any} e
   */
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.post("/settings/update", settings);
      // Push the saved snapshot to the global settingsAtom so any open
      // Customer Display window picks up the new customer_display_* values
      // on the next BroadcastChannel tick.
      setGlobalSettings({ ...settings });
      // Notify other tabs/windows (open Terminal, open Customer Display
      // window) that settings changed, so they re-fetch /settings/get.
      try {
        const ch = new BroadcastChannel("readypos_settings");
        ch.postMessage({ type: "SETTINGS_UPDATED" });
        ch.close();
      } catch {
        // BroadcastChannel unsupported; falls back to next page load.
      }
      toast.success("Settings updated");
    } catch (/** @type {any} */ err) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load settings"
        message={error.message}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Settings"
        description="Store identity, terminal behavior, payments, receipts, and appearance."
        className=""
        actions={
        <Button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="h-9 gap-1.5 px-5 text-xs font-bold">
          {saving ? (
            <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? "Saving" : "Save Settings"}
        </Button>
        }
      />

      <form onSubmit={handleSave} className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <SettingsSidebar
            items={SETTINGS_SECTIONS}
            activeId={activeSection}
            onSelect={setActiveSection}
          />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-6 animate-in fade-in duration-300">
          {/* Identity Section */}
          {activeSection === "identity" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>Settings</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">Store Identity</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Store Identity
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure your store's basic information and branding
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
              <CompactCard icon={Building2} title="Site Identity">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Store Name" hint="">
                    <Input
                      className="h-9 text-xs"
                      value={settings.site_name}
                      onChange={(/** @type {any} */ e) =>
                        update({ site_name: e.target.value })
                      }
                      placeholder="Ready POS Store"
                    />
                  </Field>
                  <Field label="Tagline" hint="">
                    <Input
                      className="h-9 text-xs"
                      value={settings.site_tagline}
                      onChange={(/** @type {any} */ e) =>
                        update({ site_tagline: e.target.value })
                      }
                      placeholder="Retail made faster"
                    />
                  </Field>
                  <Field
                    label="Logo URL"
                    hint="Used by receipt blocks and plugin surfaces.">
                    <Input
                      className="h-9 text-xs md:col-span-2"
                      value={settings.site_logo}
                      onChange={(/** @type {any} */ e) =>
                        update({
                          site_logo: e.target.value,
                          receipt_logo: settings.receipt_logo || e.target.value,
                        })
                      }
                      placeholder="https://example.com/logo.png"
                    />
                  </Field>
                </div>
              </CompactCard>

              <CompactCard icon={Monitor} title="Site Configuration">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Phone" hint="">
                    <Input
                      type="tel"
                      className="h-9 text-xs"
                      value={settings.site_phone}
                      onChange={(/** @type {any} */ e) =>
                        update({ site_phone: e.target.value })
                      }
                      placeholder="+1 555-0199"
                    />
                  </Field>
                  <Field label="Email" hint="">
                    <Input
                      type="email"
                      className="h-9 text-xs"
                      value={settings.site_email}
                      onChange={(/** @type {any} */ e) =>
                        update({ site_email: e.target.value })
                      }
                      placeholder="store@example.com"
                    />
                  </Field>
                  <Field label="Address" hint="">
                    <Textarea
                      className="min-h-20 resize-none text-xs md:col-span-2"
                      value={settings.site_address}
                      onChange={(/** @type {any} */ e) =>
                        update({ site_address: e.target.value })
                      }
                      placeholder="123 Retail Road, City"
                    />
                  </Field>
                  <Field label="Currency" hint="Synced from WooCommerce.">
                    <Input
                      disabled
                      className="h-9 bg-muted text-xs text-muted-foreground"
                      value={`${settings.currency_symbol} (${settings.currency_code})`}
                    />
                  </Field>
                </div>
              </CompactCard>
            </div>
          </div>
          )}

          {/* Terminal Section */}
          {activeSection === "terminal" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>Settings</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">Terminal</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Keyboard className="h-5 w-5 text-primary" />
                    Terminal Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure checkout behavior and terminal features
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
              <CompactCard icon={Keyboard} title="Checkout Behavior">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Max Discount (%)"
                    hint="Caps manual cashier discounts.">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="h-9 text-xs"
                      value={settings.max_discount_limit}
                      onChange={(/** @type {any} */ e) =>
                        update({
                          max_discount_limit: Math.min(
                            100,
                            Math.max(0, parseInt(e.target.value) || 0),
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="Order Prefix" hint="Example: RP-1002">
                    <Input
                      className="h-9 font-mono text-xs uppercase"
                      value={settings.pos_order_prefix}
                      onChange={(/** @type {any} */ e) =>
                        update({
                          pos_order_prefix: e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9-]/g, ""),
                        })
                      }
                      placeholder="RP"
                    />
                  </Field>
                  <Field label="Customer Display Message" hint="">
                    <Input
                      className="h-9 text-xs md:col-span-2"
                      value={settings.customer_display_message}
                      onChange={(/** @type {any} */ e) =>
                        update({ customer_display_message: e.target.value })
                      }
                      placeholder="Welcome to our store!"
                    />
                  </Field>
                </div>
              </CompactCard>

              <CompactCard icon={Tags} title="Terminal Features">
                <div className="space-y-3">
                  <ToggleRow
                    title="Barcode keyboard listener"
                    description="Capture rapid scanner input anywhere in the terminal."
                    checked={settings.keyboard_status === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ keyboard_status: checked ? "yes" : "no" })
                    }
                  />
                  <Field label="Cash Drawer Pulse" hint="">
                    <Select
                      value={settings.cash_drawer_pulse || "none"}
                      onValueChange={(value) =>
                        update({ cash_drawer_pulse: value })
                      }>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="pin2">Pin 2</SelectItem>
                        <SelectItem value="pin5">Pin 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </CompactCard>
            </div>
          </div>
          )}

          {/* Customer Display Section */}
          {activeSection === "customer-display" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>Settings</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">Customer Display</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Customer Display Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure the second screen display for customers
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
              <CompactCard icon={Monitor} title="Display Configuration">
                <div className="space-y-3">
                  <ToggleRow
                    title="Enable Customer Display"
                    description="Show real-time cart updates on a second screen."
                    checked={settings.customer_display_enabled === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ customer_display_enabled: checked ? "yes" : "no" })
                    }
                  />
                  <Field 
                    label="Welcome Message" 
                    hint="Displayed when the screen is idle or no cart is active.">
                    <Input
                      className="h-9 text-xs"
                      value={settings.customer_display_message}
                      onChange={(/** @type {any} */ e) =>
                        update({ customer_display_message: e.target.value })
                      }
                      placeholder="Welcome to our store!"
                    />
                  </Field>
                  <Field 
                    label="Idle Timeout (seconds)" 
                    hint="How long to wait before showing promotional messages.">
                    <Input
                      type="number"
                      min="10"
                      max="120"
                      className="h-9 text-xs"
                      value={settings.customer_display_idle_timeout}
                      onChange={(/** @type {any} */ e) =>
                        update({
                          customer_display_idle_timeout: Math.min(
                            120,
                            Math.max(10, parseInt(e.target.value) || 30)
                          ),
                        })
                      }
                    />
                  </Field>
                </div>
              </CompactCard>

              <CompactCard icon={Tags} title="Promotional Messages">
                <div className="space-y-3">
                  <Field label="Promotion 1" hint="Rotates when display is idle.">
                    <Textarea
                      className="min-h-16 resize-none text-xs"
                      value={settings.customer_display_promo_1}
                      onChange={(/** @type {any} */ e) =>
                        update({ customer_display_promo_1: e.target.value })
                      }
                      placeholder="Special offers available!"
                    />
                  </Field>
                  <Field label="Promotion 2" hint="">
                    <Textarea
                      className="min-h-16 resize-none text-xs"
                      value={settings.customer_display_promo_2}
                      onChange={(/** @type {any} */ e) =>
                        update({ customer_display_promo_2: e.target.value })
                      }
                      placeholder="Join our loyalty program"
                    />
                  </Field>
                </div>
              </CompactCard>

              <div className="xl:col-span-2">
                <CompactCard icon={Tags} title="Additional Promotions">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Promotion 3" hint="">
                      <Textarea
                        className="min-h-16 resize-none text-xs"
                        value={settings.customer_display_promo_3}
                        onChange={(/** @type {any} */ e) =>
                          update({ customer_display_promo_3: e.target.value })
                        }
                        placeholder="Extended store hours"
                      />
                    </Field>
                    <Field label="Promotion 4" hint="">
                      <Textarea
                        className="min-h-16 resize-none text-xs"
                        value={settings.customer_display_promo_4}
                        onChange={(/** @type {any} */ e) =>
                          update({ customer_display_promo_4: e.target.value })
                        }
                        placeholder="Shop online, pick up in store"
                      />
                    </Field>
                  </div>
                </CompactCard>
              </div>
            </div>
            </div>
            )}

          {/* Payments Section */}
          {activeSection === "payments" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>Settings</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">Payments</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure payment methods and gateway mappings
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
              <CompactCard icon={CreditCard} title="Payment Methods Toggle">
                <div className="space-y-3">
                  <ToggleRow
                    title="Cash payments"
                    description="Enable bill/coin tendering and change calculation."
                    checked={settings.payment_cash === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ payment_cash: checked ? "yes" : "no" })
                    }
                  />
                  <ToggleRow
                    title="Card payments"
                    description="Enable external terminal/card tendering."
                    checked={settings.payment_card === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ payment_card: checked ? "yes" : "no" })
                    }
                  />
                </div>
              </CompactCard>

              <CompactCard
                icon={CreditCard}
                title="WooCommerce Gateway Mappings">
                <div className="space-y-4">
                  <Field
                    label="Cash Payment Gateway Mapping"
                    hint="Maps POS Cash sales to this active WooCommerce gateway.">
                    <Select
                      value={settings.pos_cash_gateway || "cod"}
                      onValueChange={(value) =>
                        update({ pos_cash_gateway: value })
                      }>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gateways.length > 0 ? (
                          gateways.map((g) => (
                            <SelectItem
                              key={g.id}
                              value={g.id}
                              className="text-xs">
                              {g.title} ({g.id})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="cod" className="text-xs">
                            Cash on Delivery (cod)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field
                    label="Card Payment Gateway Mapping"
                    hint="Maps POS Card sales to this active WooCommerce gateway.">
                    <Select
                      value={settings.pos_card_gateway || "stripe"}
                      onValueChange={(value) =>
                        update({ pos_card_gateway: value })
                      }>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gateways.length > 0 ? (
                          gateways.map((g) => (
                            <SelectItem
                              key={g.id}
                              value={g.id}
                              className="text-xs">
                              {g.title} ({g.id})
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="stripe" className="text-xs">
                              Stripe (stripe)
                            </SelectItem>
                            <SelectItem value="bacs" className="text-xs">
                              Direct Bank Transfer (bacs)
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </CompactCard>
            </div>
            </div>
            )}

            {/* Receipts Section */}
            {activeSection === "receipts" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>Settings</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">Receipts</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Printer className="h-5 w-5 text-primary" />
                    Receipt Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure receipt layout, text, and printing options
                  </p>
                </div>

                {/* Printing Hardware Configuration */}
                <div className="grid gap-4 xl:grid-cols-2">
                  <CompactCard icon={Printer} title="Printing Method">
                    <div className="space-y-3">
                      <Field 
                        label="Primary Printing Method" 
                        hint="Choose how receipts are printed. ESC/POS thermal is recommended for retail.">
                        <Select
                          value={settings.receipt_printing_method || "browser"}
                          onValueChange={(value) =>
                            update({ receipt_printing_method: value })
                          }>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto (best available)</SelectItem>
                            <SelectItem value="browser">Browser Print (HTML/CSS)</SelectItem>
                            <SelectItem value="escpos-serial">ESC/POS - Web Serial</SelectItem>
                            <SelectItem value="escpos-usb">ESC/POS - WebUSB</SelectItem>
                            <SelectItem value="escpos-bluetooth">ESC/POS - WebBluetooth</SelectItem>
                            <SelectItem value="epson-epos">Epson ePOS</SelectItem>
                            <SelectItem value="star-webprnt">Star Micronics WebPRNT</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold text-blue-600">
                          Supported Hardware
                        </p>
                        <ul className="text-[10px] text-blue-600/80 space-y-0.5 ml-3">
                          <li>• Epson TM series (TM-T20, TM-T88)</li>
                          <li>• Star Micronics (TSP100, TSP650)</li>
                          <li>• Sunmi thermal printers</li>
                          <li>• Generic 58mm/80mm ESC/POS printers</li>
                        </ul>
                      </div>

                      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-1">
                        <p className="text-[10px] font-bold text-amber-600">
                          Browser Requirements
                        </p>
                        <p className="text-[10px] text-amber-600/80 leading-snug">
                          Direct printer APIs require Chrome or Edge. Firefox/Safari will
                          use standard browser printing unless a vendor SDK is available.
                        </p>
                      </div>
                    </div>
                  </CompactCard>

                  <CompactCard icon={Printer} title="Printer Configuration">
                    <div className="space-y-3">
                      <Field label="Paper Width" hint="Standard thermal printer paper sizes.">
                        <Select
                          value={settings.receipt_paper_width || "80mm"}
                          onValueChange={(value) =>
                            update({ receipt_paper_width: value })
                          }>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="80mm">80mm (3.15 inch) - Standard</SelectItem>
                            <SelectItem value="58mm">58mm (2.28 inch) - Compact</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field 
                        label="Connection Type" 
                        hint="How the printer connects to your POS device.">
                        <Select
                          value={settings.printer_connection_type || "serial"}
                          onValueChange={(value) =>
                            update({ printer_connection_type: value })
                          }>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="serial">USB Serial (Web Serial API)</SelectItem>
                            <SelectItem value="usb">USB Device (WebUSB)</SelectItem>
                            <SelectItem value="bluetooth">Bluetooth (WebBluetooth)</SelectItem>
                            <SelectItem value="network">Network/Ethernet (Epson/Star)</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      {(settings.receipt_printing_method === "epson-epos" ||
                        settings.receipt_printing_method === "star-webprnt" ||
                        settings.printer_connection_type === "network") && (
                        <Field
                          label="Network Printer Address"
                          hint="IP or host for Epson ePOS / Star network printers.">
                          <Input
                            className="h-9 text-xs"
                            value={settings.printer_network_address || ""}
                            onChange={(/** @type {any} */ e) =>
                              update({ printer_network_address: e.target.value })
                            }
                            placeholder="192.168.1.50"
                          />
                        </Field>
                      )}

                      {settings.receipt_printing_method === "star-webprnt" && (
                        <Field
                          label="Star WebPRNT URL"
                          hint="Optional full endpoint URL if your Star printer uses a custom path.">
                          <Input
                            className="h-9 text-xs"
                            value={settings.star_webprnt_url || ""}
                            onChange={(/** @type {any} */ e) =>
                              update({ star_webprnt_url: e.target.value })
                            }
                            placeholder="http://192.168.1.50:8001/StarWebPRNT/SendMessage"
                          />
                        </Field>
                      )}

                      <Field 
                        label="Auto-reconnect" 
                        hint="Automatically reconnect to previously paired printer on page load.">
                        <div className="flex items-center justify-between rounded-lg border bg-muted/5 p-3">
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs font-bold text-foreground">Enable Auto-reconnect</p>
                            <p className="text-[10px] text-muted-foreground">
                              Skip printer selection on reload
                            </p>
                          </div>
                          <Switch 
                            checked={settings.printer_auto_reconnect === "yes"}
                            onCheckedChange={(/** @type {boolean} */ checked) =>
                              update({ printer_auto_reconnect: checked ? "yes" : "no" })
                            }
                          />
                        </div>
                      </Field>
                    </div>
                  </CompactCard>
                </div>

                {/* Receipt Content Configuration */}
                <div className="grid gap-4 xl:grid-cols-3">
              <CompactCard icon={Printer} title="Receipt Content">
                <div className="space-y-3">
                  <Field label="Receipt Logo URL" hint="Appears at the top of receipts.">
                    <Input
                      className="h-9 text-xs"
                      value={settings.receipt_logo}
                      onChange={(/** @type {any} */ e) =>
                        update({ receipt_logo: e.target.value })
                      }
                      placeholder={
                        settings.site_logo || "https://example.com/logo.png"
                      }
                    />
                  </Field>

                  <ToggleRow
                    title="Print order barcode"
                    description="Include scannable Code 39 barcode at receipt bottom."
                    checked={settings.print_barcode === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ print_barcode: checked ? "yes" : "no" })
                    }
                  />
                </div>
              </CompactCard>

              <CompactCard icon={Printer} title="Receipt Text">
                <div className="space-y-3">
                  <Field label="Header" hint="">
                    <Textarea
                      className="min-h-20 resize-none text-xs"
                      value={settings.receipt_header}
                      onChange={(/** @type {any} */ e) =>
                        update({ receipt_header: e.target.value })
                      }
                      placeholder={settings.site_name || "Ready POS Store"}
                    />
                  </Field>
                  <Field label="Footer" hint="">
                    <Textarea
                      className="min-h-20 resize-none text-xs"
                      value={settings.receipt_footer}
                      onChange={(/** @type {any} */ e) =>
                        update({ receipt_footer: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </CompactCard>

              <div className="xl:col-span-3">
                <ReceiptBuilder
                  blocks={settings.receipt_blocks || []}
                  onChange={(/** @type {any} */ blocks) =>
                    update({ receipt_blocks: blocks })
                  }
                  paperWidth={settings.receipt_paper_width || "80mm"}
                />
              </div>

              {/* Hardware Testing Panel */}
              <div className="xl:col-span-3">
                <HardwareTestPanel settings={settings} />
              </div>
            </div>
          </div>
          )}

          {/* Returns & Exchanges Section */}
          {activeSection === "returns" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>Settings</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">Returns & Exchanges</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Tags className="h-5 w-5 text-primary" />
                    Return Policy Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure return and exchange policies for your store
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
              <CompactCard icon={Tags} title="Return Options">
                <div className="space-y-3">
                  <ToggleRow
                    title="Enable Returns"
                    description="Allow customers to return purchased items for refunds."
                    checked={settings.enable_returns === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ enable_returns: checked ? "yes" : "no" })
                    }
                  />
                  <ToggleRow
                    title="Enable Exchanges"
                    description="Allow customers to exchange items for different products."
                    checked={settings.enable_exchanges === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ enable_exchanges: checked ? "yes" : "no" })
                    }
                  />
                  <ToggleRow
                    title="Enable Store Credit"
                    description="Issue store credit instead of cash refunds."
                    checked={settings.enable_store_credit === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ enable_store_credit: checked ? "yes" : "no" })
                    }
                  />
                </div>
              </CompactCard>

              <CompactCard icon={Tags} title="Return Policy">
                <div className="space-y-3">
                  <Field 
                    label="Return Time Limit (Days)" 
                    hint="Number of days customers have to return items. Set to 0 for no time limit.">
                    <Input
                      type="number"
                      min="0"
                      max="365"
                      className="h-9 text-xs"
                      value={settings.return_time_limit_days}
                      onChange={(/** @type {any} */ e) =>
                        update({
                          return_time_limit_days: Math.min(
                            365,
                            Math.max(0, parseInt(e.target.value) || 30)
                          ),
                        })
                      }
                    />
                  </Field>
                  <ToggleRow
                    title="Require Receipt"
                    description="Only accept returns with valid receipts."
                    checked={settings.require_receipt === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ require_receipt: checked ? "yes" : "no" })
                    }
                  />
                  <ToggleRow
                    title="Auto Restock Inventory"
                    description="Automatically add returned items back to inventory."
                    checked={settings.auto_restock_inventory === "yes"}
                    onChange={(/** @type {boolean} */ checked) =>
                      update({ auto_restock_inventory: checked ? "yes" : "no" })
                    }
                  />
                </div>
              </CompactCard>

              <div className="xl:col-span-2">
                <CompactCard icon={Tags} title="Restocking Fee">
                  <div className="space-y-3">
                    <ToggleRow
                      title="Enable Restocking Fee"
                      description="Charge a fee for processing returns."
                      checked={settings.restocking_fee_enabled === "yes"}
                      onChange={(/** @type {boolean} */ checked) =>
                        update({ restocking_fee_enabled: checked ? "yes" : "no" })
                      }
                    />
                    {settings.restocking_fee_enabled === "yes" && (
                      <>
                        <Field label="Fee Type" hint="">
                          <Select
                            value={settings.restocking_fee_type || "percentage"}
                            onValueChange={(value) =>
                              update({ restocking_fee_type: value })
                            }>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field 
                          label={settings.restocking_fee_type === "percentage" ? "Fee Percentage" : "Fee Amount"} 
                          hint={settings.restocking_fee_type === "percentage" ? "Percentage of return amount to deduct" : "Fixed dollar amount to deduct"}>
                          <Input
                            type="number"
                            min="0"
                            max={settings.restocking_fee_type === "percentage" ? "100" : "1000"}
                            step={settings.restocking_fee_type === "percentage" ? "1" : "0.01"}
                            className="h-9 text-xs"
                            value={settings.restocking_fee_value}
                            onChange={(/** @type {any} */ e) =>
                              update({
                                restocking_fee_value: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </Field>
                      </>
                    )}
                  </div>
                </CompactCard>
              </div>
            </div>
          </div>
          )}
        </div>
      </form>
    </div>
  );
}
