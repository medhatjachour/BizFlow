import { useState, useRef, useEffect } from 'react'
import {
  PlayCircle, CheckCircle2, UserCheck, XCircle, MoreVertical,
  Pencil, Trash2, Stethoscope, Phone, MessageCircle, Loader2,
   AlertOctagon,  ArrowRight
} from 'lucide-react'
import { VetAppointmentRecord } from '../types'
import { formatApptTime, getApptTypeLabel } from '../utils'
import { APPT_TYPES, STATUS_CONFIG } from '../constants'
import { speciesEmoji } from '../../vet-owners/species'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  appointment: VetAppointmentRecord
  isUpdating: boolean
  onStartSession: () => void
  onStatusChange: (status: string) => void
  onEdit: () => void
  onDelete: () => void
  onViewPatient: () => void
}

export function AppointmentCard({
  appointment,
  isUpdating,
  onStartSession,
  onStatusChange,
  onEdit,
  onDelete,
  onViewPatient
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const timeStr = formatApptTime(appointment.appointmentDate)
  const isScheduled = appointment.status === 'scheduled'
  const isConfirmed = appointment.status === 'confirmed'
  const isPending = isScheduled || isConfirmed
  const isCompleted = appointment.status === 'completed'

  const statusCfg = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled
  const typeCfg = APPT_TYPES.find((t) => t.value === appointment.type)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const phone = appointment.patient?.owner?.phone?.replace(/[^0-9]/g, '')
    if (phone) window.open(`https://wa.me/${phone}`, '_blank')
  }

  return (
    <div
      className={`relative rounded-3xl border p-4 transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
        isPending
          ? 'bg-white dark:bg-slate-800/95 border-slate-200/80 dark:border-slate-700/80 hover:border-violet-300 dark:hover:border-violet-600'
          : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 opacity-80'
      }`}
    >
      <div>
        {/* Top Header: Time Badge, Patient & Overflow Menu */}
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Time Stamp Badge */}
            <div className="h-12 w-14 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/60 dark:to-purple-950/60 border border-violet-100 dark:border-violet-900/50 text-center flex flex-col items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs font-black text-violet-700 dark:text-violet-300 leading-tight">{timeStr}</span>
              <span className="text-[10px] text-slate-400 font-bold">{appointment.duration}m</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none shrink-0">{speciesEmoji(appointment.patient?.species || 'other')}</span>
                <button
                  type="button"
                  onClick={onViewPatient}
                  className="font-black text-slate-900 dark:text-white text-xs hover:text-violet-600 dark:hover:text-violet-400 hover:underline truncate text-left rtl:text-right"
                >
                  {appointment.patient?.name || 'Patient'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                {appointment.patient?.owner?.name || '—'}
              </p>
            </div>
          </div>

          {/* Type Badge & Dropdown Actions Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${typeCfg?.tone || 'bg-slate-100 text-slate-600'}`}>
              {getApptTypeLabel(appointment.type, language)}
            </span>

            {/* Overflow Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                title={isAr ? 'خيارات إضافية' : 'More Options'}
              >
                <MoreVertical size={15} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1.5 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit()
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-left rtl:text-right"
                  >
                    <Pencil size={13} className="text-slate-400" />
                    <span>{isAr ? 'تعديل الموعد' : 'Edit Booking'}</span>
                  </button>

                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onStatusChange('completed')
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-left rtl:text-right"
                      >
                        <CheckCircle2 size={13} />
                        <span>{isAr ? 'تعليم كمكتمل' : 'Mark Completed'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onStatusChange('no_show')
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold text-left rtl:text-right"
                      >
                        <AlertOctagon size={13} />
                        <span>{isAr ? 'لم يحضر (No Show)' : 'Mark No-Show'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onStatusChange('cancelled')
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-left rtl:text-right"
                      >
                        <XCircle size={13} />
                        <span>{isAr ? 'إلغاء الموعد' : 'Cancel Booking'}</span>
                      </button>
                    </>
                  )}

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete()
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-left rtl:text-right"
                  >
                    <Trash2 size={13} />
                    <span>{isAr ? 'حذف نهائي' : 'Delete'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Doctor & Notes Banner */}
        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-xs space-y-1 my-2">
          {appointment.vetName ? (
            <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
              <Stethoscope size={13} /> Dr. {appointment.vetName}
            </p>
          ) : (
            <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Stethoscope size={13} /> {isAr ? 'الطبيب: غير محدد' : 'Doctor: Any Available'}
            </p>
          )}

          {appointment.notes && (
            <p className="text-slate-600 dark:text-slate-400 text-[11px] font-medium italic truncate" title={appointment.notes}>
              {appointment.notes}
            </p>
          )}
        </div>

        {/* Client Phone & WhatsApp Direct Action */}
        {appointment.patient?.owner?.phone && (
          <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
            <a
              href={`tel:${appointment.patient.owner.phone}`}
              className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:underline"
              dir="ltr"
            >
              <Phone size={12} className="text-slate-400" /> {appointment.patient.owner.phone}
            </a>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <MessageCircle size={12} /> WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Primary Contextual Action Footer */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
        {isUpdating ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-1 w-full justify-center">
            <Loader2 size={14} className="animate-spin text-violet-500" />
            <span>{isAr ? 'جاري التحديث...' : 'Updating…'}</span>
          </div>
        ) : (
          <>
            {/* Status Pill Indicator */}
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
              {isAr ? statusCfg.labelAr : statusCfg.labelEn}
            </span>

            {/* Smart Contextual Buttons */}
            <div className="flex items-center gap-1.5">
              {isScheduled && (
                <button
                  type="button"
                  onClick={() => onStatusChange('confirmed')}
                  className="px-2.5 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 rounded-xl border border-teal-200 dark:border-teal-800 transition-all flex items-center gap-1"
                  title={isAr ? 'تأكيد الحجز مع العميل' : 'Confirm booking'}
                >
                  <UserCheck size={13} />
                  <span>{isAr ? 'تأكيد' : 'Confirm'}</span>
                </button>
              )}

              {isPending && (
                <button
                  type="button"
                  onClick={onStartSession}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl shadow-md shadow-violet-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <PlayCircle size={14} />
                  <span>{isAr ? 'بدء الكشف' : 'Start Visit'}</span>
                </button>
              )}

              {isCompleted && (
                <button
                  type="button"
                  onClick={onViewPatient}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1"
                >
                  <span>{isAr ? 'الملف الطبي' : 'Patient File'}</span>
                  <ArrowRight size={12} className="rtl:rotate-180" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}