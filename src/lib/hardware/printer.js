/**
 * Thermal receipt printer adapter using the Web Serial API.
 *
 * Speaks the ESC/POS command set used by Epson, Star, Sunmi and most
 * generic 58mm/80mm thermal printers. When Web Serial is unavailable
 * (Firefox/Safari) we expose `isSupported = false` so callers can fall
 * back to the existing browser-print receipt window.
 */

const ENC = new TextEncoder();

// ESC/POS control sequences
export const ESC_POS = {
  INIT: new Uint8Array([0x1b, 0x40]), // ESC @
  LF: new Uint8Array([0x0a]), // line feed
  CUT: new Uint8Array([0x1d, 0x56, 0x00]), // GS V 0  full cut
  PARTIAL_CUT: new Uint8Array([0x1d, 0x56, 0x01]), // GS V 1  partial cut
  ALIGN_LEFT: new Uint8Array([0x1b, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([0x1b, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([0x1b, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([0x1b, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([0x1b, 0x45, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([0x1b, 0x21, 0x10]),
  DOUBLE_WIDTH: new Uint8Array([0x1b, 0x21, 0x20]),
  DOUBLE_BOTH: new Uint8Array([0x1b, 0x21, 0x30]),
  SIZE_NORMAL: new Uint8Array([0x1b, 0x21, 0x00]),
  // Cash drawer pulse (most printers): ESC p m t1 t2
  DRAWER_KICK_PIN2: new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]),
  DRAWER_KICK_PIN5: new Uint8Array([0x1b, 0x70, 0x01, 0x19, 0xfa]),
  BEEP: new Uint8Array([0x1b, 0x42, 0x03, 0x02]),
};

class ThermalPrinter {
  constructor() {
    this.port = null;
    this.writer = null;
    this.connected = false;
    this.deviceInfo = null;
  }

  /** Web Serial API availability */
  get isSupported() {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  /**
   * Prompt the user to pick a serial device. Result is cached by the
   * browser so subsequent reloads can call `autoConnect()` silently.
   */
  async connect() {
    if (!this.isSupported) {
      throw new Error(
        "Web Serial API not supported in this browser. Use Chrome or Edge.",
      );
    }

    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    this.port = port;
    this.writer = port.writable.getWriter();
    this.connected = true;
    this.deviceInfo = port.getInfo ? port.getInfo() : null;

    await this.write(ESC_POS.INIT);
    return true;
  }

  /**
   * Reconnect to a previously-paired device without prompting.
   */
  async autoConnect() {
    if (!this.isSupported) return false;
    const ports = await navigator.serial.getPorts();
    if (ports.length === 0) return false;

    try {
      const port = ports[0];
      await port.open({ baudRate: 9600 });
      this.port = port;
      this.writer = port.writable.getWriter();
      this.connected = true;
      this.deviceInfo = port.getInfo ? port.getInfo() : null;
      await this.write(ESC_POS.INIT);
      return true;
    } catch (err) {
      
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (err) {
      
    } finally {
      this.connected = false;
    }
  }

  async write(data) {
    if (!this.writer) throw new Error("Printer not connected");
    if (typeof data === "string") {
      await this.writer.write(ENC.encode(data));
    } else {
      await this.writer.write(data);
    }
  }

  async writeLine(text = "") {
    await this.write(text);
    await this.write(ESC_POS.LF);
  }

  /**
   * Print a structured receipt with the ESC/POS command set.
   *
   * @param {object} receipt
   * @param {string} receipt.header  Top-of-receipt store text
   * @param {string} receipt.footer  Bottom thank-you text
   * @param {string} receipt.orderNumber
   * @param {string} receipt.date
   * @param {string} receipt.cashier
   * @param {Array<{name:string, qty:number, total:number}>} receipt.items
   * @param {number} receipt.subtotal
   * @param {number} receipt.discount
   * @param {number} receipt.tax
   * @param {number} receipt.total
   * @param {number} receipt.cashReceived
   * @param {number} receipt.changeGiven
   * @param {string} receipt.paymentMethod
   * @param {string} receipt.currency
   * @param {number} receipt.paperWidth   58 or 80
   * @param {boolean} receipt.kickDrawer  Open drawer after printing
   */
  async printReceipt(receipt) {
    if (!this.connected) throw new Error("Printer not connected");

    const cols = receipt.paperWidth === 58 ? 32 : 48;
    const cur = receipt.currency || "$";

    const fmt = (n) => `${cur}${(parseFloat(n) || 0).toFixed(2)}`;
    const pad = (left, right, width = cols) => {
      const space = Math.max(1, width - left.length - right.length);
      return left + " ".repeat(space) + right;
    };
    const center = (text, width = cols) => {
      const space = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(space) + text;
    };
    const divider = "-".repeat(cols);

    await this.write(ESC_POS.INIT);

    // Header
    if (receipt.header) {
      await this.write(ESC_POS.ALIGN_CENTER);
      await this.write(ESC_POS.BOLD_ON);
      for (const line of receipt.header.split("\n")) {
        await this.writeLine(line);
      }
      await this.write(ESC_POS.BOLD_OFF);
      await this.writeLine("");
    }

    // Order meta
    await this.write(ESC_POS.ALIGN_LEFT);
    await this.writeLine(`Order: ${receipt.orderNumber || ""}`);
    await this.writeLine(`Date:  ${receipt.date || ""}`);
    if (receipt.cashier) await this.writeLine(`Cashier: ${receipt.cashier}`);
    await this.writeLine(divider);

    // Items
    for (const item of receipt.items || []) {
      const line1 = item.name?.substring(0, cols) || "";
      const line2 = pad(
        `  ${item.qty} x ${fmt(item.total / Math.max(1, item.qty))}`,
        fmt(item.total),
      );
      await this.writeLine(line1);
      await this.writeLine(line2);
    }

    await this.writeLine(divider);

    // Totals
    await this.writeLine(pad("Subtotal", fmt(receipt.subtotal)));
    if (receipt.discount > 0)
      await this.writeLine(pad("Discount", `-${fmt(receipt.discount)}`));
    if (receipt.tax > 0) await this.writeLine(pad("Tax", fmt(receipt.tax)));

    await this.write(ESC_POS.BOLD_ON);
    await this.write(ESC_POS.DOUBLE_HEIGHT);
    await this.writeLine(
      pad("TOTAL", fmt(receipt.total), Math.floor(cols / 2)),
    );
    await this.write(ESC_POS.SIZE_NORMAL);
    await this.write(ESC_POS.BOLD_OFF);

    if (receipt.paymentMethod) {
      await this.writeLine(
        pad("Paid via", receipt.paymentMethod.toUpperCase()),
      );
    }
    if (receipt.cashReceived > 0) {
      await this.writeLine(pad("Cash", fmt(receipt.cashReceived)));
      await this.writeLine(pad("Change", fmt(receipt.changeGiven)));
    }

    await this.writeLine("");

    // Footer
    if (receipt.footer) {
      await this.write(ESC_POS.ALIGN_CENTER);
      for (const line of receipt.footer.split("\n")) {
        await this.writeLine(line);
      }
    }

    // Feed lines and cut
    await this.writeLine("");
    await this.writeLine("");
    await this.writeLine("");
    await this.write(ESC_POS.CUT);

    if (receipt.kickDrawer) {
      await this.write(ESC_POS.DRAWER_KICK_PIN2);
    }
  }

  /** Send the cash drawer kick pulse over the printer's DK port. */
  async kickDrawer(pin = 2) {
    if (!this.connected) throw new Error("Printer not connected");
    await this.write(
      pin === 5 ? ESC_POS.DRAWER_KICK_PIN5 : ESC_POS.DRAWER_KICK_PIN2,
    );
  }

  /** Print a small test receipt to verify connectivity. */
  async printTest() {
    await this.write(ESC_POS.INIT);
    await this.write(ESC_POS.ALIGN_CENTER);
    await this.write(ESC_POS.BOLD_ON);
    await this.write(ESC_POS.DOUBLE_BOTH);
    await this.writeLine("READY POS");
    await this.write(ESC_POS.SIZE_NORMAL);
    await this.write(ESC_POS.BOLD_OFF);
    await this.writeLine("Hardware test successful");
    await this.writeLine(new Date().toLocaleString());
    await this.writeLine("");
    await this.writeLine("");
    await this.writeLine("");
    await this.write(ESC_POS.CUT);
  }
}

// Singleton instance
export const printer = new ThermalPrinter();
