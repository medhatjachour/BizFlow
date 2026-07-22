import { CalendarRange, RefreshCw, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PRESETS } from '../constants'
import type { Preset, StatusFilter } from '../types'

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
  preset, onPreset, from, to, setFrom, setTo,
  statusFilter, setStatusFilter, onRefresh, onOpenShift, hasActiveShift,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {/* Title */}
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mr-auto">
        Shifts Operations
      </h2>

      {/* Preset pills */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => onPreset(p.value as Preset)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              preset === p.value
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <CalendarRange size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <span className="text-slate-400 text-xs">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        />
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
      >
        <option value="all">All Status</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
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
          Open Shift
        </button>
      )}
    </div>
  )
}
