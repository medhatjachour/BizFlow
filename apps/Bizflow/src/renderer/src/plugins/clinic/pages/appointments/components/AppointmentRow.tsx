import React, { useState, useRef, useEffect } from 'react'
import { 
  PlayCircle, CheckCircle2, MoreVertical, Pencil, 
  Trash2, XCircle, UserX, Loader2, ArrowUpRight, Phone, Stethoscope
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_TYPE_COLORS } from '../constants'
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
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMenu(false)
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showMenu])

  const time = new Date(appt.appointmentDate).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })

  const isScheduled = appt.status === 'scheduled'
  const isConfirmed = appt.status === 'confirmed'
  const isActive = isScheduled || isConfirmed

  const TYPE_LABELS: Record<string, string> = {
    consultation: t('apptTypeConsultation') || 'Consultation',
    follow_up: t('apptTypeFollowUp') || 'Follow-up',
    procedure: t('apptTypeProcedure') || 'Procedure',
    checkup: t('apptTypeCheckup') || 'Checkup'
  }

  const STATUS_LABELS: Record<string, string> = {
    scheduled: t('apptStatusScheduled') || 'Scheduled',
    confirmed: t('apptStatusConfirmed') || 'Confirmed',
    completed: t('apptStatusCompleted') || 'Completed',
    cancelled: t('cancelled') || 'Cancelled',
    no_show: t('apptStatusNoShow') || 'No Show'
  }

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
        isActive
          ? 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 hover:border-teal-300 dark:hover:border-teal-700 shadow-xs'
          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800/80 opacity-75'
      }`}
    >
      {/* ── Left: Time Block + Patient Metadata ── */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Time Badge */}
        <div className="shrink-0 text-center bg-teal-50/80 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 rounded-xl px-3 py-2 min-w-[64px]">
          <p className="text-xs sm:text-sm font-extrabold text-teal-700 dark:text-teal-300 leading-tight">
            {time}
          </p>
          {appt.duration && (
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
              {appt.duration}m
            </p>
          )}
        </div>

        {/* Patient Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {/* Patient Name */}
            <button
              onClick={onViewPatient}
              className="inline-flex items-center gap-1 font-bold text-sm text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              <span className="truncate">{appt.patient.name}</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity rtl:-scale-x-100" />
            </button>

            {/* Type Badge */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                APPOINTMENT_TYPE_COLORS[appt.type] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {TYPE_LABELS[appt.type] ?? appt.type}
            </span>

            {/* Status Badge */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                APPOINTMENT_STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {STATUS_LABELS[appt.status] ?? appt.status}
            </span>
          </div>

          {/* Subtitle Details */}
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
            {appt.patient.phone && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Phone className="h-3 w-3" />
                <span dir="ltr">{appt.patient.phone}</span>
              </span>
            )}
            {appt.doctorName && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Stethoscope className="h-3 w-3" /> Dr. {appt.doctorName}
              </span>
            )}
            {appt.notes && (
              <span className="truncate max-w-[200px] italic text-slate-400" title={appt.notes}>
                "{appt.notes}"
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Action Buttons & Overflow Dropdown ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {updating ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-teal-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline text-[11px] font-medium">{t('loading') || 'Updating...'}</span>
          </div>
        ) : (
          <>
            {/* 1. Primary Contextual CTA */}
            {isConfirmed && (
              <button
                onClick={onStartSession}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 rounded-xl shadow-xs transition-all"
              >
                <PlayCircle className="h-3.5 w-3.5 rtl:-scale-x-100" />
                <span>{t('startSession') || 'Start Session'}</span>
              </button>
            )}

            {isScheduled && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onStatusChange('confirmed')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 rounded-xl border border-teal-200 dark:border-teal-800/40 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{t('confirmAppt') || 'Confirm'}</span>
                </button>
                <button
                  onClick={onStartSession}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 rounded-xl shadow-xs transition-all"
                >
                  <PlayCircle className="h-3.5 w-3.5 rtl:-scale-x-100" />
                  <span className="hidden sm:inline">{t('startSession') || 'Start'}</span>
                </button>
              </div>
            )}

            {/* 2. Quick Action: Edit */}
            <button
              onClick={onEdit}
              title={t('edit') || 'Edit'}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            {/* 3. Overflow Menu (3-Dots Dropdown with RTL-Safe Logical Anchoring) */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className={`p-2 rounded-xl transition-colors ${
                  showMenu
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {/* Logical `end-0` anchors properly in both LTR and RTL */}
              {showMenu && (
                <div
                  className="absolute end-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {isActive && (
                    <>
                      <button
                        onClick={() => {
                          setShowMenu(false)
                          onStatusChange('completed')
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-start"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{t('markCompleted') || 'Mark Completed'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMenu(false)
                          onStatusChange('no_show')
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-start"
                      >
                        <UserX className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>{t('apptStatusNoShow') || 'Mark as No-Show'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMenu(false)
                          onStatusChange('cancelled')
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-start"
                      >
                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                        <span>{t('cancel') || 'Cancel Appointment'}</span>
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    </>
                  )}

                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onDelete()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-start"
                  >
                    <Trash2 className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{t('confirmDelete') || 'Delete Appointment'}</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}