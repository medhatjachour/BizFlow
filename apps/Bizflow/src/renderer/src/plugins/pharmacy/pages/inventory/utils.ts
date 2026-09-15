import { ExpiringBatchItem } from './types'
import { unitLabelKey } from '../components/units'

type TranslateFn = (key: string, params?: Record<string, any>) => string

export function getUrgencyTier(days: number, t: TranslateFn): {
  tone: 'expired' | 'urgent' | 'warning' | 'notice'
  badgeClass: string
  label: string
} {
  if (days < 0) {
    return {
      tone: 'expired',
      badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
      label: t('phInvExpiredDaysAgo', { days: Math.abs(days) }),
    }
  }
  if (days <= 7) {
    return {
      tone: 'urgent',
      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse',
      label: t('phInvDaysLeft', { days }),
    }
  }
  if (days <= 30) {
    return {
      tone: 'warning',
      badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      label: t('phInvDaysLeft', { days }),
    }
  }
  return {
    tone: 'notice',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    label: t('phInvDaysLeft', { days }),
  }
}

export function exportInventoryToCSV(batches: ExpiringBatchItem[], t: TranslateFn) {
  const headers = [
    t('phInvCsvProduct'), t('phInvCsvFormula'), t('phInvCsvBatchNo'), t('phInvCsvStockQty'),
    t('phInvCsvUnit'), t('phInvCsvCostValue'), t('phInvCsvExpiryDate'), t('phInvCsvDaysRemaining'),
    t('phInvCsvStatus'),
  ]
  const rows = batches.map(b => [
    b.product?.name || t('phInvCsvUnknown'),
    b.product?.genericName || '',
    b.batchNumber || t('phNa'),
    b.quantity,
    b.product?.unit ? t(unitLabelKey(b.product.unit)) : t('phUnitUnit'),
    b.value.toFixed(2),
    new Date(b.expiryDate).toLocaleDateString(),
    b.daysToExpiry,
    b.isExpired ? t('phInvCsvExpired') : t('phInvCsvActive'),
  ])
  return [headers, ...rows]
}