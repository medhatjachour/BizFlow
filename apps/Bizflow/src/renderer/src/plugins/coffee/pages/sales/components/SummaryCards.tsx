import { useLanguage } from '@renderer/contexts/LanguageContext'
import {COLOR_STYLES } from '../constants'
import type { SummaryData } from '../types'
import { Package, Receipt, ShoppingBag, TrendingUp } from 'lucide-react'

interface Props {
  summary: SummaryData | null
  loading?: boolean
}

export function SummaryCards({ summary, loading }: Props) {

const {t} = useLanguage()

const SUMMARY_CARD_CONFIG = [
  {
    key: 'revenue',
    label: t('cfTotalRevenue') || 'Total Revenue',
    icon: TrendingUp,
    color: 'emerald',
    getValue: (s: any) => s?.totalRevenue?.toFixed(2) ?? '0.00',
    trend: true
  },
  {
    key: 'orders',
    label: t('cfTotalOrders') || 'Total Orders',
    icon: Receipt,
    color: 'amber',
    getValue: (s: any) => String(s?.totalOrders ?? 0)
  },
  {
    key: 'avg',
    label: t('cfAverageOrderValue') || 'Avg. Order Value',
    icon: ShoppingBag,
    color: 'teal',
    getValue: (s: any) => s?.avgOrderValue?.toFixed(2) ?? '0.00'
  },
  {
    key: 'items',
    label: t('cfItemsSold') || 'Items Sold',
    icon: Package,
    color: 'violet',
    getValue: (s: any) => String(s?.totalItems ?? 0)
  }
] as const


  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
            <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700 mb-3"></div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {SUMMARY_CARD_CONFIG.map(({ key, label, icon: Icon, color, getValue }) => {
        const styles = COLOR_STYLES[color]
        return (
          <div 
            key={key} 
            className={`relative overflow-hidden rounded-xl border ${styles.border} ${styles.bg} p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${styles.text}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${styles.text}`}>
              {getValue(summary)}
            </p>
          </div>
        )
      })}

      {/* Top 3 Categories Card */}
      {summary?.topCategories && summary.topCategories.length > 0 && (
        <div className={`relative overflow-hidden rounded-xl border ${COLOR_STYLES.violet.border} ${COLOR_STYLES.violet.bg} p-4 transition-all hover:shadow-md sm:col-span-2 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${COLOR_STYLES.violet.text}`}>
                <Package className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Top Categories</p>
            </div>
          </div>
          
          <div className="space-y-3 mt-2">
            {summary.topCategories.slice(0, 3).map((cat, idx) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600 dark:text-slate-300 truncate pr-2">
                    {idx + 1}. {cat.name}
                  </span>
                  <span className={`font-bold ${COLOR_STYLES.violet.text}`}>
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${COLOR_STYLES.violet.gradient} transition-all duration-500`} 
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
