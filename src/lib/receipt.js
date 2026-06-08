/**
 * Thermal Receipt Printing Utility for Ready POS.
 */

import { formatPrice } from "./currency";
import { toast } from "sonner";

/**
 * Print a receipt based on WooCommerce order details.
 *
 * @param {object} order Order details.
 * @param {object} settings POS Receipt settings.
 */
const code39Map = {
  0: "1010011011010",
  1: "1101001010110",
  2: "1011001010110",
  3: "1101100101010",
  4: "1010011010110",
  5: "1101001101010",
  6: "1011001101010",
  7: "1010010110110",
  8: "1101001011010",
  9: "1011001011010",
  A: "1101010010110",
  B: "1011010010110",
  C: "1101101001010",
  D: "1010110010110",
  E: "1101011001010",
  F: "1011011001010",
  G: "1010100110110",
  H: "1101010011010",
  I: "1011010011010",
  J: "1010110011010",
  K: "1101010100110",
  L: "1011010100110",
  M: "1101101010010",
  N: "1010110100110",
  O: "1101011010010",
  P: "1011011010010",
  Q: "1010101100110",
  R: "1101010110010",
  S: "1011010110010",
  T: "1010110110010",
  U: "1100101010110",
  V: "1001101010110",
  W: "1100110101010",
  X: "1001011010110",
  Y: "1100101101010",
  Z: "1001101101010",
  "-": "1001010110110",
  ".": "1100101011010",
  " ": "1001101011010",
  "*": "1001011011010",
};

const generateBarcodeSvg = (data) => {
  const cleanData = data
    .toString()
    .toUpperCase()
    .replace(/[^0-9A-Z\-\.\s]/g, "");
  const upperData = `*${cleanData}*`;
  let result = "";
  for (let i = 0; i < upperData.length; i++) {
    const char = upperData[i];
    const pattern = code39Map[char] || code39Map[" "];
    result += pattern + "0";
  }

  let svgHtml = `<svg viewBox="0 0 ${
    result.length * 2
  } 40" width="100%" height="40" xmlns="http://www.w3.org/2000/svg">`;
  svgHtml += `<g fill="#000">`;
  for (let x = 0; x < result.length; x++) {
    if (result[x] === "1") {
      svgHtml += `<rect x="${x * 2}" y="0" width="2" height="40" />`;
    }
  }
  svgHtml += `</g></svg>`;
  return svgHtml;
};

const getCashDrawerKickBytes = (brand) => {
  switch (brand) {
    case "epson":
      return "\u001b\u0070\u0000\u0019\u00fa";
    case "star":
      return "\u001b\u0007";
    case "generic":
      return "\u0007";
    default:
      return "";
  }
};

/**
 * Print a receipt based on WooCommerce order details.
 *
 * @param {object} order Order details.
 * @param {object} settings POS Receipt settings.
 */
