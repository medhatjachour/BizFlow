import { DollarSign, Package, TrendingUp, Users, Scale, ArrowUpRight } from 'lucide-react'
import { formatCurrency } from '../utils'

interface SummaryCardsProps {
  operationalExpenses: number
  totalCOGS: number
  totalExpenses: number
  totalSalaries: number
  totalBaseSalary: number
  totalOvertimePay: number
  totalExtraShiftPay: number
  totalGrossPay: number
  totalWithSalaries: number
  taxDeductibleTotal: number
  expenseCount: number
  employeeCount: number
  includeCOGS: boolean
  includeSalaries: boolean
  t: (key: string) => string
}

export default function SummaryCards({
  operationalExpenses,
  totalCOGS,
  totalExpenses,
  totalSalaries,
  totalOvertimePay,
  totalGrossPay,
  totalWithSalaries,
  taxDeductibleTotal,
  expenseCount,
  employeeCount,
  includeCOGS,
  includeSalaries,
  t,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {/* 1. Direct Operational Overhead */}
      <div className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('operationalExpenses') || 'Direct Overheads'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(operationalExpenses)}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
          <span>{expenseCount} {t('transactions') || 'records'}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {formatCurrency(taxDeductibleTotal)} {t('taxDeductible') || 'Deductible'}
          </span>
        </div>
      </div>

      {/* 2. COGS Card */}
      <div className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('costOfGoodsSold') || 'COGS (Inventory)'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(totalCOGS)}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] border-t border-slate-100 dark:border-slate-800/80 pt-2">
          <span className="text-slate-500 dark:text-slate-400">{t('salesCost') || 'Base item cost'}</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${includeCOGS ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
            {includeCOGS ? t('included') || 'Active' : t('excluded') || 'Ignored'}
          </span>
        </div>
      </div>

      {/* 3. Combined Operating & COGS */}
      <div className={`group relative rounded-2xl border p-4 shadow-xs transition-all ${
        includeSalaries
          ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('totalExpenses') || 'Commercial Total'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(totalExpenses)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 truncate">
          {includeCOGS ? t('cogsIncluded') || 'Overheads + Sales COGS' : t('overheadOnly') || 'Direct Overheads only'}
        </div>
      </div>

      {/* 4. Payroll Total Card */}
      <div className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('employeeSalaries') || 'Payroll & Wages'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(totalGrossPay > 0 ? totalGrossPay : totalSalaries)}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
          <span>{employeeCount} {t('staff') || 'Staff'}</span>
          {totalOvertimePay > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              +{formatCurrency(totalOvertimePay)} OT
            </span>
          )}
        </div>
      </div>

      {/* 5. Ultimate Grand Total */}
      <div className="group relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 border border-slate-800 text-white p-4 shadow-md shadow-slate-950/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300">
            {t('totalWithSalaries') || 'Net Enterprise Burden'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center border border-white/10">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {formatCurrency(totalWithSalaries)}
        </div>
        <div className="mt-2 text-[11px] text-slate-400 border-t border-white/10 pt-2 flex items-center justify-between">
          <span>{t('allOutflows') || 'Full Cash Outflow'}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      </div>
    </div>
  )
}