import { Snowflake, Loader2 } from 'lucide-react'
import { Subscription } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface FreezeSubscriptionModalProps {
  target: Subscription | null
  freezeDays: number
  onFreezeDaysChange: (days: number) => void
  acting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function FreezeSubscriptionModal({
  target,
  freezeDays,
  onFreezeDaysChange,
  acting,
  onClose,
  onConfirm
}: FreezeSubscriptionModalProps) {
  const { t } = useLanguage()
  if (!target) return null

  const maxAllowed = target.plan?.maxFreezeDays ?? 30

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Snowflake size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t('gymFreezeSubscription') || 'Freeze Membership'}
            </h3>
            <p className="text-xs text-slate-400">{target.trainee?.name} · {target.plan?.name}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {t('gymFreezeDesc') || 'Freezing pauses access and automatically extends the expiry date by the chosen duration.'}
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">
            {t('gymFreezeDuration') || 'Freeze Duration (Days)'}
          </label>
          <input
            type="number"
            min="1"
            max={maxAllowed}
            value={freezeDays}
            onChange={e => onFreezeDaysChange(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          {maxAllowed > 0 && (
            <p className="text-[11px] text-slate-400 mt-1">
              Plan allows a maximum of <strong>{maxAllowed} freeze days</strong>.
            </p>
          )}
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={acting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('gymCancel') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={acting || freezeDays <= 0 || freezeDays > maxAllowed}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {acting ? <Loader2 size={13} className="animate-spin" /> : null}
            <span>{t('gymFreeze') || 'Freeze Plan'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}