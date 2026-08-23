import React from 'react'
import { Users, DollarSign, Wallet, Percent } from 'lucide-react'
import { CustomersMetrics } from '../types'
import { money } from '../../components/_shared'

interface CustomerMetricsBarProps {
  metrics: CustomersMetrics
}

export const CustomerMetricsBar: React.FC<CustomerMetricsBarProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Users size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Total Customers</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{metrics.totalCustomers}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <DollarSign size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Customer Revenue</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">${money(metrics.totalRevenue)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Wallet size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Outstanding Balance</p>
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">${money(metrics.totalOutstanding)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Percent size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Active Debtors</p>
          <p className="text-base font-bold text-violet-600 dark:text-violet-400">{metrics.debtorsCount}</p>
        </div>
      </div>
    </div>
  )
}