import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  page: number
  totalPages: number
  totalRecords: number
  onPageChange: (p: number) => void
}

export const HistoryPagination: React.FC<Props> = ({
  page,
  totalPages,
  totalRecords,
  onPageChange
}) => {
  const { t } = useLanguage()

  const getPageNumbers = () => {
    const pages: number[] = []
    let start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + 4)
    start = Math.max(1, end - 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="shrink-0 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
      <p className="text-xs text-slate-400">
        {t('vetPageLabel') || 'Page'} <strong className="text-slate-700 dark:text-slate-200">{page}</strong> of{' '}
        <strong className="text-slate-700 dark:text-slate-200">{totalPages}</strong> ·{' '}
        {totalRecords} records found
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={14} />
        </button>

        {getPageNumbers().map(pg => (
          <button
            key={pg}
            type="button"
            onClick={() => onPageChange(pg)}
            className={`w-7 h-7 text-xs font-bold rounded-xl transition-all ${
              page === pg
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {pg}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}