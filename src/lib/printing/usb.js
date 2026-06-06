import { buildEscposReceipt, buildTestReceipt, ESC_POS_BYTES } from "./escpos";

export class USBPrinter {
  constructor() {
    this.device = null;
    this.endpoint = null;
    this.interfaceNumber = null;
    this.connected = false;
  }

  get isSupported() {
    return typeof navigator !== "undefined" && "usb" in navigator;
  }

  async connect() {
    if (!this.isSupported) {
      throw new Error("WebUSB is not supported in this browser. Use Chrome or Edge.");
    }

    this.device = await navigator.usb.requestDevice({ filters: [] });
    await this.device.open();
    if (!this.device.configuration) await this.device.selectConfiguration(1);

    const iface = this.device.configuration.interfaces.find((candidate) =>
      candidate.alternates.some((alt) =>
        alt.endpoints.some((endpoint) => endpoint.direction === "out"),
      ),
    );

    if (!iface) throw new Error("No writable USB endpoint found for this printer.");

    const alternate = iface.alternates.find((alt) =>
      alt.endpoints.some((endpoint) => endpoint.direction === "out"),
    );
    this.interfaceNumber = iface.interfaceNumber;
    this.endpoint = alternate.endpoints.find((endpoint) => endpoint.direction === "out");

    await this.device.claimInterface(this.interfaceNumber);
    this.connected = true;
    return true;
  }

  async disconnect() {
    if (this.device && this.interfaceNumber !== null) {
      await this.device.releaseInterface(this.interfaceNumber).catch(() => {});
      await this.device.close().catch(() => {});
    }
    this.device = null;
    this.endpoint = null;
    this.interfaceNumber = null;
    this.connected = false;
  }

  async write(bytes) {
    if (!this.connected || !this.endpoint) throw new Error("USB printer not connected.");
    await this.device.transferOut(this.endpoint.endpointNumber, bytes);
  }

  async printReceipt(receipt) {
    await this.write(buildEscposReceipt(receipt));
  }

  async printTest() {
    await this.write(buildTestReceipt());
  }

  async kickDrawer(pin = 2) {
    await this.write(new Uint8Array(pin === 5 ? ESC_POS_BYTES.DRAWER_KICK_PIN5 : ESC_POS_BYTES.DRAWER_KICK_PIN2));
  }
}
