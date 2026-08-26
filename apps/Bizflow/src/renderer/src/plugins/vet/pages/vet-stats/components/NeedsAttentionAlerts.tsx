import { ChevronRight } from 'lucide-react'
import { AttentionAlert } from '../types'
import { ALERT_TONE_STYLES } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface NeedsAttentionAlertsProps {
  alerts: AttentionAlert[]
  onNavigate?: (tab: string) => void
}

export function NeedsAttentionAlerts({ alerts, onNavigate }: NeedsAttentionAlertsProps) {
  const { t } = useLanguage()

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {t('vetNeedsAttention') || 'Action Required'}
        </h2>
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 rounded-full px-2 py-0.5">
          {alerts.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map((alert) => {
          const Icon = alert.icon
          const styles = ALERT_TONE_STYLES[alert.tone]
          const isClickable = Boolean(onNavigate)

          return (
            <button
              key={alert.key}
              type="button"
              disabled={!isClickable}
              onClick={() => onNavigate?.(alert.tab)}
              className={`group flex items-center gap-3.5 text-left rounded-2xl border p-3.5 transition-all duration-150 ${styles.container} ${
                isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
              }`}
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${styles.icon}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{alert.title}</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{alert.sub}</p>
              </div>
              {isClickable && (
                <ChevronRight
                  size={16}
                  className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-transform shrink-0"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}