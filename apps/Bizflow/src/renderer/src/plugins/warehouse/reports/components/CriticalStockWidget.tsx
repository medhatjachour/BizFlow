import React from 'react'
import { AlertTriangle, Box } from 'lucide-react'
import { CriticalReportItem } from '../types'

interface Props {
  items: CriticalReportItem[]
}

export const CriticalStockWidget: React.FC<Props> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center py-8">
        <Box className="w-6 h-6 text-emerald-500 mb-1" />
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Stock Thresholds Healthy
        </span>
        <span className="text-[11px] text-slate-400">No critical depletion alerts recorded.</span>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Critical Stock Depletion Feed
          </h4>
        </div>
        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-bold">
          {items.length} Action Needed
        </span>
      </div>

      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
        {items.slice(0, 10).map(item => {
          const isOut = Number(item.quantity) <= 0
          return (
            <div
              key={item.id}
              className="p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/40 dark:bg-rose-950/20 text-xs flex items-center justify-between"
            >
              <div className="space-y-0.5 min-w-0 pr-2">
                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.productName || item.product?.name || 'Unknown SKU'}
                </div>
                <div className="text-[10.5px] text-slate-400">
                  Location: {item.location?.name || 'General'}
                </div>
              </div>

              <span
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md font-mono ${
                  isOut
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {isOut ? 'OUT OF STOCK' : `${item.quantity} left`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}