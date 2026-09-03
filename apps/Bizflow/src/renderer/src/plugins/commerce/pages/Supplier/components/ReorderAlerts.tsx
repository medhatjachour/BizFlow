import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Info,
  Package,
  Clock,
  RefreshCw,
  ShoppingCart,
  Search,
  Truck,
  DollarSign,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  TrendingDown
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'

export type ReorderPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface ReorderAlert {
  productId: string
  variantId: string
  productName: string
  variantName: string
  currentStock: number
  reorderPoint: number
  suggestedOrderQty: number
  daysToDepletion: number
  priority: ReorderPriority
  lastSoldDate?: Date
  avgDailySales: number
  supplierInfo?: {
    supplierId?: string
    supplierName: string
    cost: number
    leadTime: number
  }
}

export interface ReorderAnalysis {
  alerts: ReorderAlert[]
  summary: {
    totalAlerts: number
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
  }
}

export interface PrefilledPurchaseOrder {
  productId: string
  variantId: string
  productName: string
  variantName: string
  suggestedQty: number
  supplierInfo?: {
    supplierId?: string
    supplierName: string
    cost: number
    leadTime: number
  }
}

interface ReorderAlertsProps {
  onCreatePurchaseOrder?: (data: PrefilledPurchaseOrder) => void
}

type SortField = 'daysToDepletion' | 'currentStock' | 'suggestedOrderQty' | 'name'

