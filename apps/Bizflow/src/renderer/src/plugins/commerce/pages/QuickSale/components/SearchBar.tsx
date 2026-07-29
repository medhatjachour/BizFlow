import { Search, Info } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { BARCODE_PATTERNS } from '@/shared/constants'


import type { Ref } from 'react'

type SearchBarProps = {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus: () => void
  isSearching: boolean
  searchInputRef: Ref<HTMLInputElement>
  children?: React.ReactNode
}

export function SearchBar({
  searchQuery,
  onSearchQueryChange,
  onKeyDown,
  onFocus,
  isSearching,
  searchInputRef,
  children,
}: SearchBarProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
            size={18}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder={t('searchProductsPlaceholder')}
            className="w-full pl-10 pr-24 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            autoComplete="off"
          />
        </div>

        <div className="relative group">
          <Info size={20} className="text-slate-400 hover:text-primary cursor-help" />
          <div
            className="absolute inset-x-0 top-8 w-72 max-w-[calc(100vw-2rem)] mx-auto p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50
                        ltr:right-0 ltr:left-auto
                        rtl:left-0 rtl:right-auto
                        sm:inset-x-auto sm:w-72
                        sm:ltr:right-0 sm:ltr:left-auto
                        sm:rtl:left-0 sm:rtl:right-auto"
          >
            <div className="font-semibold mb-2">📱 Barcode Scanner Usage:</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>{t('toScanQuick')}:</strong> {t('scanningAdv')}
              </li>
              <li>
                <strong>{t('toTypeQuick')}:</strong> {t('typingAdv')}
              </li>
              <li>
                <strong>{t('QuickTipQuick')}:</strong> {t('quickTipAdv')}
              </li>
            </ul>
          </div>
        </div>

        {isSearching && (
          <div className="absolute right-14 top-1/2 -translate-y-1/2 z-10">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {BARCODE_PATTERNS.isBarcode(searchQuery) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded text-xs font-medium text-primary">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18"
              />
            </svg>
            Barcode
          </div>
        )}

        {children}
      </div>
    </div>
  )
}