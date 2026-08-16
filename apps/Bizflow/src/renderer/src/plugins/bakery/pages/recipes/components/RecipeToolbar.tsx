import React from 'react'
import { Search, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void
  onOpenCreate: () => void
}

export const RecipeToolbar: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  onOpenCreate,
}) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('bakerySearchRecipesPlaceholder') || 'Search recipes by name, notes, or ingredient…'}
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* New Recipe Action */}
      <button
        onClick={onOpenCreate}
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 shrink-0"
      >
        <Plus className="h-4 w-4" />
        <span>{t('bakeryNewRecipe') || 'Create Recipe'}</span>
      </button>
    </div>
  )
}