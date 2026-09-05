import { Loader2 } from 'lucide-react'
import { useCoaches } from './hooks/useCoaches'
import { CoachToolbar } from './components/CoachToolbar'
import { CoachCardGrid } from './components/CoachCardGrid'
import { CoachTable } from './components/CoachTable'
import { CoachPagination } from './components/CoachPagination'
import { CoachFormModal } from './components/CoachFormModal'
import { CoachProfileModal } from './components/profile/CoachProfileModal'
import { Coach } from './types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function CoachesTab() {
  const { t } = useLanguage()
  const {
    coaches,
    total,
    page,
    setPage,
    totalPages,
    searchInput,
    setSearchInput,
    handleSearchSubmit,
    handleClearSearch,
    loading,
    filter,
    setFilter,
    viewMode,
    setViewMode,
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    profileTarget,
    setProfileTarget,
    handleSaved
  } = useCoaches()

  const handleOpenAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (coach: Coach, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTarget(coach)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Toolbar */}
      <CoachToolbar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onAddNew={handleOpenAdd}
        activeFilter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={total}
      />

      {/* Main Content Pane */}
      {loading && coaches.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : coaches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
          <span className="text-4xl mb-3">🧑‍🏫</span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {searchInput
              ? t('gymNoCoachesMatch') || 'No coaches match your search'
              : t('gymNoCoaches') || 'No coaches enrolled yet'}
          </p>
          {!searchInput && (
            <p className="text-xs text-slate-400 mt-1">
              {t('gymNoCoaches') || 'No coaches enrolled yet'}.{' '}
              {t('gymAddCoach') || 'Click "Add Coach" to enroll personal trainers and gym staff.'}
            </p>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <CoachCardGrid
              coaches={coaches}
              onSelectCoach={setProfileTarget}
              onEditCoach={handleOpenEdit}
            />
          ) : (
            <CoachTable
              coaches={coaches}
              onSelectCoach={setProfileTarget}
              onEditCoach={handleOpenEdit}
            />
          )}

          {/* Pagination Controls */}
          <CoachPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Add / Edit Coach Modal */}
      <CoachFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        initial={editTarget}
      />

      {/* Coach Details Modal */}
      {profileTarget && (
        <CoachProfileModal
          coach={profileTarget}
          onClose={() => setProfileTarget(null)}
          onEdited={handleSaved}
        />
      )}
    </div>
  )
}