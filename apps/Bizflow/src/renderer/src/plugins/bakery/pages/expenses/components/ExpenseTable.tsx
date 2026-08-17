import React from 'react'
import {
  Pencil,
  Trash2,
  Loader2,
  Receipt,
  ArrowUpDown,
  FileText,
  Repeat,
} from 'lucide-react'
import { BakeryExpense, SortField, SortOrder } from '../types'
import { formatCurrency, formatDate, getCategoryMeta } from '../utils'

interface Props {
  expenses: BakeryExpense[]
  loading: boolean
  totalAmount: number
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  onEdit: (exp: BakeryExpense) => void
  onDelete: (id: string) => void
}

export const ExpenseTable: React.FC<Props> = ({
  expenses,
  loading,
  totalAmount,
  sortField,
  onSort,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden backdrop-blur-sm">
      {/* Table Header Summary */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            Expense Records
          </h3>
          <p className="text-xs text-slate-400">Detailed list of operating expenditures</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {expenses.length} records
          </span>
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
          <p className="text-xs text-slate-400">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Receipt className="h-6 w-6 opacity-40 text-slate-600 dark:text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No expenses found</p>
          <p className="text-xs mt-1 text-slate-400">
            Try adjusting your search criteria or add a new expense.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th
                  onClick={() => onSort('date')}
                  className="px-5 py-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <ArrowUpDown
                      className={`h-3 w-3 ${sortField === 'date' ? 'text-amber-500' : 'opacity-40'}`}
                    />
                  </div>
                </th>
                <th className="px-5 py-3">Category</th>
                <th
                  onClick={() => onSort('description')}
                  className="px-5 py-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Description</span>
                    <ArrowUpDown
                      className={`h-3 w-3 ${sortField === 'description' ? 'text-amber-500' : 'opacity-40'}`}
                    />
                  </div>
                </th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Payment</th>
                <th
                  onClick={() => onSort('amount')}
                  className="px-5 py-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Amount</span>
                    <ArrowUpDown
                      className={`h-3 w-3 ${sortField === 'amount' ? 'text-amber-500' : 'opacity-40'}`}
                    />
                  </div>
                </th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {expenses.map(exp => {
                const meta = getCategoryMeta(exp.category)
                return (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-700/20 transition-colors group"
                  >
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                      {formatDate(exp.date)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-800 dark:text-white font-medium max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{exp.description}</span>
                        {exp.recurrence && exp.recurrence !== 'one_time' && (
                          <span
                            title={`Recurring: ${exp.recurrence}`}
                            className="inline-flex items-center text-slate-400 dark:text-slate-500"
                          >
                            <Repeat className="h-3 w-3" />
                          </span>
                        )}
                        {exp.notes && (
                          <span title={exp.notes} className="inline-flex items-center text-slate-400">
                            <FileText className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                      {exp.vendor ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 capitalize text-xs">
                      {exp.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      −{formatCurrency(exp.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center gap-1 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(exp)}
                          title="Edit expense"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(exp.id)}
                          title="Delete expense"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}