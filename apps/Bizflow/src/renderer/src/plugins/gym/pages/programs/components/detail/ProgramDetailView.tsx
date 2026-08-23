import { Plus, Loader2, CalendarPlus } from 'lucide-react'
import { Program, CoachLite } from '../../types'
import { useProgramDetail } from '../../hooks/useProgramDetail'
import { ProgramHeader } from './ProgramHeader'
import { DayCard } from './DayCard'
import { DayFormModal } from './DayFormModal'
import { ExerciseFormModal } from './ExerciseFormModal'
import { ProgramFormModal } from '../ProgramFormModal'
import { AssignMemberModal } from '../AssignMemberModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProgramDetailViewProps {
  program: Program
  coaches: CoachLite[]
  onBack: () => void
  onProgramUpdated: (p: Program) => void
}

export function ProgramDetailView({
  program: initial,
  coaches,
  onBack,
  onProgramUpdated
}: ProgramDetailViewProps) {
  const { t } = useLanguage()
  const {
    program,
    loading,
    editOpen,
    setEditOpen,
    dayFormOpen,
    setDayFormOpen,
    exFormDay,
    setExFormDay,
    assignOpen,
    setAssignOpen,
    expandedDays,
    toggleDayExpansion,
    handleAddDay,
    handleDeleteDay,
    handleAddExercise,
    handleDeleteExercise
  } = useProgramDetail(initial)

  const days = [...(program.days ?? [])].sort(
    (a, b) => a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber
  )

  return (
    <div className="space-y-4">
      {/* Program Summary Hero Header */}
      <ProgramHeader
        program={program}
        onBack={onBack}
        onEdit={() => setEditOpen(true)}
        onAssign={() => setAssignOpen(true)}
      />

      {/* Routine Days Builder Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            Program Curriculum & Schedule
          </h3>
          <p className="text-xs text-slate-400">
            {days.length} {days.length === 1 ? 'Training Day' : 'Training Days'} configured across {program.weeksTotal} weeks
          </p>
        </div>

        <button
          onClick={() => setDayFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-2xl shadow-xs transition-all active:scale-95"
        >
          <Plus size={14} />
          <span>{t('gymAddDay') || 'Add Training Day'}</span>
        </button>
      </div>

      {/* Days List / Empty State */}
      {loading && days.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
          <CalendarPlus size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No training days built for this routine yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Training Day" to build Week 1, Day 1 and start logging exercises.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => (
            <DayCard
              key={day.id}
              day={day}
              isExpanded={expandedDays[day.id] ?? true}
              onToggle={() => toggleDayExpansion(day.id)}
              onDeleteDay={() => handleDeleteDay(day.id)}
              onAddExercise={() => setExFormDay(day)}
              onDeleteExercise={exId => handleDeleteExercise(day.id, exId)}
            />
          ))}
        </div>
      )}

      {/* Program Edit Modal */}
      <ProgramFormModal
        isOpen={editOpen}
        initial={program}
        coaches={coaches}
        onClose={() => setEditOpen(false)}
        onSaved={p => {
          onProgramUpdated(p)
          setEditOpen(false)
        }}
      />

      {/* Add Day Modal (Uses Fixed Payload) */}
      <DayFormModal
        program={program}
        isOpen={dayFormOpen}
        onClose={() => setDayFormOpen(false)}
        onSubmit={handleAddDay}
      />

      {/* Add Exercise Modal (Uses Fixed Payload) */}
      <ExerciseFormModal
        day={exFormDay}
        isOpen={Boolean(exFormDay)}
        onClose={() => setExFormDay(null)}
        onSubmit={handleAddExercise}
      />

      {/* Assign to Member Modal */}
      <AssignMemberModal
        program={program}
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSaved={() => setAssignOpen(false)}
      />
    </div>
  )
}