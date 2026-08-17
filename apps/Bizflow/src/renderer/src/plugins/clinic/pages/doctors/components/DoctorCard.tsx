import React from 'react'
import { Star, Pencil, Trash2, Phone, DoorOpen, Users, CalendarClock } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { STATUS_META } from '../constants'
import { colorForDoctor, displayName, initials, formatNextAppointment } from '../utils'
import type { Doctor, LiveStatus } from '../types'

interface Props {
  doctor: Doctor
  onViewProfile: (id: string) => void
  onEdit: (doctor: Doctor) => void
  onDelete: (doctor: Doctor) => void
  onSetDefault: (id: string) => void
}

export const DoctorCard: React.FC<Props> = ({
  doctor,
  onViewProfile,
  onEdit,
  onDelete,
  onSetDefault
}) => {
  const { t } = useLanguage()
  const meta = STATUS_META[(doctor.liveStatus as LiveStatus) ?? 'available']

  return (
    <div
      className={`group relative rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-teal-300 dark:hover:border-teal-700/60 hover:shadow-md ring-1 ${meta.ring}`}
    >
      {/* Top Identity Header */}
      <div className="flex items-start gap-3.5">
        {/* Avatar + Live Indicator */}
        <button
          onClick={() => onViewProfile(doctor.id)}
          className="relative h-14 w-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0 transition-transform group-hover:scale-105"
          style={{ backgroundColor: colorForDoctor(doctor) }}
        >
          {initials(doctor.name)}
          <span
            className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-slate-800 ${meta.dot} shadow-xs`}
            title={meta.label}
          />
        </button>

        {/* Name, Specialty & Status */}
        <div className="min-w-0 flex-1">
          <button onClick={() => onViewProfile(doctor.id)} className="text-start block w-full">
            <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <span>{displayName(doctor)}</span>
              {doctor.isDefault && (
                <span
                  title={t('defaultDoctor') || 'Default Clinic Doctor'}
                  className="inline-flex items-center text-amber-500 shrink-0"
                >
                  <Star className="h-4 w-4 fill-current" />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {doctor.specialty || (t('generalPractitioner') || 'General practitioner')}
            </p>
          </button>

          <div className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            <span>{t(`doctorStatus_${doctor.liveStatus}`) || meta.label}</span>
            {doctor.currentPatient && <span className="opacity-70 truncate max-w-[120px]">· {doctor.currentPatient}</span>}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-2 border border-slate-100 dark:border-slate-800">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">{doctor.todayCount ?? 0}</div>
          <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1 mt-0.5">
            <CalendarClock className="h-3 w-3" />
            {t('today') || 'Today'}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-2 border border-slate-100 dark:border-slate-800">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">{doctor.panelSize ?? 0}</div>
          <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1 mt-0.5">
            <Users className="h-3 w-3" />
            {t('panelSize') || 'Panel'}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-2 border border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate px-0.5">
            {formatNextAppointment(doctor.nextAppointment?.date)}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{t('next') || 'Next'}</div>
        </div>
      </div>

      {/* Contact & Room Bar */}
      {(doctor.phone || doctor.roomNumber) && (
        <div className="mt-3 flex items-center gap-3.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
          {doctor.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              <span dir="ltr">{doctor.phone}</span>
            </span>
          )}
          {doctor.roomNumber && (
            <span className="inline-flex items-center gap-1">
              <DoorOpen className="h-3.5 w-3.5" /> Room {doctor.roomNumber}
            </span>
          )}
        </div>
      )}

      {/* Bottom Actions Toolbar */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-3">
        <div>
          {!doctor.isDefault && (
            <button
              onClick={() => onSetDefault(doctor.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-colors"
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{t('setDefault') || 'Set default'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 ms-auto">
          <button
            onClick={() => onEdit(doctor)}
            className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
            title={t('edit') || 'Edit Doctor'}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(doctor)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title={t('delete') || 'Delete Doctor'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}