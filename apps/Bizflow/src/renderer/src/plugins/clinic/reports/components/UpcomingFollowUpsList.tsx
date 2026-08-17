import React from 'react'
import { CalendarClock } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { FollowUpRecord } from '../types'

interface Props {
  followUps: FollowUpRecord[]
}

export const UpcomingFollowUpsList: React.FC<Props> = ({ followUps }) => {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={16} className="text-amber-500" />
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {t('upcomingFollowUps7Days') || 'Upcoming Follow-ups (Next 7 Days)'}
        </h4>
      </div>

      {followUps.length > 0 ? (
        <div className="space-y-2 max-h-40 overflow-y-auto [scrollbar-width:thin]">
          {followUps.slice(0, 8).map((fu) => (
            <div
              key={fu.id}
              className="flex items-center justify-between p-2.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl"
            >
              <div className="min-w-0 flex-1 me-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {fu.patient?.name || fu.patientName || 'Patient'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{fu.notes || fu.reason || 'Follow-up Consultation'}</p>
              </div>
              <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 shrink-0">
                {fu.followUpDate
                  ? new Date(fu.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '-'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <CalendarClock size={28} className="opacity-30 mb-2" />
          <p className="text-xs font-semibold">No follow-ups scheduled in the next 7 days</p>
        </div>
      )}
    </div>
  )
}