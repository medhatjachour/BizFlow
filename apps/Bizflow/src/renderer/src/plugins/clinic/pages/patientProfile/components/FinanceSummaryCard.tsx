import React from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '../utils'
import type { PatientStats } from '../types'

interface Props {
  stats: PatientStats
}

export const FinanceSummaryCard: React.FC<Props> = ({ stats }) => {
  const { t } = useLanguage()
  const collectPct = stats.totalCharged > 0 ? Math.round((stats.totalPaid / stats.totalCharged) * 100) : 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5">
        {t('financeSummary')}
      </h3>
      
      <div className="flex items-center gap-6 mb-3 flex-wrap">
        <div>
          <div className="text-xs font-medium text-slate-400">{t('totalCharged')}</div>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatCurrency(stats.totalCharged)}</div>
        </div>
        <div className="text-xl text-slate-300 dark:text-slate-600">→</div>
        <div>
          <div className="text-xs font-medium text-slate-400">{t('totalPaid')}</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalPaid)}</div>
        </div>
        {stats.outstanding > 0 && (
          <>
            <div className="text-xl text-slate-300 dark:text-slate-600">=</div>
            <div>
              <div className="text-xs font-medium text-slate-400">{t('outstanding')}</div>
              <div className="text-lg font-bold text-red-500 dark:text-red-400">{formatCurrency(stats.outstanding)}</div>
            </div>
          </>
        )}
      </div>

      <div className="h-2.5 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, collectPct)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-xs font-medium text-slate-400">
        <span>{collectPct}% {t('collected')}</span>
        {stats.outstanding > 0 && (
          <span className="text-red-500 font-semibold">{formatCurrency(stats.outstanding)} due</span>
        )}
      </div>
    </div>
  )
}