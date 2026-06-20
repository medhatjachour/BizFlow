/**
 * InventoryMetrics Component
 * Analytics sidebar showing key metrics with skeleton loading
 */

import { useMemo } from 'react'
import { Package, TrendingUp, AlertTriangle, DollarSign, TrendingDown } from 'lucide-react'
import { InventoryItem, InventoryMetrics as Metrics } from '@/shared/types'
import { MetricCardSkeleton } from '@renderer/components/ui/SkeletonVariants'
import { formatCurrency, formatLargeNumber } from '@renderer/utils/formatNumber'

interface Props {
  metrics: Metrics | null
  loading: boolean
  items: InventoryItem[]
}

export default function InventoryMetrics({ metrics, loading, items }: Props) {
  // Calculate top and bottom items
  const topItems = useMemo(() => {
    return [...items]
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 5)
  }, [items])

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.stockStatus === 'low' || item.stockStatus === 'out')
  }, [items])

  if (loading || !metrics) {
    return (
      <div className="p-6 space-y-4">
        <div className="mb-6">
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
    <div className="p-6 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Analytics</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">Real-time inventory insights</p>
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        {/* Total Products */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">Total Products</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                <span className="cursor-help" title={metrics.totalProducts.toLocaleString()}>
                  {formatLargeNumber(metrics.totalProducts)}
                </span>
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="cursor-help" title={metrics.totalVariants.toLocaleString()}>
              {formatLargeNumber(metrics.totalVariants)}
            </span> variants · <span className="cursor-help" title={(metrics.totalPieces || 0).toLocaleString()}>
              {formatLargeNumber(metrics.totalPieces || 0)}
            </span> pieces
          </p>
        </div>

        {/* Stock Value */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">Stock Value</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                <span className="cursor-help" title={`$${metrics.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                  {formatCurrency(metrics.totalStockValue)}
                </span>
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cost basis of inventory
          </p>
        </div>

        {/* Retail Value */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp size={20} className="text-success" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">Retail Value</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                <span className="cursor-help" title={`$${metrics.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                  {formatCurrency(metrics.totalRetailValue)}
                </span>
              </p>
            </div>
          </div>
          <p className="text-xs text-success">
            <span className="cursor-help" title={`$${metrics.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              +{formatCurrency(metrics.potentialProfit)}
            </span> potential profit
          </p>
        </div>

        {/* Alerts */}
        {(metrics.lowStockCount > 0 || metrics.outOfStockCount > 0) && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-accent" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Stock Alerts</p>
            </div>
            <div className="space-y-2">
              {metrics.outOfStockCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-error">Out of Stock</span>
                  <span className="font-bold text-error">{metrics.outOfStockCount}</span>
                </div>
              )}
              {metrics.lowStockCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-accent">Low Stock</span>
                  <span className="font-bold text-accent">{metrics.lowStockCount}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Stocked Items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top Stocked</h3>
        </div>
        <div className="space-y-2">
          {topItems.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate flex-1">{item.name}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.category || 'Uncategorized'}</span>
                <span className="text-xs font-bold text-primary">{item.totalStock} units</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} className="text-accent" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Low Stock Alerts</h3>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-accent/30">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate flex-1">{item.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{item.baseSKU}</span>
                  <span className={`text-xs font-bold ${item.totalStock === 0 ? 'text-error' : 'text-accent'}`}>
                    {item.totalStock === 0 ? 'Out of Stock' : `${item.totalStock} left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
