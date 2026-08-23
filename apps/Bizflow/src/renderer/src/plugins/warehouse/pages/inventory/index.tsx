import { useState, useMemo, useRef } from 'react'
import { StockEntry, StockFilterMode, ViewLayout, SortOption } from './types'
import { filterAndSortStock, computeSummary } from './utils'
import { useInventoryData } from './hooks/useInventoryData'
import { useInventoryShortcuts } from './hooks/useInventoryShortcuts'
import { InventorySkeleton } from './components/InventorySkeleton'
import { InventoryHero } from './components/InventoryHero'
import { InventorySummaryCards } from './components/InventorySummaryCards'
import { LocationNavigator } from './components/LocationNavigator'
import { InventoryFilterBar } from './components/InventoryFilterBar'
import { InventoryTable } from './components/InventoryTable'
import { InventoryGridView } from './components/InventoryGridView'
import { StockUpsertModal } from './components/StockUpsertModal'
import { StockAdjustModal } from './components/StockAdjustModal'

export default function InventoryTab() {
  const {
    locations,
    stockList,
    loading,
    refresh,
    adjustStockQuantity,
    customAdjust,
    upsertStock,
    deleteStockEntry
  } = useInventoryData()

  // Filters & State
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all')
  const [filterMode, setFilterMode] = useState<StockFilterMode>('all')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('risk')
  const [layout, setLayout] = useState<ViewLayout>('table')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<StockEntry | null>(null)

  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useInventoryShortcuts({
    onNewStock: () => setShowAddModal(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onEscapeModals: () => {
      setShowAddModal(false)
      setEditingEntry(null)
    },
    isModalActive: showAddModal || !!editingEntry
  })

  // Filtered list
  const filteredEntries = useMemo(() => {
    return filterAndSortStock(stockList, query, selectedLocationId, filterMode, sortBy)
  }, [stockList, query, selectedLocationId, filterMode, sortBy])

  // Summary Metrics
  const summary = useMemo(() => {
    return computeSummary(filteredEntries)
  }, [filteredEntries])

  if (loading && stockList.length === 0) {
    return <InventorySkeleton />
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Hero Banner */}
      <InventoryHero
        loading={loading}
        onRefresh={refresh}
        onAddStock={() => setShowAddModal(true)}
      />

      {/* 2. Top-Level Facility Location Navigator */}
      <LocationNavigator
        locations={locations}
        selectedLocationId={selectedLocationId}
        onSelectLocation={setSelectedLocationId}
      />

      {/* 3. Summary Metric Cards */}
      <InventorySummaryCards summary={summary} />

      {/* 4. Filter Toolbar & Search */}
      <InventoryFilterBar
        query={query}
        onQueryChange={setQuery}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        layout={layout}
        onLayoutChange={setLayout}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        totalFiltered={filteredEntries.length}
        searchRef={searchInputRef}
      />

      {/* 5. Inventory Data Display (Table vs Grid) */}
      {layout === 'table' ? (
        <InventoryTable
          entries={filteredEntries}
          locations={locations}
          onAdjustStep={adjustStockQuantity}
          onEdit={setEditingEntry}
          onDelete={deleteStockEntry}
        />
      ) : (
        <InventoryGridView
          entries={filteredEntries}
          locations={locations}
          onAdjustStep={adjustStockQuantity}
          onEdit={setEditingEntry}
          onDelete={deleteStockEntry}
        />
      )}

      {/* 6. Upsert Stock Modal */}
      <StockUpsertModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        locations={locations}
        defaultLocationId={selectedLocationId}
        onSubmit={upsertStock}
      />

      {/* 7. Quick Adjustment Modal */}
      <StockAdjustModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onConfirm={customAdjust}
      />
    </div>
  )
}