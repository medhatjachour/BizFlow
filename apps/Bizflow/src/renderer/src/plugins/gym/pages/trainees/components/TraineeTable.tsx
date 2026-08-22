import { Pencil, QrCode } from 'lucide-react'
import { Trainee } from '../types'
import { getTraineeSubBadge, getActiveSubscription } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface TraineeTableProps {
  trainees: Trainee[]
  onSelectTrainee: (trainee: Trainee) => void
  onEditTrainee: (trainee: Trainee, e: React.MouseEvent) => void
  onViewQr: (trainee: Trainee, e: React.MouseEvent) => void
}

export function TraineeTable({
  trainees,
  onSelectTrainee,
  onEditTrainee,
  onViewQr
}: TraineeTableProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">{t('gymTraineeName') || 'Member Name'}</th>
              <th className="px-4 py-3.5">{t('gymTraineePhone') || 'Contact Phone'}</th>
              <th className="px-4 py-3.5">{t('gymTraineeEmail') || 'Email'}</th>
              <th className="px-4 py-3.5">{t('gymTraineeSubscription') || 'Active Plan'}</th>
              <th className="px-4 py-3.5 text-center">{t('gymTraineeSessions') || 'Visits'}</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {trainees.map(trainee => {
              const badge = getTraineeSubBadge(trainee)
              const activeSub = getActiveSubscription(trainee)

              return (
                <tr
                  key={trainee.id}
                  onClick={() => onSelectTrainee(trainee)}
                  className="hover:bg-orange-500/[0.03] dark:hover:bg-orange-500/[0.05] cursor-pointer transition-colors group"
                >
                  {/* Name + Avatar */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${badge.avatarCls}`}
                      >
                        {trainee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {trainee.name}
                        </p>
                        {activeSub?.plan?.name && (
                          <p className="text-[11px] text-slate-400">{activeSub.plan.name}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                    {trainee.phone || '—'}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                    {trainee.email || '—'}
                  </td>

                  {/* Subscription Badge */}
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.badgeCls}`}>
                      {badge.label}
                    </span>
                  </td>

                  {/* Visits count */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 tabular-nums">
                      {trainee._count?.sessions ?? 0}
                    </span>
                  </td>

                  {/* Quick actions */}
                  <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={e => onEditTrainee(trainee, e)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                        title="Edit profile"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={e => onViewQr(trainee, e)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                        title="Show QR Identification"
                      >
                        <QrCode size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}