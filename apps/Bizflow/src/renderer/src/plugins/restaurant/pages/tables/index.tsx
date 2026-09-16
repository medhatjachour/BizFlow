// src/pages/tables/index.tsx
import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, Plus, Users, ShoppingBag, Wine, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import ConfirmDialog from '@renderer/components/ui/ConfirmDialog'
import { useFloorPlan } from './hooks/useFloorPlan'
import { FloorToolbar } from './components/FloorToolbar'
import { TableCard } from './components/TableCard'
import { FloorCanvas } from './components/FloorCanvas'
import { TableDetailDrawer } from './components/TableDetailDrawer'
import { TableFormModal } from './components/Modals/TableFormModal'
import { TableTransferModal } from './components/Modals/TableTransferModal'
import { TableMergeModal } from './components/Modals/TableMergeModal'
import { useTableActions } from './hooks/useTableActions'
import { useRestaurant } from '../../context/RestaurantContext'
import { RestaurantTableData } from './types'
import { sounds } from '../utils/sound'

/** Occupancy clocks are rendered from `Date.now()`; tick so they stay honest. */
const CLOCK_TICK_MS = 30000

export default function FloorPlanPage() {
  const { t } = useLanguage()
  const { success } = useToast()
  const { openTableInPos, openQuickCheckInPos } = useRestaurant()
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
    transferTable,
    mergeTables,
    deleteTable,
    actionError,
    setActionError
  } = useTableActions(loadTables)

  // Modals & Popovers
  const [showTableModal, setShowTableModal] = useState(false)
  const [editingTable, setEditingTable] = useState<RestaurantTableData | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferringTable, setTransferringTable] = useState<RestaurantTableData | null>(null)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergingTable, setMergingTable] = useState<RestaurantTableData | null>(null)
  const [pendingDelete, setPendingDelete] = useState<RestaurantTableData | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 1-Tap Quick Seating Popover State
  const [seatingTable, setSeatingTable] = useState<RestaurantTableData | null>(null)

  const [, setClock] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setClock((n) => n + 1), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])

  /**
   * Tapping a table now only inspects it. Jumping straight into the POS on a tap
   * made the floor plan unusable — the tile opened a live check (or a party-size
   * prompt) whenever a waiter meant to look at, or reposition, it.
   */
  const handleInspect = (table: RestaurantTableData) => {
    sounds.playBump()
    setActionError(null)
    setSelectedTable(table)
  }

  const handleConfirmPartySizeAndOpenPos = (partySize: number) => {
    if (!seatingTable) return
    openTableInPos(seatingTable, partySize)
    setSeatingTable(null)
  }

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const ok = await deleteTable(pendingDelete.id)
    setDeleting(false)
    setPendingDelete(null)
    if (ok) success(t('restTableDeleted'))
  }

  const handleStatusChange = async (id: string, status: string) => {
    const ok = await changeStatus(id, status)
    if (ok) success(t('restTableStatusUpdated'))
  }

  return (
    <div className="space-y-4 pb-12">
      {/* ─── Top Fast-Action Bar (Floor vs Quick Bar / Takeout) ──────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openQuickCheckInPos('takeout')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-black transition-all active:scale-95 shadow-2xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t('restTableQuickTakeout')}</span>
          </button>
          <button
            type="button"
            onClick={() => openQuickCheckInPos('bar_tab')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-black transition-all active:scale-95 shadow-2xs"
          >
            <Wine className="w-3.5 h-3.5" />
            <span>{t('restTableQuickBarTab')}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTable(null)
            setShowTableModal(true)
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-500/25 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('restTableNew')}</span>
        </button>
      </div>

      {/* ─── Section Filters & Floor Controls ──────────────────────── */}
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
        onOpenAddModal={() => {
          setEditingTable(null)
          setShowTableModal(true)
        }}
        onRefresh={() => void loadTables()}
        loading={loading}
      />

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label={t('restTableDismiss')}
            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Grid View vs Spatial Canvas ──────────────────────────── */}
      {loading && tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 space-y-3">
          <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-xs font-bold text-slate-400">{t('restTableLoadingLayout')}</p>
        </div>
      ) : viewMode === 'canvas' ? (
        <FloorCanvas
          tables={filteredTables}
          onSelectTable={handleInspect}
          onUpdatePosition={updatePosition}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onSelect={handleInspect}
              onQuickSeat={() => setSeatingTable(table)}
              onTransfer={(t2) => {
                setTransferringTable(t2)
                setShowTransferModal(true)
              }}
              onMerge={(t2) => {
                setMergingTable(t2)
                setShowMergeModal(true)
              }}
              onStatusChange={handleStatusChange}
              onEdit={(t2) => {
                setEditingTable(t2)
                setShowTableModal(true)
              }}
              onDelete={(id) => setPendingDelete(tables.find((tb) => tb.id === id) || null)}
            />
          ))}

          {filteredTables.length === 0 && (
            <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <p className="text-sm font-bold text-slate-500">{t('restTableNoMatch')}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── 1-Tap Guest Count Picker Popover ──────────────────────── */}
      {seatingTable && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 font-black text-lg flex items-center justify-center mx-auto">
                #{seatingTable.number}
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {t('restTableSeatTitle', { number: seatingTable.number })}
              </h3>
              <p className="text-xs text-slate-400">{t('restTableSeatHint')}</p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleConfirmPartySizeAndOpenPos(count)}
                  className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-900 dark:text-white font-black text-sm transition-all active:scale-90 flex flex-col items-center justify-center gap-0.5"
                >
                  <Users className="w-3.5 h-3.5 opacity-60" />
                  <span>{count}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSeatingTable(null)}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ─── Detail Drawer & Action Modals ─────────────────────────── */}
      <TableDetailDrawer
        table={selectedTable}
        onClose={() => setSelectedTable(null)}
        onOpenPos={(t2) => openTableInPos(t2)}
        onQuickSeat={() => {
          if (selectedTable) setSeatingTable(selectedTable)
          setSelectedTable(null)
        }}
        onTransfer={(t2) => {
          setTransferringTable(t2)
          setShowTransferModal(true)
        }}
        onMerge={(t2) => {
          setMergingTable(t2)
          setShowMergeModal(true)
        }}
        onStatusChange={handleStatusChange}
      />

      <TableFormModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onSave={saveTable}
        editingTable={editingTable}
        existingSections={sections}
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

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={t('restTableDeleteTitle')}
        message={t('restTableDeleteMessage', { number: pendingDelete?.number ?? '' })}
        confirmLabel={t('restTableDeleteConfirm')}
        busy={deleting}
        onConfirm={() => void handleDeleteConfirmed()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
