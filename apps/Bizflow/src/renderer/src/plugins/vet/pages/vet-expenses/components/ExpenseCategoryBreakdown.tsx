import { EXPENSE_CATEGORIES } from '../constants'
import { formatExpenseMoney } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  categoryTotals: Record<string, number>
  totalExpenses: number
  onSelectCategory: (catId: string) => void
  selectedCategory: string
}

export function ExpenseCategoryBreakdown({
  categoryTotals,
  totalExpenses,
  onSelectCategory,
  selectedCategory
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const activeCategories = EXPENSE_CATEGORIES.filter((c) => (categoryTotals[c.id] || 0) > 0).sort(
    (a, b) => (categoryTotals[b.id] || 0) - (categoryTotals[a.id] || 0)
  )

  if (activeCategories.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {isAr ? 'توزيع المصاريف حسب الفئات' : 'Category Cost Distribution'}
        </h3>
        <span className="text-[11px] font-bold text-slate-500">{activeCategories.length} {isAr ? 'فئات نشطة' : 'active'}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeCategories.map((c) => {
          const Icon = c.icon
          const amount = categoryTotals[c.id] || 0
          const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
          const isSelected = selectedCategory === c.id

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(isSelected ? 'all' : c.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20 scale-105'
                  : `${c.tone} hover:shadow-sm`
              }`}
            >
              <Icon size={14} />
              <span>{isAr ? c.labelAr : c.labelEn}</span>
              <span className="font-black">{formatExpenseMoney(amount)}</span>
              <span className={`text-[10px] opacity-75 font-normal ${isSelected ? 'text-violet-200' : ''}`}>({pct}%)</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}