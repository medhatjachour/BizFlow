
import {
  X, Stethoscope, FileText,
   Activity, Pill, 
} from 'lucide-react'
import { VetSessionRecord, SessionVitals } from '../types'
import { formatSessionMoney, formatSessionDate, getVisitTypeLabel } from '../utils'
import { PAYMENT_STATUS_CONFIG } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { speciesEmoji } from '../../vet-owners/species'

interface Props {
  session: VetSessionRecord | null
  onClose: () => void
  onEdit: () => void
}

export function SessionDetailModal({ session, onClose, onEdit }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  if (!session) return null

  let vitalsObj: SessionVitals = {}
  try {
    if (session.vetVitals) vitalsObj = JSON.parse(session.vetVitals)
  } catch {}

  const payCfg = PAYMENT_STATUS_CONFIG[session.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero */}
        <div className="relative bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 px-6 py-5 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-2xl shadow-md backdrop-blur-md shrink-0">
                {speciesEmoji(session.patient?.species || 'other')}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black">{session.patient?.name || 'General Visit'}</h2>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full capitalize font-semibold">
                    {session.patient?.species}
                  </span>
                </div>
                <p className="text-xs text-violet-100 mt-0.5">
                  {isAr ? 'المالك:' : 'Owner:'} {session.patient?.owner?.name || '—'} ({session.patient?.owner?.phone || '—'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                className="px-3 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-xl transition-all backdrop-blur-md"
              >
                {isAr ? 'تعديل' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-all backdrop-blur-md"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{isAr ? 'تاريخ الزيارة' : 'Visit Date'}</p>
              <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                {formatSessionDate(session.visitDate, language)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{isAr ? 'نوع الزيارة' : 'Visit Type'}</p>
              <p className="text-xs font-black text-violet-600 dark:text-violet-400 mt-0.5">
                {getVisitTypeLabel(session.visitType, language)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{isAr ? 'الطبيب المعالج' : 'Attending Vet'}</p>
              <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                {session.vetName ? `Dr. ${session.vetName}` : '—'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{isAr ? 'حالة السداد' : 'Payment'}</p>
              <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-1 border ${payCfg.bg}`}>
                {isAr ? payCfg.labelAr : payCfg.labelEn}
              </span>
            </div>
          </div>

          {/* Chief Complaint & Diagnosis */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-violet-500" /> {isAr ? 'الشكوى الرئيسية والأعراض' : 'Chief Complaint'}
              </h4>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                {session.chiefComplaint || '—'}
              </p>
            </div>

            {session.diagnosis && (
              <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                <h4 className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Stethoscope size={14} /> {isAr ? 'التشخيص الطبي' : 'Clinical Diagnosis'}
                </h4>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                  {session.diagnosis}
                </p>
              </div>
            )}
          </div>

          {/* Vitals */}
          {Object.values(vitalsObj).some(Boolean) && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity size={14} className="text-rose-500" /> {isAr ? 'العلامات الحيوية (Vitals)' : 'Patient Vitals'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {vitalsObj.weight_kg && (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الوزن' : 'Weight'}</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">{vitalsObj.weight_kg} kg</span>
                  </div>
                )}
                {vitalsObj.temp_rectal_c && (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'حرارة المستقيم' : 'Temp Rectal'}</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">{vitalsObj.temp_rectal_c} °C</span>
                  </div>
                )}
                {vitalsObj.heart_rate && (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'نبض القلب' : 'Heart Rate'}</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">{vitalsObj.heart_rate} bpm</span>
                  </div>
                )}
                {vitalsObj.resp_rate && (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'معدل التنفس' : 'Resp Rate'}</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">{vitalsObj.resp_rate} brpm</span>
                  </div>
                )}
                {vitalsObj.crt && (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">CRT</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">{vitalsObj.crt}</span>
                  </div>
                )}
                {vitalsObj.mucous_membranes && (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الأغشية المخاطية' : 'Mucous Membranes'}</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">{vitalsObj.mucous_membranes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prescriptions List */}
          {session.prescriptions && session.prescriptions.length > 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Pill size={14} className="text-emerald-500" /> {isAr ? 'الوصفة الطبية والعلاجات' : 'Prescribed Medications'}
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {session.prescriptions.map((rx, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>{rx.medicineName}</span>
                      <span className="text-slate-500 font-medium">
                        {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                    {rx.instructions && <p className="text-[11px] text-slate-400 mt-0.5 italic">{rx.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing & Financial Summary */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">{isAr ? 'المبلغ المفوتر:' : 'Total Charged:'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatSessionMoney(session.amountCharged)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isAr ? 'المبلغ المدفوع:' : 'Amount Paid:'}</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{formatSessionMoney(session.amountPaid)}</span>
            </div>
            {Number(session.amountCharged) - Number(session.amountPaid) > 0 && (
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-rose-600 font-bold">
                <span>{isAr ? 'المتبقي للتحصيل:' : 'Balance Due:'}</span>
                <span>{formatSessionMoney(Number(session.amountCharged) - Number(session.amountPaid))}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}