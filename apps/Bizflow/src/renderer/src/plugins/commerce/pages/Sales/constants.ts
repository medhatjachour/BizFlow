/** Pagination and filter defaults for the Sales page */

export const ITEMS_PER_PAGE = 10
export const INSTALLMENT_ITEMS_PER_PAGE = 20

/** Default refund period (days). 0 = refunds disabled. Read from localStorage at runtime. */
export const DEFAULT_REFUND_PERIOD_DAYS = 30

/** How far back to load transactions on initial fetch (days) */
export const TRANSACTIONS_LOOKBACK_DAYS = 30

/** Debounce delay for installment search (ms) */
export const SEARCH_DEBOUNCE_MS = 300

/** Max rows when exporting installments */
export const EXPORT_INSTALLMENTS_LIMIT = 10000