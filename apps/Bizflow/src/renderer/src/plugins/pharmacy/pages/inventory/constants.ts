import { ExpiryWindowDays, DisposalReason } from './types'

export const EXPIRY_WINDOW_OPTIONS: { label: string; days: ExpiryWindowDays }[] = [
  { label: '7 Days (Urgent)', days: 7 },
  { label: '30 Days (Month)', days: 30 },
  { label: '60 Days', days: 60 },
  { label: '90 Days (Quarter)', days: 90 },
  { label: '180 Days (Half-Year)', days: 180 },
]

export const DISPOSAL_REASON_PRESETS: DisposalReason[] = [
  'Expired',
  'Damaged / Broken',
  'Manufacturer Recall',
  'Storage Temperature Violation',
  'Other',
]