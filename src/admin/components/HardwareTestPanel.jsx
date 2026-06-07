/**
 * Hardware Testing Panel for Receipt Printers
 * Allows users to connect, test, and configure thermal printers
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Wifi, WifiOff, TestTube, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { printManager, PRINT_METHODS } from "@/lib/printing/PrintManager";

const METHOD_LABELS = {
  [PRINT_METHODS.BROWSER]: "Browser Print",
  [PRINT_METHODS.ESC_POS_SERIAL]: "ESC/POS Web Serial",
  [PRINT_METHODS.ESC_POS_USB]: "ESC/POS WebUSB",
  [PRINT_METHODS.ESC_POS_BLUETOOTH]: "ESC/POS WebBluetooth",
  [PRINT_METHODS.EPSON_EPOS]: "Epson ePOS",
  [PRINT_METHODS.STAR_WEBPRNT]: "Star WebPRNT",
  [PRINT_METHODS.AUTO]: "Auto",
};

export function HardwareTestPanel({ settings }) {
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState({
    connected: false,
    deviceInfo: null,
    lastTest: null
  });

  /**
   * Connect to the configured receipt printer.
   */
  const handleConnect = async () => {
    setConnecting(true);
    try {
      await printManager.initialize(settings);
      const status = printManager.getStatus();
      setPrinterStatus({
        connected: true,
        deviceInfo: { type: status.type },
        lastTest: null
      });
      toast.success("Receipt printer connected", {
        description: `${METHOD_LABELS[status.type] || status.type} is ready`
      });
    } catch (err) {
      
      toast.error("Failed to connect printer", {
        description: err.message || "Check printer connection and try again"
      });
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Disconnect from thermal printer
   */
  const handleDisconnect = async () => {
    try {
      await printManager.disconnect();
      setPrinterStatus({
        connected: false,
        deviceInfo: null,
        lastTest: null
      });
      toast.success("Printer disconnected");
    } catch (err) {
      
      toast.error("Failed to disconnect printer");
    }
  };

  /**
   * Print test receipt to verify connectivity
   */
  const handleTestPrint = async () => {
    if (!printManager.getStatus().connected) {
      toast.error("No printer connected", {
        description: "Please connect a printer first"
      });
      return;
    }

    setTesting(true);
    try {
      await printManager.printTest();
      setPrinterStatus(prev => ({
        ...prev,
        lastTest: { success: true, timestamp: new Date() }
      }));
      toast.success("Test print sent successfully", {
        description: "Check your thermal printer for output"
      });
    } catch (err) {
      
      setPrinterStatus(prev => ({
        ...prev,
        lastTest: { success: false, timestamp: new Date(), error: err.message }
      }));
      toast.error("Test print failed", {
        description: err.message || "Check printer connection"
      });
    } finally {
      setTesting(false);
    }
  };

  /**
   * Test cash drawer kick pulse
   */
  const handleTestDrawer = async () => {
    if (!printManager.getStatus().connected) {
      toast.error("No printer connected");
      return;
    }

    try {
      const pin = settings.cash_drawer_pulse === "pin5" ? 5 : 2;
      await printManager.openDrawer(pin);
      toast.success("Cash drawer pulse sent", {
        description: `Sent pulse to pin ${pin}`
      });
    } catch (err) {
      
      toast.error("Failed to open drawer", {
        description: err.message
      });
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Printer className="h-4 w-4 text-primary" />
          Hardware Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/5">
          <div className="flex items-center gap-3">
            {printerStatus.connected ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Wifi className="h-4 w-4 text-green-600" />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-500/10">
                <WifiOff className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-foreground">
                {printerStatus.connected ? "Printer Connected" : "No Printer Connected"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {printerStatus.connected 
                  ? `${METHOD_LABELS[printerStatus.deviceInfo?.type] || "Printer"} ready`
                  : "Connect the configured receipt printer"
                }
              </p>
            </div>
          </div>
          <Badge variant={printerStatus.connected ? "default" : "secondary"}>
            {printerStatus.connected ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Test Results */}
        {printerStatus.lastTest && (
          <div className={`flex items-start gap-2 p-3 rounded-lg border ${
            printerStatus.lastTest.success 
              ? "bg-green-500/5 border-green-500/20" 
              : "bg-red-500/5 border-red-500/20"
          }`}>
            {printerStatus.lastTest.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-[10px] font-bold ${
                printerStatus.lastTest.success ? "text-green-600" : "text-red-600"
              }`}>
                {printerStatus.lastTest.success ? "Test Passed" : "Test Failed"}
              </p>
              <p className={`text-[10px] leading-snug ${
                printerStatus.lastTest.success ? "text-green-600/70" : "text-red-600/70"
              }`}>
                {printerStatus.lastTest.success 
                  ? "Hardware is functioning correctly"
                  : printerStatus.lastTest.error || "Unknown error occurred"
                }
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {!printerStatus.connected ? (
            <Button
              variant="default"
              size="sm"
              className="w-full text-xs"
              onClick={handleConnect}
              disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Connect Printer
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleDisconnect}>
              <WifiOff className="h-3.5 w-3.5 mr-1.5" />
              Disconnect
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleTestPrint}
            disabled={!printerStatus.connected || testing}>
            {testing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="h-3.5 w-3.5 mr-1.5" />
                Test Print
              </>
            )}
          </Button>
        </div>

        {/* Cash Drawer Test (conditional) */}
        {settings.cash_drawer_pulse && settings.cash_drawer_pulse !== "none" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleTestDrawer}
            disabled={!printerStatus.connected}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Test Cash Drawer ({settings.cash_drawer_pulse})
          </Button>
        )}

        {/* Browser Compatibility Info */}
        {!printManager.getSupportedMethods().serial && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
            <p className="text-[10px] font-bold text-amber-600">
              Web Serial API Not Available
            </p>
            <p className="text-[10px] text-amber-600/80 leading-snug mt-1">
              Direct ESC/POS serial printing requires Chrome or Edge. Browser
              printing is still available as a fallback.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
