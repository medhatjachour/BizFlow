import { Snowflake, RotateCcw, RefreshCw, Trash2, Calendar, User, Loader2 } from 'lucide-react'
import { Subscription } from '../types'
import { STATUS_CONFIG } from '../constants'
import { calculateSubscriptionProgress, formatDateLabel } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface SubscriptionCardProps {
  subscription: Subscription
  actingId: string | null
  onFreezeClick: (sub: Subscription) => void
  onUnfreezeClick: (id: string) => void
  onRenewClick: (sub: Subscription) => void
  onDeleteClick: (sub: Subscription) => void
}

export function SubscriptionCard({
  subscription: s,
  actingId,
  onFreezeClick,
  onUnfreezeClick,
  onRenewClick,
  onDeleteClick
}: SubscriptionCardProps) {
  const { t } = useLanguage()
  const progress = calculateSubscriptionProgress(s)
  const statusConfig = STATUS_CONFIG[s.status] || STATUS_CONFIG.expired
  const isActing = actingId === s.id

  return (
    <div
      className={`bg-white p-4 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4.5 shadow-sm transition-all duration-200 group flex flex-col justify-between ${statusConfig.borderCls}`}
    >
      <div>
        {/* Header / Trainee Name & Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-black shrink-0">
              {(s.trainee?.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate leading-tight">
                {s.trainee?.name ?? '—'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {s.trainee?.phone || 'No phone registered'}
              </p>
            </div>
          </div>

          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${statusConfig.badgeCls}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Plan & Coach tags */}
        <div className="flex items-center gap-2 flex-wrap mb-3 text-xs">
          <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold border border-orange-500/20">
            {s.plan?.name ?? 'Plan'}
          </span>
          {s.coach && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md font-medium">
              <User size={11} /> {s.coach.name}
            </span>
          )}
        </div>

        {/* Dates & Timeline Info */}
        <div className="space-y-1.5 py-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar size={12} /> {formatDateLabel(s.startDate)} → {formatDateLabel(s.endDate)}
            </span>
            {s.status === 'active' && (
              <span className={`text-xs font-bold ${progress.isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {progress.daysRemaining >= 0 ? `${progress.daysRemaining}d left` : 'Expired'}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {(s.status === 'active' || s.status === 'expired') && (
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress.progressColorClass}`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {s.amountPaid != null ? `$${s.amountPaid.toFixed(2)}` : '—'}
        </span>

        <div className="flex items-center gap-1.5">
          {s.status === 'active' && (
            <button
              onClick={() => onFreezeClick(s)}
              disabled={isActing}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
            >
              <Snowflake size={12} />
              <span>{t('gymFreeze') || 'Freeze'}</span>
            </button>
          )}

          {s.status === 'frozen' && (
            <button
              onClick={() => onUnfreezeClick(s.id)}
              disabled={isActing}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 transition-colors"
            >
              {isActing ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              <span>{t('gymUnfreeze') || 'Unfreeze'}</span>
            </button>
          )}

          {(s.status === 'expired' || s.status === 'cancelled' || progress.isExpiringSoon) && (
            <button
              onClick={() => onRenewClick(s)}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
            >
              <RefreshCw size={11} />
              <span>{t('gymRenew') || 'Renew'}</span>
            </button>
          )}

          <button
            onClick={() => onDeleteClick(s)}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            title="Delete subscription"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}