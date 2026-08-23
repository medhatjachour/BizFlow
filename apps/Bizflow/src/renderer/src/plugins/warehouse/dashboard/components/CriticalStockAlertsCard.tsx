import React from 'react'
import { AlertTriangle, Package, ShieldCheck } from 'lucide-react'
import { CriticalRawItem } from '../types'

interface Props {
  items: CriticalRawItem[]
}

export const CriticalStockAlertsCard: React.FC<Props> = ({ items }) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Critical Threshold Alerts
          </h3>
        </div>
        {items.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {items.length} Depleted
          </span>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
          {items.slice(0, 6).map((item, i) => (
            <div
              key={i}
              className="p-2 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 flex items-center gap-2 text-xs"
            >
              <Package className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {item.productName || item.name || item.sku || 'Unknown'}
                </p>
                <p className="text-[10.5px] text-rose-600 dark:text-rose-400 font-mono">
                  {item.quantity ?? item.qty ?? 0} remaining · {item.location?.name || item.locationName || 'General'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-emerald-500 text-xs gap-1">
          <ShieldCheck className="w-6 h-6" />
          <span>All stock thresholds optimal</span>
        </div>
      )}
    </div>
  )
}