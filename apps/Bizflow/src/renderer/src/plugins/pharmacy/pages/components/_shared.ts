// Shared helpers for the pharmacy renderer pages.

export const pharma = () => (window as any).api?.pharmacy

export const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const int = (n: number) => (Number(n) || 0).toLocaleString('en-US')

export function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export const PAY_BADGE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unpaid: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
}

export const SALE_STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  refunded: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  partially_refunded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

export const PO_STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
}

export const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'

export function expiryTone(days: number): string {
  if (days < 0) return 'text-red-600 dark:text-red-400'
  if (days <= 30) return 'text-amber-600 dark:text-amber-400'
  if (days <= 90) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-slate-500 dark:text-slate-400'
}
