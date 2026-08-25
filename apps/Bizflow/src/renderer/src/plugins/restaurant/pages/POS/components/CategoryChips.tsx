import React from 'react'
import { Search } from 'lucide-react'

interface Props {
  categories: string[]
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
}

export const CategoryChips: React.FC<Props> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {/* Horizontal Category Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30 scale-102'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'ALL' ? 'All Dishes' : cat}
            </button>
          ))}
        </div>

        {/* Quick Search Box */}
        <div className="relative w-40 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>
      </div>
    </div>
  )
}