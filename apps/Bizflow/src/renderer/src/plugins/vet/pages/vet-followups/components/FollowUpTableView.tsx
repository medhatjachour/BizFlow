import {
  Calendar, CheckCircle2,  Clock,
  Activity, Loader2
} from 'lucide-react'
import { VetFollowUpRecord } from '../types'
import { getDaysDiff, getUrgencyCategory, formatFollowUpDate } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { URGENCY_STYLES } from '../constants'
import { speciesEmoji } from '../../vet-owners/species'

interface Props {
  followUps: VetFollowUpRecord[]
  clearingId: string | null
  onBook: (f: VetFollowUpRecord) => void
  onWalkIn: (f: VetFollowUpRecord) => void
  onReschedule: (f: VetFollowUpRecord) => void
  onMarkDone: (f: VetFollowUpRecord) => void
  onViewPatient: (f: VetFollowUpRecord) => void
}

export function FollowUpTableView({
  followUps,
  clearingId,
  onBook,
  onWalkIn,
  onReschedule,
  onMarkDone,
  onViewPatient
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left rtl:text-right">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">{isAr ? 'تاريخ المتابعة' : 'Due Date'}</th>
              <th className="py-3 px-4">{isAr ? 'المريض' : 'Patient'}</th>
              <th className="py-3 px-4">{isAr ? 'المالك والتواصل' : 'Owner & Phone'}</th>
              <th className="py-3 px-4">{isAr ? 'الطبيب والشكوى' : 'Doctor & Complaint'}</th>
              <th className="py-3 px-4">{isAr ? 'الحالة' : 'Urgency'}</th>
              <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {followUps.map((fu) => {
              const diff = getDaysDiff(fu.followUpDate)
              const category = getUrgencyCategory(diff)
              const style = URGENCY_STYLES[category]
              const dateFmt = formatFollowUpDate(fu.followUpDate, language)
              const isClearing = clearingId === fu.id

              return (
                <tr key={fu.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                    {dateFmt.full}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{speciesEmoji(fu.patient?.species || 'other')}</span>
                      <button
                        type="button"
                        onClick={() => onViewPatient(fu)}
                        className="font-bold text-slate-900 dark:text-white hover:text-violet-600 hover:underline truncate"
                      >
                        {fu.patient?.name || 'Patient'}
                      </button>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{fu.patient?.owner?.name || '—'}</p>
                    {fu.patient?.owner?.phone && (
                      <p className="text-[11px] text-slate-400 font-mono" dir="ltr">{fu.patient.owner.phone}</p>
                    )}
                  </td>

                  <td className="py-3 px-4 max-w-[200px]">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {fu.vetName ? `Dr. ${fu.vetName}` : '—'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate" title={fu.chiefComplaint || ''}>
                      {fu.chiefComplaint || '—'}
                    </p>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${style.badge}`}>
                      {diff < 0
                        ? `${Math.abs(diff)}d overdue`
                        : diff === 0
                        ? (isAr ? 'اليوم' : 'Due today')
                        : `in ${diff}d`}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onBook(fu)}
                        className="px-2 py-1 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-1 shadow-sm"
                        title={isAr ? 'حجز موعد' : 'Book Appt'}
                      >
                        <Calendar size={12} />
                        <span>{isAr ? 'حجز' : 'Book'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onWalkIn(fu)}
                        className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg"
                        title={isAr ? 'كشف فوري' : 'Walk-in'}
                      >
                        <Activity size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReschedule(fu)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        title={isAr ? 'تأجيل' : 'Reschedule'}
                      >
                        <Clock size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarkDone(fu)}
                        disabled={isClearing}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg disabled:opacity-50"
                        title={isAr ? 'إنهاء' : 'Mark Done'}
                      >
                        {isClearing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}