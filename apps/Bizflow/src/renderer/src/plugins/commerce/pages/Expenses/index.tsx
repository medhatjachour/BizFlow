import { Plus, Download, AlertCircle } from 'lucide-react'
import { useExpenses } from './hooks/useExpenses'
import SummaryCards from './components/SummaryCards'
import ExpenseFilters from './components/ExpenseFilters'
import ExpenseCharts from './components/ExpenseCharts'
import ExpenseTable from './components/ExpenseTable'
import ExpenseModal from './components/ExpenseModal'
import PayrollBreakdown from './components/PayrollBreakdown'

export default function Expenses() {
  const s = useExpenses()

  if (s.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">{s.t('loading')}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-scroll">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {s.t('expensesManagement')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{s.t('trackBusinessExpenses')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={s.handleExport}
            disabled={!s.apiAvailable}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            {s.t('export')}
          </button>
          <button
            onClick={s.openAdd}
            disabled={!s.apiAvailable}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            {s.t('add')} {s.t('expenses')}
          </button>
        </div>
      </div>

      {!s.apiAvailable && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Expense tracking requires the <strong>Commerce</strong> module. This module is not enabled in the current build.
            Expense records and revenue data are unavailable.
          </span>
        </div>
      )}

      <SummaryCards
        operationalExpenses={s.operationalExpenses}
        totalCOGS={s.totalCOGS}
        totalExpenses={s.totalExpenses}
        totalSalaries={s.totalSalaries}
        totalBaseSalary={s.totalBaseSalary}
        totalOvertimePay={s.totalOvertimePay}
        totalExtraShiftPay={s.totalExtraShiftPay}
        totalGrossPay={s.totalGrossPay}
        totalWithSalaries={s.totalWithSalaries}
        expenseCount={s.filteredExpenses.length}
        employeeCount={s.employeeCount}
        includeCOGS={s.includeCOGS}
        includeSalaries={s.includeSalaries}
        t={s.t}
      />

      <ExpenseFilters
        searchTerm={s.searchTerm}
        setSearchTerm={s.setSearchTerm}
        filterCategory={s.filterCategory}
        setFilterCategory={s.setFilterCategory}
        dateRange={s.dateRange}
        setDateRange={s.setDateRange}
        includeCOGS={s.includeCOGS}
        setIncludeCOGS={s.setIncludeCOGS}
        includeSalaries={s.includeSalaries}
        setIncludeSalaries={s.setIncludeSalaries}
        t={s.t}
      />

      <ExpenseCharts
        categoriesForCharts={s.categoriesForCharts}
        includeCOGS={s.includeCOGS}
        includeSalaries={s.includeSalaries}
        t={s.t}
      />

      {/* Expense List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{s.t('expenseHistory')}</h3>
          <span className="text-sm text-slate-500">{s.filteredExpenses.length} {s.t('expenseTransactions')}</span>
        </div>
        <ExpenseTable
          expenses={s.filteredExpenses}
          getCategoryName={s.getCategoryName}
          getCategoryColor={s.getCategoryColor}
          onEdit={s.openEdit}
          onDelete={s.handleDelete}
          t={s.t}
        />
      </div>

      <PayrollBreakdown payrollDetails={s.payrollDetails} />

      {s.showModal && (
        <ExpenseModal
          editingExpense={s.editingExpense}
          formData={s.formData}
          setFormData={s.setFormData}
          onSave={s.handleSave}
          onClose={s.closeModal}
          t={s.t}
        />
      )}
    </div>
  )
}
