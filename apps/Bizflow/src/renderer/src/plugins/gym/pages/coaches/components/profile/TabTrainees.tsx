import { CoachStats } from '../../types'
import { SUB_STATUS_STYLES } from '../../constants'
import { formatDateLabel } from '../../utils'

interface TabTraineesProps {
  stats: CoachStats | null
  loading: boolean
}

export function TabTrainees({ stats, loading }: TabTraineesProps) {
  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading client roster…</div>
  }

  const subscriptions = stats?.subscriptions ?? []

  if (subscriptions.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-400">
        No trainees are currently assigned to this coach.
      </div>
    )
  }

  const sorted = [...subscriptions].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1
    if (b.status === 'active' && a.status !== 'active') return 1
    return 0
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
        <span>Assigned Trainees</span>
        <span>{sorted.length} Total</span>
      </div>

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {sorted.map(sub => {
          const statusConfig = SUB_STATUS_STYLES[sub.status] || SUB_STATUS_STYLES.cancelled

          return (
            <div
              key={sub.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-black shrink-0">
                  {(sub.trainee?.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {sub.trainee?.name ?? 'Unknown Member'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {[sub.trainee?.phone, sub.plan?.name].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConfig.cls}`}>
                  {statusConfig.label}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {sub.status === 'active'
                    ? `Expires ${formatDateLabel(sub.endDate)}`
                    : `Ended ${formatDateLabel(sub.endDate)}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}