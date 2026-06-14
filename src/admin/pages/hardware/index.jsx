import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHardware } from "@/admin/hooks/useHardware";
import { toast } from "sonner";
import {
  Printer,
  ScanBarcode,
  Scale,
  Wallet,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Plug,
  Unplug,
  TestTube,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/admin/components/PageLayout";

export default function HardwarePage() {
  const hw = useHardware();
  const [busy, setBusy] = useState({});
  const [scaleReading, setScaleReading] = useState(null);
  const [pollingScale, setPollingScale] = useState(false);

  const setBusyKey = (key, value) =>
    setBusy((prev) => ({ ...prev, [key]: value }));

  // Live scale reading polling when connected
  useEffect(() => {
    if (!hw.scaleConnected) {
      setScaleReading(null);
      return;
    }
    setPollingScale(true);
    const interval = setInterval(() => {
      // Access the scale singleton's lastReading via a dynamic import.
      // We use import() instead of require() for Vite/ESM compatibility.
      import("@/lib/hardware/scale")
        .then(({ scale: scaleModule }) => {
          if (scaleModule.lastReading) {
            setScaleReading(scaleModule.lastReading);
          }
        })
        .catch(() => {});
    }, 200);
    return () => {
      clearInterval(interval);
      setPollingScale(false);
    };
  }, [hw.scaleConnected]);

  const wrap = async (key, fn, successMsg) => {
    setBusyKey(key, true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setBusyKey(key, false);
    }
  };

  const StatusBadge = ({ connected, supported }) => {
    if (!supported) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] gap-1 font-bold border-amber-500/30 text-amber-600">
          <AlertCircle className="w-3 h-3" />
          Browser Unsupported
        </Badge>
      );
    }
    return connected ? (
      <Badge className="text-[10px] gap-1 font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/15">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="text-[10px] gap-1 font-bold text-muted-foreground">
        <WifiOff className="w-3 h-3" />
        Disconnected
      </Badge>
    );
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Hardware"
        description="Pair physical retail hardware: thermal printers, cash drawers, barcode scanners, and weight scales."
      />

      {!hw.printerSupported && !hw.scannerHIDSupported && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-foreground">
              Browser does not support hardware APIs
            </p>
            <p className="text-muted-foreground">
              Web Serial and WebHID are required to talk directly to USB
              devices. Use Chrome 89+, Edge 89+, or Opera 75+ for full hardware
              support. The POS will still work via keyboard-wedge scanners and
              browser print dialogs.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Thermal Printer */}
        <Card className="shadow-sm border border-border/60 rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary" />
                Thermal Receipt Printer
              </CardTitle>
              <CardDescription className="text-xs">
                ESC/POS compatible. Tested with Epson, Star, Sunmi, generic
                58mm/80mm.
              </CardDescription>
            </div>
            <StatusBadge
              connected={hw.printerConnected}
              supported={hw.printerSupported}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {!hw.printerConnected ? (
                <Button
                  size="sm"
                  disabled={!hw.printerSupported || busy.printer}
                  onClick={() =>
                    wrap(
                      "printer",
                      () => hw.connectPrinter(),
                      "Printer connected",
                    )
                  }
                  className="text-xs font-bold gap-1.5">
                  {busy.printer ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plug className="w-3.5 h-3.5" />
                  )}
                  Pair Printer
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy.printer}
                    onClick={() =>
                      wrap(
                        "printer",
                        () => hw.printTest(),
                        "Test receipt printed",
                      )
                    }
                    className="text-xs font-semibold gap-1.5">
                    <TestTube className="w-3.5 h-3.5" />
                    Print Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy.printer}
                    onClick={() =>
                      wrap(
                        "printer",
                        () => hw.disconnectPrinter(),
                        "Printer disconnected",
                      )
                    }
                    className="text-xs font-semibold gap-1.5 text-rose-500 hover:bg-rose-500/10">
                    <Unplug className="w-3.5 h-3.5" />
                    Disconnect
                  </Button>
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
              <p>• Connect printer via USB before clicking Pair</p>
              <p>• Browser will prompt to select the serial device</p>
              <p>• Printer setting persists across page reloads</p>
            </div>
          </CardContent>
        </Card>

        {/* Cash Drawer */}
        <Card className="shadow-sm border border-border/60 rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Cash Drawer
              </CardTitle>
              <CardDescription className="text-xs">
                Triggered through the receipt printer's DK port (RJ-12 pulse).
              </CardDescription>
            </div>
            <StatusBadge
              connected={hw.printerConnected}
              supported={hw.printerSupported}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!hw.printerConnected || busy.drawer}
                onClick={() =>
                  wrap("drawer", () => hw.openDrawer(2), "Drawer kicked")
                }
                className="text-xs font-bold gap-1.5">
                {busy.drawer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wallet className="w-3.5 h-3.5" />
                )}
                Test Open Drawer
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
              <p>
                • Most drawers connect through the printer (no separate setup)
              </p>
              <p>• Pair the printer first, then test</p>
              <p>
                • Pin 2 is standard; switch to pin 5 if your drawer doesn't open
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Barcode Scanner */}
        <Card className="shadow-sm border border-border/60 rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ScanBarcode className="w-4 h-4 text-purple-600" />
                Barcode Scanner
              </CardTitle>
              <CardDescription className="text-xs">
                Most USB scanners work as keyboard wedges automatically. Pair
                only for HID/serial mode.
              </CardDescription>
            </div>
            <StatusBadge
              connected={hw.scannerConnected}
              supported={hw.scannerHIDSupported}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {!hw.scannerConnected ? (
                <>
                  <Button
                    size="sm"
                    disabled={!hw.scannerHIDSupported || busy.scanner}
                    onClick={() =>
                      wrap(
                        "scanner",
                        () => hw.connectScanner("hid"),
                        "Scanner paired (HID mode)",
                      )
                    }
                    className="text-xs font-bold gap-1.5">
                    {busy.scanner ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plug className="w-3.5 h-3.5" />
                    )}
                    Pair USB (HID)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hw.scannerSerialSupported || busy.scanner}
                    onClick={() =>
                      wrap(
                        "scanner",
                        () => hw.connectScanner("serial"),
                        "Scanner paired (Serial mode)",
                      )
                    }
                    className="text-xs font-semibold gap-1.5">
                    <Plug className="w-3.5 h-3.5" />
                    Pair Serial
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy.scanner}
                  onClick={() =>
                    wrap(
                      "scanner",
                      () => hw.disconnectScanner(),
                      "Scanner disconnected",
                    )
                  }
                  className="text-xs font-semibold gap-1.5 text-rose-500 hover:bg-rose-500/10">
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnect
                </Button>
              )}
              {hw.scannerMode && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase">
                  {hw.scannerMode} mode
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
              <p>• Default keyboard-wedge mode works without pairing</p>
              <p>• Use HID mode if scans interfere with form inputs</p>
              <p>
                • Use Serial mode for programmable scanners (Honeywell,
                Datalogic)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weight Scale */}
        <Card className="shadow-sm border border-border/60 rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                Weight Scale
              </CardTitle>
              <CardDescription className="text-xs">
                For produce, deli, and bulk-priced items. USB serial scales
                (Mettler, CAS, Avery).
              </CardDescription>
            </div>
            <StatusBadge
              connected={hw.scaleConnected}
              supported={hw.scaleSupported}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {!hw.scaleConnected ? (
                <Button
                  size="sm"
                  disabled={!hw.scaleSupported || busy.scale}
                  onClick={() =>
                    wrap("scale", () => hw.connectScale(), "Scale connected")
                  }
                  className="text-xs font-bold gap-1.5">
                  {busy.scale ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plug className="w-3.5 h-3.5" />
                  )}
                  Pair Scale
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy.scale}
                  onClick={() =>
                    wrap(
                      "scale",
                      () => hw.disconnectScale(),
                      "Scale disconnected",
                    )
                  }
                  className="text-xs font-semibold gap-1.5 text-rose-500 hover:bg-rose-500/10">
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnect
                </Button>
              )}
            </div>

            {hw.scaleConnected && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Live Reading
                </p>
                {scaleReading ? (
                  <>
                    <p className="text-3xl font-black text-foreground tracking-tight font-mono mt-1">
                      {scaleReading.weight.toFixed(3)}{" "}
                      <span className="text-sm text-muted-foreground">
                        {scaleReading.unit}
                      </span>
                    </p>
                    <p
                      className={`text-[10px] font-bold mt-1 ${
                        scaleReading.stable
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}>
                      {scaleReading.stable ? "● Stable" : "● Reading..."}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic mt-2">
                    Place item on scale
                  </p>
                )}
              </div>
            )}

            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
              <p>• Auto-detects format (Mettler Toledo, CAS, generic)</p>
              <p>• Normalizes units to kg for consistent pricing</p>
              <p>• Use "Get Weight" in cart for weighable items</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
