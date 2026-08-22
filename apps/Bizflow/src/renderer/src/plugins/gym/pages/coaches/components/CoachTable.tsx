import { Pencil, CheckCircle2, XCircle } from 'lucide-react'
import { Coach } from '../types'
import { formatSalary } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface CoachTableProps {
  coaches: Coach[]
  onSelectCoach: (coach: Coach) => void
  onEditCoach: (coach: Coach, e: React.MouseEvent) => void
}

export function CoachTable({ coaches, onSelectCoach, onEditCoach }: CoachTableProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Coach</th>
              <th className="px-4 py-3.5">Specialty</th>
              <th className="px-4 py-3.5">Contact</th>
              <th className="px-4 py-3.5">Salary & Structure</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {coaches.map(coach => (
              <tr
                key={coach.id}
                onClick={() => onSelectCoach(coach)}
                className="hover:bg-orange-500/[0.03] dark:hover:bg-orange-500/[0.05] cursor-pointer transition-colors group"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-black shrink-0">
                      {coach.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {coach.name}
                      </p>
                      {coach.hireDate && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          Hired {new Date(coach.hireDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {coach.specialty || 'General'}
                </td>

                <td className="px-4 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <p>{coach.phone || '—'}</p>
                  {coach.email && <p className="text-[11px] truncate max-w-[140px]">{coach.email}</p>}
                </td>

                <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {formatSalary(coach.salary, coach.salaryType)}
                </td>

                <td className="px-4 py-3.5 text-center">
                  {coach.isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={11} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">
                      <XCircle size={11} /> Inactive
                    </span>
                  )}
                </td>

                <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => onEditCoach(coach, e)}
                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                    title={t('gymEdit') || 'Edit Coach'}
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}