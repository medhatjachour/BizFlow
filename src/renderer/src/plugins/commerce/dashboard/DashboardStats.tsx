/**
 * DashboardStats Component
 * Key performance metrics cards
 * Memoized to prevent unnecessary re-renders
 */

import { memo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Users } from 'lucide-react'
import { formatCurrency, formatLargeNumber } from '@renderer/utils/formatNumber'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  stats: {
    todayRevenue: number
    todayOrders: number
    totalProducts: number
    lowStockItems: number
    totalCustomers: number
    revenueChange: number
    ordersChange: number
  }
  loading: boolean
}

function DashboardStats({ stats, loading }: Props) {
  const { t } = useLanguage()
  const metrics = [
    {
      label: t('todayRevenue'),
      value: formatCurrency(stats.todayRevenue),
      rawValue: `$${stats.todayRevenue.toFixed(2)}`,
      change: stats.revenueChange,
      icon: DollarSign,
      color: 'emerald',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
    {
      label: t('todayOrders'),
      value: formatLargeNumber(stats.todayOrders),
      rawValue: stats.todayOrders.toLocaleString(),
      change: stats.ordersChange,
      icon: ShoppingCart,
      color: 'blue',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
    },
    {
      label: t('totalProducts'),
      value: formatLargeNumber(stats.totalProducts),
      rawValue: stats.totalProducts.toLocaleString(),
      change: 0,
      icon: Package,
      color: 'purple',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-600',
    },
    {
      label: t('totalCustomers'),
      value: formatLargeNumber(stats.totalCustomers),
      rawValue: stats.totalCustomers.toLocaleString(),
      change: 0,
      icon: Users,
      color: 'amber',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse"
          >
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        const isPositive = metric.change > 0
        const hasChange = metric.change !== 0

        return (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {metric.label}
              </span>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-4 h-4 ${metric.iconColor}`} />
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" title={metric.rawValue}>
                  {metric.value}
                </p>
                {hasChange && (
                  <div className="flex items-center gap-1 mt-1">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-success" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-error" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        isPositive ? 'text-success' : 'text-error'
                      }`}
                    >
                      {Math.abs(metric.change).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Memoize component - only re-render when props actually change
export default memo(DashboardStats, (prevProps, nextProps) => {
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.stats.todayRevenue === nextProps.stats.todayRevenue &&
    prevProps.stats.todayOrders === nextProps.stats.todayOrders &&
    prevProps.stats.totalProducts === nextProps.stats.totalProducts &&
    prevProps.stats.lowStockItems === nextProps.stats.lowStockItems &&
    prevProps.stats.totalCustomers === nextProps.stats.totalCustomers &&
    prevProps.stats.revenueChange === nextProps.stats.revenueChange &&
    prevProps.stats.ordersChange === nextProps.stats.ordersChange
  )
})
