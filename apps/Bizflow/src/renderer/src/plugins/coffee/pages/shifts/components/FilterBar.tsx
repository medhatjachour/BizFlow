import { CalendarRange, RefreshCw, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PRESETS } from '../constants'
import type { Preset, StatusFilter } from '../types'
import CustomSelect from '@renderer/components/ui/CustomSelect'

interface Props {
  preset: Preset
  onPreset: (p: Preset) => void
  from: string
  to: string
  setFrom: (v: string) => void
  setTo: (v: string) => void
  statusFilter: StatusFilter
  setStatusFilter: (s: StatusFilter) => void
  onRefresh: () => void
  onOpenShift: () => void
  hasActiveShift: boolean
}

export function FilterBar({
  preset,
  onPreset,
  from,
  to,
  setFrom,
  setTo,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onOpenShift,
  hasActiveShift
}: Props) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {/* Title */}

      {/* Preset pills */}
      <div className="flex items-center gap-2 rounded-lg">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPreset(p.value as Preset)}
            className={`px-3 py-2 rounded-xl text-md font-medium transition-colors  ${
              preset === p.value
                ? 'bg-amber-500 text-white shadow-sm '
                : 'text-slate-600 dark:text-slate-400 dark:bg-slate-800 bg-gray-200 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <CalendarRange
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="pl-8 pr-2 py-1.5 text-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <span className="text-slate-400 text-xs">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-2 py-1.5 text-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        />
      </div>

      {/* Status filter */}
      <div className="min-w-[140px]">
        <CustomSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' }
          ]}
        />
      </div>
      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="p-5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-white hover:bg-amber-600 dark:hover:border-amber-300 transition-colors"
        title="Refresh"
      >
        <RefreshCw size={14} />
      </button>

      {/* Open Shift button */}
      {!hasActiveShift && (
        <button
          onClick={onOpenShift}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
        >
          <Plus size={14} />
          {t('cfOpenNewShift') || ''}
        </button>
      )}
    </div>
  )
}
