import { Pencil, Phone, Mail, DollarSign, CheckCircle2, XCircle } from 'lucide-react'
import { Coach } from '../types'
import { formatSalary } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface CoachCardGridProps {
  coaches: Coach[]
  onSelectCoach: (coach: Coach) => void
  onEditCoach: (coach: Coach, e: React.MouseEvent) => void
}

export function CoachCardGrid({ coaches, onSelectCoach, onEditCoach }: CoachCardGridProps) {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {coaches.map(coach => (
        <div
          key={coach.id}
          onClick={() => onSelectCoach(coach)}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm hover:border-orange-300 dark:hover:border-orange-500/40 cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
        >
          <div>
            {/* Header / Avatar + Specialty */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20 flex items-center justify-center text-sm font-black shrink-0">
                  {coach.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-tight">
                    {coach.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {coach.specialty || 'General Fitness Trainer'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                {coach.isActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={11} /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                    <XCircle size={11} /> Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Metadata Contact Details */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-slate-400" />
                <span className="font-mono text-[11px]">{coach.phone || 'No phone'}</span>
              </div>
              {coach.email && (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-slate-400" />
                  <span className="truncate text-[11px]">{coach.email}</span>
                </div>
              )}
              {coach.salary != null && coach.salary > 0 && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <DollarSign size={12} className="text-emerald-500" />
                  <span>{formatSalary(coach.salary, coach.salaryType)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60" onClick={e => e.stopPropagation()}>
            <span className="text-[11px] font-medium text-slate-400">
              {coach._count?.subscriptions ?? 0} assigned trainees
            </span>
            <button
              onClick={e => onEditCoach(coach, e)}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-orange-600 px-2 py-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
            >
              <Pencil size={12} />
              <span>{t('gymEdit') || 'Edit'}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}