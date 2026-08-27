import { Activity, CheckCircle2, TrendingUp, DollarSign, AlertCircle } from 'lucide-react'
import { formatSessionMoney } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  metrics: {
    total: number
    completed: number
    billed: number
    paid: number
    outstanding: number
  }
}

export function SessionKpiCards({ metrics }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Total Sessions */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'إجمالي الجلسات' : 'Total Sessions'}
          </span>
          <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Activity size={16} />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.total}</p>
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-bold flex items-center gap-1">
          <CheckCircle2 size={11} /> {metrics.completed} {isAr ? 'جلسة مكتملة' : 'completed'}
        </p>
      </div>

      {/* Billed Revenue */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'إجمالي المفوتر' : 'Billed Sessions'}
          </span>
          <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
        </div>
        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
          {formatSessionMoney(metrics.billed)}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
          {isAr ? 'إجمالي فواتير الزيارات' : 'Gross visit billings'}
        </p>
      </div>

      {/* Collected Payments */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'المحصل نقداً وبطاقة' : 'Collected Value'}
          </span>
          <div className="h-8 w-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <DollarSign size={16} />
          </div>
        </div>
        <p className="text-2xl font-black text-teal-600 dark:text-teal-400 tracking-tight">
          {formatSessionMoney(metrics.paid)}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
          {isAr ? 'دفعات مستلمة بالفعل' : 'Paid & deposited'}
        </p>
      </div>

      {/* Outstanding Balance */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'مستحق غير مدفوع' : 'Unpaid Balance'}
          </span>
          <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle size={16} />
          </div>
        </div>
        <p
          className={`text-2xl font-black tracking-tight ${
            metrics.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
          }`}
        >
          {formatSessionMoney(metrics.outstanding)}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
          {isAr ? 'ديون جلسات للتحصيل' : 'Pending client balances'}
        </p>
      </div>
    </div>
  )
}