import { Trainee } from '../../types'
import { formatSubDate } from '../../utils'

interface TabHistoryProps {
  trainee: Trainee
}

export function TabHistory({ trainee }: TabHistoryProps) {
  return (
    <div className="space-y-5">
      {/* Subscriptions Log */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Membership History
        </h4>
        {(!trainee.subscriptions || trainee.subscriptions.length === 0) ? (
          <p className="text-xs text-slate-400 py-3">No recorded memberships.</p>
        ) : (
          <div className="space-y-2">
            {trainee.subscriptions.map(sub => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 px-4 py-2.5 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {sub.plan?.name || 'Subscription Plan'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatSubDate(sub.startDate)} → {formatSubDate(sub.endDate)}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Check-ins timeline */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Recent Check-Ins & Visits
        </h4>
        {(!trainee.sessions || trainee.sessions.length === 0) ? (
          <p className="text-xs text-slate-400 py-3">No recorded visits.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-56 overflow-y-auto">
            {trainee.sessions.slice(0, 30).map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between py-2 text-xs text-slate-600 dark:text-slate-300"
              >
                <span className="font-mono">{formatSubDate(s.date)}</span>
                <span className="capitalize text-slate-400">
                  {s.type === 'walkin' ? '🚶 Walk-In' : '✅ Subscription Visit'}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {(s.amount ?? 0) > 0 ? `$${s.amount?.toFixed(2)}` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}