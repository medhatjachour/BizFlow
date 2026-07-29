import { TrendingUp, DollarSign, ShoppingBag } from 'lucide-react'
import { formatCurrency, formatLargeNumber } from '@renderer/utils/formatNumber'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SalesStats } from '../types'

interface StatsCardsProps {
  stats: SalesStats
}

export function StatsCards({ stats }: StatsCardsProps): JSX.Element {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="glass-card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('totalRevenue')}
          </span>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center">
            <DollarSign size={20} className="text-white" />
          </div>
        </div>
        <div
          className="text-3xl font-bold text-slate-900 dark:text-white mb-1"
          title={`$${stats.totalRevenue.toLocaleString()}`}
        >
          {formatCurrency(stats.totalRevenue)}
        </div>
        {stats.hasData ? (
          <div
            className={`flex items-center text-sm ${
              stats.weeklyRevenueChange >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {stats.weeklyRevenueChange >= 0 ? (
              <TrendingUp size={16} className="mr-1" />
            ) : (
              <TrendingUp size={16} className="mr-1 rotate-180" />
            )}
            {Math.abs(stats.weeklyRevenueChange).toFixed(1)}% {t('fromLastWeek')}
          </div>
        ) : (
          <div className="text-sm text-slate-400">{t('noSalesData')}</div>
        )}
      </div>

      <div className="glass-card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('totalSales')}
          </span>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <ShoppingBag size={20} className="text-white" />
          </div>
        </div>
        <div
          className="text-3xl font-bold text-slate-900 dark:text-white mb-1"
          title={stats.totalSales.toLocaleString()}
        >
          {formatLargeNumber(stats.totalSales)}
        </div>
        {stats.hasData ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {stats.todayCount}{' '}
            {stats.todayCount === 1 ? t('saleToday') : t('salesToday')}
          </div>
        ) : (
          <div className="text-sm text-slate-400">{t('startMakingSales')}</div>
        )}
      </div>

      <div className="glass-card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Items Sold
          </span>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-purple-600 flex items-center justify-center">
            <ShoppingBag size={20} className="text-white" />
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
          {stats.totalItems}
        </div>
        {stats.hasData ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {t('acrossAllTransactions')}
          </div>
        ) : (
          <div className="text-sm text-slate-400">{t('noItemsSold')}</div>
        )}
      </div>

      <div className="glass-card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('avgSale')}
          </span>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center">
            <DollarSign size={20} className="text-white" />
          </div>
        </div>
        <div
          className="text-3xl font-bold text-slate-900 dark:text-white mb-1"
          title={`$${stats.avgSale.toLocaleString()}`}
        >
          {formatCurrency(stats.avgSale)}
        </div>
        {stats.hasData ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {t('perTransaction')}
          </div>
        ) : (
          <div className="text-sm text-slate-400">{t('noSalesData')}</div>
        )}
      </div>
    </div>
  )
}