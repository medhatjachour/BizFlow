import { Pencil, QrCode, Phone, Mail, Calendar } from 'lucide-react'
import { Trainee } from '../types'
import { getTraineeSubBadge, getActiveSubscription } from '../utils'

interface TraineeCardGridProps {
  trainees: Trainee[]
  onSelectTrainee: (trainee: Trainee) => void
  onEditTrainee: (trainee: Trainee, e: React.MouseEvent) => void
  onViewQr: (trainee: Trainee, e: React.MouseEvent) => void
}

export function TraineeCardGrid({
  trainees,
  onSelectTrainee,
  onEditTrainee,
  onViewQr
}: TraineeCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {trainees.map(trainee => {
        const badge = getTraineeSubBadge(trainee)
        const activeSub = getActiveSubscription(trainee)

        return (
          <div
            key={trainee.id}
            onClick={() => onSelectTrainee(trainee)}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm hover:border-orange-300 dark:hover:border-orange-500/40 cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${badge.avatarCls}`}
                  >
                    {trainee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-tight">
                      {trainee.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {activeSub?.plan?.name ?? 'No Plan'}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.badgeCls}`}>
                  {badge.label}
                </span>
              </div>

              {/* Metadata */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-slate-400" />
                  <span className="font-mono text-[11px]">{trainee.phone || 'No phone number'}</span>
                </div>
                {trainee.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-slate-400" />
                    <span className="truncate text-[11px]">{trainee.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Stats & Action */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar size={12} />
                <span>{trainee._count?.sessions ?? 0} total visits</span>
              </div>

              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={e => onEditTrainee(trainee, e)}
                  className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={e => onViewQr(trainee, e)}
                  className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                >
                  <QrCode size={13} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}