export const printReceipt = (order, settings = {}) => {
  const logoHtml = settings.receipt_logo
    ? `<div class="logo"><img src="${settings.receipt_logo}" alt="Store Logo" /></div>`
    : "";

  const headerHtml = settings.receipt_header
    ? `<div class="header-text">${settings.receipt_header.replace(
        /\n/g,
        "<br/>",
      )}</div>`
    : "<h3>Store Receipt</h3>";

  const footerHtml = settings.receipt_footer
    ? `<div class="footer-text">${settings.receipt_footer.replace(
        /\n/g,
        "<br/>",
      )}</div>`
    : "<p>Thank you for shopping!</p>";

  const dateStr = order.date || new Date().toLocaleString();
  const cashierName =
    order.cashier_name ||
    (typeof readypos_admin !== "undefined"
      ? readypos_admin.userInfo.username
      : "Cashier");

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr class="item-row">
            <td class="item-name">${item.name}</td>
            <td class="item-qty">${item.quantity}</td>
            <td class="item-total">${formatPrice(item.total)}</td>
        </tr>
    `,
    )
    .join("");

  const orderIdToEncode = order.order_number || order.id || `POS-${Date.now()}`;
  const barcodeHtml =
    settings.print_barcode !== "no"
      ? `<div class="receipt-barcode">
            ${generateBarcodeSvg(orderIdToEncode)}
            <div class="barcode-text">${orderIdToEncode}</div>
           </div>`
      : "";

  const kickCommand = getCashDrawerKickBytes(settings.cash_drawer_pulse);

  const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt #${orderIdToEncode}</title>
            <style>
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    width: 80mm; /* Standard 3-inch thermal printer width */
                    margin: 0;
                    padding: 5mm;
                    color: #000;
                    background: #fff;
                }
                .logo {
                    text-align: center;
                    margin-bottom: 5px;
                }
                .logo img {
                    max-width: 50mm;
                    max-height: 20mm;
                    object-fit: contain;
                }
                .header-text, h3 {
                    text-align: center;
                    margin: 5px 0;
                    font-weight: bold;
                }
                .meta-info {
                    border-bottom: 1px dashed #000;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                }
                .meta-info table {
                    width: 100%;
                }
                .meta-info td {
                    font-size: 11px;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 5px;
                }
                .items-table th {
                    border-bottom: 1px solid #000;
                    text-align: left;
                    font-size: 11px;
                    padding-bottom: 2px;
                }
                .items-table th.qty-col, .items-table td.item-qty {
                    text-align: center;
                    width: 15%;
                }
                .items-table th.total-col, .items-table td.item-total {
                    text-align: right;
                    width: 30%;
                }
                .item-row td {
                    padding: 3px 0;
                    vertical-align: top;
                }
                .totals-section {
                    border-top: 1px dashed #000;
                    padding-top: 5px;
                    margin-bottom: 10px;
                }
                .totals-table {
                    width: 100%;
                }
                .totals-table td {
                    padding: 2px 0;
                }
                .totals-table td.label {
                    text-align: left;
                }
                .totals-table td.val {
                    text-align: right;
                    font-weight: bold;
                }
                .totals-table tr.grand-total {
                    font-size: 14px;
                    border-top: 1px solid #000;
                }
                .footer-text {
                    text-align: center;
                    margin-top: 10px;
                    border-top: 1px dashed #000;
                    padding-top: 10px;
                    font-size: 11px;
                }
                .receipt-barcode {
                    text-align: center;
                    margin-top: 15px;
                    margin-bottom: 5px;
                    padding-top: 10px;
                    border-top: 1px dashed #000;
                }
                .barcode-text {
                    font-family: monospace;
                    font-size: 10px;
                    letter-spacing: 2px;
                    margin-top: 3px;
                    text-align: center;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            ${
              kickCommand
                ? `<span style="display:none;">${kickCommand}</span>`
                : ""
            }
            ${logoHtml}
            ${headerHtml}
            
            <div class="meta-info">
                <table>
                    <tr>
                        <td><strong>Date:</strong></td>
                        <td style="text-align: right;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td><strong>Receipt #:</strong></td>
                        <td style="text-align: right;">#${orderIdToEncode}</td>
                    </tr>
                    <tr>
                        <td><strong>Cashier:</strong></td>
                        <td style="text-align: right;">${cashierName}</td>
                    </tr>
                </table>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="qty-col">Qty</th>
                        <th class="total-col">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="val">${formatPrice(
                          order.subtotal || order.total - (order.tax || 0),
                        )}</td>
                    </tr>
                    ${
                      order.discount > 0
                        ? `
                    <tr>
                        <td class="label">Discount:</td>
                        <td class="val">-${formatPrice(order.discount)}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      order.tax > 0
                        ? `
                    <tr>
                        <td class="label">Tax:</td>
                        <td class="val">${formatPrice(order.tax)}</td>
                    </tr>`
                        : ""
                    }
                    <tr class="grand-total">
                        <td class="label" style="padding-top: 5px;">TOTAL:</td>
                        <td class="val" style="padding-top: 5px;">${formatPrice(
                          order.total,
                        )}</td>
                    </tr>
                    ${
                      order.cash_received > 0
                        ? `
                    <tr style="font-size: 11px; color: #555;">
                        <td class="label">Cash Received:</td>
                        <td class="val">${formatPrice(order.cash_received)}</td>
                    </tr>
                    <tr style="font-size: 11px; color: #555;">
                        <td class="label">Change:</td>
                        <td class="val">${formatPrice(order.change_given)}</td>
                    </tr>
                    `
                        : ""
                    }
                </table>
            </div>

            ${footerHtml}
            ${barcodeHtml}
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `;

  // Open a new window and write receipt code to it
  const printWindow = window.open("", "_blank", "width=600,height=800");
  if (printWindow) {
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  } else {
    toast.error("Pop-up blocker is enabled. Please allow popups to print receipts.");
  }
};
