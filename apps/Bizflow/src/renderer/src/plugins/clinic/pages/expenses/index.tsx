import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { useExpenses } from './hooks/useExpenses'
import { ExpenseToolbar } from './components/ExpenseToolbar'
import { ExpenseKpiGrid } from './components/ExpenseKpiGrid'
import { CategoryBreakdownCard } from './components/CategoryBreakdownCard'
import { ExpenseTable } from './components/ExpenseTable'
import { ExpenseFormModal } from './components/ExpenseFormModal'
import { DeleteExpenseModal } from './components/DeleteExpenseModal'
import type { Expense } from './types'

export default function ExpensesTab() {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [deleteItem, setDeleteItem] = useState<Expense | null>(null)

  const {
    expenses,
    summary,
    loading,
    period,
    category,
    setPeriod,
    setCategory,
    reload,
    deleteExpense
  } = useExpenses()

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full">
      {/* Action Toolbar */}
      <ExpenseToolbar
        period={period}
        category={category}
        onSelectPeriod={setPeriod}
        onSelectCategory={setCategory}
        onOpenCreateModal={() => {
          setEditItem(null)
          setShowForm(true)
        }}
      />

      {/* Financial KPIs */}
      <ExpenseKpiGrid summary={summary} />

      {/* Category Share Breakdown */}
      {summary?.byCategory && summary.byCategory.length > 0 && (
        <CategoryBreakdownCard
          breakdown={summary.byCategory}
          totalExpenses={summary.totalExpenses}
        />
      )}

      {/* Main Expense Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : (
        <ExpenseTable
          expenses={expenses}
          onEdit={(item) => {
            setEditItem(item)
            setShowForm(true)
          }}
          onDelete={(item) => setDeleteItem(item)}
          onAdd={() => {
            setEditItem(null)
            setShowForm(true)
          }}
        />
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <ExpenseFormModal
          existing={editItem}
          onClose={() => {
            setShowForm(false)
            setEditItem(null)
          }}
          onSaved={() => {
            setShowForm(false)
            setEditItem(null)
            reload()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <DeleteExpenseModal
          expense={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={async () => {
            await deleteExpense(deleteItem.id)
            setDeleteItem(null)
          }}
        />
      )}
    </div>
  )
}