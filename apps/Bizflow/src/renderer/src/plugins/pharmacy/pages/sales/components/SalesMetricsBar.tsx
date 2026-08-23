import React from 'react'
import { DollarSign, AlertCircle, RotateCcw, ReceiptIcon } from 'lucide-react'
import { SalesMetrics } from '../types'
import { money } from '../../components/_shared'

interface SalesMetricsBarProps {
  metrics: SalesMetrics
}

export const SalesMetricsBar: React.FC<SalesMetricsBarProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <DollarSign size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Gross Sales</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">${money(metrics.totalRevenue)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <ReceiptIcon size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Transactions</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{metrics.totalSalesCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <AlertCircle size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Total Outstanding</p>
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">${money(metrics.totalOutstanding)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
          <RotateCcw size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Total Refunded</p>
          <p className="text-base font-bold text-red-600 dark:text-red-400">${money(metrics.totalRefunded)}</p>
        </div>
      </div>
    </div>
  )
}