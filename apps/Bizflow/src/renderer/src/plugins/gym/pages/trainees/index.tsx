import { Loader2 } from 'lucide-react'
import { useTrainees } from './hooks/useTrainees'
import { TraineeToolbar } from './components/TraineeToolbar'
import { TraineeTable } from './components/TraineeTable'
import { TraineeCardGrid } from './components/TraineeCardGrid'
import { TraineePagination } from './components/TraineePagination'
import { TraineeFormModal } from './components/TraineeFormModal'
import { TraineeProfileModal } from './components/profile/TraineeProfileModal'
import QRModal from '../../components/QRModal'
import { useState } from 'react'
import { Trainee } from './types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function TraineesTab() {
  const { t } = useLanguage()
  const {
    trainees,
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
    handleTraineeSaved
  } = useTrainees()

  const [qrModalTarget, setQrModalTarget] = useState<Trainee | null>(null)

  const handleOpenAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (trainee: Trainee, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTarget(trainee)
    setFormOpen(true)
  }

  const handleOpenQr = (trainee: Trainee, e: React.MouseEvent) => {
    e.stopPropagation()
    setQrModalTarget(trainee)
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Toolbar */}
      <TraineeToolbar
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

      {/* Main Content Area */}
      {loading && trainees.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : trainees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
          <span className="text-4xl mb-3">🏋️</span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {searchInput ? t('gymNoTraineesMatch') || 'No members match your search criteria' : t('gymNoTrainees') || 'No members in the database'}
          </p>
          {!searchInput && (
            <p className="text-xs text-slate-400 mt-1">
              {t('gymAddFirstMember') || 'Click "Add Member" to enroll your first gym member.'}
            </p>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <TraineeTable
              trainees={trainees}
              onSelectTrainee={setProfileTarget}
              onEditTrainee={handleOpenEdit}
              onViewQr={handleOpenQr}
            />
          ) : (
            <TraineeCardGrid
              trainees={trainees}
              onSelectTrainee={setProfileTarget}
              onEditTrainee={handleOpenEdit}
              onViewQr={handleOpenQr}
            />
          )}

          {/* Pagination Controls */}
          <TraineePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Modals */}
      <TraineeFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleTraineeSaved}
        initial={editTarget}
      />

      {profileTarget && (
        <TraineeProfileModal
          trainee={profileTarget}
          onClose={() => setProfileTarget(null)}
          onEdited={handleTraineeSaved}
        />
      )}

      {qrModalTarget && (
        <QRModal
          isOpen={!!qrModalTarget}
          onClose={() => setQrModalTarget(null)}
          type="gym_trainee"
          id={qrModalTarget.id}
          name={qrModalTarget.name}
        />
      )}
    </div>
  )
}