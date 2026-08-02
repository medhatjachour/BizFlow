import { Calendar } from 'lucide-react'
import { DatePreset } from '../types'
import { DATE_PRESETS } from '../constants'

interface DateRangePickerProps {
  from: string
  to: string
  activePreset: DatePreset
  onPresetChange: (preset: DatePreset) => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  t: (key: string) => string
}

export function DateRangePicker({
  from,
  to,
  activePreset,
  onPresetChange,
  onFromChange,
  onToChange,
  t,
}: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {DATE_PRESETS.map(preset => (
          <button
            key={preset.value}
            onClick={() => onPresetChange(preset.value)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activePreset === preset.value
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500/50 hover:text-emerald-600'
            }`}
          >
            <span className="mr-1.5">{preset.icon}</span>
            {t(preset.labelKey)}
          </button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="relative">
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={from}
            onChange={e => onFromChange(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <span className="text-slate-400 text-sm">→</span>
        <input
          type="date"
          value={to}
          onChange={e => onToChange(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
      </div>
    </div>
  )
}
