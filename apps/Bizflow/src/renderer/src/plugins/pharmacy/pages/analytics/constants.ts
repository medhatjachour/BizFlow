import { DateRangePreset } from './types'

export const DATE_PRESETS: { label: string; preset: DateRangePreset }[] = [
  { label: 'Today', preset: 'today' },
  { label: 'Yesterday', preset: 'yesterday' },
  { label: '7 Days', preset: 'week' },
  { label: '30 Days', preset: 'month' },
  { label: 'Quarter (90d)', preset: 'quarter' },
  { label: 'Full Year', preset: 'year' },
]