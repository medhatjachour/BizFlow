import { AlertCircle } from 'lucide-react'
import { useExpenses } from './hooks/useExpenses'
import SummaryCards from './components/SummaryCards'
import ExpenseToolbar from './components/ExpenseToolbar'
import ExpenseFilters from './components/ExpenseFilters'
import ExpenseCharts from './components/ExpenseCharts'
import ExpenseTable from './components/ExpenseTable'
import ExpenseModal from './components/ExpenseModal'
import PayrollBreakdown from './components/PayrollBreakdown'

export default function ExpensesTab() {
  const s = useExpenses()

  if (s.loading) {
    return (
      <div className="flex items-center justify-center min-h-[420px] w-full">
        <div className="text-center">
          <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            {s.t('loading') || 'Loading expenses...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-2 animate-in fade-in duration-200">
      {/* Module Missing Notice */}
      {!s.apiAvailable && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 p-4 text-xs font-medium text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {s.t('expenseOfflineWarning') || 'Expense management engine is running in local preview mode.'}
          </span>
        </div>
      )}

      {/* Global Outflow KPI Cards */}
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
        taxDeductibleTotal={s.taxDeductibleTotal}
        expenseCount={s.filteredExpenses.length}
        employeeCount={s.employeeCount}
        includeCOGS={s.includeCOGS}
        includeSalaries={s.includeSalaries}
        t={s.t}
      />

      {/* Calculation Toggles */}
      <ExpenseFilters
        includeCOGS={s.includeCOGS}
        setIncludeCOGS={s.setIncludeCOGS}
        includeSalaries={s.includeSalaries}
        setIncludeSalaries={s.setIncludeSalaries}
        t={s.t}
      />

      {/* Visual Analytics */}
      <ExpenseCharts
        categoriesForCharts={s.categoriesForCharts}
        includeCOGS={s.includeCOGS}
        includeSalaries={s.includeSalaries}
        t={s.t}
      />

      {/* Power Toolbar */}
      <ExpenseToolbar
        searchTerm={s.searchTerm}
        setSearchTerm={s.setSearchTerm}
        filterCategory={s.filterCategory}
        setFilterCategory={s.setFilterCategory}
        filterPaymentMethod={s.filterPaymentMethod}
        setFilterPaymentMethod={s.setFilterPaymentMethod}
        dateRange={s.dateRange}
        setDateRange={s.setDateRange}
        viewMode={s.viewMode}
        setViewMode={s.setViewMode}
        selectedCount={s.selectedIds.size}
        totalCount={s.filteredExpenses.length}
        onAdd={s.openAdd}
        onExport={s.handleExport}
        onBulkDelete={s.handleBulkDelete}
        onRefresh={s.loadExpenses}
        apiAvailable={s.apiAvailable}
        t={s.t}
      />

      {/* Main Expense Table / Cards */}
      <ExpenseTable
        expenses={s.filteredExpenses}
        selectedIds={s.selectedIds}
        viewMode={s.viewMode}
        getCategoryName={s.getCategoryName}
        getCategoryConfig={s.getCategoryConfig}
        onToggleSelectAll={s.toggleSelectAll}
        onToggleSelectRow={s.toggleSelectRow}
        onEdit={s.openEdit}
        onDelete={s.handleDelete}
        t={s.t}
      />

      {/* Staff Payroll Section */}
      <PayrollBreakdown payrollDetails={s.payrollDetails} t={s.t} />

      {/* Add / Edit Modal */}
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