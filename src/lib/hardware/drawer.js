/**
 * Cash drawer adapter.
 *
 * Most retail cash drawers are dumb mechanical devices triggered by an
 * RJ-12 cable plugged into the receipt printer's DK port. So the drawer
 * "opens" by sending an ESC/POS pulse through the printer connection.
 *
 * For setups without a thermal printer (network/cloud drawers, USB HID
 * drawers like Posiflex CR-4000), Web Serial / WebHID can talk directly.
 */

import { printer, ESC_POS } from "./printer";

class CashDrawer {
  constructor() {
    this.directPort = null;
    this.directWriter = null;
  }

  /**
   * Open via the connected receipt printer.
   */
  async openViaPrinter(pin = 2) {
    if (!printer.connected) {
      throw new Error(
        "Printer not connected. Connect a printer first or use direct mode.",
      );
    }
    await printer.kickDrawer(pin);
    return true;
  }

  /**
   * Connect directly to a network/serial cash drawer (rare setup).
   */
  async connectDirect() {
    if (!("serial" in navigator)) {
      throw new Error("Web Serial API not supported.");
    }
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    this.directPort = port;
    this.directWriter = port.writable.getWriter();
    return true;
  }

  async openDirect(pin = 2) {
    if (!this.directWriter) throw new Error("Drawer not connected directly.");
    const cmd = pin === 5 ? ESC_POS.DRAWER_KICK_PIN5 : ESC_POS.DRAWER_KICK_PIN2;
    await this.directWriter.write(cmd);
    return true;
  }

  /**
   * Smart open: prefer direct connection, fall back to printer pass-through.
   * 
   * SECURITY FIX #3: Require server authorization before opening drawer
   * 
   * @param {number} pin - Drawer pin (2 or 5)
   * @param {number} sessionId - Active session ID (required)
   * @param {number} registerId - Register ID (optional)
   * @param {string} reason - Reason for opening drawer (optional)
   */
  async open(pin = 2, sessionId = null, registerId = null, reason = "") {
    // SECURITY FIX #3: Require server authorization first
    if (!sessionId) {
      throw new Error(
        "Session ID is required to open the cash drawer for security audit.",
      );
    }

    try {
      // Request authorization from server
      const response = await fetch(
        `${window.readypos?.apiUrl || "/wp-json/readypos/v1"}/sessions/drawer-open`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.readypos?.nonce || "",
          },
          body: JSON.stringify({
            sessionId,
            registerId,
            reason,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Server denied drawer open authorization.",
        );
      }

      // Authorization granted, proceed with hardware open
      if (this.directWriter) {
        return this.openDirect(pin);
      }
      if (printer.connected) {
        return this.openViaPrinter(pin);
      }
      throw new Error(
        "No cash drawer or printer available. Connect hardware first.",
      );
    } catch (error) {
      
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.directWriter) {
        await this.directWriter.close();
        this.directWriter = null;
      }
      if (this.directPort) {
        await this.directPort.close();
        this.directPort = null;
      }
    } catch (err) {
      
    }
  }

  get connected() {
    return !!this.directWriter || printer.connected;
  }
}

export const drawer = new CashDrawer();
