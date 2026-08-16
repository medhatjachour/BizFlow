import React from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { SalesSummary } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  summary: SalesSummary | null
}

export const TopRevenueBreakdown: React.FC<Props> = ({ summary }) => {
  const { t } = useLanguage()

  if (!summary || !summary.byRecipe?.length || summary.totalRevenue <= 0) {
    return null
  }

  const totalRev = summary.totalRevenue

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-5 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        {t('bakerySaleTopItems') || 'Top Products by Revenue'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
        {summary.byRecipe.map((row, i) => {
          const pct = totalRev > 0 ? Math.round((row.totalAmount / totalRev) * 100) : 0
          return (
            <div key={row.recipeId ?? i} className="group">
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                  {row.recipe?.name || (t('bakerySaleOther') || 'Custom Sale')}
                </span>
                <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0 ml-2">
                  ${formatCurrency(row.totalAmount)} · {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}