import { Calendar, AlertCircle, Scale, Hash } from 'lucide-react'
import { speciesEmoji, speciesLabel } from '../../vet-owners/species'
import { computePatientAge } from '../../vet-owners/utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function PatientHeaderCard({ patient, totalVisits }: { patient: any; totalVisits: number }) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const age = computePatientAge(patient.dateOfBirth)

  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 opacity-90" />

      <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-950/60 dark:to-fuchsia-950/60 border border-violet-200 dark:border-violet-800/80 flex items-center justify-center text-3xl shadow-inner shrink-0">
            {speciesEmoji(patient.species)}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white truncate">{patient.name}</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800">
                {speciesLabel(patient.species, language)}
              </span>
              {patient.gender && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                  {patient.gender === 'male' ? (isAr ? 'ذكر' : 'Male') : patient.gender === 'female' ? (isAr ? 'أنثى' : 'Female') : patient.gender}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {[patient.breed, patient.petColor].filter(Boolean).join(' • ')}
            </p>

            {/* Demographics row */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600 dark:text-slate-300 font-semibold">
              {patient.weight && (
                <span className="flex items-center gap-1">
                  <Scale size={13} className="text-slate-400" />
                  {patient.weight} kg
                </span>
              )}

              {(age.years || age.months) && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  {isAr
                    ? `${age.years ? `${age.years} سنة ` : ''}${age.months ? `${age.months} شهر` : ''}`
                    : `${age.years ? `${age.years}y ` : ''}${age.months ? `${age.months}m` : ''}`}
                </span>
              )}

              {patient.microchipId && (
                <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                  <Hash size={11} className="text-slate-400" />
                  {patient.microchipId}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right rtl:text-left sm:shrink-0 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAr ? 'إجمالي الزيارات' : 'Total Visits'}
          </p>
          <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-0.5">{totalVisits}</p>
        </div>
      </div>

      {/* Allergies & Medical Notes Banner */}
      {(patient.allergies || patient.medicalNotes) && (
        <div className="mt-5 p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-1 text-xs">
          {patient.allergies && (
            <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <span>{isAr ? 'الحساسية:' : 'Allergies:'} {patient.allergies}</span>
            </p>
          )}
          {patient.medicalNotes && (
            <p className="text-amber-700 dark:text-amber-400 font-medium pl-5 rtl:pl-0 rtl:pr-5">
              {isAr ? 'ملاحظات طبية:' : 'Medical Notes:'} {patient.medicalNotes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}