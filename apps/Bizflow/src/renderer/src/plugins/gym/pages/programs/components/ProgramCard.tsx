import { Dumbbell, Pencil, Calendar, User, ChevronRight } from 'lucide-react'
import { Program } from '../types'
import { getGoalStyle } from '../utils'

interface ProgramCardProps {
  program: Program
  onSelect: () => void
  onEdit: (e: React.MouseEvent) => void
}

export function ProgramCard({ program, onSelect, onEdit }: ProgramCardProps) {
  const goalStyle = getGoalStyle(program.goal)

  return (
    <div
      onClick={onSelect}
      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs hover:shadow-md hover:border-orange-300 dark:hover:border-orange-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group"
    >
      <div>
        {/* Header / Goal Badge + Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Dumbbell size={18} />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-tight">
                {program.name}
              </h3>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${goalStyle.badgeCls}`}>
                {goalStyle.label}
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
              program.isActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
            }`}
          >
            {program.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Description */}
        {program.description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
            {program.description}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic mb-3">No description provided.</p>
        )}

        {/* Schedule Metric Strip */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-slate-400" />
            <span className="font-semibold">
              {program.weeksTotal} Weeks Total · {program.daysPerWeek} Days / Week
            </span>
          </div>

          {program.coach && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <User size={13} className="text-slate-400" />
              <span>Lead Coach: {program.coach.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60">
        <button
          onClick={onEdit}
          className="text-xs font-bold text-slate-500 hover:text-orange-600 flex items-center gap-1 p-1 rounded-lg transition-colors"
        >
          <Pencil size={12} />
          <span>Edit Details</span>
        </button>

        <div className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400">
          <span>Open Routine</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  )
}