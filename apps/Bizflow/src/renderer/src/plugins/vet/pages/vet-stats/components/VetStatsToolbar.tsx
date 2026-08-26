import { RefreshCw, Calendar } from 'lucide-react'
import { PeriodPreset } from '../types'
import { PERIOD_PRESETS } from '../constants'
import { StatsHelpTooltip } from './StatsHelpTooltip'
import DateField from '@renderer/components/DateField'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface VetStatsToolbarProps {
  period: PeriodPreset
  onPeriodChange: (p: PeriodPreset) => void
  customFrom?: string
  customTo?: string
  onCustomChange: (from?: string, to?: string) => void
  onRefresh: () => void
  isRefreshing: boolean
}

export function VetStatsToolbar({
  period,
  onPeriodChange,
  customFrom = '',
  customTo = '',
  onCustomChange,
  onRefresh,
  isRefreshing
}: VetStatsToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-sm transition-all">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
          {PERIOD_PRESETS.map((p) => {
            const active = period === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPeriodChange(p.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  active
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {t(p.labelKey) || p.fallback}
              </button>
            )
          })}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-200">
            <Calendar size={14} className="text-violet-500" />
            <DateField
              value={customFrom}
              onChange={(val) => onCustomChange(val, customTo)}
              wrapperClassName="w-32"
              className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400 text-xs font-semibold">–</span>
            <DateField
              value={customTo}
              onChange={(val) => onCustomChange(customFrom, val)}
              wrapperClassName="w-32"
              className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            />
          </div>
        )}

        <StatsHelpTooltip />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-violet-500' : ''} />
          <span>{t('vetRefresh') || 'Sync Live'}</span>
        </button>
      </div>
    </div>
  )
}