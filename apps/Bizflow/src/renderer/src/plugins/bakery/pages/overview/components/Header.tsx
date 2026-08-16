import { Flame, RefreshCw, Sunset, LineChart } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface HeaderProps {
  lastRefresh: Date | null
  loading: boolean
  onRefresh: () => void
  onOpenEOD: () => void

}

export function Header({
  lastRefresh,
  loading,
  onRefresh,
  onOpenEOD
 
}: HeaderProps) {
  const { t } = useLanguage()

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
          <Flame className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('bakeryCommandCenter')}
          </h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{todayStr}</span>
            {lastRefresh && (
              <>
                <span>•</span>
                <span>
                  {t('bakeryLastUpdated')}{' '}
                  {lastRefresh.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
       
       
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          title={t('bakeryRefreshBtn')}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={onOpenEOD}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-sm"
        >
          <Sunset className="h-4 w-4" />
          <span>{t('bakeryEndOfDay')}</span>
        </button>
      </div>
    </div>
  )
}