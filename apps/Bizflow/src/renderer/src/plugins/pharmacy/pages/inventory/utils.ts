import { ExpiringBatchItem } from './types'

export function getUrgencyTier(days: number): {
  tone: 'expired' | 'urgent' | 'warning' | 'notice'
  badgeClass: string
  label: string
} {
  if (days < 0) {
    return {
      tone: 'expired',
      badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
      label: `Expired (${Math.abs(days)}d ago)`,
    }
  }
  if (days <= 7) {
    return {
      tone: 'urgent',
      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse',
      label: `${days} days left`,
    }
  }
  if (days <= 30) {
    return {
      tone: 'warning',
      badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      label: `${days} days left`,
    }
  }
  return {
    tone: 'notice',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    label: `${days} days left`,
  }
}

export function exportInventoryToCSV(batches: ExpiringBatchItem[]) {
  const headers = ['Product', 'Generic Formula', 'Batch #', 'Stock Qty', 'Unit', 'Cost Value', 'Expiry Date', 'Days Remaining', 'Status']
  const rows = batches.map(b => [
    b.product?.name || 'Unknown',
    b.product?.genericName || '',
    b.batchNumber || 'N/A',
    b.quantity,
    b.product?.unit || 'unit',
    b.value.toFixed(2),
    new Date(b.expiryDate).toLocaleDateString(),
    b.daysToExpiry,
    b.isExpired ? 'EXPIRED' : 'ACTIVE',
  ])
  return [headers, ...rows]
}