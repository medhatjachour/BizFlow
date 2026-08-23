import React from 'react'
import { ClipboardList, Clock, Truck, CheckCircle2 } from 'lucide-react'
import { PurchaseOrdersMetrics } from '../types'
import { money } from '../../components/_shared'

interface PurchaseOrdersMetricsBarProps {
  metrics: PurchaseOrdersMetrics
}

export const PurchaseOrdersMetricsBar: React.FC<PurchaseOrdersMetricsBarProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <ClipboardList size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Total Purchase Orders</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{metrics.totalOrders}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
          <Clock size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Draft POs</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{metrics.draftsCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Truck size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Pending Inbound Value</p>
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">${money(metrics.pendingOrderedValue)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Received Stock Value</p>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">${money(metrics.receivedValue)}</p>
        </div>
      </div>
    </div>
  )
}