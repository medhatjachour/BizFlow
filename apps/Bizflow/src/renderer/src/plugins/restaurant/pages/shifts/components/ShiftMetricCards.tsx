import React from 'react'
import { DollarSign, Clock, Banknote, HeartHandshake } from 'lucide-react'
import { RestaurantShiftData } from '../types'
import { formatCurrency, formatShiftDuration } from '../utils'

interface Props {
  activeShift: RestaurantShiftData | null
}

export const ShiftMetricCards: React.FC<Props> = ({ activeShift }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black text-amber-600 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 uppercase">
            {activeShift ? 'In Progress' : 'No Active Shift'}
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {activeShift ? formatShiftDuration(activeShift.openedAt) : '0h 0m'}
        </div>
        <div className="text-xs font-semibold text-slate-400 mt-0.5">Shift Elapsed Time</div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Banknote className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 uppercase">
            Float Cash
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(activeShift?.startCash || 0)}
        </div>
        <div className="text-xs font-semibold text-slate-400 mt-0.5">Opening Drawer Balance</div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black text-blue-600 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 uppercase">
            Shift Sales
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(activeShift?.totalSales || 0)}
        </div>
        <div className="text-xs font-semibold text-slate-400 mt-0.5">Total Shift Revenue</div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black text-purple-600 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 uppercase">
            Tips Pool
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(activeShift?.totalTips || 0)}
        </div>
        <div className="text-xs font-semibold text-slate-400 mt-0.5">Server Gratuity Accumulated</div>
      </div>
    </div>
  )
}