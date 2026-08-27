import React from 'react'
import { User, UserPlus, UserCheck, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { INPUT_BASE_CLS } from '../constants'
import type { CustomerLite } from '../types'

interface Props {
  selectedCustomer: CustomerLite | null
  search: string
  results: CustomerLite[]
  searching: boolean
  dropdownOpen: boolean
  onSearchChange: (q: string) => void
  onSelect: (c: CustomerLite) => void
  onClear: () => void
  onOpenNewModal: () => void
  setDropdownOpen: (open: boolean) => void
}

export const CustomerSelector: React.FC<Props> = ({
  selectedCustomer,
  search,
  results,
  searching,
  dropdownOpen,
  onSearchChange,
  onSelect,
  onClear,
  onOpenNewModal,
  setDropdownOpen
}) => {
  const { t } = useLanguage()

  if (selectedCustomer) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-xl border border-violet-200 dark:border-violet-800/80 bg-violet-50/50 dark:bg-violet-950/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
            <UserCheck size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {selectedCustomer.name}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{selectedCustomer.phone}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => {
              onSearchChange(e.target.value)
              setDropdownOpen(true)
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder={t('vetSearchCustomer') || 'Link client / owner…'}
            className={`${INPUT_BASE_CLS} pl-8 py-1.5`}
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />
          )}
        </div>
        <button
          type="button"
          onClick={onOpenNewModal}
          className="p-2 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-xl transition-colors shrink-0"
          title="New Client"
        >
          <UserPlus size={14} />
        </button>
      </div>

      {dropdownOpen && search.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto">
          {results.length === 0 && !searching ? (
            <div className="p-3 text-center text-xs text-slate-400">No client found</div>
          ) : (
            results.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => onSelect(c)}
                className="w-full text-left px-3.5 py-2 hover:bg-violet-50 dark:hover:bg-violet-950/30 border-b border-slate-100 dark:border-slate-700/50 last:border-none"
              >
                <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                <p className="text-[10px] text-slate-400">{c.phone}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}