import React from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { STATUS_META } from '../constants'
import type { LiveStatus } from '../types'

export const DoctorStatusLegend: React.FC = () => {
  const { t } = useLanguage()
  const statuses: LiveStatus[] = ['available', 'busy', 'off', 'on_leave', 'inactive']

  return (
    <div className="flex items-center gap-3.5 sm:gap-5 text-xs text-slate-400 flex-wrap px-1">
      {statuses.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5 font-medium">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot} ring-2 ring-white/20`} />
          <span className="text-slate-600 dark:text-slate-300">{t(`doctorStatus_${s}`) || STATUS_META[s].label}</span>
        </span>
      ))}
    </div>
  )
}