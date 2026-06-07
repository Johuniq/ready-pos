/**
 * Barcode scanner adapter.
 *
 * Most retail USB barcode scanners (Honeywell, Zebra, generic) operate as
 * "keyboard wedge" devices — they type the scanned code into the focused
 * field and press Enter. The existing keyboard listener in ProductGrid
 * already handles this case.
 *
 * This module adds support for two more advanced cases:
 *   1. WebHID-mode scanners (for true POS apps where keyboard input is
 *      undesirable, e.g. while the cashier is typing in a search field).
 *   2. Programmable serial scanners over Web Serial.
 *
 * Both modes call the registered listeners with the decoded barcode.
 */

class BarcodeScanner {
  constructor() {
    this.device = null; // HIDDevice
    this.serialPort = null; // SerialPort
    this.serialReader = null;
    this.serialBuffer = "";
    this.listeners = new Set();
    this.mode = null; // 'hid' | 'serial' | null
    this.connected = false;
  }

  get isHIDSupported() {
    return typeof navigator !== "undefined" && "hid" in navigator;
  }

  get isSerialSupported() {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  /** Connect to a USB HID barcode scanner. */
  async connectHID() {
    if (!this.isHIDSupported) {
      throw new Error("WebHID not supported. Use Chrome or Edge.");
    }

    const devices = await navigator.hid.requestDevice({
      filters: [
        // Common scanner vendor IDs
        { vendorId: 0x05e0 }, // Symbol/Zebra
        { vendorId: 0x0c2e }, // Honeywell
        { vendorId: 0x05f9 }, // PSC/Datalogic
        { vendorId: 0x1eab }, // Newland
        { vendorId: 0x23d0 }, // Generic
      ],
    });

    if (devices.length === 0) return false;

    this.device = devices[0];
    if (!this.device.opened) {
      await this.device.open();
    }

    let buffer = "";
    this.device.addEventListener("inputreport", (event) => {
      // HID keyboard reports → translate keycodes to ASCII
      const data = new Uint8Array(event.data.buffer);
      for (let i = 2; i < data.length; i++) {
        const code = data[i];
        if (code === 0) continue;
        if (code === 0x28) {
          // Enter — flush buffer
          if (buffer.length > 2) {
            this.notify(buffer);
          }
          buffer = "";
        } else if (code >= 0x04 && code <= 0x1d) {
          // a-z
          buffer += String.fromCharCode(code - 0x04 + 0x61);
        } else if (code >= 0x1e && code <= 0x26) {
          // 1-9
          buffer += String.fromCharCode(code - 0x1e + 0x31);
        } else if (code === 0x27) {
          buffer += "0";
        }
      }
    });

    this.mode = "hid";
    this.connected = true;
    return true;
  }

  /** Connect to a serial barcode scanner. */
  async connectSerial() {
    if (!this.isSerialSupported) {
      throw new Error("Web Serial not supported. Use Chrome or Edge.");
    }

    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    this.serialPort = port;

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable).catch(() => {});
    this.serialReader = decoder.readable.getReader();

    this.mode = "serial";
    this.connected = true;
    this._readSerialLoop();
    return true;
  }

  async _readSerialLoop() {
    try {
      while (this.serialReader) {
        const { value, done } = await this.serialReader.read();
        if (done) break;
        if (value) {
          this.serialBuffer += value;
          // Most scanners terminate barcodes with CR/LF
          let idx;
          while ((idx = this.serialBuffer.search(/[\r\n]/)) !== -1) {
            const code = this.serialBuffer.substring(0, idx).trim();
            this.serialBuffer = this.serialBuffer.substring(idx + 1);
            if (code.length > 2) this.notify(code);
          }
        }
      }
    } catch (err) {
      
    }
  }

  async disconnect() {
    try {
      if (this.device && this.device.opened) {
        await this.device.close();
      }
      if (this.serialReader) {
        await this.serialReader.cancel();
        this.serialReader = null;
      }
      if (this.serialPort) {
        await this.serialPort.close();
        this.serialPort = null;
      }
    } catch (err) {
      
    } finally {
      this.device = null;
      this.mode = null;
      this.connected = false;
    }
  }

  /** Subscribe to scan events. Returns an unsubscribe fn. */
  onScan(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(code) {
    for (const cb of this.listeners) {
      try {
        cb(code);
      } catch (err) {
        
      }
    }
  }
}

export const scanner = new BarcodeScanner();
