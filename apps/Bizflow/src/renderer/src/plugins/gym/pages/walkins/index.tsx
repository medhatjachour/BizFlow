import { Loader2 } from 'lucide-react'
import { useWalkIns } from './hooks/useWalkIns'
import { WalkInToolbar } from './components/WalkInToolbar'
import { WalkInStatsStrip } from './components/WalkInStatsStrip'
import { WalkInTable } from './components/WalkInTable'
import { WalkInCardGrid } from './components/WalkInCardGrid'
import { WalkInFormModal } from './components/WalkInFormModal'
import { DeleteSessionModal } from './components/DeleteSessionModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function WalkInsTab() {
  const { t } = useLanguage()
  const {
    sessions,
    period,
    setPeriod,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    totalRevenue,
    loading,
    hasMore,
    handleLoadMore,
    formOpen,
    setFormOpen,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    reload
  } = useWalkIns()

  return (
    <div className="space-y-4">
      {/* Search & Actions Toolbar */}
      <WalkInToolbar
        period={period}
        onPeriodChange={setPeriod}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        onRefresh={reload}
        onAddNew={() => setFormOpen(true)}
      />

      {/* KPI Overview Strip */}
      <WalkInStatsStrip sessions={sessions} totalRevenue={totalRevenue} />

      {/* Main Content Pane */}
      {loading && sessions.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
          <span className="text-4xl mb-3">🚶</span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {searchQuery
              ? 'No sessions match your search criteria'
              : `${t('gymNoSessions') || 'No visits recorded'} for this period`}
          </p>
          {!searchQuery && (
            <p className="text-xs text-slate-400 mt-1">
              Click "Log Entry / Visit" to record walk-ins or member visits.
            </p>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <WalkInTable sessions={sessions} onDelete={setDeleteTarget} />
          ) : (
            <WalkInCardGrid sessions={sessions} onDelete={setDeleteTarget} />
          )}

          {/* Load More Pagination */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin text-orange-500" /> : null}
                <span>{t('gymLoadMore') || 'Load More Sessions'}</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Visit Logging Modal */}
      <WalkInFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />

      {/* Delete Confirmation Modal */}
      <DeleteSessionModal
        target={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}