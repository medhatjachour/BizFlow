import React from 'react'
import { Package, DollarSign, AlertTriangle, Clock } from 'lucide-react'
import { ProductsMetrics } from '../types'
import { money } from '../../components/_shared'

interface ProductMetricsBarProps {
  metrics: ProductsMetrics
}

export const ProductMetricsBar: React.FC<ProductMetricsBarProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Package size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Total Products</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{metrics.totalSkus}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <DollarSign size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Inventory Value</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">${money(metrics.totalValue)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Low / Out of Stock</p>
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">{metrics.lowStockCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
          <Clock size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Expiring (&le;30d)</p>
          <p className="text-base font-bold text-red-600 dark:text-red-400">{metrics.expiringCount}</p>
        </div>
      </div>
    </div>
  )
}