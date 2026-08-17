import React from 'react'
import { Stethoscope, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VISIT_TYPE_CONFIG } from '../constants'
import type { Session, PatientStats } from '../types'
import TimelineSession from '../../sessions/components/TimelineSession'

interface Props {
  sessions: Session[]
  stats: PatientStats | null
  onNewSession: () => void
  onEditSession: (session: Session) => void
}

export const SessionTimelineSection: React.FC<Props> = ({
  sessions,
  stats,
  onNewSession,
  onEditSession
}) => {
  const { t } = useLanguage()

  return (
    <div>
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight">
            {t('sessionHistory')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
            {stats?.firstVisit && (
              <> · Since {new Date(stats.firstVisit).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</>
            )}
          </p>
        </div>

        {/* Visit Types Legend */}
        <div className="hidden sm:flex items-center gap-3.5 flex-wrap">
          {Object.entries(VISIT_TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotCls}`} />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-700/60 flex items-center justify-center mb-3">
            <Stethoscope className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('noSessionsFound')}</p>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">This patient has no recorded sessions yet</p>
          <button
            onClick={onNewSession}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" /> {t('newSession')}
          </button>
        </div>
      ) : (
        <div className="relative">
          {sessions.map((s, idx) => (
            <TimelineSession
              key={s.id}
              session={s as any}
              isLast={idx === sessions.length - 1}
              onEdit={(session) => onEditSession(session as any)}
            />
          ))}
        </div>
      )}
    </div>
  )
}