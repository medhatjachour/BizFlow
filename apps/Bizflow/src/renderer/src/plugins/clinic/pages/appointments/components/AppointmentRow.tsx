import React from 'react'
import { Loader2, PlayCircle, Check, X, Pencil, Trash2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_TYPE_COLORS } from '../constants'
import { ApptHelpTooltip } from './ApptHelpTooltip'
import type { Appointment } from '../types'

interface Props {
  appt: Appointment
  updating: boolean
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
  onViewPatient: () => void
  onStartSession: () => void
}

export const AppointmentRow: React.FC<Props> = ({
  appt,
  updating,
  onEdit,
  onDelete,
  onStatusChange,
  onViewPatient,
  onStartSession
}) => {
  const { t } = useLanguage()
  const time = new Date(appt.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const isActive = ['scheduled', 'confirmed'].includes(appt.status)

  const TYPE_LABELS: Record<string, string> = {
    consultation: t('apptTypeConsultation'),
    follow_up:    t('apptTypeFollowUp'),
    procedure:    t('apptTypeProcedure'),
    checkup:      t('apptTypeCheckup')
  }

  const STATUS_LABELS: Record<string, string> = {
    scheduled: t('apptStatusScheduled'),
    confirmed: t('apptStatusConfirmed'),
    completed: t('apptStatusCompleted'),
    cancelled: t('cancelled'),
    no_show:   t('apptStatusNoShow')
  }

  return (
    <div
      className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
        isActive
          ? 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-teal-300 dark:hover:border-teal-700/60 shadow-xs'
          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
      }`}
    >
      {/* Time Slot Badge */}
      <div className="flex-shrink-0 text-center bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 rounded-xl px-3 py-2 min-w-[62px]">
        <p className="text-xs sm:text-sm font-extrabold text-teal-700 dark:text-teal-300 leading-none">{time}</p>
        {appt.duration && <p className="text-[10px] font-semibold text-slate-400 mt-1">{appt.duration}m</p>}
      </div>

      {/* Patient & Metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <button
            onClick={onViewPatient}
            className="font-bold text-sm text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            {appt.patient.name}
          </button>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              APPOINTMENT_TYPE_COLORS[appt.type] ?? 'bg-slate-100 text-slate-500'
            }`}
          >
            {TYPE_LABELS[appt.type] ?? appt.type.replace('_', ' ')}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              APPOINTMENT_STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-500'
            }`}
          >
            {STATUS_LABELS[appt.status] ?? appt.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span className="font-medium">{appt.patient.phone}</span>
          {appt.doctorName && <span>• Dr. {appt.doctorName}</span>}
          {appt.notes && (
            <span className="truncate max-w-[200px] text-slate-500 dark:text-slate-400" title={appt.notes}>
              • {appt.notes}
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {updating ? (
          <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
        ) : (
          <>
            {isActive && (
              <button
                onClick={onStartSession}
                title={t('startSession')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 rounded-xl border border-teal-200 dark:border-teal-800/40 transition-colors shadow-xs"
              >
                <PlayCircle className="h-3.5 w-3.5" /> {t('startSession')}
              </button>
            )}
            {appt.status === 'scheduled' && (
              <button
                onClick={() => onStatusChange('confirmed')}
                title={t('confirmAppt')}
                className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {isActive && (
              <>
                <button
                  onClick={() => onStatusChange('completed')}
                  title={t('markCompleted')}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-bold text-sm"
                >
                  ✓
                </button>
                <button
                  onClick={() => onStatusChange('cancelled')}
                  title={t('cancel')}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <ApptHelpTooltip />
          </>
        )}
      </div>
    </div>
  )
}