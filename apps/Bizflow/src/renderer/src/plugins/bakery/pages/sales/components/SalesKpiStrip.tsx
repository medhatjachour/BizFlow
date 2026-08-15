import React from 'react'
import { DollarSign, Package, ShoppingBag, TrendingUp } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { SalesSummary } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  summary: SalesSummary | null
}

export const SalesKpiStrip: React.FC<Props> = ({ summary }) => {
  const { t } = useLanguage()

  const totalRevenue = summary?.totalRevenue ?? 0
  const totalUnits = summary?.totalUnitsSold ?? 0
  const totalTx = summary?.totalTransactions ?? 0
  const avgSaleValue = totalTx > 0 ? totalRevenue / totalTx : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Revenue */}
      <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {t('bakerySaleTotalRevenue') || 'Total Revenue'}
          </p>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
          ${formatCurrency(totalRevenue)}
        </p>
      </div>

      {/* Units Sold */}
      <div className="rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
            {t('bakerySaleUnitsSold') || 'Units Sold'}
          </p>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Package className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
          {totalUnits.toLocaleString()}
        </p>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-purple-200/80 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-800 dark:text-purple-300">
            {t('bakerySaleTransactions') || 'Transactions'}
          </p>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ShoppingBag className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-300">
          {totalTx.toLocaleString()}
        </p>
      </div>

      {/* Avg Ticket Size */}
      <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            {t('bakerySaleAvgValue') || 'Avg Ticket Value'}
          </p>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
          ${formatCurrency(avgSaleValue)}
        </p>
      </div>
    </div>
  )
}