export default function ReorderAlerts({ onCreatePurchaseOrder }: ReorderAlertsProps) {
  const [analysis, setAnalysis] = useState<ReorderAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | ReorderPriority>('ALL')
  const [sortField, setSortField] = useState<SortField>('daysToDepletion')
  const [sortAsc, setSortAsc] = useState(true)

  const { showToast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    loadReorderAlerts()
  }, [])

  const loadReorderAlerts = async () => {
    try {
      setLoading(true)
      // Supports both window.electron.ipcRenderer and window.api
      const ipc =
        (window as any).electron?.ipcRenderer ||
        (window as any).api?.reorder

      const result = ipc?.invoke
        ? await ipc.invoke('reorder:getAlerts')
        : await (window as any).api?.reorder?.getAlerts?.()

      if (result?.success) {
        setAnalysis(result.data)
      } else {
        showToast('error', result?.error || 'Failed to load reorder alerts')
      }
    } catch (error) {
      logger.error('Error loading reorder alerts:', error)
      showToast('error', 'Failed to load reorder alerts')
    } finally {
      setLoading(false)
    }
  }

  // Filtered & Sorted alerts
  const processedAlerts = useMemo(() => {
    if (!analysis?.alerts) return []

    return analysis.alerts
      .filter((alert) => {
        const matchesPriority =
          priorityFilter === 'ALL' || alert.priority === priorityFilter

        const query = searchQuery.trim().toLowerCase()
        const matchesSearch =
          !query ||
          alert.productName.toLowerCase().includes(query) ||
          alert.variantName.toLowerCase().includes(query) ||
          alert.supplierInfo?.supplierName.toLowerCase().includes(query)

        return matchesPriority && matchesSearch
      })
      .sort((a, b) => {
        let valA: string | number = 0
        let valB: string | number = 0

        switch (sortField) {
          case 'daysToDepletion':
            valA = a.daysToDepletion
            valB = b.daysToDepletion
            break
          case 'currentStock':
            valA = a.currentStock
            valB = b.currentStock
            break
          case 'suggestedOrderQty':
            valA = a.suggestedOrderQty
            valB = b.suggestedOrderQty
            break
          case 'name':
            valA = a.productName.toLowerCase()
            valB = b.productName.toLowerCase()
            break
        }

        if (valA < valB) return sortAsc ? -1 : 1
        if (valA > valB) return sortAsc ? 1 : -1
        return 0
      })
  }, [analysis, priorityFilter, searchQuery, sortField, sortAsc])

  // Total estimated replenishment cost
  const totalRestockCost = useMemo(() => {
    if (!analysis?.alerts) return 0
    return analysis.alerts.reduce((sum, item) => {
      const unitCost = item.supplierInfo?.cost || 0
      return sum + unitCost * item.suggestedOrderQty
    }, 0)
  }, [analysis])

  const getPriorityBadge = (priority: ReorderPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5" />,
          label: 'Critical',
          class:
            'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        }
      case 'HIGH':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: 'High Priority',
          class:
            'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
        }
      case 'MEDIUM':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'Medium',
          class:
            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
        }
      case 'LOW':
        return {
          icon: <Info className="w-3.5 h-3.5" />,
          label: 'Low Priority',
          class:
            'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
        }
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              {t('reorderRecommendations') || 'Automated Stock Restock Alerts'}
              {analysis && analysis.summary.totalAlerts > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 rounded-full">
                  {analysis.summary.totalAlerts} 
                  {t('itemsNeedAction') || 'items need action'}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('reorderRecommendationsDescription') || 'Runout forecast based on sales velocities, replenishment lead times, and safe minimums.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadReorderAlerts}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing...' : 'Recalculate Runout'}</span>
        </button>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Critical */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            priorityFilter === 'CRITICAL'
              ? 'bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {t('critical') || 'Critical'}</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {analysis?.summary.criticalCount ?? 0}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">&le; 2 days depletion</span>
        </button>

        {/* High */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            priorityFilter === 'HIGH'
              ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('highRisk') || 'High Risk'}</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {analysis?.summary.highCount ?? 0}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">&le; 7 days depletion</span>
        </button>

        {/* Medium */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            priorityFilter === 'MEDIUM'
              ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('moderate') || 'Moderate'}</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {analysis?.summary.mediumCount ?? 0}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {t('atReorderThreshold') || 'At reorder threshold'}</span>
        </button>

        {/* Total Restock Required */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('restockValue') || 'Restock Value'}</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            ${totalRestockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {t('estimatedOrderBudget') || 'Estimated order budget'}</span>
        </div>

        {/* Total Alerts Count */}
        <button
          onClick={() => setPriorityFilter('ALL')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            priorityFilter === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ring-2 ring-slate-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between opacity-80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('totalAlerts') || 'Total Alerts'}</span>
            <Package className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">
            {analysis?.summary.totalAlerts ?? 0}
          </p>
          <span className="text-[10px] opacity-70">Filtered: {processedAlerts.length} items</span>
        </button>
      </div>

      {/* 3. Search & Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product, variant, SKU or vendor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Priority filter pills */}
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setPriorityFilter(lvl)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                priorityFilter === lvl
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {lvl === 'ALL' ? 'All Alerts' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table / Content Viewport */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl animate-pulse p-4"
            />
          ))}
        </div>
      ) : processedAlerts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {searchQuery || priorityFilter !== 'ALL'
              ? 'No matching alerts found'
              : 'All inventory stock levels optimal'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || priorityFilter !== 'ALL'
              ? 'Try modifying your search keywords or switching priority filters.'
              : 'No items have fallen below their safety threshold or reorder triggers.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4">
                       {t('PriorityAndItem') || 'Priority & Item'}
                    </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    onClick={() => toggleSort('currentStock')}
                  >
                    <div className="flex items-center gap-1">
                      <span
                      >{t('stockStatus') || 'Stock Status'}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    onClick={() => toggleSort('daysToDepletion')}
                  >
                    <div className="flex items-center gap-1">
                      
                       {t('daysToDepletion') || 'Depletion Risk'}
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    onClick={() => toggleSort('suggestedOrderQty')}
                  >
                    <div className="flex items-center gap-1">
                      <span>
                        {t('suggestedOrderQty') || 'Suggested Order Quantity'}
                      </span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="py-3 px-4">
                    <span>
                      {t('primarySupplier') || 'Primary Supplier'}
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <span>
                      {t('procureAction') || 'Procure Action'}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {processedAlerts.map((alert) => {
                  const badge = getPriorityBadge(alert.priority)
                  const stockHealthPercent = Math.min(
                    100,
                    Math.round((alert.currentStock / Math.max(alert.reorderPoint, 1)) * 100)
                  )
                  const unitCost = alert.supplierInfo?.cost || 0
                  const estimatedTotalCost = unitCost * alert.suggestedOrderQty

                  return (
                    <tr
                      key={`${alert.productId}-${alert.variantId}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 1. Item Name & Priority */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.class}`}
                            >
                              {badge.icon}
                              {badge.label}
                            </span>
                            {alert.variantName && alert.variantName !== 'Default' && (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {alert.variantName}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                            {alert.productName}
                          </p>
                        </div>
                      </td>

                      {/* 2. Stock Health Meter */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1 w-32 sm:w-40">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {alert.currentStock}{' '}
                              <span className="font-normal text-slate-400">/ {alert.reorderPoint} min</span>
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                stockHealthPercent < 35
                                  ? 'text-rose-500'
                                  : stockHealthPercent < 70
                                  ? 'text-amber-500'
                                  : 'text-blue-500'
                              }`}
                            >
                              {stockHealthPercent}%
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                stockHealthPercent < 35
                                  ? 'bg-rose-500'
                                  : stockHealthPercent < 70
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${stockHealthPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <TrendingDown className="w-2.5 h-2.5" />
                            {alert.avgDailySales > 0
                              ? `~${alert.avgDailySales.toFixed(1)} sold/day`
                              : 'Low velocity'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Depletion Risk / Days Remaining */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                          <Clock
                            className={`w-3.5 h-3.5 ${
                              alert.daysToDepletion <= 2
                                ? 'text-rose-500'
                                : alert.daysToDepletion <= 7
                                ? 'text-amber-500'
                                : 'text-slate-400'
                            }`}
                          />
                          <span className="font-bold text-xs">
                            {alert.daysToDepletion <= 0
                              ? 'Depleted'
                              : `${alert.daysToDepletion}d left`}
                          </span>
                        </div>
                      </td>

                      {/* 4. Suggested PO Qty & Investment */}
                      <td className="py-3.5 px-4 align-top">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            +{alert.suggestedOrderQty} units
                          </p>
                          {estimatedTotalCost > 0 && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ${estimatedTotalCost.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 5. Supplier Context */}
                      <td className="py-3.5 px-4 align-top">
                        {alert.supplierInfo ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[140px]">
                                {alert.supplierInfo.supplierName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>${alert.supplierInfo.cost.toFixed(2)}/unit</span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-0.5">
                                <Truck className="w-2.5 h-2.5" />
                                {alert.supplierInfo.leadTime}d lead
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No assigned vendor</span>
                        )}
                      </td>

                      {/* 6. Action Button */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (onCreatePurchaseOrder) {
                              onCreatePurchaseOrder({
                                productId: alert.productId,
                                variantId: alert.variantId,
                                productName: alert.productName,
                                variantName: alert.variantName,
                                suggestedQty: alert.suggestedOrderQty,
                                supplierInfo: alert.supplierInfo
                                  ? {
                                      supplierId: alert.supplierInfo.supplierId,
                                      supplierName: alert.supplierInfo.supplierName,
                                      cost: alert.supplierInfo.cost,
                                      leadTime: alert.supplierInfo.leadTime
                                    }
                                  : undefined
                              })
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs transition-all shadow-2xs hover:shadow-xs active:scale-98"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>
                            {t('createPO') || 'Create PO'}
                            </span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}