import React from 'react'
import { FolderTree } from 'lucide-react'
import { CategoryValuationMetric } from '../types'
import { money } from '../../components/_shared'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface CategoryValuationDistributionProps {
  categories: CategoryValuationMetric[]
}

export const CategoryValuationDistribution: React.FC<CategoryValuationDistributionProps> = ({
  categories,
}) => {
  const { t } = useLanguage()

  if (!categories || categories.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <p className="text-xs">{t('phAnNoCategorizedRecords')}</p>
      </div>
    )
  }

  const maxVal = categories[0]?.value || 1

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree size={16} className="text-teal-500" />
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">
            {t('phStockByCategory')}
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">
          {t('phAnCategoriesCount', { count: categories.length })}
        </span>
      </div>

      <div className="space-y-2.5">
        {categories.map((c, i) => {
          const pct = Math.round((c.value / maxVal) * 100)

          return (
            <div key={c.category || i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {c.category} <span className="text-[10px] text-slate-400 font-normal">{t('phAnItemsCount', { count: c.count })}</span>
                </span>
                <span className="font-bold text-teal-600 dark:text-teal-400">${money(c.value)}</span>
              </div>

              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
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