/**
 * Currency utility to format prices according to WooCommerce configuration.
 */

const getCurrencyConfig = () => {
  if (typeof readyPosAdmin !== "undefined" && readyPosAdmin.currency) {
    return readyPosAdmin.currency;
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

  // Position symbol
  switch (config.position) {
    case "left":
      return `${config.symbol}${joinedNum}`;
    case "right":
      return `${joinedNum}${config.symbol}`;
    case "left_space":
      return `${config.symbol} ${joinedNum}`;
    case "right_space":
      return `${joinedNum} ${config.symbol}`;
    default:
      return `${config.symbol}${joinedNum}`;
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
