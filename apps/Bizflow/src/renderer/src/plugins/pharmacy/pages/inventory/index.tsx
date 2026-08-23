import { useState } from 'react'
import { CalendarClock, Download } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { downloadCSV } from '../components/_shared'
import { Toolbar, SearchBox, Button } from '../components/ui'

import { usePharmacyInventory } from './hooks/usePharmacyInventory'
import { useInventoryDisposal } from './hooks/useInventoryDisposal'
import { InventoryKpiCards } from './components/InventoryKpiCards'
import { ExpiryBatchesTable } from './components/ExpiryBatchesTable'
import { BatchDisposalModal } from './components/BatchDisposalModal'
import { ProductDetailModal } from '../products/components/ProductDetailModal'
import { EXPIRY_WINDOW_OPTIONS } from './constants'
import { exportInventoryToCSV } from './utils'
import { PharmacyProductItem } from '../products/types'

export default function PharmacyInventory() {
  const toast = useToast()
  const { t } = useLanguage()

  const [detailProductTarget, setDetailProductTarget] = useState<PharmacyProductItem | null>(null)

  const {
    days,
    search,
    batches,
    summary,
    loading,
    setDays,
    setSearch,
    reload,
  } = usePharmacyInventory(toast)

  const {
    targetBatch,
    reason,
    customNotes,
    disposeQty,
    busy: disposalBusy,
    setReason,
    setCustomNotes,
    setDisposeQty,
    openDisposal,
    closeDisposal,
    executeDisposal,
  } = useInventoryDisposal(toast, t, reload)

  const handleExportCSV = () => {
    if (batches.length === 0) {
      toast.error('No expiring batches available to export')
      return
    }
    const csvData = exportInventoryToCSV(batches)
    downloadCSV(csvData, `pharmacy-expiry-report-${days}days-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Expiry audit report exported')
  }

  return (
    <div className="p-4 space-y-4">
      {/* High-Level Inventory KPI Cards */}
      <InventoryKpiCards summary={summary} />

      {/* Controls & Filter Toolbar */}
      <Toolbar
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
            >
              Export Report
            </Button>
          </div>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Filter expiring stock by medicine name or batch #..."
        />

        {/* Expiry Window Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <CalendarClock size={14} className="text-slate-400 mx-1.5 shrink-0" />
          {EXPIRY_WINDOW_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                days === opt.days
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Toolbar>

      {/* Main Expiry Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <ExpiryBatchesTable
          batches={batches}
          loading={loading}
          onInspectProduct={p => setDetailProductTarget(p as any)}
          onDisposeBatch={openDisposal}
          t={t}
        />
      </div>

      {/* Batch Disposal / Write-Off Modal */}
      <BatchDisposalModal
        batch={targetBatch}
        reason={reason}
        customNotes={customNotes}
        disposeQty={disposeQty}
        busy={disposalBusy}
        onClose={closeDisposal}
        onReasonChange={setReason}
        onNotesChange={setCustomNotes}
        onQtyChange={setDisposeQty}
        onConfirm={executeDisposal}
      />

      {/* Product Detail & Analytics Modal */}
      {detailProductTarget && (
        <ProductDetailModal
          product={detailProductTarget}
          onClose={() => setDetailProductTarget(null)}
          t={t}
        />
      )}
    </div>
  )
}