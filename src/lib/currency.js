/**
 * Currency utility to format prices according to WooCommerce configuration.
 */

/**
 * Decode HTML entities in currency symbol
 * Note: The symbol is already decoded by PHP (html_entity_decode in Admin.php)
 * but this provides a fallback for any edge cases
 */
const decodeHtmlEntities = (text) => {
  if (typeof text !== 'string') return text;
  
  // Create a temporary element to decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const getCurrencyConfig = () => {
  if (typeof readyPosAdmin !== "undefined" && readyPosAdmin.currency) {
    // The symbol is already decoded by PHP, but decode again as fallback
    const config = { ...readyPosAdmin.currency };
    config.symbol = decodeHtmlEntities(config.symbol);
    
    // Debug log to see what we're getting
    console.log('[ReadyPOS Currency]', {
      symbol: config.symbol,
      position: config.position,
      originalSymbol: readyPosAdmin.currency.symbol
    });
    
    return config;
  }

  return {
    symbol: "$",
    code: "USD",
    position: "left",
    decimals: 2,
    thousand: ",",
    decimal: ".",
  };
};

/**
 * Format a number to currency string.
 *
 * @param {number|string} amount Amount to format.
 * @returns {string}
 */
export const formatPrice = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "";

  const config = getCurrencyConfig();

  // Format number decimals
  const formattedNum = num.toFixed(config.decimals);
  const parts = formattedNum.split(".");

  // Apply thousand separator
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousand);

  const joinedNum = parts.join(config.decimal);

  // Position symbol with proper spacing for better UX
  switch (config.position) {
    case "left":
      // Add space after symbol for better readability (e.g., "৳ 500" instead of "৳500")
      return `${config.symbol} ${joinedNum}`;
    case "right":
      // Add space before symbol for better readability (e.g., "500 ৳" instead of "500৳")
      return `${joinedNum} ${config.symbol}`;
    case "left_space":
      return `${config.symbol} ${joinedNum}`;
    case "right_space":
      return `${joinedNum} ${config.symbol}`;
    default:
      return `${config.symbol} ${joinedNum}`;
  }
};

/**
 * Get the current currency symbol.
 *
 * @returns {string}
 */
export const getCurrencySymbol = () => {
  return getCurrencyConfig().symbol;
};
