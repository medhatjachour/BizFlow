import React from 'react'
import { TrendingUp, TrendingDown, Receipt, AlertCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatMoney } from '../utils'
import type { ExpenseSummary } from '../types'

interface Props {
  summary: ExpenseSummary | null
}

export const ExpenseKpiGrid: React.FC<Props> = ({ summary }) => {
  const { t } = useLanguage()
  const netIncome = summary?.netIncome ?? 0
  const isNetPositive = netIncome >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* Revenue */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
        <div className="h-12 w-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
            {t('revenue') || 'Total Revenue'}
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
            ${formatMoney(summary?.revenue)}
          </p>
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
        <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <Receipt className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
            {t('totalExpenses') || 'Total Expenses'}
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 truncate mt-0.5">
            ${formatMoney(summary?.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Net Income */}
      <div
        className={`rounded-3xl border p-4 sm:p-5 shadow-xs flex items-center gap-3.5 ${
          isNetPositive
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
        }`}
      >
        <div
          className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
            isNetPositive
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
          }`}
        >
          {isNetPositive ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
            {t('netIncome') || 'Net Income'}
          </p>
          <p
            className={`text-lg sm:text-xl font-extrabold truncate mt-0.5 ${
              isNetPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            ${formatMoney(netIncome)}
          </p>
        </div>
      </div>

      {/* Outstanding Balances */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
        <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
            {t('outstanding') || 'Due Receivables'}
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 truncate mt-0.5">
            ${formatMoney(summary?.outstanding)}
          </p>
        </div>
      </div>
    </div>
  )
}