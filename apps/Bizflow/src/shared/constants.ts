/**
 * Shared Constants
 * Application-wide constants and configuration values
 */

// Barcode validation patterns
export const BARCODE_PATTERNS = {
  // Matches standard barcodes (8-13 digits)
  NUMERIC: /^\d{8,13}$/,
  // Matches custom BAR prefix format
  PREFIX: (value: string) => value.startsWith('BAR'),
  // Combined check for any barcode pattern
  isBarcode: (value: string) => 
    value.startsWith('BAR') || /^\d{8,13}$/.test(value)
} as const

// Product cost calculation
export const PRODUCT_DEFAULTS = {
  // Default cost as percentage of price when not specified
  COST_TO_PRICE_RATIO: 0.6, // 60% of price
  calculateDefaultCost: (price: number) => price * 0.6
} as const

// Search configuration
export const SEARCH_CONFIG = {
  // Debounce times in milliseconds
  BARCODE_DEBOUNCE: 0,    // Instant for barcodes
  TEXT_DEBOUNCE: 100,      // 100ms for text search
  
  // Result limits
  BARCODE_RESULT_LIMIT: 5,
  TEXT_RESULT_LIMIT: 30,
  
  // Feature flags
  ENRICH_DATA_DEFAULT: false // Disabled for speed
} as const
