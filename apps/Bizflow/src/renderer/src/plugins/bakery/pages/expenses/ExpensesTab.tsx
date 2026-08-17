import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useBakeryExpenses } from './hooks/useBakeryExpenses'
import { ExpenseSummaryCards } from './components/ExpenseSummaryCards'
import { CategoryBreakdown } from './components/CategoryBreakdown'
import { ExpenseToolbar } from './components/ExpenseToolbar'
import { ExpenseTable } from './components/ExpenseTable'
import { ExpenseFormModal } from './components/ExpenseFormModal'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'

export default function BakeryExpensesTab() {
  useLanguage()
  const {
    expenses,
    rawCount,
    summary,
    loading,
    range,
    setRange,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSort,
    totalVisibleAmount,
    // Modals
    formModalOpen,
    setFormModalOpen,
    editingExpense,
    openCreateModal,
    openEditModal,
    deletingId,
    setDeletingId,
    handleSaveExpense,
    handleDeleteExpense,
  } = useBakeryExpenses()

  return (
    <div className="space-y-6">
      {/* 1. Summary KPI Cards */}
      <ExpenseSummaryCards summary={summary} totalEntries={rawCount} range={range} />

      {/* 2. Visual Category Distribution */}
      <CategoryBreakdown summary={summary} />

      {/* 3. Search and Action Toolbar */}
      <ExpenseToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        range={range}
        onRangeChange={setRange}
        onAddClick={openCreateModal}
      />

      {/* 4. Main Expense Records Table */}
      <ExpenseTable
        expenses={expenses}
        loading={loading}
        totalAmount={totalVisibleAmount}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onEdit={openEditModal}
        onDelete={id => setDeletingId(id)}
      />

      {/* 5. Create / Edit Form Modal */}
      <ExpenseFormModal
        isOpen={formModalOpen}
        existing={editingExpense}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSaveExpense}
      />

      {/* 6. Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDeleteExpense(deletingId)}
      />
    </div>
  )
}