import {
  Calendar, CheckCircle2, Phone, MessageCircle, Clock,
   Stethoscope,  Activity, Loader2
} from 'lucide-react'
import { VetFollowUpRecord } from '../types'
import { getDaysDiff, getUrgencyCategory, formatFollowUpDate } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { speciesEmoji } from '../../vet-owners/species'
import { URGENCY_STYLES } from '../constants'

interface Props {
  followUp: VetFollowUpRecord
  isClearing: boolean
  onBook: () => void
  onWalkIn: () => void
  onReschedule: () => void
  onMarkDone: () => void
  onViewPatient: () => void
}

export function FollowUpCard({
  followUp,
  isClearing,
  onBook,
  onWalkIn,
  onReschedule,
  onMarkDone,
  onViewPatient
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const diff = getDaysDiff(followUp.followUpDate)
  const category = getUrgencyCategory(diff)
  const style = URGENCY_STYLES[category]
  const dateFmt = formatFollowUpDate(followUp.followUpDate, language)

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const phone = followUp.patient?.owner?.phone?.replace(/[^0-9]/g, '')
    if (phone) window.open(`https://wa.me/${phone}`, '_blank')
  }

  return (
    <div
      className={`relative rounded-3xl border p-4 transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${style.ring}`}
    >
      <div>
        {/* Top Header: Date Block & Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Stamp block */}
            <div className="w-13 h-13 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center flex flex-col items-center justify-center shrink-0 shadow-sm">
              <span className="text-base font-black text-slate-900 dark:text-white leading-none">{dateFmt.day}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{dateFmt.month}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none">{speciesEmoji(followUp.patient?.species || 'other')}</span>
                <button
                  type="button"
                  onClick={onViewPatient}
                  className="font-bold text-slate-900 dark:text-white text-sm hover:text-violet-600 dark:hover:text-violet-400 hover:underline text-left rtl:text-right truncate"
                >
                  {followUp.patient?.name || 'Patient'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {followUp.patient?.owner?.name || '—'}
              </p>
            </div>
          </div>

          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shrink-0 ${style.badge}`}>
            {diff < 0
              ? (isAr ? `${Math.abs(diff)} يوم تأخير` : `${Math.abs(diff)}d overdue`)
              : diff === 0
              ? (isAr ? 'مستحق اليوم' : 'Due today')
              : diff === 1
              ? (isAr ? 'غداً' : 'Tomorrow')
              : (isAr ? `خلال ${diff} أيام` : `in ${diff} days`)}
          </span>
        </div>

        {/* Diagnosis & Complaints */}
        <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1 my-2">
          {followUp.chiefComplaint && (
            <p className="text-slate-800 dark:text-slate-200 font-semibold truncate" title={followUp.chiefComplaint}>
              {followUp.chiefComplaint}
            </p>
          )}
          {followUp.vetName && (
            <p className="text-[11px] text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1">
              <Stethoscope size={12} /> Dr. {followUp.vetName}
            </p>
          )}
        </div>

        {/* Contact info */}
        {followUp.patient?.owner?.phone && (
          <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
            <span className="flex items-center gap-1 font-mono text-[11px]" dir="ltr">
              <Phone size={12} className="text-slate-400" /> {followUp.patient.owner.phone}
            </span>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <MessageCircle size={12} /> WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={onBook}
          className="flex-1 py-1.5 px-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl flex items-center justify-center gap-1 shadow-md shadow-violet-500/20 active:scale-95 transition-all"
        >
          <Calendar size={13} />
          <span>{isAr ? 'حجز موعد' : 'Book Appt'}</span>
        </button>

        <button
          type="button"
          onClick={onWalkIn}
          className="py-1.5 px-2.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 rounded-xl flex items-center justify-center gap-1 transition-all"
          title={isAr ? 'بدء كشف فوري' : 'Walk-in Session'}
        >
          <Activity size={13} />
          <span className="hidden sm:inline">{isAr ? 'كشف' : 'Visit'}</span>
        </button>

        <button
          type="button"
          onClick={onReschedule}
          className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 rounded-xl transition-colors"
          title={isAr ? 'تأجيل الموعد' : 'Reschedule Date'}
        >
          <Clock size={14} />
        </button>

        <button
          type="button"
          onClick={onMarkDone}
          disabled={isClearing}
          className="p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-xl disabled:opacity-50 transition-colors"
          title={isAr ? 'إنهاء المتابعة' : 'Mark Completed'}
        >
          {isClearing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        </button>
      </div>
    </div>
  )
}