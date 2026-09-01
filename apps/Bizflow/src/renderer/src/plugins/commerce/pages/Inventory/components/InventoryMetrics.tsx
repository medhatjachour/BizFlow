/**
 * InventoryMetrics Component
 * Analytics sidebar showing key metrics with skeleton loading
 */

import { useMemo } from 'react'
import { Package, TrendingUp, AlertTriangle, DollarSign, TrendingDown } from 'lucide-react'
import { InventoryItem, InventoryMetrics as Metrics } from '@/shared/types'
import { MetricCardSkeleton } from '@renderer/components/ui/SkeletonVariants'
import { formatCurrency, formatLargeNumber } from '@renderer/utils/formatNumber'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  metrics: Metrics | null
  loading: boolean
  items: InventoryItem[]
}

export default function InventoryMetrics({ metrics, loading, items }: Props) {
  const { t } = useLanguage()
  // Calculate top and bottom items
  const topItems = useMemo(() => {
    return [...items]
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 5)
  }, [items])

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.stockStatus === 'low' || item.stockStatus === 'out')
  }, [items])

  const largestStock = Math.max(topItems[0]?.totalStock || 0, 1)

  if (loading || !metrics) {
    return (
      <div className="p-4 space-y-3">
        <div className="mb-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2 animate-pulse" />
          <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    )
  }

  return (
    <aside className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase text-slate-900 dark:text-white">{t('inventoryUiPulse')}</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('inventoryUiPulseDescription')}</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" title={t('inventoryUiLiveData')} />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700">
        <div className="bg-white dark:bg-slate-800 p-3">
          <Package size={14} className="mb-2 text-slate-400" />
          <p className="text-[9px] font-bold uppercase text-slate-400">{t('inventoryUiProducts')}</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white" title={metrics.totalProducts.toLocaleString()}>
            {formatLargeNumber(metrics.totalProducts)}
          </p>
          <p className="text-[9px] text-slate-500">{formatLargeNumber(metrics.totalVariants)} {t('inventoryUiVariants')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3">
          <DollarSign size={14} className="mb-2 text-sky-500" />
          <p className="text-[9px] font-bold uppercase text-slate-400">{t('inventoryUiCostBasis')}</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white" title={`$${metrics.totalStockValue.toLocaleString()}`}>
            {formatCurrency(metrics.totalStockValue)}
          </p>
          <p className="text-[9px] text-slate-500">{t('inventoryUiCurrentInventory')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3">
          <TrendingUp size={14} className="mb-2 text-emerald-500" />
          <p className="text-[9px] font-bold uppercase text-slate-400">{t('inventoryUiRetailValue')}</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white" title={`$${metrics.totalRetailValue.toLocaleString()}`}>
            {formatCurrency(metrics.totalRetailValue)}
          </p>
          <p className="text-[9px] text-emerald-600">{t('inventoryUiSellThroughValue')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3">
          <TrendingUp size={14} className="mb-2 text-violet-500" />
          <p className="text-[9px] font-bold uppercase text-slate-400">{t('inventoryUiProfitPotential')}</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white" title={`$${metrics.potentialProfit.toLocaleString()}`}>
            {formatCurrency(metrics.potentialProfit)}
          </p>
          <p className="text-[9px] text-violet-600">{t('inventoryUiBeforeExpenses')}</p>
        </div>
      </div>

      {(metrics.lowStockCount > 0 || metrics.outOfStockCount > 0) && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">{t('inventoryUiActionRequired')}</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-amber-200 dark:divide-amber-900">
            <div>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{metrics.outOfStockCount}</p>
              <p className="text-[9px] uppercase font-semibold text-rose-600 dark:text-rose-400">{t('inventoryUiOutOfStock')}</p>
            </div>
            <div className="pl-3">
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{metrics.lowStockCount}</p>
              <p className="text-[9px] uppercase font-semibold text-amber-600 dark:text-amber-400">{t('inventoryUiRunningLow')}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} className="text-slate-400" />
            <h3 className="text-[11px] font-bold text-slate-800 dark:text-white">{t('inventoryUiHighestOnHand')}</h3>
          </div>
          <span className="text-[9px] text-slate-400">{t('inventoryUiThisPage')}</span>
        </div>
        <div className="space-y-3">
          {topItems.map((item) => (
            <div key={item.id}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate">{item.name}</p>
                <span className="text-[10px] font-bold tabular-nums text-slate-900 dark:text-white">{item.totalStock}</span>
              </div>
              <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max((item.totalStock / largestStock) * 100, 3)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingDown size={13} className="text-amber-500" />
            <h3 className="text-[11px] font-bold text-slate-800 dark:text-white">{t('inventoryUiAtRiskItems')}</h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700 border-y border-slate-200 dark:border-slate-700">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                  <span className="text-[9px] font-mono text-slate-400">{item.baseSKU}</span>
                </div>
                <span className={`text-[10px] font-bold whitespace-nowrap ${item.totalStock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {item.totalStock === 0 ? t('inventoryUiOutOfStock') : `${item.totalStock} ${t('inventoryUiLeft')}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
