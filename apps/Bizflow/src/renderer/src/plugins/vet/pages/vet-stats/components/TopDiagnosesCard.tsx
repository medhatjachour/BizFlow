import { DiagnosisStat } from '../types'
import { Stethoscope } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function TopDiagnosesCard({ diagnoses }: { diagnoses: DiagnosisStat[] }) {
  const { t } = useLanguage()
  const maxCount = Math.max(1, ...diagnoses.map((d) => d.count))

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Stethoscope size={16} className="text-violet-500" />
          {t('topDiagnoses') || 'Top Diagnoses'}
        </h3>
        <span className="text-xs text-slate-400 font-medium">{diagnoses.length} recorded</span>
      </div>

      <div className="space-y-2.5">
        {diagnoses.map((d, i) => {
          const pct = Math.round((d.count / maxCount) * 100)
          return (
            <div key={d.diagnosis} className="group relative overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-slate-100 dark:border-slate-800">
              <div
                className="absolute inset-y-0 left-0 bg-violet-500/10 dark:bg-violet-500/20 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 w-4">{i + 1}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{d.diagnosis}</span>
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700 shadow-sm shrink-0">
                  {d.count}
                </span>
              </div>
            </div>
          )
        })}

        {diagnoses.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">{t('vetNoDataYet') || 'No diagnoses recorded'}</p>
        )}
      </div>
    </div>
  )
}