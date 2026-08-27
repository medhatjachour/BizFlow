import { useState } from 'react'
import { DollarSign, Plus, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ExpenseRecord } from './types'
import { useVetExpenses } from './hooks/useVetExpenses'
import { VetExpensesToolbar } from './components/VetExpensesToolbar'
import { ExpenseSummaryCards } from './components/ExpenseSummaryCards'
import { ExpenseCategoryBreakdown } from './components/ExpenseCategoryBreakdown'
import { ExpenseTableView } from './components/ExpenseTableView'
import { ExpenseCard } from './components/ExpenseCard'
import { ExpenseFormModal } from './components/ExpenseFormModal'
import { ExpenseDeleteModal } from './components/ExpenseDeleteModal'

export default function VetExpensesTab() {
  const toast = useToast()
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    expenses,
    filteredCount,
    summary,
    total,
    loading,
    isRefreshing,
    refresh,
    loadMore,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    paymentFilter,
    setPaymentFilter,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    viewMode,
    setViewMode,
    categoryTotals
  } = useVetExpenses()

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<ExpenseRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async (payload: any) => {
    if (editTarget) {
      await window.api.vet?.expenses.update(editTarget.id, payload)
      toast.success(isAr ? 'تم تعديل المصروف بنجاح' : 'Expense updated successfully')
    } else {
      await window.api.vet?.expenses.create(payload)
      toast.success(isAr ? 'تم تسجيل المصروف بنجاح' : 'Expense recorded successfully')
    }
    setShowForm(false)
    setEditTarget(null)
    refresh()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await window.api.vet?.expenses.delete(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
      toast.success(isAr ? 'تم حذف المصروف بنجاح' : 'Expense deleted successfully')
    } catch (err: any) {
      toast.error(err.message ?? (isAr ? 'فشل حذف المصروف' : 'Delete failed'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Interactive Toolbar */}
      <VetExpensesToolbar
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customRange.from}
        customTo={customRange.to}
        onCustomChange={(from, to) => setCustomRange({ from, to })}
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortAsc={sortAsc}
        onToggleSortOrder={() => setSortAsc((prev) => !prev)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddExpense={() => {
          setEditTarget(null)
          setShowForm(true)
        }}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      {/* KPI Financial Overview Cards */}
      <ExpenseSummaryCards summary={summary} />

      {/* Category Cost Distribution Chips */}
      <ExpenseCategoryBreakdown
        categoryTotals={categoryTotals}
        totalExpenses={summary?.totalExpenses || 0}
        selectedCategory={categoryFilter}
        onSelectCategory={setCategoryFilter}
      />

      {/* Count Info */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
        <p>
          {isAr ? 'عرض' : 'Showing'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-black">{filteredCount}</span>{' '}
          {isAr ? 'من إجمالي' : 'of'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-bold">{total}</span>{' '}
          {isAr ? 'سجلات مصاريف' : 'recorded expenses'}
        </p>
      </div>

      {/* Main Expense Items */}
      {loading && expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'جاري تحميل سجلات المصاريف...' : 'Loading Clinic Expenses…'}
          </p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center px-4">
          <div className="h-16 w-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400 shadow-inner">
            <DollarSign size={30} />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-sm">
            {search || categoryFilter !== 'all'
              ? (isAr ? 'لم يتم العثور على مصاريف تطابق بحثك' : 'No expenses match your search or active filter')
              : (isAr ? 'لا توجد مصاريف مسجلة في هذه الفترة' : 'No expenses recorded in this period')}
          </p>
          <p className="text-xs text-slate-400 mb-4 max-w-sm">
            {isAr
              ? 'سجل نفقات العيادة، الأدوية، الإيجار والرواتب لتتبع الأرباح بدقة'
              : 'Track clinic operating costs, medications, and supplies to accurately gauge net profit'}
          </p>
          {!search && categoryFilter === 'all' && (
            <button
              type="button"
              onClick={() => {
                setEditTarget(null)
                setShowForm(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 active:scale-95 transition-all"
            >
              <Plus size={15} />
              <span>{isAr ? 'تسجيل أول مصروف' : 'Record First Expense'}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <ExpenseTableView
              expenses={expenses}
              onEdit={(e) => {
                setEditTarget(e)
                setShowForm(true)
              }}
              onDelete={(e) => setDeleteTarget(e)}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {expenses.map((exp) => (
                <ExpenseCard
                  key={exp.id}
                  expense={exp}
                  onEdit={() => {
                    setEditTarget(exp)
                    setShowForm(true)
                  }}
                  onDelete={() => setDeleteTarget(exp)}
                />
              ))}
            </div>
          )}

          {expenses.length < total && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2.5 text-xs font-bold text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>
                  {isAr ? `تحميل المزيد (${total - expenses.length} متبقي)` : `Load more (${total - expenses.length} remaining)`}
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <ExpenseFormModal
          expense={editTarget}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditTarget(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ExpenseDeleteModal
        expense={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}