import React from 'react'
import { Receipt, Pencil, Trash2, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { CATEGORY_BADGES } from '../constants'
import { getCategoryLabel, getPaymentMethodLabel, getRecurrenceLabel, formatDate, formatMoney } from '../utils'
import type { Expense } from '../types'

interface Props {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onAdd: () => void
}

export const ExpenseTable: React.FC<Props> = ({ expenses, onEdit, onDelete, onAdd }) => {
  const { t, language } = useLanguage()
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mb-3 shadow-xs">
          <Receipt className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {t('noExpensesFound') || 'No expense records found'}
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Keep track of rent, medications, utilities, and clinic operating fees in one place.
        </p>
        <button
          onClick={onAdd}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{t('addExpense') || 'Record First Expense'}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full min-w-[760px] text-start text-xs">
          <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/80 text-slate-400 uppercase tracking-wider font-bold">
            <tr>
              <th className="px-5 py-3.5 text-start">{t('date') || 'Date'}</th>
              <th className="px-4 py-3.5 text-start">{t('expenseCategory') || 'Category'}</th>
              <th className="px-4 py-3.5 text-start">{t('expenseDescription') || 'Description'}</th>
              <th className="px-4 py-3.5 text-start">{t('paymentMethod') || 'Method'}</th>
              <th className="px-4 py-3.5 text-end">{t('expenseAmount') || 'Amount'}</th>
              <th className="px-4 py-3.5 text-center w-24">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
            {expenses.map((exp) => (
              <tr
                key={exp.id}
                className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
              >
                {/* Date */}
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatDate(exp.date)}
                </td>

                {/* Category Badge */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                      CATEGORY_BADGES[exp.category] ?? CATEGORY_BADGES.other
                    }`}
                  >
                    {getCategoryLabel(exp.category, language)}
                  </span>
                </td>

                {/* Description + Vendor & Recurrence */}
                <td className="px-4 py-3 min-w-[200px]">
                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-sm">
                    {exp.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {exp.vendor && (
                      <span className="text-[11px] text-slate-400 truncate">
                        • {exp.vendor}
                      </span>
                    )}
                    {exp.recurrence && exp.recurrence !== 'one_time' && (
                      <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded-md">
                        {getRecurrenceLabel(exp.recurrence, language)}
                      </span>
                    )}
                  </div>
                </td>

                {/* Payment Method */}
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap capitalize">
                  {getPaymentMethodLabel(exp.paymentMethod, language)}
                </td>

                {/* Amount */}
                <td className="px-4 py-3 text-end font-extrabold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap text-sm">
                  ${formatMoney(exp.amount)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(exp)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      title={t('edit') || 'Edit'}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(exp)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title={t('delete') || 'Delete'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer Bar */}
      <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-400">
          {expenses.length} {language === 'ar' ? 'سجل' : 'records logged'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider">{t('totalExpenses') || 'Sum'}:</span>
          <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            ${formatMoney(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  )
}