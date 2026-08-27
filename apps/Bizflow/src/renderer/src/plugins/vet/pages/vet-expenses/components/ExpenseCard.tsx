import { Pencil, Trash2, Calendar, User, CreditCard } from 'lucide-react'
import { ExpenseRecord } from '../types'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants'
import { formatExpenseMoney, formatExpenseDate } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ExpenseCardProps {
  expense: ExpenseRecord
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const cat = EXPENSE_CATEGORIES.find((c) => c.id === expense.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  const Icon = cat.icon
  const pm = PAYMENT_METHODS.find((p) => p.id === expense.paymentMethod)

  return (
    <div className="group relative bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.tone}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.tone}`}>
                {isAr ? cat.labelAr : cat.labelEn}
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-1 truncate" title={expense.description}>
                {expense.description}
              </h4>
            </div>
          </div>

          <p className="text-base font-black text-rose-600 dark:text-rose-400 shrink-0">
            −{formatExpenseMoney(expense.amount)}
          </p>
        </div>

        {/* Metadata */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" />
              {formatExpenseDate(expense.date, language)}
            </span>
            {pm && (
              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                <CreditCard size={11} /> {isAr ? pm.labelAr : pm.labelEn}
              </span>
            )}
          </div>

          {expense.vendor && (
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
              <User size={12} className="text-slate-400 shrink-0" />
              <span className="font-semibold">{isAr ? 'المورد:' : 'Vendor:'} {expense.vendor}</span>
            </div>
          )}

          {expense.notes && (
            <p className="text-[10px] text-slate-400 italic truncate" title={expense.notes}>
              {expense.notes}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
          title={isAr ? 'تعديل' : 'Edit'}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title={isAr ? 'حذف' : 'Delete'}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}