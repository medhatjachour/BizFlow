import { useState } from 'react'
import { ClipboardList, Loader2, ArrowDown, Plus } from 'lucide-react'
import { useSessions } from './hooks/useSessions'
import { Session } from './types'
import SessionStatsBar from './components/SessionStatsBar'
import SessionFiltersBar from './components/SessionFiltersBar'
import SessionCard from './components/SessionCard'
import SessionFormModal from './components/SessionFormModal'

export default function SessionsTab() {
  const {
    sessions,
    total,
    loading,
    loadingMore,
    hasMore,
    filters,
    setFilters,
    metrics,
    updatingStatusId,
    loadMore,
    reload,
    updateSessionStatus,
    deleteSession
  } = useSessions()

  const [showNewModal, setShowNewModal] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)

  return (
    <div className="space-y-4">
      {/* Session Metrics Bar */}
      <SessionStatsBar metrics={metrics} />

      {/* Filter and Search Bar */}
      <SessionFiltersBar
        filters={filters}
        onChange={setFilters}
        onNewSession={() => setShowNewModal(true)}
      />

      {/* Content Rendering */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-xs text-slate-400 font-medium">Loading clinical sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 text-center p-6 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
          <div className="h-16 w-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
            <ClipboardList className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white">No sessions recorded</p>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {filters.search || filters.status || filters.paymentStatus
              ? 'No sessions match your search criteria.'
              : 'Record a new walk-in visit or start from an appointment.'}
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20"
          >
            <Plus className="h-4 w-4" /> Start New Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              onEdit={setEditSession}
              onDelete={deleteSession}
              onStatusChange={updateSessionStatus}
              statusUpdating={updatingStatusId === s.id}
            />
          ))}

          {/* Load more pagination */}
          {hasMore && (
            <div className="flex justify-center pt-3">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin text-teal-600" /> : <ArrowDown className="h-4 w-4" />}
                Load more sessions ({sessions.length} of {total})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modals */}
      {(showNewModal || editSession) && (
        <SessionFormModal
          existingSession={editSession}
          onClose={() => {
            setShowNewModal(false)
            setEditSession(null)
          }}
          onSaved={() => {
            setShowNewModal(false)
            setEditSession(null)
            reload()
          }}
        />
      )}
    </div>
  )
}