export class EpsonPrinter {
  constructor() {
    this.printer = null;
    this.settings = {};
    this.connected = false;
  }

  get isSupported() {
    return (
      typeof window !== "undefined" &&
      !!window.epson?.ePOSPrint &&
      !!window.epson?.ePOSBuilder
    );
  }

  async connect(settings = {}) {
    if (!this.isSupported) {
      throw new Error("Epson ePOS SDK is not loaded.");
    }
    this.settings = settings;
    const address = settings.printer_network_address || settings.epson_epos_address;
    if (!address) {
      throw new Error("Epson ePOS printer IP address is required.");
    }

    this.printer = new window.epson.ePOSPrint(
      `http://${address}/cgi-bin/epos/service.cgi`,
    );
    this.connected = true;
    return true;
  }

  async printReceipt(receipt) {
    if (!this.connected || !this.printer) throw new Error("Epson printer not connected.");
    const payload = this.buildMessage(receipt);

    await new Promise((resolve, reject) => {
      this.printer.onreceive = (response) =>
        response.success ? resolve(response) : reject(new Error("Epson ePOS print failed."));
      this.printer.onerror = (error) => reject(new Error(error?.message || "Epson ePOS print failed."));
      this.printer.send(payload);
    });
  }

  buildMessage(receipt) {
    const epson = window.epson;
    const builder = new epson.ePOSBuilder();
    const cols = receipt.paperWidth === 58 ? 32 : 48;
    const currency = receipt.currency || "$";
    const money = (value) => `${currency}${(parseFloat(value) || 0).toFixed(2)}`;
    const pad = (left, right) => {
      const space = Math.max(1, cols - String(left).length - String(right).length);
      return `${left}${" ".repeat(space)}${right}`;
    };
    const text = (value = "") => builder.addText(`${value}\n`);

    builder.addTextAlign(epson.ePOSBuilder.ALIGN_CENTER);
    builder.addTextStyle(false, false, true);
    String(receipt.header || "Receipt")
      .split("\n")
      .forEach(text);
    builder.addTextStyle(false, false, false);
    text();

    builder.addTextAlign(epson.ePOSBuilder.ALIGN_LEFT);
    text(`Order: ${receipt.orderNumber || ""}`);
    text(`Date:  ${receipt.date || ""}`);
    if (receipt.cashier) text(`Cashier: ${receipt.cashier}`);
    text("-".repeat(cols));

    for (const item of receipt.items || []) {
      const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
      const total = Number(item.total ?? item.price * qty) || 0;
      text(String(item.name || "").substring(0, cols));
      text(pad(`  ${qty} x ${money(total / qty)}`, money(total)));
    }

    text("-".repeat(cols));
    text(pad("Subtotal", money(receipt.subtotal)));
    if (receipt.discount > 0) text(pad("Discount", `-${money(receipt.discount)}`));
    if (receipt.tax > 0) text(pad("Tax", money(receipt.tax)));
    builder.addTextStyle(false, false, true);
    text(pad("TOTAL", money(receipt.total)));
    builder.addTextStyle(false, false, false);
    if (receipt.paymentMethod) text(pad("Paid via", String(receipt.paymentMethod).toUpperCase()));
    if (receipt.cashReceived > 0) {
      text(pad("Cash", money(receipt.cashReceived)));
      text(pad("Change", money(receipt.changeGiven)));
    }

    text();
    builder.addTextAlign(epson.ePOSBuilder.ALIGN_CENTER);
    String(receipt.footer || "")
      .split("\n")
      .filter(Boolean)
      .forEach(text);
    builder.addFeedLine(3);
    builder.addCut(epson.ePOSBuilder.CUT_FEED);
    return builder.toString();
  }

  async printTest() {
    await this.printReceipt({
      header: "READY POS PRO\nEpson ePOS Test",
      orderNumber: "TEST-001",
      date: new Date().toLocaleString(),
      items: [{ name: "Connection test", qty: 1, total: 0 }],
      subtotal: 0,
      total: 0,
      paymentMethod: "Test",
      paperWidth: 80,
    });
  }
}
