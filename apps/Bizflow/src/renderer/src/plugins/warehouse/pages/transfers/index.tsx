import { useState, useMemo, useRef } from 'react'
import { Transfer } from './types'
import { computeTransferMetrics, filterTransfers } from './utils'
import { useTransfersData } from './hooks/useTransfersData'
import { useTransfersShortcuts } from './hooks/useTransfersShortcuts'
import { TransfersSkeleton } from './components/TransfersSkeleton'
import { TransfersHero } from './components/TransfersHero'
import { TransfersSummaryRibbon } from './components/TransfersSummaryRibbon'
import { TransfersFilterBar } from './components/TransfersFilterBar'
import { TransferCard } from './components/TransferCard'
import { TransferDetailDrawer } from './components/TransferDetailDrawer'
import { CreateTransferModal } from './components/CreateTransferModal'
import { ConfirmStatusModal } from './components/ConfirmStatusModal'

export default function TransfersTab() {
  const {
    transfers,
    locations,
    loading,
    actingTransferId,
    refresh,
    createTransfer,
    updateStatus,
    deleteTransfer
  } = useTransfersData()

  // State
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [query, setQuery] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [inspectingTransfer, setInspectingTransfer] = useState<Transfer | null>(null)

  // Status Action Confirmation State
  const [pendingAction, setPendingAction] = useState<{
    transfer: Transfer
    targetStatus: string
  } | null>(null)

  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useTransfersShortcuts({
    onNewTransfer: () => setShowCreateModal(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onEscape: () => {
      setShowCreateModal(false)
      setInspectingTransfer(null)
      setPendingAction(null)
    },
    isModalActive: showCreateModal || !!inspectingTransfer || !!pendingAction
  })

  const locationMap = useMemo(() => {
    return new Map(locations.map(l => [l.id, l]))
  }, [locations])

  const filteredTransfers = useMemo(() => {
    return filterTransfers(transfers, query, statusFilter, locationMap)
  }, [transfers, query, statusFilter, locationMap])

  const metrics = useMemo(() => {
    return computeTransferMetrics(transfers)
  }, [transfers])

  const handleExecuteStatusUpdate = async () => {
    if (!pendingAction) return
    await updateStatus(pendingAction.transfer.id, pendingAction.targetStatus)
    setPendingAction(null)
  }

  if (loading && transfers.length === 0) {
    return <TransfersSkeleton />
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Hero Banner */}
      <TransfersHero
        loading={loading}
        onRefresh={refresh}
        onNewTransfer={() => setShowCreateModal(true)}
      />

      {/* 2. Key Metrics Summary Ribbon */}
      <TransfersSummaryRibbon metrics={metrics} />

      {/* 3. Filter Bar & Search */}
      <TransfersFilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        query={query}
        onQueryChange={setQuery}
        totalCount={filteredTransfers.length}
        searchRef={searchInputRef}
      />

      {/* 4. Transfers Feed */}
      {filteredTransfers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-400 text-xs">
          No stock transfers found matching the filter criteria.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredTransfers.map(tr => (
            <TransferCard
              key={tr.id}
              transfer={tr}
              locationMap={locationMap}
              onInspect={setInspectingTransfer}
              onRequestAdvance={(target, next) => setPendingAction({ transfer: target, targetStatus: next })}
              onRequestCancel={target => setPendingAction({ transfer: target, targetStatus: 'cancelled' })}
              onDelete={deleteTransfer}
              isActing={actingTransferId === tr.id}
            />
          ))}
        </div>
      )}

      {/* 5. Create Transfer Modal */}
      <CreateTransferModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        locations={locations}
        onSubmit={createTransfer}
      />

      {/* 6. Transfer Detail & Bill of Lading Drawer */}
      <TransferDetailDrawer
        transfer={inspectingTransfer}
        locations={locations}
        onClose={() => setInspectingTransfer(null)}
      />

      {/* 7. Safety Action Confirmation Dialog */}
      <ConfirmStatusModal
        transfer={pendingAction?.transfer || null}
        targetStatus={pendingAction?.targetStatus || null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleExecuteStatusUpdate}
      />
    </div>
  )
}