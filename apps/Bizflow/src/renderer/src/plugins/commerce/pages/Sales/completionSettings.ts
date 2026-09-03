export const DEFAULT_SALE_COMPLETION_DELAY_DAYS = 7
export const SALE_COMPLETION_DELAY_STORAGE_KEY = 'bizflow:sales:completion-delay-days'

export function normalizeSaleCompletionDelay(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_SALE_COMPLETION_DELAY_DAYS
  return Math.min(Math.max(Math.trunc(parsed), 0), 365)
}

export function getSaleCompletionDelayDays(): number {
  return normalizeSaleCompletionDelay(
    localStorage.getItem(SALE_COMPLETION_DELAY_STORAGE_KEY)
  )
}

export function setSaleCompletionDelayDays(value: unknown): number {
  const delayDays = normalizeSaleCompletionDelay(value)
  localStorage.setItem(SALE_COMPLETION_DELAY_STORAGE_KEY, String(delayDays))
  return delayDays
}
