import { useMemo } from 'react'
import { Layers } from 'lucide-react'
import { CategoryRow } from '../types'
import { formatCurrency, formatNumber, calcMarginPct } from '../utils'

interface CategoryPerformanceProps {
  categories: CategoryRow[]
  loading: boolean
  t: (key: string) => string
}

const CATEGORY_COLORS = [
  'from-violet-500 to-purple-500',
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-blue-500',
  'from-lime-500 to-green-500',
  'from-fuchsia-500 to-pink-500',
]

export function CategoryPerformance({ categories, loading, t }: CategoryPerformanceProps) {
  const maxRevenue = useMemo(() => Math.max(...categories.map(c => c.revenue), 1), [categories])
  const totalRevenue = useMemo(() => categories.reduce((s, c) => s + c.revenue, 0), [categories])

  const processed = useMemo(
    () =>
      categories.map(c => ({
        ...c,
        marginPct: c.marginPct || calcMarginPct(c.revenue, c.cogs),
        pct: (c.revenue / totalRevenue) * 100,
      })),
    [categories, totalRevenue]
  )

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('cfCategoryPerformance')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {categories.length} categories • {formatCurrency(totalRevenue)} total
          </p>
        </div>
      </div>

      {processed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Layers className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">No category data</p>
        </div>
      ) : (
        <div className="space-y-4">
          {processed.map((cat, idx) => {
            const widthPct = (cat.revenue / maxRevenue) * 100
            const colorGradient = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]

            return (
              <div key={`${cat.categoryId}-${idx}`} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{cat.categoryName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      {cat.pct.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(cat.revenue)}
                  </span>
                </div>

                <div className="relative h-8 bg-slate-100 dark:bg-slate-700/50 rounded-lg overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colorGradient} rounded-lg transition-all duration-500 group-hover:brightness-110`}
                    style={{ width: `${Math.max(widthPct, 3)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>{formatNumber(cat.quantity)} {t('cfItems')}</span>
                  <span>
                    {t('cfProfit')}: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(cat.grossProfit)}</span>
                  </span>
                  <span>Margin: {cat.marginPct.toFixed(1)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
