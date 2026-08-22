import { Loader2 } from 'lucide-react'
import { useLockers } from './hooks/useLockers'
import { LockerToolbar } from './components/LockerToolbar'
import { LockerStatsStrip } from './components/LockerStatsStrip'
import { LockerCard } from './components/LockerCard'
import { LockerTable } from './components/LockerTable'
import { LockerFormModal } from './components/LockerFormModal'
import { AssignLockerModal } from './components/AssignLockerModal'
import { DeleteLockerModal } from './components/DeleteLockerModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function LockersTab() {
  const { t } = useLanguage()
  const {
    lockers,
    rawLockers,
    stats,
    loading,
    zone,
    setZone,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    assignTarget,
    setAssignTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleUnassign,
    handleDelete,
    reload
  } = useLockers()

  const handleOpenAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Toolbar */}
      <LockerToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeZone={zone}
        onZoneChange={setZone}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddNew={handleOpenAdd}
        totalCount={lockers.length}
      />

      {/* KPI Overview Strip */}
      <LockerStatsStrip
        total={stats.total}
        occupied={stats.occupied}
        available={stats.available}
        occupancyRate={stats.rate}
      />

      {/* Main Locker Grid / Table View */}
      {loading && rawLockers.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : lockers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
          <span className="text-4xl mb-3">🔒</span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {searchQuery
              ? 'No lockers match your search query'
              : rawLockers.length === 0
              ? t('gymNoLockers') || 'No lockers registered in facility'
              : 'No lockers found in this section'}
          </p>
          {rawLockers.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Locker" to register your facility's lockers.
            </p>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {lockers.map(locker => (
                <LockerCard
                  key={locker.id}
                  locker={locker}
                  onAssignClick={() => setAssignTarget(locker)}
                  onUnassignClick={() => handleUnassign(locker)}
                  onEditClick={() => {
                    setEditTarget(locker)
                    setFormOpen(true)
                  }}
                  onDeleteClick={() => setDeleteTarget(locker)}
                />
              ))}
            </div>
          ) : (
            <LockerTable
              lockers={lockers}
              onAssignClick={l => setAssignTarget(l)}
              onUnassignClick={l => handleUnassign(l)}
              onEditClick={l => {
                setEditTarget(l)
                setFormOpen(true)
              }}
              onDeleteClick={l => setDeleteTarget(l)}
            />
          )}
        </>
      )}

      {/* Locker Add / Edit Modal */}
      <LockerFormModal
        isOpen={formOpen}
        initial={editTarget}
        onClose={() => {
          setFormOpen(false)
          setEditTarget(null)
        }}
        onSaved={reload}
      />

      {/* Assign Member Modal */}
      <AssignLockerModal
        locker={assignTarget}
        isOpen={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        onSaved={reload}
      />

      {/* Delete Confirmation Modal */}
      <DeleteLockerModal
        target={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}