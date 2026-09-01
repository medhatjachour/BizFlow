import {
  CalendarClock,
  Download,
  ListChecks,
  RefreshCw,
  Receipt,
  WalletCards
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SalesTab } from '../types'

const DEFAULT_DELAY_OPTIONS = [0, 1, 3, 7, 14, 30]

interface SalesToolbarProps {
  activeTab: SalesTab
  loading: boolean
  pendingCount: number
  defaultDelayDays: number
  onTabChange: (tab: SalesTab) => void
  onRefresh: () => void
  onExport: () => void
  onDefaultDelayChange: (days: number) => void
}

export function SalesToolbar({
  activeTab,
  loading,
  pendingCount,
  defaultDelayDays,
  onTabChange,
  onRefresh,
  onExport,
  onDefaultDelayChange
}: SalesToolbarProps): JSX.Element {
  const { t } = useLanguage()

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="px-4 lg:px-6 pt-4 pb-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center">
            <Receipt size={19} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-950 dark:text-white">{t('salesUiOperations')}</h1>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {pendingCount} {t('salesUiAwaitingCompletion')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t('salesUiOperationsDescription')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'sales' && (
            <label className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
              <CalendarClock size={14} className="text-amber-500" />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{t('salesUiDefaultCompletion')}</span>
              <select
                value={defaultDelayDays}
                onChange={(event) => onDefaultDelayChange(Number(event.target.value))}
                className="bg-transparent text-[11px] font-bold text-slate-800 dark:text-white outline-none"
              >
                {DEFAULT_DELAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days === 0 ? t('salesUiImmediate') : `${days} ${t(days === 1 ? 'salesUiDay' : 'salesUiDays')}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
            title={t('refresh')}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={onExport}
            className="h-9 px-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 inline-flex items-center gap-2 text-xs font-bold"
          >
            <Download size={14} />
            {t('export')}
          </button>
        </div>
      </div>

      <nav className="px-4 lg:px-6 flex items-center gap-5 border-t border-slate-100 dark:border-slate-800/70" aria-label={t('salesUiViews')}>
        {([
          { id: 'sales', label: t('sales'), icon: ListChecks },
          { id: 'installments', label: t('installments'), icon: WalletCards }
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`relative inline-flex items-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
              activeTab === id
                ? 'text-slate-950 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={14} />
            {label}
            {activeTab === id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />}
          </button>
        ))}
      </nav>
    </header>
  )
}
