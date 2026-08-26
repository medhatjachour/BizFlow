import { useState } from 'react'
import {
   ChevronDown, ChevronUp,
  Pencil, Pill, PawPrint
} from 'lucide-react'
import { VetSession } from '../hooks/useVetPatientProfile'
import { formatSessionMoney, formatSessionDate, getVisitTypeLabel } from '../../vet-sessions/utils'
import { VISIT_TYPE_COLORS, PAYMENT_STATUS_CONFIG } from '../../vet-sessions/constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  sessions: VetSession[]
  onEditSession: (s: VetSession) => void
}

export function PatientSessionTimeline({ sessions, onEditSession }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (sessions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-12 text-center text-slate-400 shadow-sm">
        <PawPrint size={36} className="mx-auto mb-2 opacity-30" />
        <p className="text-xs font-bold">{isAr ? 'لا توجد زيارات أو جلسات مسجلة بعد' : 'No visits recorded yet'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isOpen = expandedId === session.id
        let vitals: any = null
        try {
          if (session.vetVitals) vitals = JSON.parse(session.vetVitals)
        } catch {}

        const payCfg = PAYMENT_STATUS_CONFIG[session.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid

        return (
          <div
            key={session.id}
            className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm transition-all"
          >
            {/* Header Clickable Row */}
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : session.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-left rtl:text-right transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    VISIT_TYPE_COLORS[session.visitType] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {getVisitTypeLabel(session.visitType, language)}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {formatSessionDate(session.visitDate, language)}
                </span>
                {session.vetName && (
                  <span className="text-xs text-slate-400 hidden sm:inline font-semibold">Dr. {session.vetName}</span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${payCfg.bg}`}>
                  {isAr ? payCfg.labelAr : payCfg.labelEn}
                </span>

                {session.amountCharged != null && (
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {formatSessionMoney(session.amountCharged)}
                  </span>
                )}

                {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </button>

            {/* Expanded Drawer Details */}
            {isOpen && (
              <div className="border-t border-slate-100 dark:border-slate-700/60 p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
                {/* Chief Complaint */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {isAr ? 'الشكوى الرئيسية' : 'Chief Complaint'}
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{session.chiefComplaint}</p>
                </div>

                {/* Vitals */}
                {vitals && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      {isAr ? 'العلامات الحيوية' : 'Vitals'}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {vitals.weight_kg && <VitalPill label={isAr ? 'الوزن' : 'Weight'} value={`${vitals.weight_kg} kg`} />}
                      {vitals.temp_rectal_c && <VitalPill label={isAr ? 'الحرارة' : 'Temp'} value={`${vitals.temp_rectal_c} °C`} />}
                      {vitals.heart_rate && <VitalPill label={isAr ? 'النبض' : 'Heart Rate'} value={`${vitals.heart_rate} bpm`} />}
                      {vitals.resp_rate && <VitalPill label={isAr ? 'التنفس' : 'Resp Rate'} value={`${vitals.resp_rate} brpm`} />}
                      {vitals.crt && <VitalPill label="CRT" value={vitals.crt} />}
                      {vitals.mucous_membranes && <VitalPill label={isAr ? 'الأغشية' : 'Mucous Memb.'} value={vitals.mucous_membranes} />}
                    </div>
                  </div>
                )}

                {/* Diagnosis & Notes */}
                {session.diagnosis && (
                  <div>
                    <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
                      {isAr ? 'التشخيص الطبي' : 'Diagnosis'}
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">{session.diagnosis}</p>
                  </div>
                )}

                {session.notes && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {isAr ? 'ملاحظات الطبيب' : 'Notes'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">{session.notes}</p>
                  </div>
                )}

                {/* Prescriptions */}
                {session.prescriptions && session.prescriptions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Pill size={12} /> {isAr ? 'الوصفات الطبية' : 'Prescriptions'}
                    </p>
                    <div className="space-y-1">
                      {session.prescriptions.map((rx) => (
                        <div
                          key={rx.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 text-xs"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{rx.medicineName}</span>
                          <span className="text-[11px] text-slate-500">
                            {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onEditSession(session)}
                    className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    <Pencil size={12} /> {isAr ? 'تعديل بيانات الجلسة' : 'Edit Session'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function VitalPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
      <span className="text-[10px] text-slate-400 block">{label}</span>
      <span className="font-bold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  )
}