export function formatCurrency(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`
}

export function isStockLow(currentStock: number, minStockAlert: number): boolean {
  return currentStock <= minStockAlert
}