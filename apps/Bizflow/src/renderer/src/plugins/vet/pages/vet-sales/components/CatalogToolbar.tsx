import React from 'react'
import { Search, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  search: string
  onSearchChange: (q: string) => void
  categories: string[]
  selectedCategory: string
  onSelectCategory: (cat: string) => void
}

export const CatalogToolbar: React.FC<Props> = ({
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  const { t } = useLanguage()

  return (
    <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 space-y-2.5">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('vetSearchMedicines') || 'Search item name, brand, or category… (F2)'}
          className="w-full pl-10 pr-9 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Horizontal Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'
              }`}
            >
              {cat === 'all' ? t('vetFilterAll') || 'All Categories' : cat}
            </button>
          )
        })}
      </div>
    </div>
  )
}