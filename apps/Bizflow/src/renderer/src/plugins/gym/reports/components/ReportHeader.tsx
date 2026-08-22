import React from 'react'
import { Dumbbell, Download, Calendar, RefreshCcw } from 'lucide-react'
import { ReportPeriod, GymReportStats, GymSessionRecord } from '../types'
import { REPORT_PERIOD_OPTIONS } from '../constants'
import { downloadGymReportCSV } from '../utils'

interface Props {
  period: ReportPeriod
  onPeriodChange: (p: ReportPeriod) => void
  selectedDate: string
  onDateChange: (date: string) => void
  onRefresh: () => void
  loading: boolean
  stats: GymReportStats | null
  sessions: GymSessionRecord[]
}

export const ReportHeader: React.FC<Props> = ({
  period,
  onPeriodChange,
  selectedDate,
  onDateChange,
  onRefresh,
  loading,
  stats,
  sessions
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
      {/* Brand & Context Title */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 rounded-2xl border border-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm">
          <Dumbbell size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Gym Intelligence & Daily Audits
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              Live Plugin
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Attendance check-ins, memberships expiring, walk-ins, and financial revenue flows.
          </p>
        </div>
      </div>

      {/* Dynamic Controls Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Quick Period Buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
          {REPORT_PERIOD_OPTIONS.map((item) => (
            <button
              key={item.value}
              onClick={() => onPeriodChange(item.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === item.value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Day Picker */}
        <div className="relative flex items-center">
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            <Calendar size={13} />
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all shadow-sm"
          />
        </div>

        {/* Export CSV Button */}
        <button
          onClick={() => downloadGymReportCSV(stats, sessions, period, selectedDate)}
          disabled={!stats || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm disabled:opacity-40"
        >
          <Download size={13} />
          <span>Export</span>
        </button>

        {/* Reload button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin text-orange-500' : ''} />
        </button>
      </div>
    </div>
  )
}