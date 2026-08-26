
import { useState, useEffect } from 'react'
import { Package, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

import { useVetMedicines } from './hooks/useVetMedicines'
import { useMedicineCategories } from './hooks/useMedicineCategories'
import { useMedicineUnits } from './hooks/useMedicineUnits'

import { MedicinesStats } from './components/MedicinesStats'
import { MedicinesToolbar } from './components/MedicinesToolbar'
import { MedicineCard } from './components/MedicineCard'


import { PAGE_SIZE } from './constants'
import type { Medicine, Batch } from './types'
import { BatchModal } from './components/BatchModal'
import { CategoryManagerModal } from './components/CategoryManagerModal'
import { UnitManagerModal } from './components/UnitManagerModal'
import { MedicineModal } from './components/MedicineModal'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { MedicineHistoryModal } from './components/MedicineHistoryModal'
import { DisposeConfirmModal } from './components/DisposeConfirmModal'

export default function VetMedicinesTab() {
  const { t } = useLanguage()
  const toast = useToast()

  const {
    medicines,
    loading,
    search,
    setSearch,
    category,
    setCategory,
    batchFilter,
    setBatchFilter,
    sortOption,
    setSortOption,
    expandedIds,
    toggleExpand,
    metrics,
    refresh
  } = useVetMedicines()

  const { categories, refreshCategories } = useMedicineCategories()
  const { units, unitRecords, refreshUnits } = useMedicineUnits()

  const [medPage, setMedPage] = useState(1)
  const [medModal, setMedModal] = useState<{ open: boolean; item: Medicine | null }>({
    open: false,
    item: null
  })

  const [batchModal, setBatchModal] = useState<{
    open: boolean
    medId: string
    unit: string
    subUnit?: string | null
    ratio?: number | null
    item: Batch | null
  }>({
    open: false,
    medId: '',
    unit: '',
    item: null
  })

  const [showCatManager, setShowCatManager] = useState(false)
  const [showUnitManager, setShowUnitManager] = useState(false)
  const [delTarget, setDelTarget] = useState<{ type: 'medicine' | 'batch'; id: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [disposeTarget, setDisposeTarget] = useState<{ batch: Batch; medicineName: string; unit: string } | null>(null)
  const [disposing, setDisposing] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    setMedPage(1)
  }, [search, category, batchFilter])

  async function confirmDelete() {
    if (!delTarget) return
    setDeleting(true)
    try {
      if (delTarget.type === 'medicine') {
        await (window as any).api?.vet?.medicines?.delete(delTarget.id)
      } else {
        await (window as any).api?.vet?.medicines?.deleteBatch(delTarget.id)
      }
      toast.success(t('vetDeleted') || 'Deleted')
      setDelTarget(null)
      refresh()
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  async function confirmDispose(reason: string) {
    if (!disposeTarget) return
    setDisposing(true)
    try {
      const res = await (window as any).api?.vet?.medicines?.disposeBatch(disposeTarget.batch.id, {
        reason: reason || undefined
      })
      toast.success(
        (t('vetWriteOffSuccess') || 'Written off — ${amount} loss recorded').replace(
          '${amount}',
          `$${(res?.lossAmount ?? 0).toFixed(2)}`
        )
      )
      setDisposeTarget(null)
      refresh()
    } catch (err: any) {
      toast.error(err?.message ?? 'Dispose failed')
    } finally {
      setDisposing(false)
    }
  }

  const medTotalPages = Math.max(1, Math.ceil(medicines.length / PAGE_SIZE))
  const safePage = Math.min(medPage, medTotalPages)
  const pagedMedicines = medicines.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="p-6 space-y-5">
      <MedicinesStats
        metrics={metrics}
        activeFilter={batchFilter}
        onSelectFilter={setBatchFilter}
      />

      <MedicinesToolbar
        search={search}
        onSearchChange={setSearch}
        selectedCategory={category}
        onSelectCategory={setCategory}
        categories={categories}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onOpenMedicineModal={() => setMedModal({ open: true, item: null })}
        onOpenCategoryModal={() => setShowCatManager(true)}
        onOpenUnitModal={() => setShowUnitManager(true)}
      />

      {loading && medicines.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : medicines.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {batchFilter === 'expired'
              ? 'No expired medicines'
              : batchFilter === 'expiring'
              ? 'No medicines expiring within 30 days'
              : t('vetNoMedicinesFound') || 'No medicines found'}
          </p>
          {batchFilter ? (
            <button
              onClick={() => setBatchFilter(null)}
              className="mt-2 text-sm text-slate-500 dark:text-slate-400 hover:underline"
            >
              {t('vetClearFilter') || 'Clear filter'}
            </button>
          ) : (
            <button
              onClick={() => setMedModal({ open: true, item: null })}
              className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              {t('vetAddFirstMedicine') || 'Add the first medicine'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {pagedMedicines.map(med => (
            <MedicineCard
              key={med.id}
              medicine={med}
              expanded={expandedIds.has(med.id)}
              onToggle={() => toggleExpand(med.id)}
              onReceiveBatch={() =>
                setBatchModal({
                  open: true,
                  medId: med.id,
                  unit: med.unit,
                  subUnit: med.subUnit,
                  ratio: med.subUnitsPerContainer,
                  item: null
                })
              }
              onEditMedicine={() => setMedModal({ open: true, item: med })}
              onDeleteMedicine={() =>
                setDelTarget({ type: 'medicine', id: med.id, label: `Delete "${med.name}"?` })
              }
              onViewHistory={() => setHistoryTarget({ id: med.id, name: med.name })}
              onEditBatch={b =>
                setBatchModal({
                  open: true,
                  medId: med.id,
                  unit: med.unit,
                  subUnit: med.subUnit,
                  ratio: med.subUnitsPerContainer,
                  item: b
                })
              }
              onDisposeBatch={b =>
                setDisposeTarget({ batch: b, medicineName: med.name, unit: med.unit })
              }
              onDeleteBatch={b =>
                setDelTarget({ type: 'batch', id: b.id, label: 'Delete this batch?' })
              }
            />
          ))}

          {medTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                {t('vetShowing') || 'Showing'} {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, medicines.length)} {t('vetOfLabel') || 'of'}{' '}
                {medicines.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMedPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="h-3.5 w-3.5 -rotate-90" />
                </button>
                <span className="px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {safePage} / {medTotalPages}
                </span>
                <button
                  onClick={() => setMedPage(p => Math.min(medTotalPages, p + 1))}
                  disabled={safePage === medTotalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCatManager && (
        <CategoryManagerModal
          onRefresh={() => {
            refreshCategories()
            refresh()
          }}
          onClose={() => setShowCatManager(false)}
        />
      )}

      {showUnitManager && (
        <UnitManagerModal
          unitRecords={unitRecords}
          onRefresh={() => {
            refreshUnits()
            refresh()
          }}
          onClose={() => setShowUnitManager(false)}
        />
      )}

      {medModal.open && (
        <MedicineModal
          initial={medModal.item}
          categories={categories.map(c => c.name)}
          units={units}
          unitRecords={unitRecords}
          onRefresh={refreshCategories}
          onUnitsChange={refreshUnits}
          onSave={() => {
            setMedModal({ open: false, item: null })
            refresh()
          }}
          onClose={() => setMedModal({ open: false, item: null })}
        />
      )}

      {batchModal.open && (
        <BatchModal
          medicineId={batchModal.medId}
          unit={batchModal.unit}
          subUnit={batchModal.subUnit}
          subUnitsPerContainer={batchModal.ratio}
          initial={batchModal.item}
          onSave={() => {
            setBatchModal({ open: false, medId: '', unit: '', item: null })
            refresh()
          }}
          onClose={() => setBatchModal({ open: false, medId: '', unit: '', item: null })}
        />
      )}

      {delTarget && (
        <DeleteConfirmModal
          label={delTarget.label}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}

      {disposeTarget && (
        <DisposeConfirmModal
          batch={disposeTarget.batch}
          medicineName={disposeTarget.medicineName}
          unit={disposeTarget.unit}
          busy={disposing}
          onConfirm={confirmDispose}
          onCancel={() => setDisposeTarget(null)}
        />
      )}

      {historyTarget && (
        <MedicineHistoryModal
          medicineId={historyTarget.id}
          medicineName={historyTarget.name}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  )
}