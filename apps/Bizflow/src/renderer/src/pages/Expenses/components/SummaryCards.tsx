import { DollarSign, Package, TrendingUp, Users, Filter } from 'lucide-react'

interface Props {
  operationalExpenses: number
  totalCOGS: number
  totalExpenses: number
  totalSalaries: number
  totalBaseSalary: number
  totalOvertimePay: number
  totalExtraShiftPay: number
  totalGrossPay: number
  totalWithSalaries: number
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
  totalBaseSalary,
  totalOvertimePay,
  totalExtraShiftPay,
  totalGrossPay,
  totalWithSalaries,
  expenseCount,
  employeeCount,
  includeCOGS,
  includeSalaries,
  t,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('operationalExpenses')}</h3>
          <div className="p-2 bg-red-500/10 rounded-lg">
            <DollarSign size={20} className="text-red-600 dark:text-red-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">${operationalExpenses.toFixed(2)}</p>
        <p className="text-sm text-slate-500 mt-1">{expenseCount} {t('expenseTransactions')}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('costOfGoodsSold')}</h3>
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Package size={20} className="text-green-600 dark:text-green-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">${totalCOGS.toFixed(2)}</p>
        <p className="text-sm text-slate-500 mt-1">
          {includeCOGS ? t('fromSales') : `${t('fromSales')} (${t('excluded')})`}
        </p>
      </div>

      <div className={`rounded-xl p-6 shadow-sm border transition-opacity ${
        includeSalaries
          ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
          : 'bg-white/80 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 opacity-80'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('totalExpenses')}</h3>
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">${totalExpenses.toFixed(2)}</p>
        <p className="text-sm text-slate-500 mt-1">
          {includeCOGS ? t('includingCOGS') : t('excludingCOGS')}
        </p>
      </div>

      {/* Enhanced payroll card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('employeeSalaries')}</h3>
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Users size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          ${(totalGrossPay > 0 ? totalGrossPay : totalSalaries).toFixed(2)}
        </p>
        <div className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          {totalBaseSalary > 0 && (
            <p>Base: <span className="font-medium text-slate-700 dark:text-slate-300">${totalBaseSalary.toFixed(2)}</span></p>
          )}
          {totalOvertimePay > 0 && (
            <p>Overtime: <span className="font-medium text-amber-600 dark:text-amber-400">+${totalOvertimePay.toFixed(2)}</span></p>
          )}
          {totalExtraShiftPay > 0 && (
            <p>Extra shifts: <span className="font-medium text-cyan-600 dark:text-cyan-400">+${totalExtraShiftPay.toFixed(2)}</span></p>
          )}
          {totalGrossPay === 0 && (
            <p>{employeeCount} {t('expenseEmployees')}</p>
          )}
          {!includeSalaries && (
            <p className="text-slate-400">Excluded from totals</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('totalWithSalaries')}</h3>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Filter size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">${totalWithSalaries.toFixed(2)}</p>
        <p className="text-sm text-slate-500 mt-1">
          {includeCOGS && includeSalaries
            ? t('completeOverview')
            : `Includes: ${includeCOGS ? 'COGS' : 'No COGS'} • ${includeSalaries ? 'Salaries' : 'No Salaries'}`}
        </p>
      </div>
    </div>
  )
}
