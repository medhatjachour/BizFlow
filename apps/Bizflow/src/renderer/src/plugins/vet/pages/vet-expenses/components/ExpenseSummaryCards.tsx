import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'
import { ExpenseSummary } from '../types'
import { formatExpenseMoney } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function ExpenseSummaryCards({ summary }: { summary: ExpenseSummary | null }) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  if (!summary) return null

  const revenue = summary.revenue || 0
  const expenses = summary.totalExpenses || 0
  const net = summary.netIncome || 0
  const outstanding = summary.outstanding || 0

  const expenseRatio = revenue > 0 ? Math.min(100, Math.round((expenses / revenue) * 100)) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Revenue */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'إجمالي الإيرادات' : 'Clinic Revenue'}
          </span>
          <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
        </div>
        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
          {formatExpenseMoney(revenue)}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
          {isAr ? 'جلسات ومبيعات الصيدلية' : 'Billed sessions & store'}
        </p>
      </div>

      {/* Total Expenses */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'إجمالي المصاريف' : 'Total Expenses'}
          </span>
          <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <TrendingDown size={16} />
          </div>
        </div>
        <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
          {formatExpenseMoney(expenses)}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-semibold">
          <span className="text-rose-500 font-bold">{expenseRatio}%</span>
          <span>{isAr ? 'من نسبة الإيرادات' : 'of gross revenue'}</span>
        </div>
      </div>

      {/* Net Income */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'صافي الدخل' : 'Net Income'}
          </span>
          <div
            className={`h-8 w-8 rounded-xl flex items-center justify-center ${
              net >= 0
                ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
            }`}
          >
            <DollarSign size={16} />
          </div>
        </div>
        <p
          className={`text-2xl font-black tracking-tight ${
            net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {formatExpenseMoney(net)}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
          {net >= 0 ? (isAr ? 'هامش ربح إيجابي' : 'Profitable margin') : (isAr ? 'عجز تشغيلي' : 'Operational deficit')}
        </p>
      </div>

      {/* Outstanding */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'مستحقات غير محصلة' : 'Outstanding'}
          </span>
          <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle size={16} />
          </div>
        </div>
        <p
          className={`text-2xl font-black tracking-tight ${
            outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
          }`}
        >
          {formatExpenseMoney(outstanding)}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
          {isAr ? 'فواتير عملاء معلقة' : 'Unpaid patient balances'}
        </p>
      </div>
    </div>
  )
}