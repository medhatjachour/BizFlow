/**
 * Format large numbers with K/M/B suffixes for better readability
 * @param value The number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.2K", "5.3M", "2.1B")
 */
export function formatLargeNumber(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value)
  if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`
  }
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`
  }
  if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`
  }
  return value.toLocaleString()
}

/**
 * Format currency with K/M/B suffixes
 * @param value The amount to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted currency string (e.g., "$1.2K", "$5.3M", "$2.1B")
 */
export function formatCurrency(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value)
  if (absValue >= 1e9) {
    return `$${(value / 1e9).toFixed(decimals)}B`
  }
  if (absValue >= 1e6) {
    return `$${(value / 1e6).toFixed(decimals)}M`
  }
  if (absValue >= 1e3) {
    return `$${(value / 1e3).toFixed(decimals)}K`
  }
  return `$${value.toLocaleString()}`
}
