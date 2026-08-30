import {
  Edit2,
  Trash2,
  Receipt,
  FileText,

} from 'lucide-react'
import { formatCurrency } from '../utils'
import type { Expense, ExpenseCategory, ViewMode } from '../types'

interface Props {
  expenses: Expense[]
  selectedIds: Set<string>
  viewMode: ViewMode
  getCategoryName: (id: ExpenseCategory) => string
  getCategoryConfig: (id: ExpenseCategory) => any
  onToggleSelectAll: () => void
  onToggleSelectRow: (id: string) => void
  onEdit: (e: Expense) => void
  onDelete: (id: string) => void
  onViewReceipt?: (e: Expense) => void
  t: (key: string) => string
}

export default function ExpenseTable({
  expenses,
  selectedIds,
  viewMode,
  getCategoryName,
  getCategoryConfig,
  onToggleSelectAll,
  onToggleSelectRow,
  onEdit,
  onDelete,
  t,
}: Props) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Receipt className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          {t('noExpensesFound') || 'No expense entries recorded'}
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {t('addFirstExpense') || 'Use the Log Expense button above to record your first operational outflow.'}
        </p>
      </div>
    )
  }

  // CARD / GRID VIEW
  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {expenses.map((expense) => {
          const cfg = getCategoryConfig(expense.category)
          const Icon = cfg.icon || FileText
          const isSelected = selectedIds.has(expense.id)

          return (
            <div
              key={expense.id}
              className={`rounded-2xl border p-4 bg-white dark:bg-slate-900 shadow-xs transition-all relative ${
                isSelected ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${cfg.badgeBg} ${cfg.badgeText}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white block leading-tight">
                      {getCategoryName(expense.category)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(expense.date || expense.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-end">
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(expense.amount)}
                  </span>
                  {expense.isTaxDeductible && (
                    <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Tax Deductible
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mb-3 line-clamp-2">
                {expense.description}
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate max-w-[140px]">{expense.vendor || expense.user?.username || '—'}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(expense)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // MODERN RTL-COMPLIANT TABLE VIEW
  const allSelected = expenses.length > 0 && selectedIds.size === expenses.length

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-3.5 text-center w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label={t('selectAll') || 'Select all rows'}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 text-start">{t('date') || 'Date'}</th>
              <th className="py-3 px-3 text-start">{t('category') || 'Category'}</th>
              <th className="py-3 px-3 text-start">{t('description') || 'Description'}</th>
              <th className="py-3 px-3 text-start">{t('vendor') || 'Vendor / Source'}</th>
              <th className="py-3 px-3 text-end">{t('amount') || 'Amount'}</th>
              <th className="py-3 px-3 text-start">{t('paymentMethod') || 'Method'}</th>
              <th className="py-3 px-3 text-center w-24">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {expenses.map((expense) => {
              const cfg = getCategoryConfig(expense.category)
              const Icon = cfg.icon || FileText
              const isSelected = selectedIds.has(expense.id)

              return (
                <tr
                  key={expense.id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    isSelected ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <td className="p-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(expense.id)}
                      aria-label={t('selectRow') || 'Select row'}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-500 dark:text-slate-400">
                    {new Date(expense.date || expense.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <div className={`p-1 rounded-md ${cfg.badgeBg} ${cfg.badgeText}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {getCategoryName(expense.category)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-900 dark:text-slate-100 max-w-xs font-medium">
                    <div className="truncate">{expense.description}</div>
                    {expense.referenceNumber && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ref: {expense.referenceNumber}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    {expense.vendor || '—'}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-end">
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                      {formatCurrency(expense.amount)}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                      {expense.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(expense)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={t('edit') || 'Edit'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        title={t('delete') || 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}