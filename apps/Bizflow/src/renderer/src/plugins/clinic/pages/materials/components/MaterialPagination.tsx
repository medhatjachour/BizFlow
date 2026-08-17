import React from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PAGE_SIZE_OPTIONS } from '../constants'

interface Props {
  page: number
  pageSize: number
  total: number
  count: number
  hasMore: boolean
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}

export const MaterialPagination: React.FC<Props> = ({
  page,
  pageSize,
  total,
  count,
  hasMore,
  onPageChange,
  onPageSizeChange
}) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1">
      <div className="text-xs font-semibold text-slate-400">
        {t('clinicMaterialShowing') || 'Showing'} {count === 0 ? 0 : (page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, total)} {t('clinicMaterialOf') || 'of'} {total} records
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-400">{t('rowsPerPage') || 'Rows'}:</label>
        <select
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          {t('clinicMaterialPrevious') || 'Previous'}
        </button>

        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
          {page}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore}
          className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          {t('clinicMaterialNext') || 'Next'}
        </button>
      </div>
    </div>
  )
}