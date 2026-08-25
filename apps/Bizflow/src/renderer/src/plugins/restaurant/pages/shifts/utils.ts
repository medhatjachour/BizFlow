export function formatCurrency(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`
}

export function formatShiftDuration(openedAt: string, closedAt?: string | null): string {
  const start = new Date(openedAt).getTime()
  const end = closedAt ? new Date(closedAt).getTime() : Date.now()
  const diffMins = Math.max(0, Math.floor((end - start) / 60000))

  const hrs = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hrs}h ${mins}m`
}

export function calculateCashDiscrepancy(
  startCash: number,
  cashSales: number,
  countedCash: number
): { expected: number; variance: number; isShort: boolean; isOver: boolean } {
  const expected = startCash + cashSales
  const variance = countedCash - expected
  return {
    expected,
    variance,
    isShort: variance < 0,
    isOver: variance > 0
  }
}