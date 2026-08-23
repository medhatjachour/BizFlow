import React from 'react'
import { AlertTriangle, ShieldCheck, Box, PackageX } from 'lucide-react'
import { CriticalImpactItem } from '../types'

interface Props {
  items: CriticalImpactItem[]
  totalSKUs: number
}

export const CriticalImpactTabView: React.FC<Props> = ({ items, totalSKUs }) => {
  if (items.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-2">
        <ShieldCheck className="w-10 h-10 text-emerald-500" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Zero Critical Exposure
        </h4>
        <p className="text-xs text-slate-400 max-w-sm">
          All inventory items across active facilities are stocked above their configured minimum reorder thresholds.
        </p>
      </div>
    )
  }

  const outOfStockCount = items.filter(i => i.quantity <= 0).length
  const totalDeficitUnits = items.reduce((sum, i) => sum + i.deficitQty, 0)

  return (
    <div className="space-y-4">
      {/* Top Banner KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950/60 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Low Stock / At Risk
            </div>
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {items.length} SKUs
            </div>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Out of Stock Outages
            </div>
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {outOfStockCount} SKUs
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600">
            <PackageX className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Replenishment Deficit
            </div>
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {totalDeficitUnits.toLocaleString()} units
            </div>
          </div>
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
            <Box className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Critical Items Feed */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Stock Depletion & Reorder Thresholds
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[30rem] overflow-y-auto">
          {items.map(item => {
            const isOut = item.quantity <= 0
            return (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isOut
                        ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600'
                        : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {item.productName}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono">{item.sku || 'No SKU'}</span>
                      <span>•</span>
                      <span>{item.locationName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs">
                    <div className="text-slate-400 text-[10.5px]">
                      Min Threshold: {item.minQuantity} {item.unit}
                    </div>
                    <div className="font-mono text-slate-600 dark:text-slate-300">
                      Deficit: <span className="font-bold text-rose-600">+{item.deficitQty} {item.unit}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full font-mono ${
                      isOut
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {isOut ? 'OUT OF STOCK' : `${item.quantity} ${item.unit} left`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}