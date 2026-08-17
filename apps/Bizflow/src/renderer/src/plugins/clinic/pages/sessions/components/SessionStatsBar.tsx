import { ClipboardList, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../utils'

interface Props {
  metrics: {
    totalCharged: number
    totalPaid: number
    totalOutstanding: number
    activeCount: number
    completedCount: number
    count: number
  }
}

export default function SessionStatsBar({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visits in Period</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg font-bold text-slate-900 dark:text-white">{metrics.count}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              ({metrics.activeCount} in-progress)
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Billed</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(metrics.totalCharged)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Collected</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(metrics.totalPaid)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Receivable Due</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(metrics.totalOutstanding)}</p>
        </div>
      </div>
    </div>
  )
}