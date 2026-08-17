import React from 'react'
import { Stethoscope, Calendar, DollarSign, Banknote, TrendingUp, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '../utils'
import type { PatientStats, CheckResult, Session } from '../types'

interface Props {
  stats: PatientStats
  checkResults: CheckResult[]
  sessions: Session[]
  isDentistMode: boolean
  showResultsPanel: boolean
  showDentalPanel: boolean
  onToggleResults: () => void
  onToggleDental: () => void
  onOpenPayModal: () => void
}

export const PatientStatCards: React.FC<Props> = ({
  stats,
  checkResults,
  sessions,
  isDentistMode,
  showResultsPanel,
  showDentalPanel,
  onToggleResults,
  onToggleDental,
  onOpenPayModal
}) => {
  const { t } = useLanguage()
  const hasOutstanding = (stats.outstanding ?? 0) > 0
  const dentalChartsCount = sessions.filter((s) => s.dentalChart).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5  gap-3 sm:gap-4">
      {/* 1. Total Visits */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 text-teal-600 dark:text-teal-400">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {stats.totalSessions}
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">{t('totalVisits')}</div>
        </div>
      </div>

      {/* 2. Last Visit */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0 text-sky-600 dark:text-sky-400">
          <Calendar className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
            {stats.lastVisit
              ? new Date(stats.lastVisit).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : '–'}
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">{t('lastVisit')}</div>
        </div>
      </div>

      {/* 3. Balance / Outstanding */}
      <div
        className={`rounded-2xl p-4 border shadow-sm flex items-center gap-3.5 ${
          hasOutstanding
            ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
            : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
        }`}
      >
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            hasOutstanding
              ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <DollarSign className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-xl sm:text-2xl font-bold truncate leading-tight ${
              hasOutstanding ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {hasOutstanding ? stats.outstanding.toFixed(0) : '✓'}
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
            {hasOutstanding ? t('outstanding') : t('fullyPaid')}
          </div>
        </div>
        {hasOutstanding && (
          <button
            onClick={onOpenPayModal}
            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Banknote className="h-3.5 w-3.5" />
            Pay
          </button>
        )}
      </div>

      {/* 4. Total Paid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
            {stats.totalPaid > 0 ? formatCurrency(stats.totalPaid) : '–'}
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">{t('totalPaid')}</div>
        </div>
      </div>

      {/* 5. Check Results Toggle */}
      <button
        onClick={onToggleResults}
        className={`rounded-2xl p-4 border flex items-center gap-3.5 text-left transition-all ${
          showResultsPanel
            ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 shadow-sm ring-2 ring-rose-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-rose-300 dark:hover:border-rose-800/60 shadow-sm'
        }`}
      >
        <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0 text-rose-500 dark:text-rose-400">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {checkResults.length}
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">Check Results</div>
        </div>
        {checkResults.length > 0 &&
          (showResultsPanel ? (
            <ChevronUp className="h-4 w-4 text-rose-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          ))}
      </button>

      {/* 6. Dental Charts Toggle (Dentist Mode Only) */}
      {isDentistMode && (
        <button
          onClick={onToggleDental}
          className={`rounded-2xl p-4 border flex items-center gap-3.5 text-left transition-all ${
            showDentalPanel
              ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800 shadow-sm ring-2 ring-teal-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-teal-300 dark:hover:border-teal-800/60 shadow-sm'
          }`}
        >
          <div className="h-11 w-11 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 text-teal-600 dark:text-teal-400">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              {dentalChartsCount}
            </div>
            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">Dental Charts</div>
          </div>
          {dentalChartsCount > 0 &&
            (showDentalPanel ? (
              <ChevronUp className="h-4 w-4 text-teal-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            ))}
        </button>
      )}
    </div>
  )
}