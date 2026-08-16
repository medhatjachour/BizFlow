import React from 'react'
import { Factory, PackageCheck, ShoppingBag, Flame } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  totalBatches: number
  totalProduced: number
  totalSold: number
  totalLost: number
}

export const ProductionKpiStrip: React.FC<Props> = ({
  totalBatches,
  totalProduced,
  totalSold,
  totalLost,
}) => {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Batches */}
      <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            {t('bakeryTotalBatches') || 'Total Batches'}
          </p>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Factory className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-amber-700 dark:text-amber-300">
          {totalBatches.toLocaleString()}
        </p>
      </div>

      {/* Units Produced */}
      <div className="rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
            {t('bakeryUnitsProduced') || 'Units Produced'}
          </p>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <PackageCheck className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-blue-700 dark:text-blue-300">
          {totalProduced.toLocaleString()}
        </p>
      </div>

      {/* Units Sold */}
      <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {t('bakeryUnitsSold') || 'Units Sold'}
          </p>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShoppingBag className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
          {totalSold.toLocaleString()}
        </p>
      </div>

      {/* Waste / Loss */}
      <div className="rounded-2xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            {t('bakeryWasteLoss') || 'Waste / Loss'}
          </p>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Flame className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-rose-700 dark:text-rose-300">
          {totalLost.toLocaleString()}
        </p>
      </div>
    </div>
  )
}