/**
 * Weight scale adapter for produce / bulk items.
 *
 * Talks to USB serial scales (Mettler Toledo, CAS, Avery) that stream
 * weight readings over a serial connection. The UX flow:
 *   1. Cashier presses "Weigh" on a weighable product
 *   2. We poll the scale or read its continuous stream
 *   3. Return the stable weight reading
 *
 * Most scales output ASCII like "ST,GS,  1.234kg" or NCI-style frames.
 * This adapter parses the most common formats; vendor-specific parsing
 * can be plugged in via `setParser()`.
 */

class WeightScale {
  constructor() {
    this.port = null;
    this.reader = null;
    this.connected = false;
    this.lastReading = null; // { weight: 1.234, unit: 'kg', stable: true }
    this.parser = this.defaultParser;
  }

  get isSupported() {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  /** Pick the scale device. */
  async connect() {
    if (!this.isSupported) {
      throw new Error("Web Serial not supported.");
    }

    const port = await navigator.serial.requestPort();
    await port.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });
    this.port = port;
    this.connected = true;
    this._listen();
    return true;
  }

  async disconnect() {
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (err) {
      console.warn("[Scale] disconnect error:", err);
    } finally {
      this.connected = false;
      this.lastReading = null;
    }
  }

  async _listen() {
    if (!this.port) return;
    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable).catch(() => {});
    this.reader = decoder.readable.getReader();

    let buffer = "";
    try {
      while (this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          let idx;
          while ((idx = buffer.search(/[\r\n]/)) !== -1) {
            const line = buffer.substring(0, idx).trim();
            buffer = buffer.substring(idx + 1);
            if (line) {
              const parsed = this.parser(line);
              if (parsed) this.lastReading = parsed;
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Scale] read error:", err);
    }
  }

  /**
   * Default parser: handles formats like
   *   "ST,GS,   1.234kg"        (Mettler Toledo)
   *   "  1.234 kg ST"           (CAS)
   *   "  1234 g"                (generic gram output)
   */
  defaultParser(line) {
    // Match number + optional unit
    const match = line.match(/(-?\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
    if (!match) return null;
    let weight = parseFloat(match[1]);
    const unit = (match[2] || "kg").toLowerCase();

    // Stability: prefix "ST" / "S " indicates stable; "US" unstable
    const stable = /\bST\b|\bS\b/i.test(line) && !/\bUS\b|\bU\b/i.test(line);

    // Normalize to kg for consistent cart math
    if (unit === "g") weight = weight / 1000;
    if (unit === "lb") weight = weight * 0.453592;
    if (unit === "oz") weight = weight * 0.0283495;

    return {
      weight,
      unit: "kg",
      originalUnit: unit,
      stable,
      raw: line,
    };
  }

  setParser(fn) {
    this.parser = fn;
  }

  /** Wait for a stable reading (or timeout). */
  async getStableWeight(timeoutMs = 5000) {
    if (!this.connected) throw new Error("Scale not connected.");
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.lastReading?.stable) {
        return this.lastReading;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (this.lastReading) return this.lastReading;
    throw new Error("Scale reading timeout.");
  }
}

export const scale = new WeightScale();
