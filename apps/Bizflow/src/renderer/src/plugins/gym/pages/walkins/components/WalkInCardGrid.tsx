import { Trash2, User } from 'lucide-react'
import { GymSession } from '../types'
import { formatSessionDateTime, formatAmount, getSessionBadge } from '../utils'

interface WalkInCardGridProps {
  sessions: GymSession[]
  onDelete: (s: GymSession) => void
}

export function WalkInCardGrid({ sessions, onDelete }: WalkInCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {sessions.map(s => {
        const dt = formatSessionDateTime(s.date)
        const badge = getSessionBadge(s)

        return (
          <div
            key={s.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm hover:border-orange-300 dark:hover:border-orange-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${badge.avatarCls}`}
                  >
                    {(s.trainee?.name ?? 'G').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate leading-tight">
                      {s.trainee?.name || 'Guest Visitor'}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {dt.date} · {dt.time}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.badgeCls}`}>
                  {badge.label}
                </span>
              </div>

              {s.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 mb-2">
                  “{s.notes}”
                </p>
              )}

              {s.coach && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <User size={12} />
                  <span>Coach: {s.coach.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-1">
                <span className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
                  {formatAmount(s.amount)}
                </span>
                {(s.amount ?? 0) > 0 && s.paymentMethod && (
                  <span className="text-[10px] text-slate-400 capitalize">
                    ({s.paymentMethod})
                  </span>
                )}
              </div>

              <button
                onClick={() => onDelete(s)}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                title="Remove entry"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}