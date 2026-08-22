import { Dumbbell, Pencil, ChevronRight } from 'lucide-react'
import { Program } from '../types'
import { getGoalStyle } from '../utils'

interface ProgramTableProps {
  programs: Program[]
  onSelect: (p: Program) => void
  onEdit: (p: Program, e: React.MouseEvent) => void
}

export function ProgramTable({ programs, onSelect, onEdit }: ProgramTableProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Routine Name</th>
              <th className="px-4 py-3.5">Fitness Goal</th>
              <th className="px-4 py-3.5">Schedule</th>
              <th className="px-4 py-3.5">Coach</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {programs.map(p => {
              const goalStyle = getGoalStyle(p.goal)

              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="hover:bg-orange-500/[0.03] dark:hover:bg-orange-500/[0.05] cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                        <Dumbbell size={15} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
                          {p.name}
                        </p>
                        {p.description && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${goalStyle.badgeCls}`}>
                      {goalStyle.label}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    {p.weeksTotal} Weeks ({p.daysPerWeek}d / wk)
                  </td>

                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                    {p.coach?.name || '—'}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={e => onEdit(p, e)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onSelect(p)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                      >
                        <ChevronRight size={15} />
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