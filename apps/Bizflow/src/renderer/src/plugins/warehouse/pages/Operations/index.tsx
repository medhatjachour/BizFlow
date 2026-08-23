import { useState, useMemo, useRef } from 'react'
import { ViewMode } from './types'
import { filterOrders } from './utils'
import { useOperationsData } from './hooks/useOperationsData'
import { useOperationsShortcuts } from './hooks/useOperationsShortcuts'
import { OperationsSkeleton } from './components/OperationsSkeleton'
import { OperationsHero } from './components/OperationsHero'
import { OperationsMetricRibbon } from './components/OperationsMetricRibbon'
import { OperationsFilterBar } from './components/OperationsFilterBar'
import { ControlTowerView } from './components/ControlTowerView'
import { StageQueueView } from './components/StageQueueView'
import { ActivityFeedView } from './components/ActivityFeedView'
import { CreateOrderModal } from './components/CreateOrderModal'

export default function OperationsTab() {
  const [view, setView] = useState<ViewMode>('control')
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const {
    loading,
    actingOrderId,
    locations,
    activeOrders,
    movements,
    auditLogs,
    board,
    advanceOrder,
    refresh
  } = useOperationsData()

  useOperationsShortcuts({
    onNewOrder: () => setShowCreateModal(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onEscapeModal: () => setShowCreateModal(false),
    isModalOpen: showCreateModal
  })

  // Filtered orders pipeline
  const filteredActiveOrders = useMemo(() => {
    return filterOrders(activeOrders, query, locationFilter)
  }, [activeOrders, query, locationFilter])

  const inboundOrders = useMemo(() => {
    return filteredActiveOrders.filter(o => o.orderType === 'inbound')
  }, [filteredActiveOrders])

  const outboundOrders = useMemo(() => {
    return filteredActiveOrders.filter(o => o.orderType === 'outbound')
  }, [filteredActiveOrders])

  if (loading && activeOrders.length === 0) {
    return <OperationsSkeleton />
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Hero Banner */}
      <OperationsHero
        loading={loading}
        onRefresh={refresh}
        onNewOrder={() => setShowCreateModal(true)}
      />

      {/* 2. Operations Metrics Bar */}
      <OperationsMetricRibbon board={board} activeCount={activeOrders.length} />

      {/* 3. Filter Bar & View Mode Pills */}
      <OperationsFilterBar
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        locations={locations}
        searchRef={searchInputRef}
      />

      {/* 4. Dynamic Workspace Views */}
      {view === 'control' && (
        <ControlTowerView
          inboundOrders={inboundOrders}
          outboundOrders={outboundOrders}
          onAdvance={advanceOrder}
          actingOrderId={actingOrderId}
        />
      )}

      {view === 'receiving' && (
        <StageQueueView
          stages={['receiving', 'qc', 'putaway']}
          orders={inboundOrders}
          onAdvance={advanceOrder}
          actingOrderId={actingOrderId}
        />
      )}

      {view === 'outbound' && (
        <StageQueueView
          stages={['picking', 'packing', 'shipping']}
          orders={outboundOrders}
          onAdvance={advanceOrder}
          actingOrderId={actingOrderId}
        />
      )}

      {view === 'activity' && (
        <ActivityFeedView movements={movements} auditLogs={auditLogs} />
      )}

      {/* 5. Create Order Modal Dialog */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        locations={locations}
        onSuccess={refresh}
      />
    </div>
  )
}