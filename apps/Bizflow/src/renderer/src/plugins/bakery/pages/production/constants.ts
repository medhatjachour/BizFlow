import { LossReason } from './types'

export const BATCH_QTY_PRESETS = [0.5, 1, 2, 3, 5, 10]

export const LOSS_REASONS: { key: LossReason; label: string; icon: string }[] = [
  { key: 'expired', label: 'Expired Date', icon: '🕐' },
  { key: 'shrinkage', label: 'Bake Shrinkage / Test', icon: '📉' },
  { key: 'damaged', label: 'Handling Damage', icon: '💥' },
  { key: 'other', label: 'Other Reason', icon: '📝' },
]

export const PRODUCTION_PAGE_SIZES = [10, 20, 50, 100]