import { DateRangePreset } from './types'

export const DATE_PRESETS: { labelKey: string; preset: DateRangePreset }[] = [
  { labelKey: 'phAnPresetToday', preset: 'today' },
  { labelKey: 'phAnPresetYesterday', preset: 'yesterday' },
  { labelKey: 'phAnPresetWeek', preset: 'week' },
  { labelKey: 'phAnPresetMonth', preset: 'month' },
  { labelKey: 'phAnPresetQuarter', preset: 'quarter' },
  { labelKey: 'phAnPresetYear', preset: 'year' },
]