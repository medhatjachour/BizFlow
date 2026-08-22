import { Phone, Mail, Calendar, User, MapPin, AlertCircle, Dumbbell } from 'lucide-react'
import { Trainee } from '../../types'
import { getActiveSubscription, formatSubDate } from '../../utils'

interface TabInfoProps {
  trainee: Trainee
}

export function TabInfo({ trainee }: TabInfoProps) {
  const activeSub = getActiveSubscription(trainee)

  let daysRemaining = 0
  let totalDuration = 0
  let progressPercent = 0

  if (activeSub) {
    const start = new Date(activeSub.startDate).getTime()
    const end = new Date(activeSub.endDate).getTime()
    totalDuration = Math.max(1, Math.ceil((end - start) / 86_400_000))
    daysRemaining = Math.ceil((end - Date.now()) / 86_400_000)
    progressPercent = Math.max(0, Math.min(100, ((totalDuration - Math.max(0, daysRemaining)) / totalDuration) * 100))
  }

  return (
    <div className="space-y-4">
      {/* Active Subscription Progress Card */}
      {activeSub ? (
        <div className="rounded-2xl border border-orange-200/80 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/60 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} className="text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {activeSub.plan?.name || 'Active Membership'}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
              {activeSub.status}
            </span>
          </div>

          {activeSub.status === 'active' && (
            <div className="space-y-1.5">
              <div className="h-2 bg-orange-200/50 dark:bg-orange-900/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                <span>From {formatSubDate(activeSub.startDate)}</span>
                <span className="text-orange-600 dark:text-orange-400">
                  {Math.max(0, daysRemaining)} days left (until {formatSubDate(activeSub.endDate)})
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-orange-200/50 dark:border-orange-800/30 text-xs text-slate-500">
            <span>Coach: {activeSub.coach?.name || 'Self-guided'}</span>
            <span>Paid: {activeSub.amountPaid != null ? `$${activeSub.amountPaid.toFixed(2)}` : '—'}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-5 text-center text-xs text-slate-400">
          No current subscription assigned.
        </div>
      )}

      {/* Member Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Phone, label: 'Phone', value: trainee.phone },
          { icon: Mail, label: 'Email', value: trainee.email },
          {
            icon: Calendar,
            label: 'Date of Birth',
            value: trainee.dateOfBirth ? formatSubDate(trainee.dateOfBirth) : null
          },
          {
            icon: User,
            label: 'Gender',
            value: trainee.gender ? trainee.gender.toUpperCase() : null
          }
        ].map((item, idx) => {
          const Icon = item.icon
          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60"
            >
              <div className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-400">
                <Icon size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {item.value || '—'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {trainee.address && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <MapPin size={14} className="text-slate-400 shrink-0" />
          <span>{trainee.address}</span>
        </div>
      )}

      {/* Emergency Contact Pill */}
      {(trainee.emergencyContact || trainee.emergencyPhone) && (
        <div className="rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 p-3.5 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 mt-0.5">
            <AlertCircle size={15} />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Emergency Contact</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">
              {trainee.emergencyContact || '—'} · {trainee.emergencyPhone || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      {trainee.notes && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-400 block text-[10px] uppercase mb-1">Health & Fitness Notes</span>
          {trainee.notes}
        </div>
      )}
    </div>
  )
}