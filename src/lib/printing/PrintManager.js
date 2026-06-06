/**
 * PrintManager - Unified receipt printing interface
 * 
 * Supports multiple printing methods:
 * - Browser printing (HTML/CSS)
 * - ESC/POS thermal printers (Web Serial, WebUSB, WebBluetooth)
 * - Epson ePOS SDK
 * - Star Micronics SDK
 * 
 * Automatically selects the best available method based on settings and browser support.
 */

import { toast } from "sonner";
import { formatPrice } from "../currency";
import { printer as serialPrinter } from "../hardware/printer";
import { EpsonPrinter } from "./epson";
import { StarPrinter } from "./star";
import { USBPrinter } from "./usb";
import { BluetoothPrinter } from "./bluetooth";
import { BrowserPrinter } from "./browser";

export const PRINT_METHODS = {
  BROWSER: "browser",
  ESC_POS_SERIAL: "escpos-serial",
  ESC_POS_USB: "escpos-usb",
  ESC_POS_BLUETOOTH: "escpos-bluetooth",
  EPSON_EPOS: "epson-epos",
  STAR_WEBPRNT: "star-webprnt",
  AUTO: "auto",
};

const LEGACY_METHOD_MAP = {
  browser: PRINT_METHODS.BROWSER,
  escpos: PRINT_METHODS.ESC_POS_SERIAL,
  "web-serial": PRINT_METHODS.ESC_POS_SERIAL,
  serial: PRINT_METHODS.ESC_POS_SERIAL,
  "web-usb": PRINT_METHODS.ESC_POS_USB,
  usb: PRINT_METHODS.ESC_POS_USB,
  "web-bluetooth": PRINT_METHODS.ESC_POS_BLUETOOTH,
  bluetooth: PRINT_METHODS.ESC_POS_BLUETOOTH,
  "epson-epos": PRINT_METHODS.EPSON_EPOS,
  epson: PRINT_METHODS.EPSON_EPOS,
  "star-webprnt": PRINT_METHODS.STAR_WEBPRNT,
  star: PRINT_METHODS.STAR_WEBPRNT,
  auto: PRINT_METHODS.AUTO,
};

export const CONNECTION_TYPES = {
  SERIAL: "serial",
  USB: "usb",
  BLUETOOTH: "bluetooth",
  NETWORK: "network",
};

class PrintManager {
  constructor() {
    this.activePrinter = null;
    this.printerType = null;
    this.settings = {};
    
    // Initialize printer instances
    this.printers = {
      browser: new BrowserPrinter(),
      serial: serialPrinter,
      usb: new USBPrinter(),
      bluetooth: new BluetoothPrinter(),
      epson: new EpsonPrinter(),
      star: new StarPrinter(),
    };
  }

  /**
   * Check which printing methods are supported in the current browser
   */
  getSupportedMethods() {
    const supported = {
      browser: true, // Always available
      serial: typeof navigator !== "undefined" && "serial" in navigator,
      usb: typeof navigator !== "undefined" && "usb" in navigator,
      bluetooth: typeof navigator !== "undefined" && "bluetooth" in navigator,
      epson:
        typeof window !== "undefined" &&
        !!window.epson?.ePOSPrint &&
        !!window.epson?.ePOSBuilder,
      star:
        typeof window !== "undefined" &&
        !!window.StarWebPrintTrader &&
        !!window.StarWebPrintBuilder,
    };

    return supported;
  }

  /**
   * Initialize printer based on settings
   */
  async initialize(settings = {}) {
    const printMethod =
      settings.printMethod ||
      settings.receipt_printing_method ||
      PRINT_METHODS.AUTO;

    this.settings = {
      ...settings,
      printMethod: LEGACY_METHOD_MAP[printMethod] || printMethod,
      connectionType:
        settings.connectionType ||
        settings.printer_connection_type ||
        CONNECTION_TYPES.SERIAL,
      autoReconnect:
        settings.autoReconnect ?? settings.printer_auto_reconnect !== "no",
      paperWidth: settings.paperWidth || settings.receipt_paper_width || "80mm",
    };

    const method = this.settings.printMethod;

    if (method === PRINT_METHODS.AUTO) {
      return await this.autoDetectPrinter();
    }

    return await this.connectPrinter(method);
  }

  /**
   * Auto-detect and connect to the best available printer
   */
  async autoDetectPrinter() {
    const supported = this.getSupportedMethods();
    
    // Priority order: Serial > USB > Epson > Star > Bluetooth > Browser
    const priorities = [
      { type: "serial", method: PRINT_METHODS.ESC_POS_SERIAL },
      { type: "usb", method: PRINT_METHODS.ESC_POS_USB },
      { type: "epson", method: PRINT_METHODS.EPSON_EPOS },
      { type: "star", method: PRINT_METHODS.STAR_WEBPRNT },
      { type: "bluetooth", method: PRINT_METHODS.ESC_POS_BLUETOOTH },
    ];

    for (const { type, method } of priorities) {
      if (supported[type]) {
        try {
          const connected = await this.connectPrinter(method, true);
          if (connected) {
            console.log(`[PrintManager] Auto-connected to ${method}`);
            return true;
          }
        } catch (err) {
          console.log(`[PrintManager] ${method} not available:`, err.message);
        }
      }
    }

    // Fallback to browser printing
    this.activePrinter = this.printers.browser;
    this.printerType = PRINT_METHODS.BROWSER;
    console.log("[PrintManager] Falling back to browser printing");
    return true;
  }

