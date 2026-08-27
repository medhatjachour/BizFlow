export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime()
  if (isNaN(target)) return 0
  return Math.floor((target - Date.now()) / 86_400_000)
}

export function roundDecimal(value: number, decimals = 4): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function trimQty(n: number): string {
  return String(roundDecimal(n, 4))
}

export function remainingDisplay(
  qty: number,
  unit: string,
  subUnit?: string | null,
  subUnitsPerContainer?: number | null
): { value: string; unit: string; secondary: string | null; isSub: boolean } {
  const canSub = Boolean(subUnit && subUnitsPerContainer && subUnitsPerContainer > 0)
  if (canSub && qty > 0 && qty < 1) {
    return {
      value: trimQty(qty * (subUnitsPerContainer as number)),
      unit: subUnit as string,
      secondary: `${trimQty(qty)} ${unit}`,
      isSub: true
    }
  }
  return { value: trimQty(qty), unit, secondary: null, isSub: false }
}

export function getFefoBatch(batches: import('./types').BatchLite[]): import('./types').BatchLite | null {
  return (
    [...batches]
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0) ?? null
  )
}