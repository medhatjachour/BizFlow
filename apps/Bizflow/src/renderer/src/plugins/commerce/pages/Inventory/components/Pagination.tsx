/**
 * Pagination Component
 * Displays pagination controls with page numbers and navigation
 */

import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: Props) {
  const { t } = useLanguage()
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT') return

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        onPageChange(currentPage - 1)
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        onPageChange(currentPage + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages, onPageChange])

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7 // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          {t('inventoryUiShowing')} {totalItems} {t(totalItems === 1 ? 'inventoryUiItem' : 'inventoryUiItems')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Items info */}
      <div className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {t('inventoryUiShowing')} <span className="font-medium text-slate-900 dark:text-white">{startItem}</span> {t('inventoryUiTo')}{' '}
        <span className="font-medium text-slate-900 dark:text-white">{endItem}</span> {t('inventoryUiOf')}{' '}
        <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> {t('inventoryUiItems')}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between sm:justify-end gap-1 w-full sm:w-auto">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center justify-center transition-colors"
          title={t('inventoryUiFirstPage')}
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center justify-center transition-colors"
          title={t('inventoryUiPreviousPage')}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        <div className="hidden md:flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page)}
                className={`min-w-8 h-8 px-2 rounded-md text-[11px] font-bold transition-colors ${
                  currentPage === page
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                {page}
              </span>
            )
          ))}
        </div>

        <span className="md:hidden text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          {t('inventoryUiPage')} {currentPage} {t('inventoryUiOf')} {totalPages}
        </span>

        {/* Next page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center justify-center transition-colors"
          title={t('inventoryUiNextPage')}
        >
          <ChevronRight size={14} />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center justify-center transition-colors"
          title={t('inventoryUiLastPage')}
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}
