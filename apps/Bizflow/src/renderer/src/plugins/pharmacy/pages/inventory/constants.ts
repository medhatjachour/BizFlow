import { ExpiryWindowDays, DisposalReason } from './types'

export const EXPIRY_WINDOW_OPTIONS: { labelKey: string; days: ExpiryWindowDays }[] = [
  { labelKey: 'phInvWindow7', days: 7 },
  { labelKey: 'phInvWindow30', days: 30 },
  { labelKey: 'phInvWindow60', days: 60 },
  { labelKey: 'phInvWindow90', days: 90 },
  { labelKey: 'phInvWindow180', days: 180 },
]

export const DISPOSAL_REASON_PRESETS: DisposalReason[] = [
  'Expired',
  'Damaged / Broken',
  'Manufacturer Recall',
  'Storage Temperature Violation',
  'Other',
]

/** Persisted disposal reasons stay in English; this maps them to UI labels. */
export const DISPOSAL_REASON_LABEL_KEYS: Record<string, string> = {
  'Expired': 'phInvReasonExpired',
  'Damaged / Broken': 'phInvReasonDamaged',
  'Manufacturer Recall': 'phInvReasonRecall',
  'Storage Temperature Violation': 'phInvReasonTemp',
  'Other': 'phInvReasonOther',
}
