import { useEffect, useState, useCallback } from "react";
import { printer, drawer, scanner, scale, cardReader } from "@/lib/hardware";

/**
 * React hook exposing live hardware connection state and helpers.
 *
 * Usage:
 *   const hw = useHardware();
 *   hw.printerConnected           // boolean
 *   await hw.connectPrinter();
 *   await hw.printReceipt(data);  // uses ESC/POS if connected, else falls back
 *   await hw.openDrawer();
 *   hw.onScan(callback);          // returns unsubscribe fn
 *   await hw.connectCardReader();
 *   await hw.processCardPayment(amount);
 */
export function useHardware() {
  const [printerConnected, setPrinterConnected] = useState(printer.connected);
  const [scannerConnected, setScannerConnected] = useState(scanner.connected);
  const [scaleConnected, setScaleConnected] = useState(scale.connected);
  const [cardReaderConnected, setCardReaderConnected] = useState(cardReader.connected);
  const [scannerMode, setScannerMode] = useState(scanner.mode);

  // Try silent reconnect on mount (uses cached browser permissions)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (printer.isSupported && !printer.connected) {
        const ok = await printer.autoConnect();
        if (mounted && ok) setPrinterConnected(true);
      }
      if (cardReader.isSupported && !cardReader.connected) {
        const ok = await cardReader.autoConnect();
        if (mounted && ok) setCardReaderConnected(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const connectPrinter = useCallback(async () => {
    await printer.connect();
    setPrinterConnected(printer.connected);
  }, []);

  const disconnectPrinter = useCallback(async () => {
    await printer.disconnect();
    setPrinterConnected(false);
  }, []);

  const connectScanner = useCallback(async (mode = "hid") => {
    if (mode === "serial") {
      await scanner.connectSerial();
    } else {
      await scanner.connectHID();
    }
    setScannerConnected(scanner.connected);
    setScannerMode(scanner.mode);
  }, []);

  const disconnectScanner = useCallback(async () => {
    await scanner.disconnect();
    setScannerConnected(false);
    setScannerMode(null);
  }, []);

  const connectScale = useCallback(async () => {
    await scale.connect();
    setScaleConnected(scale.connected);
  }, []);

  const disconnectScale = useCallback(async () => {
    await scale.disconnect();
    setScaleConnected(false);
  }, []);

  const printReceipt = useCallback(async (receipt) => {
    if (!printer.connected) {
      throw new Error(
        "Printer not connected. Connect a thermal printer or use browser fallback.",
      );
    }
    await printer.printReceipt(receipt);
  }, []);

  const openDrawer = useCallback(async (pin = 2) => {
    await drawer.open(pin);
  }, []);

  const onScan = useCallback((callback) => {
    return scanner.onScan(callback);
  }, []);

  const getWeight = useCallback(async (timeoutMs) => {
    return scale.getStableWeight(timeoutMs);
  }, []);

  const printTest = useCallback(async () => {
    if (!printer.connected) throw new Error("Printer not connected.");
    await printer.printTest();
  }, []);

  const connectCardReader = useCallback(async (type = "serial") => {
    if (type === "usb") {
      await cardReader.connectUSB();
    } else {
      await cardReader.connectSerial();
    }
    setCardReaderConnected(cardReader.connected);
  }, []);

  const disconnectCardReader = useCallback(async () => {
    await cardReader.disconnect();
    setCardReaderConnected(false);
  }, []);

  const processCardPayment = useCallback(async (amount, options = {}) => {
    if (!cardReader.connected) {
      throw new Error("Card reader not connected.");
    }
    return await cardReader.startTransaction({ amount, ...options });
  }, []);

  const cancelCardPayment = useCallback(async () => {
    await cardReader.cancelTransaction();
  }, []);

  const onCardReaderEvent = useCallback((event, callback) => {
    return cardReader.on(event, callback);
  }, []);

  return {
    // Status
    printerConnected,
    scannerConnected,
    scaleConnected,
    cardReaderConnected,
    scannerMode,
    printerSupported: printer.isSupported,
    scannerHIDSupported: scanner.isHIDSupported,
    scannerSerialSupported: scanner.isSerialSupported,
    scaleSupported: scale.isSupported,
    cardReaderSupported: cardReader.isSupported,
    cardReaderSerialSupported: cardReader.isSerialSupported,
    cardReaderUSBSupported: cardReader.isUSBSupported,

    // Connection management
    connectPrinter,
    disconnectPrinter,
    connectScanner,
    disconnectScanner,
    connectScale,
    disconnectScale,
    connectCardReader,
    disconnectCardReader,

    // Operations
    printReceipt,
    printTest,
    openDrawer,
    onScan,
    getWeight,
    processCardPayment,
    cancelCardPayment,
    onCardReaderEvent,
  };
}
