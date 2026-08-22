import { Trash2 } from 'lucide-react'
import { GymSession } from '../types'
import { formatSessionDateTime, formatAmount, getSessionBadge } from '../utils'

interface WalkInTableProps {
  sessions: GymSession[]
  onDelete: (s: GymSession) => void
}

export function WalkInTable({ sessions, onDelete }: WalkInTableProps) {

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Time & Date</th>
              <th className="px-4 py-3.5">Attendee / Member</th>
              <th className="px-4 py-3.5">Visit Classification</th>
              <th className="px-4 py-3.5">Coach / Trainer</th>
              <th className="px-4 py-3.5 text-right">Fee</th>
              <th className="px-4 py-3.5 text-center">Payment</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {sessions.map(s => {
              const dt = formatSessionDateTime(s.date)
              const badge = getSessionBadge(s)
              const displayName = s.trainee?.name || (
                <span className="text-slate-400 italic font-medium">Guest Visitor</span>
              )

              return (
                <tr
                  key={s.id}
                  className="hover:bg-orange-500/[0.03] dark:hover:bg-orange-500/[0.05] transition-colors group"
                >
                  {/* Date & Time */}
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{dt.time}</span>
                    <span className="text-[11px] text-slate-400">{dt.date}</span>
                  </td>

                  {/* Attendee */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${badge.avatarCls}`}
                      >
                        {(s.trainee?.name ?? 'G').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">
                          {displayName}
                        </p>
                        {s.notes && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                            {s.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Classification */}
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${badge.badgeCls}`}>
                      {badge.label}
                    </span>
                  </td>

                  {/* Coach */}
                  <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                    {s.coach?.name || <span className="text-slate-400 italic">—</span>}
                  </td>

                  {/* Fee */}
                  <td className="px-4 py-3.5 text-right font-black text-xs text-slate-900 dark:text-white tabular-nums">
                    {formatAmount(s.amount)}
                  </td>

                  {/* Payment Method */}
                  <td className="px-4 py-3.5 text-center">
                    {(s.amount ?? 0) > 0 ? (
                      <span className="text-[11px] font-semibold text-slate-500 capitalize bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                        {s.paymentMethod || 'cash'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onDelete(s)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
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