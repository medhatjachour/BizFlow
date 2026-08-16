import { Users, AlertCircle, CalendarCheck, CreditCard } from 'lucide-react'
import { formatCurrency } from '../utils'

interface Props {
  stats: {
    totalPatients: number
    totalOutstanding: number
    withOutstandingCount: number
    totalSessions: number
  }
}

export default function PatientStatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Patients</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white leading-none mt-1">{stats.totalPatients}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <CalendarCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Recorded Visits</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white leading-none mt-1">{stats.totalSessions}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">With Outstanding</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-none mt-1">{stats.withOutstandingCount} patients</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Unpaid Balance</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 leading-none mt-1">{formatCurrency(stats.totalOutstanding)}</p>
        </div>
      </div>
    </div>
  )
}