import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { ProgramDay } from '../../types'
import { ExerciseItem } from './ExerciseItem'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface DayCardProps {
  day: ProgramDay
  isExpanded: boolean
  onToggle: () => void
  onDeleteDay: () => void
  onAddExercise: () => void
  onDeleteExercise: (exerciseId: string) => void
}

export function DayCard({
  day,
  isExpanded,
  onToggle,
  onDeleteDay,
  onAddExercise,
  onDeleteExercise
}: DayCardProps) {
  const { t } = useLanguage()
  const exercises = day.exercises ?? []

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs">
      {/* Day Accordion Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-mono flex flex-col items-center justify-center text-[10px] font-black leading-tight shrink-0">
            <span>W{day.weekNumber}</span>
            <span>D{day.dayNumber}</span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Week {day.weekNumber} · Day {day.dayNumber}
              {day.name && <span className="text-slate-500 font-medium"> — {day.name}</span>}
            </h4>
            <p className="text-xs text-slate-400">
              {exercises.length} {exercises.length === 1 ? 'Exercise' : 'Exercises'} scheduled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={onDeleteDay}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            title="Delete this training day"
          >
            <Trash2 size={13} />
          </button>

          <button onClick={onToggle} className="p-1 text-slate-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Exercises Ledger */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700/60 p-4 space-y-2.5 bg-slate-50/30 dark:bg-slate-900/10">
          {exercises.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3 italic">
              No exercises added for this day. Click "+ Add Exercise" below to build routine.
            </p>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex, idx) => (
                <ExerciseItem
                  key={ex.id}
                  exercise={ex}
                  index={idx}
                  onDelete={() => onDeleteExercise(ex.id)}
                />
              ))}
            </div>
          )}

          <button
            onClick={onAddExercise}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-orange-600 dark:text-orange-400 border border-dashed border-orange-300 dark:border-orange-800 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all"
          >
            <Plus size={13} />
            <span>{t('gymAddExercise') || 'Add Exercise to Day'}</span>
          </button>
        </div>
      )}
    </div>
  )
}