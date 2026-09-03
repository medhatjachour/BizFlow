import { CalendarClock, CheckCircle2, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SaleTransaction } from '../types'

const DELAY_OPTIONS = [1, 3, 7, 14, 30]

interface SaleLifecycleControlProps {
  transaction: SaleTransaction
  updating: boolean
  onComplete: () => void
  onReschedule: (delayDays: number) => void
}

export function SaleLifecycleControl({
  transaction,
  updating,
  onComplete,
  onReschedule
}: SaleLifecycleControlProps): JSX.Element | null {
  const { t } = useLanguage()
  if (transaction.status !== 'pending') return null

  const scheduledFor = transaction.completionScheduledFor
    ? new Date(transaction.completionScheduledFor)
    : null

  return (
    <div className="min-w-[210px] rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 mb-2">
        <CalendarClock size={12} />
        <span>
          {scheduledFor
            ? `${t('salesUiCompletes')} ${scheduledFor.toLocaleDateString()}`
            : t('salesUiPendingCompletion')}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <select
          value={transaction.completionDelayDays ?? 7}
          onChange={(event) => onReschedule(Number(event.target.value))}
          disabled={updating}
          className="h-7 min-w-0 flex-1 rounded-md border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 px-2 text-[10px] font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-amber-500 disabled:opacity-50"
          aria-label={t('salesUiRescheduleCompletion')}
        >
          {DELAY_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {days} {t(days === 1 ? 'salesUiDay' : 'salesUiDays')}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onComplete}
          disabled={updating}
          className="h-7 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 text-[10px] font-bold disabled:opacity-50"
          title={t('salesUiCompleteNow')}
        >
          {updating ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
          {t('salesUiComplete')}
        </button>
      </div>
    </div>
  )
}
