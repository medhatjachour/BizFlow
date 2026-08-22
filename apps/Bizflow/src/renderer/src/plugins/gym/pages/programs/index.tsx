import { Loader2, Dumbbell } from 'lucide-react'
import { usePrograms } from './hooks/usePrograms'
import { ProgramToolbar } from './components/ProgramToolbar'
import { ProgramStatsStrip } from './components/ProgramStatsStrip'
import { ProgramCard } from './components/ProgramCard'
import { ProgramTable } from './components/ProgramTable'
import { ProgramDetailView } from './components/detail/ProgramDetailView'
import { ProgramFormModal } from './components/ProgramFormModal'
import { DeleteProgramModal } from './components/DeleteProgramModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function ProgramsTab() {
  const { t } = useLanguage()
  const {
    programs,
    rawPrograms,
    coaches,
    loading,
    searchQuery,
    setSearchQuery,
    goalFilter,
    setGoalFilter,
    viewMode,
    setViewMode,
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    detailTarget,
    setDetailTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    handleProgramSaved
  } = usePrograms()

  // Full Screen Program Schedule Builder View
  if (detailTarget) {
    return (
      <ProgramDetailView
        program={detailTarget}
        coaches={coaches}
        onBack={() => setDetailTarget(null)}
        onProgramUpdated={handleProgramSaved}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Toolbar */}
      <ProgramToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeGoal={goalFilter}
        onGoalChange={setGoalFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddNew={() => {
          setEditTarget(null)
          setFormOpen(true)
        }}
        totalCount={programs.length}
      />

      {/* KPI Overview Strip */}
      <ProgramStatsStrip programs={rawPrograms} />

      {/* Main Content Pane */}
      {loading && rawPrograms.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
          <Dumbbell size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {searchQuery
              ? 'No programs match your search filter'
              : t('gymNoPrograms') || 'No workout programs found'}
          </p>
          {!searchQuery && (
            <p className="text-xs text-slate-400 mt-1">
              Click "Create Program" to build workout regimens and exercise guides.
            </p>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map(program => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onSelect={() => setDetailTarget(program)}
                  onEdit={e => {
                    e.stopPropagation()
                    setEditTarget(program)
                    setFormOpen(true)
                  }}
                />
              ))}
            </div>
          ) : (
            <ProgramTable
              programs={programs}
              onSelect={setDetailTarget}
              onEdit={(p, e) => {
                e.stopPropagation()
                setEditTarget(p)
                setFormOpen(true)
              }}
            />
          )}
        </>
      )}

      {/* Program Create / Edit Modal */}
      <ProgramFormModal
        isOpen={formOpen}
        initial={editTarget}
        coaches={coaches}
        onClose={() => {
          setFormOpen(false)
          setEditTarget(null)
        }}
        onSaved={handleProgramSaved}
      />

      {/* Delete Program Confirmation Modal */}
      <DeleteProgramModal
        target={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}