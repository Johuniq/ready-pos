export class StarPrinter {
  constructor() {
    this.settings = {};
    this.connected = false;
  }

  get isSupported() {
    return (
      typeof window !== "undefined" &&
      !!window.StarWebPrintTrader &&
      !!window.StarWebPrintBuilder
    );
  }

  async connect(settings = {}) {
    if (!this.isSupported) {
      throw new Error("Star WebPRNT SDK is not loaded.");
    }
    if (!settings.printer_network_address && !settings.star_webprnt_url) {
      throw new Error("Star printer URL or IP address is required.");
    }
    this.settings = settings;
    this.connected = true;
    return true;
  }

  async printReceipt(receipt) {
    if (!this.connected) throw new Error("Star printer not connected.");
    const url =
      this.settings.star_webprnt_url ||
      `http://${this.settings.printer_network_address}:8001/StarWebPRNT/SendMessage`;
    const trader = new window.StarWebPrintTrader({ url });
    const payload = this.buildMessage(receipt);

    await new Promise((resolve, reject) => {
      trader.onReceive = (response) =>
        response.traderSuccess ? resolve(response) : reject(new Error(response.status || "Star WebPRNT print failed."));
      trader.onError = (error) => reject(new Error(error?.message || "Star WebPRNT print failed."));
      trader.sendMessage(payload);
    });
  }

  buildMessage(receipt) {
    const builder = new window.StarWebPrintBuilder();
    const cols = receipt.paperWidth === 58 ? 32 : 48;
    const currency = receipt.currency || "$";
    const money = (value) => `${currency}${(parseFloat(value) || 0).toFixed(2)}`;
    const pad = (left, right) => {
      const space = Math.max(1, cols - String(left).length - String(right).length);
      return `${left}${" ".repeat(space)}${right}`;
    };
    const text = (value = "") => builder.addText(`${value}\n`);

    builder.addTextAlign(builder.Alignment.Center);
    builder.addTextStyle(false, false, true);
    String(receipt.header || "Receipt")
      .split("\n")
      .forEach(text);
    builder.addTextStyle(false, false, false);
    text();

    builder.addTextAlign(builder.Alignment.Left);
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
    builder.addTextAlign(builder.Alignment.Center);
    String(receipt.footer || "")
      .split("\n")
      .filter(Boolean)
      .forEach(text);
    builder.addFeedLine(3);
    builder.addCutPaper(builder.CutPaperAction.PartialCut);
    return builder.getMessage();
  }

  async printTest() {
    await this.printReceipt({
      header: "READY POS\nStar WebPRNT Test",
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
