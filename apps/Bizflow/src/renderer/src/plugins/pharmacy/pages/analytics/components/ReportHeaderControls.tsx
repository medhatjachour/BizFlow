import React from 'react'
import { Calendar, Download, RefreshCw } from 'lucide-react'
import { ReportViewType, DateRange } from '../types'
import { DATE_PRESETS } from '../constants'
import { computePresetDateRange } from '../utils'
import { inputCls } from '../../components/_shared'
import { Button } from '../../components/ui'

interface ReportHeaderControlsProps {
  view: ReportViewType
  range: DateRange
  loading: boolean
  onViewChange: (v: ReportViewType) => void
  onRangeChange: (r: DateRange) => void
  onExport: () => void
  onRefresh: () => void
}

export const ReportHeaderControls: React.FC<ReportHeaderControlsProps> = ({
  view,
  range,
  loading,
  onViewChange,
  onRangeChange,
  onExport,
  onRefresh,
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xs">
      {/* View Tabs */}
      <div className="inline-flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
        <button
          onClick={() => onViewChange('sales')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            view === 'sales'
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Sales & P&L
        </button>
        <button
          onClick={() => onViewChange('inventory')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            view === 'inventory'
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Inventory & Valuation
        </button>
      </div>

      {/* Date Filters (for Sales/Financial view) */}
      <div className="flex items-center gap-2 flex-wrap">
        {view === 'sales' && (
          <>
            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.preset}
                  onClick={() => onRangeChange(computePresetDateRange(p.preset))}
                  className="px-2 py-1 text-[11px] font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar size={13} className="text-slate-400" />
              <input
                type="date"
                value={range.from}
                onChange={e => onRangeChange({ ...range, from: e.target.value })}
                className={`${inputCls} py-0.5 px-1 text-xs w-auto border-none bg-transparent`}
              />
              <span className="text-slate-400 text-xs">–</span>
              <input
                type="date"
                value={range.to}
                onChange={e => onRangeChange({ ...range, to: e.target.value })}
                className={`${inputCls} py-0.5 px-1 text-xs w-auto border-none bg-transparent`}
              />
            </div>
          </>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          title="Refresh Data"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-500' : ''} />
        </button>

        <Button variant="secondary" size="sm" icon={Download} onClick={onExport}>
          Export CSV
        </Button>
      </div>
    </div>
  )
}