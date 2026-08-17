import React from 'react'
import { User, Activity, Calendar, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { PatientProfileData, PatientStats } from '../types'

interface Props {
  patient: PatientProfileData
  stats: PatientStats | null
}

export const MedicalHighlights: React.FC<Props> = ({ patient, stats }) => {
  const { t } = useLanguage()

  const hasAnyHighlight = Boolean(
    patient.folderNumber ||
    stats?.topDiagnosis ||
    stats?.nextFollowUp ||
    patient.medicalNotes
  )

  if (!hasAnyHighlight) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {patient.folderNumber && (
        <div className="bg-teal-50/70 dark:bg-teal-950/20 rounded-2xl p-4 border border-teal-100 dark:border-teal-900/30 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              {t('folderNumber')}
            </span>
          </div>
          <p className="text-base font-mono font-bold text-teal-800 dark:text-teal-200">#{patient.folderNumber}</p>
        </div>
      )}

      {stats?.topDiagnosis && (
        <div className="bg-violet-50/70 dark:bg-violet-950/20 rounded-2xl p-4 border border-violet-100 dark:border-violet-900/30 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              {t('commonDiagnosis')}
            </span>
          </div>
          <p className="text-sm font-semibold text-violet-800 dark:text-violet-200 line-clamp-1">{stats.topDiagnosis}</p>
        </div>
      )}

      {stats?.nextFollowUp && (
        <div className="bg-sky-50/70 dark:bg-sky-950/20 rounded-2xl p-4 border border-sky-100 dark:border-sky-900/30 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              {t('nextFollowUp')}
            </span>
          </div>
          <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">
            {new Date(stats.nextFollowUp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
      )}

      {patient.medicalNotes && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {t('medicalNotes')}
            </span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium line-clamp-2">{patient.medicalNotes}</p>
        </div>
      )}
    </div>
  )
}