import React from 'react'
import { Truck, Boxes, PhoneCall, Layers } from 'lucide-react'
import { SuppliersMetrics } from '../types'
import { int } from '../../components/_shared'

interface SuppliersMetricsBarProps {
  metrics: SuppliersMetrics
}

export const SuppliersMetricsBar: React.FC<SuppliersMetricsBarProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Truck size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Total Vendors</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{metrics.totalSuppliers}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Layers size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Purchase Orders</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{int(metrics.activeOrdersCount)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Boxes size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Delivered Batches</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{int(metrics.totalBatchesSourced)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <PhoneCall size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Active Contacts</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{metrics.directContactCount}</p>
        </div>
      </div>
    </div>
  )
}