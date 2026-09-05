import { CalendarDays, Trash2, Loader2 } from 'lucide-react'
import { Session } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface SessionListProps {
  sessions: Session[]
  loading: boolean
  isToday: boolean
  onDeleteSession: (session: Session) => void
}

export function SessionList({ sessions, loading, isToday, onDeleteSession }: SessionListProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {sessions.length > 0
              ? `${sessions.length} Logged Check-Ins`
              : t('gymNoCheckinsYet') || 'No Check-Ins'}
          </h3>
          <p className="text-[11px] text-slate-400">Activity timeline for this date</p>
        </div>
        {loading && <Loader2 size={15} className="animate-spin text-orange-500" />}
      </div>

      {/* List / Empty State */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <CalendarDays size={40} className="mb-2.5 opacity-20" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {isToday ? t('gymNoCheckInsToday') || 'No check-ins logged today yet' : t('gymNoCheckInsDay') || 'No check-ins on this date'}
          </p>
          {isToday && (
            <p className="text-xs text-slate-400 mt-0.5">
              {t('gymQuickCheckInDescription') || 'Search members or register quick paid visits'}.{' '}
              {t('gymUseQuickCheckin') || 'Use the Express Check-In box above to register visits.'}
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[480px] overflow-y-auto">
          {sessions.map((s, idx) => {
            const time = new Date(s.date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
            const isSub = s.type === 'subscription_visit'
            const isAnon = s.type === 'walkin' && !s.traineeId
            const isMember = s.type === 'walkin' && s.traineeId

            const badgeConfig = isSub
              ? { label: 'Subscription', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' }
              : isMember
              ? { label: 'Member Walk-in', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
              : { label: 'Guest Walk-in', cls: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' }

            return (
              <div
                key={s.id || idx}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors group"
              >
                <span className="text-xs font-mono text-slate-400 w-16 shrink-0">{time}</span>

                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {(s.trainee?.name ?? (isAnon ? 'G' : 'W')).charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {s.trainee?.name ?? <span className="italic text-slate-400">Guest Visitor</span>}
                  </p>
                  {s.notes && <p className="text-xs text-slate-400 truncate">{s.notes}</p>}
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeConfig.cls}`}
                >
                  {badgeConfig.label}
                </span>

                {(s.amount ?? 0) > 0 ? (
                  <div className="text-right shrink-0 min-w-[60px]">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                      {s.amount?.toFixed(2)}
                    </span>
                    {s.paymentMethod && (
                      <span className="block text-[9px] text-slate-400 capitalize">
                        {s.paymentMethod}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-300 dark:text-slate-600 tabular-nums shrink-0 min-w-[60px] text-right">
                    —
                  </span>
                )}

                <button
                  onClick={() => onDeleteSession(s)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                  title="Delete record"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}