const ENC = new TextEncoder();

export const ESC_POS_BYTES = {
  INIT: [0x1b, 0x40],
  LF: [0x0a],
  CUT: [0x1d, 0x56, 0x00],
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  DOUBLE_HEIGHT: [0x1b, 0x21, 0x10],
  SIZE_NORMAL: [0x1b, 0x21, 0x00],
  DRAWER_KICK_PIN2: [0x1b, 0x70, 0x00, 0x19, 0xfa],
  DRAWER_KICK_PIN5: [0x1b, 0x70, 0x01, 0x19, 0xfa],
};

function textBytes(text) {
  return Array.from(ENC.encode(String(text)));
}

function pushText(bytes, text = "") {
  bytes.push(...textBytes(text), ...ESC_POS_BYTES.LF);
}

function money(value, currency = "$") {
  return `${currency}${(parseFloat(value) || 0).toFixed(2)}`;
}

function pad(left, right, width) {
  const safeLeft = String(left || "");
  const safeRight = String(right || "");
  const space = Math.max(1, width - safeLeft.length - safeRight.length);
  return safeLeft + " ".repeat(space) + safeRight;
}

export function buildEscposReceipt(receipt = {}) {
  const cols = receipt.paperWidth === 58 ? 32 : 48;
  const currency = receipt.currency || "$";
  const divider = "-".repeat(cols);
  const bytes = [...ESC_POS_BYTES.INIT];

  if (receipt.header) {
    bytes.push(...ESC_POS_BYTES.ALIGN_CENTER, ...ESC_POS_BYTES.BOLD_ON);
    String(receipt.header)
      .split("\n")
      .forEach((line) => pushText(bytes, line));
    bytes.push(...ESC_POS_BYTES.BOLD_OFF);
    pushText(bytes);
  }

  bytes.push(...ESC_POS_BYTES.ALIGN_LEFT);
  pushText(bytes, `Order: ${receipt.orderNumber || ""}`);
  pushText(bytes, `Date:  ${receipt.date || ""}`);
  if (receipt.cashier) pushText(bytes, `Cashier: ${receipt.cashier}`);
  pushText(bytes, divider);

  for (const item of receipt.items || []) {
    const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
    const total = Number(item.total ?? item.price * qty) || 0;
    pushText(bytes, String(item.name || "").substring(0, cols));
    pushText(bytes, pad(`  ${qty} x ${money(total / qty, currency)}`, money(total, currency), cols));
  }

  pushText(bytes, divider);
  pushText(bytes, pad("Subtotal", money(receipt.subtotal, currency), cols));
  if (receipt.discount > 0) {
    pushText(bytes, pad("Discount", `-${money(receipt.discount, currency)}`, cols));
  }
  if (receipt.tax > 0) pushText(bytes, pad("Tax", money(receipt.tax, currency), cols));

  bytes.push(...ESC_POS_BYTES.BOLD_ON, ...ESC_POS_BYTES.DOUBLE_HEIGHT);
  pushText(bytes, pad("TOTAL", money(receipt.total, currency), Math.floor(cols / 2)));
  bytes.push(...ESC_POS_BYTES.SIZE_NORMAL, ...ESC_POS_BYTES.BOLD_OFF);

  if (receipt.paymentMethod) {
    pushText(bytes, pad("Paid via", String(receipt.paymentMethod).toUpperCase(), cols));
  }
  if (receipt.cashReceived > 0) {
    pushText(bytes, pad("Cash", money(receipt.cashReceived, currency), cols));
    pushText(bytes, pad("Change", money(receipt.changeGiven, currency), cols));
  }

  pushText(bytes);
  if (receipt.footer) {
    bytes.push(...ESC_POS_BYTES.ALIGN_CENTER);
    String(receipt.footer)
      .split("\n")
      .forEach((line) => pushText(bytes, line));
  }

  pushText(bytes);
  pushText(bytes);
  pushText(bytes);
  bytes.push(...ESC_POS_BYTES.CUT);

  if (receipt.kickDrawer) {
    bytes.push(...ESC_POS_BYTES.DRAWER_KICK_PIN2);
  }

  return new Uint8Array(bytes);
}

export function buildTestReceipt() {
  return buildEscposReceipt({
    header: "READY POS\nTest Receipt",
    orderNumber: "TEST-001",
    date: new Date().toLocaleString(),
    cashier: "Hardware Test",
    items: [{ name: "Printer connectivity", qty: 1, total: 0 }],
    subtotal: 0,
    total: 0,
    paymentMethod: "Test",
    footer: "Ready to print",
    paperWidth: 80,
  });
}
