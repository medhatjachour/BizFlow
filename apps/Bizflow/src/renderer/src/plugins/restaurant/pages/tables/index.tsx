import React, { useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useFloorPlan } from './hooks/useFloorPlan'
import { useTableActions } from './hooks/useTableActions'
import { FloorToolbar } from './components/FloorToolbar'
import { TableCard } from './components/TableCard'
import { FloorCanvas } from './components/FloorCanvas'
import { TableDetailDrawer } from './components/TableDetailDrawer'
import { TableFormModal } from './components/Modals/TableFormModal'
import { QuickSeatModal } from './components/Modals/QuickSeatModal'
import { TableTransferModal } from './components/Modals/TableTransferModal'
import { TableMergeModal } from './components/Modals/TableMergeModal'
import { RestaurantTableData } from './types'

interface Props {
  onNavigateToPos?: (table: RestaurantTableData) => void
}

export default function FloorPlanPage({ onNavigateToPos }: Props) {
  const {
    tables,
    filteredTables,
    loading,
    error,
    sections,
    stats,
    viewMode,
    setViewMode,
    selectedSection,
    setSelectedSection,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedTable,
    setSelectedTable,
    loadTables,
    updatePosition
  } = useFloorPlan()

  const {
    saveTable,
    changeStatus,
    quickSeat,
    transferTable,
    mergeTables,
    deleteTable
  } = useTableActions(loadTables)

  // Modal States
  const [showTableModal, setShowTableModal] = useState(false)
  const [editingTable, setEditingTable] = useState<RestaurantTableData | null>(null)

  const [showQuickSeatModal, setShowQuickSeatModal] = useState(false)
  const [seatingTable, setSeatingTable] = useState<RestaurantTableData | null>(null)

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferringTable, setTransferringTable] = useState<RestaurantTableData | null>(null)

  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergingTable, setMergingTable] = useState<RestaurantTableData | null>(null)

  // Trigger handlers
  const handleOpenAdd = () => {
    setEditingTable(null)
    setShowTableModal(true)
  }

  const handleOpenEdit = (t: RestaurantTableData) => {
    setEditingTable(t)
    setShowTableModal(true)
  }

  const handleOpenQuickSeat = (t: RestaurantTableData) => {
    setSeatingTable(t)
    setShowQuickSeatModal(true)
  }

  const handleOpenTransfer = (t: RestaurantTableData) => {
    setTransferringTable(t)
    setShowTransferModal(true)
  }

  const handleOpenMerge = (t: RestaurantTableData) => {
    setMergingTable(t)
    setShowMergeModal(true)
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Toolbar and Status Ribbons */}
      <FloorToolbar
        sections={sections}
        selectedSection={selectedSection}
        onSelectSection={setSelectedSection}
        statusFilter={statusFilter}
        onSelectStatus={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        stats={stats}
        onOpenAddModal={handleOpenAdd}
        onRefresh={loadTables}
        loading={loading}
      />

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Floor Viewport (Grid vs Canvas) */}
      {loading && tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-xs font-semibold text-slate-400">Loading dining floor layout...</p>
        </div>
      ) : viewMode === 'canvas' ? (
        <FloorCanvas
          tables={filteredTables}
          onSelectTable={setSelectedTable}
          onUpdatePosition={updatePosition}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onSelect={setSelectedTable}
              onQuickSeat={handleOpenQuickSeat}
              onTransfer={handleOpenTransfer}
              onMerge={handleOpenMerge}
              onStatusChange={changeStatus}
              onEdit={handleOpenEdit}
              onDelete={deleteTable}
            />
          ))}

          {filteredTables.length === 0 && (
            <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No tables match current filters</p>
              <p className="text-xs text-slate-400 mt-1">Try switching section or adding a new table.</p>
            </div>
          )}
        </div>
      )}

      {/* Side Slide-Over Drawer for Selected Table */}
      <TableDetailDrawer
        table={selectedTable}
        onClose={() => setSelectedTable(null)}
        onOpenPos={(t) => {
          setSelectedTable(null)
          onNavigateToPos?.(t)
        }}
        onQuickSeat={handleOpenQuickSeat}
        onTransfer={handleOpenTransfer}
        onMerge={handleOpenMerge}
        onStatusChange={changeStatus}
      />

      {/* Action Modals */}
      <TableFormModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onSave={saveTable}
        editingTable={editingTable}
        existingSections={sections}
      />

      <QuickSeatModal
        isOpen={showQuickSeatModal}
        onClose={() => setShowQuickSeatModal(false)}
        table={seatingTable}
        onSeat={quickSeat}
      />

      <TableTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        sourceTable={transferringTable}
        allTables={tables}
        onTransfer={transferTable}
      />

      <TableMergeModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        sourceTable={mergingTable}
        allTables={tables}
        onMerge={mergeTables}
      />
    </div>
  )
}