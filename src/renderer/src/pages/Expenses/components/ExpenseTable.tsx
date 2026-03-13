import {
  Building2, Zap, Package, CreditCard, Briefcase,
  ShoppingBag, Wrench, Megaphone, MoreHorizontal,
  Edit2, Trash2, Receipt,
} from 'lucide-react'
import type { Expense, ExpenseCategory } from '../types'

const ICON_MAP: Record<ExpenseCategory, React.ElementType> = {
  rent:        Building2,
  utilities:   Zap,
  supplies:    Package,
  inventory:   ShoppingBag,
  marketing:   Megaphone,
  maintenance: Wrench,
  fees:        CreditCard,
  insurance:   Briefcase,
  other:       MoreHorizontal,
}

interface Props {
  expenses: (Expense & { category: ExpenseCategory })[]
  getCategoryName: (id: ExpenseCategory) => string
  getCategoryColor: (id: ExpenseCategory) => string
  onEdit: (e: Expense) => void
  onDelete: (id: string) => void
  t: (key: string) => string
}

export default function ExpenseTable({ expenses, getCategoryName, getCategoryColor, onEdit, onDelete, t }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-slate-600 dark:text-slate-400">{t('noExpensesFound')}</p>
        <p className="text-sm text-slate-500 mt-1">{t('addFirstExpense')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            {['date', 'category', 'description', 'amount', 'recordedBy', 'actions'].map(k => (
              <th
                key={k}
                className={`px-6 py-3 text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider ${
                  k === 'amount' ? 'text-right' : k === 'actions' ? 'text-center' : 'text-left'
                }`}
              >
                {t(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {expenses.map(expense => {
            const Icon = ICON_MAP[expense.category] ?? MoreHorizontal
            return (
              <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {new Date(expense.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${getCategoryColor(expense.category)}/20`}>
                      <Icon size={16} className="text-slate-900 dark:text-white" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {getCategoryName(expense.category)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                  {expense.description.replace(/^\[.*?\]\s*/, '')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    ${expense.amount.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {expense.user?.username ?? t('unknown')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(expense)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title={t('edit')}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(expense.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
