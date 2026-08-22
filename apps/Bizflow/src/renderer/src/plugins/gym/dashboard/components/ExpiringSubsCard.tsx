import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowRight, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ExpiringSubscription } from '../types'
import { getDaysRemaining } from '../utils'

interface Props {
  subscriptions: ExpiringSubscription[]
}

export const ExpiringSubsCard: React.FC<Props> = ({ subscriptions }) => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-slate-800/90 p-4 shadow-sm">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock size={14} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('gymExpiringPanel') ?? 'Expiring Subscriptions'}
              </span>
              <p className="text-[10px] text-slate-400">Expiring in the next 7 calendar days</p>
            </div>
            {subscriptions.length > 0 && (
              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {subscriptions.length}
              </span>
            )}
          </div>

          <button
            onClick={() => navigate('/gym/subscriptions')}
            className="inline-flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-600 font-semibold"
          >
            <span>Manage</span>
            <ArrowRight size={11} />
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1.5">
              <ShieldCheck size={16} />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No imminent expirations
            </p>
            <p className="text-[10px] text-slate-400">All current tiers remain in good standing.</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-44 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-700/60">
            {subscriptions.slice(0, 5).map((s) => {
              const days = getDaysRemaining(s.endDate)
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {s.trainee?.name ?? 'Anonymous Member'}
                    </p>
                    <p className="text-[10px] text-slate-400">{s.plan?.name ?? 'Standard Membership'}</p>
                  </div>

                  <div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        days <= 1
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {subscriptions.length > 5 && (
        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 text-center">
          <p className="text-[10px] text-slate-400">+{subscriptions.length - 5} more queued for renewal</p>
        </div>
      )}
    </div>
  )
}