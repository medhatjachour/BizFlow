import { PencilLine, Trash2, Inbox } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { ExpenseRow } from '../types'
import { catMeta, payMeta } from '../constants'
import { hexToRgba, formatMoney, formatDateShort } from '../utils'

interface Props {
  rows: ExpenseRow[]
  loading: boolean
  onEdit: (e: ExpenseRow) => void
  onDelete: (id: string) => void
}

export function ExpenseTable({ rows, loading, onEdit, onDelete }: Props) {
  const {t} = useLanguage()
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 space-y-3">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 flex-1 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
          <Inbox size={28} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {t('cfNoExpensesFound')}
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t('cfTryAdjustingFiltersOrAddNewExpense')}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('cfExpenseDate')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('cfExpenseDescription')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('cfExpenseCategory')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('cfShift')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('cfExpenseAmount')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('cfActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {rows.map(expense => {
              const cat = catMeta(expense.category)
              const pay = payMeta(expense.paymentMethod)
              const CatIcon = cat.icon
              const PayIcon = pay.icon
              return (
                <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateShort(expense.date)}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {expense.description}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {expense.vendor && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {expense.vendor}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: hexToRgba('#475569', 0.1),
                          color: '#475569',
                        }}
                      >
                        <PayIcon size={10} />
                        {pay.label}
                      </span>
                    </div>
                  </td>

                  {/* Category badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: hexToRgba(cat.color, 0.12),
                        color: cat.color,
                      }}
                    >
                      <CatIcon size={12} />
                      {cat.label}
                    </span>
                  </td>

                  {/* Shift */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {expense.shift ? (
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {expense.shift.cashier?.fullName || expense.shift.cashier?.username || 'Shift'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600 italic">Unlinked</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(expense.amount)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(expense)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title="Edit"
                      >
                        <PencilLine size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
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
