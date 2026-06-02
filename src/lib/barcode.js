/**
 * Barcode generation utility for Ready POS.
 *
 * Generates Code 128 barcodes as SVG strings for printing on receipts,
 * product labels, and gift cards. Uses a pure-JS implementation with no
 * external dependencies.
 */

// Code 128B character set encoding table
const CODE128B_START = 104;
const CODE128_STOP = 106;

const CODE128B_PATTERNS = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  "1100011101011",
];

/**
 * Encode a string as Code 128B barcode pattern.
 *
 * @param {string} text The text to encode.
 * @returns {string} Binary pattern string (1 = bar, 0 = space).
 */
function encodeCode128B(text) {
  let checksum = CODE128B_START;
  let pattern = CODE128B_PATTERNS[CODE128B_START]; // Start B

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) - 32;
    if (charCode < 0 || charCode > 95) continue; // Skip unsupported chars
    pattern += CODE128B_PATTERNS[charCode];
    checksum += charCode * (i + 1);
  }

  // Checksum
  pattern += CODE128B_PATTERNS[checksum % 103];
  // Stop
  pattern += CODE128B_PATTERNS[CODE128_STOP];

  return pattern;
}

/**
 * Generate an SVG barcode string.
 *
 * @param {string} text Text to encode.
 * @param {object} options Configuration options.
 * @param {number} options.width Total SVG width in px (default 200).
 * @param {number} options.height Barcode height in px (default 60).
 * @param {boolean} options.showText Show text below barcode (default true).
 * @param {string} options.color Bar color (default "#000").
 * @returns {string} SVG markup string.
 */
export function generateBarcodeSVG(text, options = {}) {
  const { width = 200, height = 60, showText = true, color = "#000" } = options;

  if (!text || text.length === 0) return "";

  const pattern = encodeCode128B(text);
  const barWidth = width / pattern.length;
  const textHeight = showText ? 14 : 0;
  const totalHeight = height + textHeight;

  let bars = "";
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "1") {
      bars += `<rect x="${
        i * barWidth
      }" y="0" width="${barWidth}" height="${height}" fill="${color}"/>`;
    }
  }

  let textEl = "";
  if (showText) {
    textEl = `<text x="${width / 2}" y="${
      height + 11
    }" text-anchor="middle" font-family="monospace" font-size="10" fill="${color}">${text}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">${bars}${textEl}</svg>`;
}

/**
 * Generate a barcode as a data URL for embedding in images or printing.
 *
 * @param {string} text Text to encode.
 * @param {object} options Same as generateBarcodeSVG.
 * @returns {string} Data URL (image/svg+xml).
 */
export function generateBarcodeDataURL(text, options = {}) {
  const svg = generateBarcodeSVG(text, options);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Print a barcode label directly to a new window.
 *
 * @param {string} text Text to encode.
 * @param {object} meta Additional label info.
 * @param {string} meta.title Product name or label title.
 * @param {string} meta.price Price string.
 * @param {string} meta.sku SKU code.
 */
export function printBarcodeLabel(text, meta = {}) {
  const svg = generateBarcodeSVG(text, {
    width: 250,
    height: 50,
    showText: true,
  });

  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Barcode Label</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Arial', sans-serif; }
                .label {
                    width: 280px;
                    padding: 12px 16px;
                    text-align: center;
                    border: 1px dashed #ccc;
                    margin: 10px auto;
                }
                .label-title { font-size: 11px; font-weight: bold; margin-bottom: 4px; }
                .label-price { font-size: 14px; font-weight: 900; margin-bottom: 6px; }
                .label-sku { font-size: 9px; color: #666; margin-top: 4px; }
                .barcode-svg { margin: 4px auto; }
                @media print {
                    body { margin: 0; }
                    .label { border: none; padding: 4px 8px; }
                }
            </style>
        </head>
        <body>
            <div class="label">
                ${
                  meta.title
                    ? `<div class="label-title">${meta.title}</div>`
                    : ""
                }
                ${
                  meta.price
                    ? `<div class="label-price">${meta.price}</div>`
                    : ""
                }
                <div class="barcode-svg">${svg}</div>
                ${
                  meta.sku
                    ? `<div class="label-sku">SKU: ${meta.sku}</div>`
                    : ""
                }
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

  const printWindow = window.open("", "_blank", "width=350,height=300");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
