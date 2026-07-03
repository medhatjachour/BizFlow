import { useState, useEffect, useCallback } from 'react'
import {
  Pill, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Loader2,
  PackagePlus, AlertTriangle, Clock, Search, X, Package, XCircle, Settings,
  History, DollarSign
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Medicine, Batch } from './vetMedicines.types'
import { api, loadUnits, saveUnits, daysUntil, ExpiryBadge, StoreHelp } from './vetMedicines.shared'
import MedicineModal from './MedicineModal'
import BatchModal from './BatchModal'
import CategoryManagerModal from './CategoryManagerModal'
import MedicineHistoryModal from './MedicineHistoryModal'

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ label, onConfirm, onCancel, busy }: { label: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <p className="font-semibold text-slate-900 dark:text-white mb-2">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('vetDeletePermanent')||'This action cannot be undone.'}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">{t('vetMedCancel')||'Cancel'}</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('vetDeleteConfirm')||'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DisposeConfirm({
  batch, medicineName, unit, onConfirm, onCancel, busy
}: {
  batch: Batch; medicineName: string; unit: string
  onConfirm: (reason: string) => void; onCancel: () => void; busy: boolean
}) {
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const lossAmount = batch.quantity * (batch.costPerUnit ?? 0)
  const lotLabel   = batch.batchNumber ? ` LOT-${batch.batchNumber}` : ''
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('vetWriteOffTitle')||'Write Off Expired Batch'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{medicineName}{lotLabel}</p>
          </div>
        </div>
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 mb-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">{t('vetWriteOffQtyLabel')||'Quantity to write off'}</span>
            <span className="font-semibold text-slate-900 dark:text-white">{batch.quantity} {unit}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">{t('vetWriteOffCostUnit')||'Cost per unit'}</span>
            <span className="font-semibold text-slate-900 dark:text-white">${(batch.costPerUnit ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-red-200 dark:border-red-700 pt-1 mt-1">
            <span className="font-semibold text-red-700 dark:text-red-400">{t('vetWriteOffLoss')||'Loss recorded'}</span>
            <span className="font-bold text-red-700 dark:text-red-400">${lossAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetWriteOffReason')||'Reason (optional)'}</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Expired — not administered"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          This will zero the batch stock and record a <strong>${lossAmount.toFixed(2)}</strong> loss under <em>Medications</em> expenses.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">{t('vetMedCancel')||'Cancel'}</button>
          <button onClick={() => onConfirm(reason)} disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-3.5 w-3.5" /> {t('vetWriteOff')||'Write Off'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function VetMedicinesTab() {
  const { t } = useLanguage()
  const toast = useToast()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('all')
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())

  const [dbCategories, setDbCategories] = useState<{ id: string; name: string; color: string }[]>([])
  const [units, setUnits]           = useState<string[]>(loadUnits)
  // Container units are persisted in the DB; localStorage is just a warm cache.
  useEffect(() => {
    ;(window as any).api?.vet?.medicineUnits?.getAll()
      .then((r: { name: string }[]) => { if (r?.length) { const names = r.map(u => u.name); setUnits(names); saveUnits(names) } })
      .catch(() => {})
  }, [])
  const [showCatManager, setShowCatManager] = useState(false)
  const [medModal, setMedModal]     = useState<{ open: boolean; item: Medicine | null }>({ open: false, item: null })
  const [batchModal, setBatchModal] = useState<{ open: boolean; medId: string; unit: string; subUnit?: string | null; ratio?: number | null; item: Batch | null }>({ open: false, medId: '', unit: '', item: null })
  const [delTarget, setDelTarget]   = useState<{ type: 'medicine' | 'batch'; id: string; label: string } | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [showLowStock, setShowLowStock] = useState(false)
  const [medPage, setMedPage] = useState(1)
  const [batchFilter,  setBatchFilter]  = useState<'expired' | 'expiring' | null>(null)
  const [disposeTarget, setDisposeTarget] = useState<{ batch: Batch; medicineName: string; unit: string } | null>(null)
  const [disposing, setDisposing]   = useState(false)
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null)

  // Reset active category filter if its category was deleted
  const categoryNames = ['all', ...dbCategories.map(c => c.name)]
  useEffect(() => {
    if (category !== 'all' && !categoryNames.includes(category)) setCategory('all')
  }, [dbCategories])

  const loadCategories = useCallback(async () => {
    try {
      const rows = await (window as any).api?.vet?.medicineCategories?.getAll()
      setDbCategories(rows ?? [])
    } catch {}
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getAll({ search: search || undefined, category: category !== 'all' ? category : undefined, take: 1000 })
      setMedicines(res.data ?? []); setTotal(res.total ?? 0)
    } catch (err: any) { toast.error(err?.message ?? 'Failed to load') }
    finally { setLoading(false) }
  }, [search, category])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function confirmDelete() {
    if (!delTarget) return
    setDeleting(true)
    try {
      if (delTarget.type === 'medicine') await api.delete(delTarget.id)
      else                               await api.deleteBatch(delTarget.id)
      toast.success(t('vetDeleted')||'Deleted')
      setDelTarget(null)
      load()
    } catch (err: any) { toast.error(err?.message ?? 'Delete failed') }
    finally { setDeleting(false) }
  }

  async function confirmDispose(reason: string) {
    if (!disposeTarget) return
    setDisposing(true)
    try {
      const res = await api.disposeBatch(disposeTarget.batch.id, { reason: reason || undefined })
      toast.success((t('vetWriteOffSuccess')||'Written off — ${amount} loss recorded').replace('${amount}', `$${(res.lossAmount ?? 0).toFixed(2)}`))
      setDisposeTarget(null)
      load()
    } catch (err: any) { toast.error(err?.message ?? 'Dispose failed') }
    finally { setDisposing(false) }
  }

  const lowStockMeds = medicines.filter(m => m.isLowStock)
  const displayedMedicines = (() => {
    if (showLowStock) return lowStockMeds
    if (batchFilter === 'expired')  return medicines.filter(m => m.hasExpired)
    if (batchFilter === 'expiring') return medicines.filter(m => m.expiresWithin30Days && !m.hasExpired)
    return medicines
  })()

  // Client-side pagination keeps the list snappy with large catalogues (500+).
  const MED_PAGE_SIZE = 24
  const medTotalPages = Math.max(1, Math.ceil(displayedMedicines.length / MED_PAGE_SIZE))
  const safePage = Math.min(medPage, medTotalPages)
  const pagedMedicines = displayedMedicines.slice((safePage - 1) * MED_PAGE_SIZE, safePage * MED_PAGE_SIZE)
  useEffect(() => { setMedPage(1) }, [search, category, showLowStock, batchFilter])

  return (
    <div className="p-6 space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('vetSearchMedicines')||'Search medicines…'}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-52" />
          </div>
          <div className="flex gap-0.5 flex-wrap items-center">
            {categoryNames.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors
                  ${category === c
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {c === 'all' ? t('vetFilterAll') || 'All' : c}
              </button>
            ))}
            <button
              onClick={() => setShowCatManager(true)}
              className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={t('vetManageCategories') || 'Manage Categories'}>
              <Settings size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMedModal({ open: true, item: null })}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> {t('vetAddMedicineBtn')||'Add Medicine'}
          </button>
          <StoreHelp />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: t('vetTotalMedicines')||'Total Medicines',   value: total,                                                                  icon: Pill,          color: 'text-violet-600 dark:text-violet-400', clickable: true,     filterKey: null },
          { label: t('vetExpiredBatches')||'Expired Batches',   value: medicines.filter(m => m.hasExpired).length,                            icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',        clickable: true,     filterKey: 'expired' as const },
          { label: t('vetExpiring30')||'Expiring ≤30 days', value: medicines.filter(m => m.expiresWithin30Days && !m.hasExpired).length,  icon: Clock,         color: 'text-amber-600 dark:text-amber-400',    clickable: true,     filterKey: 'expiring' as const },
          { label: t('vetLowStockCard')||'Low Stock',         value: lowStockMeds.length,                                                   icon: Package,       color: 'text-orange-600 dark:text-orange-400',  clickable: true,     filterKey: null },
          { label: t('vetStockValue')||'Stock Value',         value: `$${medicines.reduce((sum, m) => sum + (m.batches?.reduce((bs, b) => bs + b.quantity * (b.costPerUnit || 0), 0) ?? 0), 0).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', clickable: false, filterKey: null },
        ].map(s => {
          const isTotal         = s.label === (t('vetTotalMedicines')||'Total Medicines')
          const anyFilterActive  = showLowStock || batchFilter !== null || category !== 'all'
          const isLowStockActive = s.label === (t('vetLowStockCard')||'Low Stock') && showLowStock
          const isBatchActive    = s.filterKey !== null && batchFilter === s.filterKey
          const isActive         = isLowStockActive || isBatchActive || (isTotal && anyFilterActive)
          return (
            <div key={s.label}
              onClick={s.clickable ? () => {
                if (isTotal) {
                  setShowLowStock(false)
                  setBatchFilter(null)
                  setCategory('all')
                } else if (s.filterKey !== null) {
                  setShowLowStock(false)
                  setBatchFilter(batchFilter === s.filterKey ? null : s.filterKey)
                } else if (s.label === (t('vetLowStockCard')||'Low Stock')) {
                  setBatchFilter(null)
                  setShowLowStock(v => !v)
                }
              } : undefined}
              className={`border rounded-xl p-4 text-center transition-all
                ${s.clickable ? 'cursor-pointer select-none' : ''}
                ${isActive
                  ? 'ring-2 ' + (
                      s.filterKey === 'expired' ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 ring-red-400/40'
                      : s.filterKey === 'expiring' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600 ring-amber-400/40'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 ring-orange-400/40'
                    )
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{s.label}</p>
              {isActive && (
                <span className="mt-1 inline-block text-[10px] font-medium opacity-70">
                  {isTotal && anyFilterActive ? '✕ clear filters' : '● filtered'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Medicine list */}
      {loading && medicines.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : displayedMedicines.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{showLowStock ? t('vetAllStockedUp')||'No low-stock medicines — all stocked up!' : batchFilter === 'expired' ? 'No expired medicines' : batchFilter === 'expiring' ? 'No medicines expiring within 30 days' : t('vetNoMedicinesFound')||'No medicines found'}</p>
          {(showLowStock || batchFilter)
            ? <button onClick={() => { setShowLowStock(false); setBatchFilter(null) }} className="mt-2 text-sm text-slate-500 dark:text-slate-400 hover:underline">{t('vetClearFilter')||'Clear filter'}</button>
            : <button onClick={() => setMedModal({ open: true, item: null })} className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline">{t('vetAddFirstMedicine')||'Add the first medicine'}</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {category !== 'all' && (
            <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2">
              <span className="text-xs text-violet-700 dark:text-violet-300 font-medium capitalize">
                {medicines.length} result{medicines.length !== 1 ? 's' : ''} in &ldquo;{category}&rdquo;
              </span>
              <button onClick={() => setCategory('all')}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline">
                <X size={11} /> {t('vetClearFilter')||'Clear filter'}
              </button>
            </div>
          )}
          {showLowStock && (
            <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2">
              <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                {lowStockMeds.length} {t('vetLowStockCard')||'Low Stock'}
              </span>
              <button onClick={() => setShowLowStock(false)}
                className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline">
                <X size={11} /> {t('vetClearFilter')||'Clear filter'}
              </button>
            </div>
          )}
          {batchFilter && (
            <div className={`flex items-center justify-between border rounded-lg px-3 py-2 ${
              batchFilter === 'expired'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}>
              <span className={`text-xs font-medium ${
                batchFilter === 'expired' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {batchFilter === 'expired'
                  ? `${medicines.filter(m => m.hasExpired).length} Expired Batches`
                  : `${medicines.filter(m => m.expiresWithin30Days && !m.hasExpired).length} Expiring \u226430 days`}
              </span>
              <button onClick={() => setBatchFilter(null)}
                className={`flex items-center gap-1 text-xs hover:underline ${
                  batchFilter === 'expired' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                <X size={11} /> {t('vetClearFilter')||'Clear filter'}
              </button>
            </div>
          )}
          {pagedMedicines.map(med => (
            <div key={med.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {/* Medicine header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggle(med.id)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors shrink-0">
                  {expanded.has(med.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{med.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 capitalize">{med.category}</span>
                    {med.hasExpired && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">{t('vetExpiredBadge')||'Expired'}</span>}
                    {!med.hasExpired && med.expiresWithin30Days && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">{t('vetExpiringSoon')||'Expiring soon'}</span>}
                    {med.isLowStock && <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium">{t('vetLowStockBadge')||'Low stock'}</span>}
                  </div>
                  {med.description && <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{med.description}</p>}
                </div>

                <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
                  <div>
                    <p className={`text-lg font-bold ${med.isLowStock ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>{med.totalStock}</p>
                    <p className="text-[11px] text-slate-400">{med.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{med.activeBatchCount}</p>
                    <p className="text-[11px] text-slate-400">{t('vetBatchesLabel')||'batches'}</p>
                  </div>
                  {med.nearestExpiry && (
                    <div>
                      <ExpiryBadge date={med.nearestExpiry} qty={1} />
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('vetNearestLabel')||'nearest'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setHistoryTarget({ id: med.id, name: med.name })} title={t('vetViewHistory') || 'View history'}
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 transition-colors">
                    <History size={15} />
                  </button>
                  <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, subUnit: med.subUnit, ratio: med.subUnitsPerContainer, item: null })} title="Receive batch"
                    className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors">
                    <PackagePlus size={15} />
                  </button>
                  <button onClick={() => setMedModal({ open: true, item: med })}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDelTarget({ type: 'medicine', id: med.id, label: `Delete "${med.name}"?` })}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded batches */}
              {expanded.has(med.id) && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                  {med.batches.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-5 text-slate-400 text-sm">
                      <PackagePlus size={15} /> {t('vetNoBatches')||'No batches yet'} —
                      <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, subUnit: med.subUnit, ratio: med.subUnitsPerContainer, item: null })}
                        className="text-violet-600 dark:text-violet-400 hover:underline">{t('vetReceiveFirstBatch')||'receive the first batch'}</button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                            {[t('vetBatchNumHeader')||'Batch #', t('vetExpiryHeader')||'Expiry', t('vetRemainingHeader')||'Remaining', t('vetInitialHeader')||'Initial', t('vetCostUnitHeader')||'Cost/unit', t('vetSellPriceHeader')||'Sell price', t('vetValueHeader')||'Stock value', t('vetBatchSupplier')||'Supplier', ''].map((h, i) => (
                                <th key={`${h}-${i}`} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {med.batches.map(b => {
                              const days  = daysUntil(b.expiryDate)
                              const isExp = days < 0
                              const isWarn = !isExp && days <= 30
                              const stockValue = b.quantity * (b.costPerUnit ?? 0)
                              const margin = (b.sellingPrice && b.costPerUnit) ? ((b.sellingPrice - b.costPerUnit) / b.sellingPrice) * 100 : null
                              return (
                                <tr key={b.id} className={`transition-colors ${isExp ? 'bg-red-50/60 dark:bg-red-900/10' : isWarn ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/20'}`}>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.batchNumber ?? '—'}</td>
                                  <td className="px-4 py-2.5"><ExpiryBadge date={b.expiryDate} qty={b.quantity} /></td>
                                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{b.quantity} <span className="text-slate-400 font-normal">{med.unit}</span></td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.initialQty}</td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{b.costPerUnit > 0 ? `$${b.costPerUnit.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 whitespace-nowrap">
                                    {b.sellingPrice != null
                                      ? <span className="text-violet-600 dark:text-violet-400 font-medium">${b.sellingPrice.toFixed(2)}{margin != null && <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">{margin >= 0 ? '+' : ''}{margin.toFixed(0)}%</span>}</span>
                                      : <span className="text-slate-400">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{stockValue > 0 ? `$${stockValue.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.supplier ?? '—'}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, subUnit: med.subUnit, ratio: med.subUnitsPerContainer, item: b })}
                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <Pencil size={13} />
                                      </button>
                                      {isExp && b.quantity > 0 && b.status !== 'disposed' && (
                                        <button onClick={() => setDisposeTarget({ batch: b, medicineName: med.name, unit: med.unit })}
                                          title="Write off expired batch"
                                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 dark:hover:text-red-400">
                                          <XCircle size={13} />
                                        </button>
                                      )}
                                      <button onClick={() => setDelTarget({ type: 'batch', id: b.id, label: 'Delete this batch?' })}
                                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2 flex justify-end border-t border-slate-100 dark:border-slate-700">
                        <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, subUnit: med.subUnit, ratio: med.subUnitsPerContainer, item: null })}
                          className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline">
                          <Plus size={11} /> {t('vetReceiveNewBatch')||'Receive new batch'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {medTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                {t('vetShowing') || 'Showing'} {(safePage - 1) * MED_PAGE_SIZE + 1}–{Math.min(safePage * MED_PAGE_SIZE, displayedMedicines.length)} {t('vetOfLabel') || 'of'} {displayedMedicines.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setMedPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronUp className="h-3.5 w-3.5 -rotate-90" />
                </button>
                <span className="px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{safePage} / {medTotalPages}</span>
                <button onClick={() => setMedPage(p => Math.min(medTotalPages, p + 1))} disabled={safePage === medTotalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCatManager && (
        <CategoryManagerModal
          onRefresh={loadCategories}
          onClose={() => setShowCatManager(false)} />
      )}
      {medModal.open && (
        <MedicineModal initial={medModal.item}
          categories={dbCategories.map(c => c.name)}
          units={units}
          onRefresh={loadCategories}
          onUnitsChange={us => { setUnits(us); saveUnits(us) }}
          onSave={() => { setMedModal({ open: false, item: null }); load() }}
          onClose={() => setMedModal({ open: false, item: null })} />
      )}
      {batchModal.open && (
        <BatchModal medicineId={batchModal.medId} unit={batchModal.unit} subUnit={batchModal.subUnit} subUnitsPerContainer={batchModal.ratio} initial={batchModal.item}
          onSave={() => { setBatchModal({ open: false, medId: '', unit: '', item: null }); load() }}
          onClose={() => setBatchModal({ open: false, medId: '', unit: '', item: null })} />
      )}
      {delTarget && (
        <DeleteConfirm label={delTarget.label} busy={deleting}
          onConfirm={confirmDelete} onCancel={() => setDelTarget(null)} />
      )}
      {disposeTarget && (
        <DisposeConfirm
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
