import React from 'react'
import { Trash2, DollarSign } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { WasteSummary } from '../types'
import { WASTE_TYPES } from '../constants'
import { formatCurrency } from '../utils'

interface Props {
  summary: WasteSummary | null
}

export const WasteSummaryCards: React.FC<Props> = ({ summary }) => {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('bakeryTotalWasteCost') || 'Total Loss Cost'}
          </p>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
          {formatCurrency(summary?.totalCost ?? 0)}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('bakeryWasteEntries') || 'Logged Incidents'}
          </p>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Trash2 className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {summary?.totalEntries ?? 0}
        </p>
      </div>

      {WASTE_TYPES.slice(0, 2).map(wt => {
        const row = summary?.byWasteType?.find(r => r.wasteType === wt.value)
        const Icon = wt.icon
        return (
          <div
            key={wt.value}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {t(wt.labelKey) || wt.defaultLabel}
              </p>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {row ? formatCurrency(row._sum.cost ?? 0) : '$0.00'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {row ? `${row._count} incidents` : (t('bakeryWasteNoEntries') || 'No logs recorded')}
            </p>
          </div>
        )
      })}
    </div>
  )
}