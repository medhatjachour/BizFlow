import { Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  searchQuery: string
  onSearchChange: (value: string) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  page: number
  totalCount: number
  totalPages: number
  startIndex: number
  endIndex: number
  hasMore: boolean
  onPageChange: (page: number) => void
}

export function CustomerSearchBar({
  searchQuery, onSearchChange,
  pageSize, onPageSizeChange,
  page, totalCount, totalPages,
  startIndex, endIndex, hasMore,
  onPageChange
}: Props) {
  const { t } = useLanguage()

  return (
    <div className="glass-card p-4">
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder={t('searchCustomers')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-field w-full pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 dark:text-slate-400">{t('perPage')}:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="input-field w-24"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>
            {t('showingCustomers')} {startIndex} - {endIndex} / {totalCount}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(0)}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('first')}
            </button>
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('previous')}
            </button>
            <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium">
              {t('page')} {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('next')}
            </button>
            <button
              onClick={() => onPageChange(totalPages - 1)}
              disabled={!hasMore}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('last')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
