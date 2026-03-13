import { DollarSign, Package, TrendingUp, Users, Filter } from 'lucide-react'

interface Props {
  operationalExpenses: number
  totalCOGS: number
  totalExpenses: number
  totalSalaries: number
  totalWithSalaries: number
  expenseCount: number
  employeeCount: number
  includeCOGS: boolean
  t: (key: string) => string
}

export default function SummaryCards({
  operationalExpenses,
  totalCOGS,
  totalExpenses,
  totalSalaries,
  totalWithSalaries,
  expenseCount,
  employeeCount,
  includeCOGS,
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

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
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

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('employeeSalaries')}</h3>
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Users size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">${totalSalaries.toFixed(2)}</p>
        <p className="text-sm text-slate-500 mt-1">{employeeCount} {t('expenseEmployees')}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('totalWithSalaries')}</h3>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Filter size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">${totalWithSalaries.toFixed(2)}</p>
        <p className="text-sm text-slate-500 mt-1">{t('completeOverview')}</p>
      </div>
    </div>
  )
}
