import { Trash2, Timer, Weight } from 'lucide-react'
import { ProgramExercise } from '../../types'

interface ExerciseItemProps {
  exercise: ProgramExercise
  index: number
  onDelete: () => void
}

export function ExerciseItem({ exercise, index, onDelete }: ExerciseItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/60 group hover:border-slate-300 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-300 shrink-0">
          {exercise.order ?? index + 1}
        </div>

        <div className="min-w-0">
          <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
            {exercise.name}
          </h5>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 font-mono">
              {exercise.sets} Sets × {exercise.reps} Reps
            </span>
            {exercise.weight && (
              <span className="flex items-center gap-1">
                <Weight size={11} className="text-slate-400" />
                <span>{exercise.weight}</span>
              </span>
            )}
            {exercise.restSec != null && exercise.restSec > 0 && (
              <span className="flex items-center gap-1">
                <Timer size={11} className="text-slate-400" />
                <span>{exercise.restSec}s Rest</span>
              </span>
            )}
          </div>
          {exercise.notes && (
            <p className="text-[11px] text-slate-400 italic mt-1 truncate max-w-[420px]">
              “{exercise.notes}”
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
        title="Remove exercise"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}