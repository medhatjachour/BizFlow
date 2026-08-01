import { useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { TrendRow } from '../types'
import { formatCurrency, formatShortDate, calcGrowth } from '../utils'

interface RevenueChartProps {
  trend: TrendRow[]
  loading: boolean
  t: (key: string) => string
}

export function RevenueChart({ trend, loading, t }: RevenueChartProps) {
  const maxRevenue = useMemo(() => Math.max(...trend.map(r => r.revenue), 1), [trend])
  const totalRevenue = useMemo(() => trend.reduce((sum, r) => sum + r.revenue, 0), [trend])
  const totalOrders = useMemo(() => trend.reduce((sum, r) => sum + r.orders, 0), [trend])

  const growth = useMemo(() => {
    if (trend.length < 2) return 0
    const recent = trend.slice(-Math.ceil(trend.length / 2)).reduce((s, r) => s + r.revenue, 0)
    const previous = trend.slice(0, Math.floor(trend.length / 2)).reduce((s, r) => s + r.revenue, 0)
    return calcGrowth(recent, previous)
  }, [trend])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('cfRevenueTrend')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formatCurrency(totalRevenue)} • {totalOrders} orders
          </p>
        </div>
        {growth !== 0 && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              growth > 0
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            {growth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(growth).toFixed(1)}%
          </div>
        )}
      </div>

      {trend.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">{t('cfNoTrendData')}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {trend.map((row, idx) => {
            const heightPct = (row.revenue / maxRevenue) * 100
            const prevRevenue = idx > 0 ? trend[idx - 1].revenue : row.revenue
            const dayGrowth = calcGrowth(row.revenue, prevRevenue)

            return (
              <div
                key={row.date}
                className="group flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg p-2 -mx-2 transition-colors"
              >
                <div className="w-16 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                  {formatShortDate(row.date)}
                </div>

                <div className="flex-1 relative h-9 bg-slate-100 dark:bg-slate-700/50 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg transition-all duration-500 group-hover:from-emerald-600 group-hover:to-teal-600"
                    style={{ width: `${Math.max(heightPct, 2)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs font-medium text-white drop-shadow-sm">
                      {formatCurrency(row.revenue)}
                    </span>
                    <span className="text-xs text-white/90 drop-shadow-sm">{row.orders} ord</span>
                  </div>
                </div>

                {idx > 0 && dayGrowth !== 0 && (
                  <div
                    className={`w-12 text-xs font-medium text-right ${
                      dayGrowth > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {dayGrowth > 0 ? '+' : ''}
                    {dayGrowth.toFixed(0)}%
                  </div>
                )}
                {idx === 0 && <div className="w-12" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
