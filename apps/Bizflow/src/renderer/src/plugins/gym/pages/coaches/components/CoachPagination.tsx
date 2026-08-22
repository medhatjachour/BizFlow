import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface CoachPaginationProps {
  page: number
  totalPages: number
  onPageChange: (newPage: number) => void
}

export function CoachPagination({ page, totalPages, onPageChange }: CoachPaginationProps) {
  const { t } = useLanguage()

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-2 pt-2">
      <p className="text-xs text-slate-400">
        {t('gymPage') || 'Page'} {page + 1} {t('gymPageOf') || 'of'} {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}