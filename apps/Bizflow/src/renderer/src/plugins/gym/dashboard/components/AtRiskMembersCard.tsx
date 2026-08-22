import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Phone, ArrowRight, UserCheck } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { AtRiskMember } from '../types'

interface Props {
  members: AtRiskMember[]
}

export const AtRiskMembersCard: React.FC<Props> = ({ members }) => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-slate-800/90 p-4 shadow-sm">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={14} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('gymAtRiskPanel') ?? 'At-Risk Members'}
              </span>
              <p className="text-[10px] text-slate-400">Absent for over 14 consecutive days</p>
            </div>
            {members.length > 0 && (
              <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
                {members.length}
              </span>
            )}
          </div>

          <button
            onClick={() => navigate('/gym/members?status=inactive')}
            className="inline-flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-600 font-semibold"
          >
            <span>View All</span>
            <ArrowRight size={11} />
          </button>
        </div>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
              <UserCheck size={16} />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Retention rate is optimal
            </p>
            <p className="text-[10px] text-slate-400">All active members visited recently.</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-44 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-700/60">
            {members.slice(0, 5).map((m) => (
              <div
                key={m.traineeId}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{m.name}</p>
                  <p className="text-[10px] text-slate-400">{m.planName ?? 'Standard Plan'}</p>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                    {m.daysSince >= 999 ? 'Never' : `${m.daysSince}d ago`}
                  </span>

                  {m.phone && (
                    <a
                      href={`tel:${m.phone}`}
                      title={`Call ${m.name}`}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-colors"
                    >
                      <Phone size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {members.length > 5 && (
        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 text-center">
          <p className="text-[10px] text-slate-400">+{members.length - 5} additional inactive members</p>
        </div>
      )}
    </div>
  )
}