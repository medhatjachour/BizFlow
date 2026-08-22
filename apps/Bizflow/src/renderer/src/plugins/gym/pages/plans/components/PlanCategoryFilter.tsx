import { ListChecks } from 'lucide-react'
import { CATEGORIES } from '../constants'

interface PlanCategoryFilterProps {
  activeCategory: string
  onSelectCategory: (cat: string) => void
  categoryCounts: Record<string, number>
  totalPlans: number
}

export function PlanCategoryFilter({
  activeCategory,
  onSelectCategory,
  categoryCounts,
  totalPlans
}: PlanCategoryFilterProps) {
  const options = [
    { value: 'all', label: `All Plans (${totalPlans})`, icon: ListChecks },
    ...CATEGORIES.filter(c => (categoryCounts[c.value] ?? 0) > 0).map(c => ({
      ...c,
      label: `${c.label} (${categoryCounts[c.value] ?? 0})`
    }))
  ]

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {options.map(opt => {
        const Icon = opt.icon
        const isSelected = activeCategory === opt.value

        return (
          <button
            key={opt.value}
            onClick={() => onSelectCategory(opt.value)}
            className={`shrink-0 flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              isSelected
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-300 dark:hover:border-slate-600'
            }`}
          >
            <Icon size={12} />
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}