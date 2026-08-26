import { Pencil, Trash2 } from 'lucide-react'
import { ExpenseRecord } from '../types'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants'
import { formatExpenseMoney, formatExpenseDate } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ExpenseTableViewProps {
  expenses: ExpenseRecord[]
  onEdit: (e: ExpenseRecord) => void
  onDelete: (e: ExpenseRecord) => void
}

export function ExpenseTableView({ expenses, onEdit, onDelete }: ExpenseTableViewProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left rtl:text-right">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">{isAr ? 'التاريخ' : 'Date'}</th>
              <th className="py-3 px-4">{isAr ? 'الفئة' : 'Category'}</th>
              <th className="py-3 px-4">{isAr ? 'بيان المصروف' : 'Description'}</th>
              <th className="py-3 px-4">{isAr ? 'المورد / المستفيد' : 'Vendor'}</th>
              <th className="py-3 px-4">{isAr ? 'طريقة الدفع' : 'Payment'}</th>
              <th className="py-3 px-4 text-right rtl:text-left">{isAr ? 'المبلغ' : 'Amount'}</th>
              <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {expenses.map((exp) => {
              const cat = EXPENSE_CATEGORIES.find((c) => c.id === exp.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
              const Icon = cat.icon
              const pm = PAYMENT_METHODS.find((p) => p.id === exp.paymentMethod)

              return (
                <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatExpenseDate(exp.date, language)}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cat.tone}`}>
                      <Icon size={12} />
                      <span>{isAr ? cat.labelAr : cat.labelEn}</span>
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-[260px]">{exp.description}</p>
                    {exp.notes && <p className="text-[10px] text-slate-400 truncate max-w-[260px]">{exp.notes}</p>}
                  </td>

                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[150px]">
                    {exp.vendor || '—'}
                  </td>

                  <td className="py-3 px-4">
                    {pm ? (
                      <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                        {isAr ? pm.labelAr : pm.labelEn}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right rtl:text-left font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                    −{formatExpenseMoney(exp.amount)}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(exp)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title={isAr ? 'تعديل' : 'Edit'}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(exp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={14} />
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