import { buildEscposReceipt, buildTestReceipt, ESC_POS_BYTES } from "./escpos";

const COMMON_SERVICES = [
  0x18f0,
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

export class BluetoothPrinter {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.connected = false;
  }

  get isSupported() {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  async connect() {
    if (!this.isSupported) {
      throw new Error("WebBluetooth is not supported in this browser. Use Chrome or Edge.");
    }

    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_SERVICES,
    });
    this.server = await this.device.gatt.connect();

    for (const serviceId of COMMON_SERVICES) {
      try {
        const service = await this.server.getPrimaryService(serviceId);
        const characteristics = await service.getCharacteristics();
        this.characteristic = characteristics.find(
          (item) =>
            item.properties.write ||
            item.properties.writeWithoutResponse,
        );
        if (this.characteristic) break;
      } catch {
        // Try the next common printer service.
      }
    }

    if (!this.characteristic) {
      throw new Error("No writable Bluetooth printer service found.");
    }

    this.connected = true;
    return true;
  }

  async disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.connected = false;
  }

  async write(bytes) {
    if (!this.characteristic) throw new Error("Bluetooth printer not connected.");
    const chunkSize = 180;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
    }
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
