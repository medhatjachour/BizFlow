import React from 'react'
import { DollarSign, Package, AlertTriangle, ShoppingCart } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '../utils'

interface Props {
  totalValuation: number
  totalItems: number
  lowCount: number
  reorderCount: number
}

export const PantryKpiStrip: React.FC<Props> = ({
  totalValuation,
  totalItems,
  lowCount,
  reorderCount,
}) => {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Valuation */}
      <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {t('bakeryTotalStockValue') || 'Total Inventory Value'}
          </p>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
          ${formatCurrency(totalValuation)}
        </p>
      </div>

      {/* Tracked Ingredients */}
      <div className="rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
            {t('bakeryTrackedIngredients') || 'Tracked Ingredients'}
          </p>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Package className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-blue-700 dark:text-blue-300">
          {totalItems}
        </p>
      </div>

      {/* Low Stock Alerts */}
      <div className="rounded-2xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            {t('bakeryLowStockAlerts') || 'Low Stock Alerts'}
          </p>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-rose-700 dark:text-rose-300">
          {lowCount}
        </p>
      </div>

      {/* Needs Reorder */}
      <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            {t('bakeryNeedsReorderCount') || 'To Be Reordered'}
          </p>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShoppingCart className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-amber-700 dark:text-amber-300">
          {reorderCount}
        </p>
      </div>
    </div>
  )
}