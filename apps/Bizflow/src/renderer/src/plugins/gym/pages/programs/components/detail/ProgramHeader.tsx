import { ChevronLeft, User, Pencil } from 'lucide-react'
import { Program } from '../../types'
import { getGoalStyle } from '../../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProgramHeaderProps {
  program: Program
  onBack: () => void
  onEdit: () => void
  onAssign: () => void
}

export function ProgramHeader({ program, onBack, onEdit, onAssign }: ProgramHeaderProps) {
  const { t } = useLanguage()
  const goalStyle = getGoalStyle(program.goal)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all active:scale-95 shrink-0 mt-0.5"
          title="Back to All Routines"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {program.name}
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${goalStyle.badgeCls}`}>
                  {goalStyle.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    program.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}
                >
                  {program.isActive ? 'Active Plan' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold flex-wrap">
                <span>📅 {program.weeksTotal} Weeks Total</span>
                <span>⚡ {program.daysPerWeek} Training Days / Week</span>
                {program.coach && <span>👤 Coach: {program.coach.name}</span>}
              </div>

              {program.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed max-w-3xl">
                  {program.description}
                </p>
              )}
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onAssign}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-2xl shadow-xs transition-all active:scale-95"
              >
                <User size={14} />
                <span>{t('gymAssign') || 'Assign to Member'}</span>
              </button>

              <button
                onClick={onEdit}
                className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                title="Edit Routine Details"
              >
                <Pencil size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}