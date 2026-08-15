import { PosFilterType } from './types'

export const POS_FILTER_OPTIONS: { key: PosFilterType; labelKey: string; defaultLabel: string }[] = [
  { key: '', labelKey: 'bakerySaleFilterAll', defaultLabel: 'All Products' },
  { key: 'expiring', labelKey: 'bakerySaleFilterExpiring', defaultLabel: '⚠️ Expiring Soon' },
  { key: 'noprice', labelKey: 'bakerySaleFilterNoPrice', defaultLabel: 'No Price Set' },
]

export const QTY_QUICK_PRESETS = [1, 2, 5, 10]
export const HISTORY_PAGE_SIZES = [10, 20, 50, 100]