  /**
   * Connect to a specific printer type
   */
  async connectPrinter(method, silent = false) {
    try {
      switch (method) {
        case PRINT_METHODS.ESC_POS_SERIAL:
          await this.printers.serial.connect();
          this.activePrinter = this.printers.serial;
          this.printerType = PRINT_METHODS.ESC_POS_SERIAL;
          break;

        case PRINT_METHODS.ESC_POS_USB:
          await this.printers.usb.connect();
          this.activePrinter = this.printers.usb;
          this.printerType = PRINT_METHODS.ESC_POS_USB;
          break;

        case PRINT_METHODS.ESC_POS_BLUETOOTH:
          await this.printers.bluetooth.connect();
          this.activePrinter = this.printers.bluetooth;
          this.printerType = PRINT_METHODS.ESC_POS_BLUETOOTH;
          break;

        case PRINT_METHODS.EPSON_EPOS:
          await this.printers.epson.connect(this.settings);
          this.activePrinter = this.printers.epson;
          this.printerType = PRINT_METHODS.EPSON_EPOS;
          break;

        case PRINT_METHODS.STAR_WEBPRNT:
          await this.printers.star.connect(this.settings);
          this.activePrinter = this.printers.star;
          this.printerType = PRINT_METHODS.STAR_WEBPRNT;
          break;

        case PRINT_METHODS.BROWSER:
        default:
          this.activePrinter = this.printers.browser;
          this.printerType = PRINT_METHODS.BROWSER;
          break;
      }

      if (!silent) {
        toast.success(`Connected to ${this.printerType} printer`);
      }
      return true;
    } catch (error) {
      if (!silent) {
        toast.error(`Failed to connect: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Disconnect from current printer
   */
  async disconnect() {
    if (this.activePrinter && typeof this.activePrinter.disconnect === "function") {
      await this.activePrinter.disconnect();
    }
    this.activePrinter = null;
    this.printerType = null;
  }

  /**
   * Print a receipt
   * @param {Object} order - Order data
   * @param {Object} options - Print options
   */
  async printReceipt(order, options = {}) {
    if (!this.activePrinter) {
      await this.initialize(options);
    }

    const receiptData = this.formatReceiptData(order, options);

    try {
      if (this.printerType === PRINT_METHODS.BROWSER) {
        // Browser printing uses HTML
        await this.activePrinter.print(order, { ...this.settings, ...options });
      } else {
        // All other printers use structured data
        await this.activePrinter.printReceipt(receiptData);
      }

      // Kick drawer if requested
      if (options.kickDrawer && typeof this.activePrinter.kickDrawer === "function") {
        await this.activePrinter.kickDrawer();
      }

      return true;
    } catch (error) {
      console.error("[PrintManager] Print failed:", error);
      
      // Try fallback to browser printing
      if (this.printerType !== PRINT_METHODS.BROWSER) {
        toast.error(`Printer error. Falling back to browser printing.`);
        this.activePrinter = this.printers.browser;
        this.printerType = PRINT_METHODS.BROWSER;
        return await this.printReceipt(order, options);
      }

      throw error;
    }
  }

  /**
   * Format order data into standardized receipt structure
   */
  formatReceiptData(order, options = {}) {
    const settings = { ...this.settings, ...options };
    
    return {
      header: settings.receipt_header || settings.site_name || "Store Receipt",
      footer: settings.receipt_footer || "Thank you for your business!",
      orderNumber: order.order_number || order.id || `POS-${Date.now()}`,
      date: order.date || new Date().toLocaleString(),
      cashier: order.cashier_name || "Cashier",
      items: (order.items || []).map(item => ({
        name: item.name,
        qty: item.quantity,
        total: parseFloat(item.total),
        price: parseFloat(item.total) / Math.max(1, item.quantity),
      })),
      subtotal: parseFloat(order.subtotal || order.total - (order.tax || 0)),
      discount: parseFloat(order.discount || 0),
      tax: parseFloat(order.tax || 0),
      total: parseFloat(order.total),
      cashReceived: parseFloat(order.cash_received || 0),
      changeGiven: parseFloat(order.change_given || 0),
      paymentMethod: order.payment_method || "Cash",
      currency: settings.currency_symbol || "$",
      paperWidth:
        (settings.paperWidth || settings.receipt_paper_width) === "58mm"
          ? 58
          : 80,
      kickDrawer: settings.kickDrawer || false,
      printBarcode: settings.print_barcode !== "no",
    };
  }

  /**
   * Print a test receipt
   */
  async printTest() {
    if (!this.activePrinter) {
      throw new Error("No printer connected");
    }

    if (typeof this.activePrinter.printTest === "function") {
      await this.activePrinter.printTest();
    } else {
      // Create test receipt
      const testOrder = {
        order_number: "TEST-001",
        date: new Date().toLocaleString(),
        cashier_name: "Test Cashier",
        items: [
          { name: "Test Item 1", quantity: 2, total: 20.00 },
          { name: "Test Item 2", quantity: 1, total: 15.50 },
        ],
        subtotal: 35.50,
        tax: 3.55,
        total: 39.05,
        payment_method: "Test",
      };

      await this.printReceipt(testOrder, { ...this.settings, kickDrawer: false });
    }

    toast.success("Test receipt printed");
  }

  /**
   * Open cash drawer
   */
  async openDrawer(pin = 2) {
    if (!this.activePrinter) {
      throw new Error("No printer connected");
    }

    if (typeof this.activePrinter.kickDrawer === "function") {
      await this.activePrinter.kickDrawer(pin);
      toast.success("Cash drawer opened");
    } else {
      throw new Error("Cash drawer not supported with current printer");
    }
  }

  /**
   * Get printer status
   */
  getStatus() {
    return {
      connected: !!this.activePrinter,
      type: this.printerType,
      supported: this.getSupportedMethods(),
      settings: this.settings,
    };
  }
}

// Singleton instance
export const printManager = new PrintManager();

// Export for use in components
export default printManager;
