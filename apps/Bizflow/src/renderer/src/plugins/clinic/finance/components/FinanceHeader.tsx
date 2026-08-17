import React from 'react'
import { Stethoscope, RefreshCcw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PERIOD_DEFINITIONS } from '../constants'
import type { Period } from '../types'

interface Props {
  period: Period
  loading: boolean
  onSelectPeriod: (p: Period) => void
  onRefresh: () => void
}

export const FinanceHeader: React.FC<Props> = ({
  period,
  loading,
  onSelectPeriod,
  onRefresh
}) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
      {/* Title + Branding */}
      <div className="flex items-center gap-3.5">
        <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-sm shadow-teal-500/30 text-white shrink-0">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            {t('clinicFinanceTitle') || 'Clinic Financial Management'}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {t('clinicFinanceSubtitle') || 'Cashflow realization, patient debt recovery, and inventory valuation'}
          </p>
        </div>
      </div>

      {/* Shared Period Switcher + Refresh Action */}
      <div className="flex items-center gap-2 shrink-0 ms-auto">
        <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
          {PERIOD_DEFINITIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSelectPeriod(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === key
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-xs"
          title={t('refreshLabel') || 'Refresh finances'}
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin text-teal-500' : ''}`} />
        </button>
      </div>
    </div>
  )
}