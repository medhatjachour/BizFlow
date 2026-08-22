import { Snowflake, RotateCcw, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { Subscription } from '../types'
import { STATUS_CONFIG } from '../constants'
import { calculateSubscriptionProgress, formatDateLabel } from '../utils'

interface SubscriptionTableProps {
  subscriptions: Subscription[]
  actingId: string | null
  onFreezeClick: (sub: Subscription) => void
  onUnfreezeClick: (id: string) => void
  onRenewClick: (sub: Subscription) => void
  onDeleteClick: (sub: Subscription) => void
}

export function SubscriptionTable({
  subscriptions,
  actingId,
  onFreezeClick,
  onUnfreezeClick,
  onRenewClick,
  onDeleteClick
}: SubscriptionTableProps) {

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Member</th>
              <th className="px-4 py-3.5">Plan & Duration</th>
              <th className="px-4 py-3.5">Assigned Coach</th>
              <th className="px-4 py-3.5">Validity Dates</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-4 py-3.5 text-right">Paid</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {subscriptions.map(s => {
              const progress = calculateSubscriptionProgress(s)
              const statusConfig = STATUS_CONFIG[s.status] || STATUS_CONFIG.expired
              const isActing = actingId === s.id

              return (
                <tr
                  key={s.id}
                  className="hover:bg-orange-500/[0.03] dark:hover:bg-orange-500/[0.05] transition-colors group"
                >
                  {/* Member */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-black shrink-0">
                        {(s.trainee?.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">
                          {s.trainee?.name ?? '—'}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {s.trainee?.phone || 'No phone'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {s.plan?.name ?? '—'}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {s.plan?.durationDays ?? 30} days
                    </span>
                  </td>

                  {/* Coach */}
                  <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                    {s.coach?.name || <span className="text-slate-400 italic">No Coach</span>}
                  </td>

                  {/* Dates & countdown */}
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <div>
                      {formatDateLabel(s.startDate)} → {formatDateLabel(s.endDate)}
                    </div>
                    {s.status === 'active' && (
                      <span className={`text-[10px] font-bold ${progress.isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                        {progress.daysRemaining} days remaining
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusConfig.badgeCls}`}>
                      {statusConfig.label}
                    </span>
                  </td>

                  {/* Amount Paid */}
                  <td className="px-4 py-3.5 text-right font-bold text-xs text-slate-900 dark:text-white tabular-nums">
                    {s.amountPaid != null ? `$${s.amountPaid.toFixed(2)}` : '—'}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {s.status === 'active' && (
                        <button
                          onClick={() => onFreezeClick(s)}
                          disabled={isActing}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                          title="Freeze Subscription"
                        >
                          <Snowflake size={13} />
                        </button>
                      )}

                      {s.status === 'frozen' && (
                        <button
                          onClick={() => onUnfreezeClick(s.id)}
                          disabled={isActing}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                          title="Reactivate Subscription"
                        >
                          {isActing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        </button>
                      )}

                      {(s.status === 'expired' || s.status === 'cancelled' || progress.isExpiringSoon) && (
                        <button
                          onClick={() => onRenewClick(s)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                          title="Renew Membership"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteClick(s)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Delete record"
                      >
                        <Trash2 size={13} />
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