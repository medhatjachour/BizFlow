import React from 'react'
import { PieChart } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { CATEGORY_BADGES, CATEGORY_BAR_COLORS } from '../constants'
import { getCategoryLabel, formatMoney } from '../utils'
import type { CategoryExpenseSummary } from '../types'

interface Props {
  breakdown: CategoryExpenseSummary[]
  totalExpenses: number
}

export const CategoryBreakdownCard: React.FC<Props> = ({ breakdown, totalExpenses }) => {
  const { t, language } = useLanguage()
  const maxCategoryTotal = Math.max(...breakdown.map((c) => c.total), 1)

  if (breakdown.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="h-4 w-4 text-slate-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('expenseCategory') || 'Category Breakdown'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {breakdown.map(({ category, total }) => {
          const sharePct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0
          const barWidth = Math.min(100, Math.round((total / maxCategoryTotal) * 100))

          return (
            <div
              key={category}
              className="p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${
                    CATEGORY_BADGES[category] ?? CATEGORY_BADGES.other
                  }`}
                >
                  {getCategoryLabel(category, language)}
                </span>
                <div className="text-end">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    ${formatMoney(total)}
                  </span>
                  <span className="text-[10px] text-slate-400 ms-1.5">({sharePct}%)</span>
                </div>
              </div>

              <div className="h-2 rounded-full bg-slate-200/70 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: CATEGORY_BAR_COLORS[category] ?? CATEGORY_BAR_COLORS.other
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}