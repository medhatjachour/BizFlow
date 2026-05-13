import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Pill, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Loader2,
  PackagePlus, AlertTriangle, Clock, Search, X, Package, Info, XCircle
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

const api = (window as any).api?.vet?.medicines
const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Medicine {
  id: string; name: string; category: string; unit: string
  description?: string | null; minimumStock: number
  totalStock: number; nearestExpiry: string | null
  hasExpired: boolean; expiresWithin30Days: boolean
  isLowStock: boolean; batchCount: number; activeBatchCount: number
  batches: Batch[]
}

interface Batch {
  id: string; batchNumber?: string | null; supplier?: string | null
  expiryDate: string; quantity: number; initialQty: number
  costPerUnit: number; receivedDate: string; notes?: string | null
  status?: string; disposedAt?: string | null
}

const CATEGORIES = ['all', 'antibiotic', 'antiparasitic', 'vaccine', 'anesthetic', 'supplement', 'general', 'other']
const UNITS      = ['tablet', 'capsule', 'ml', 'vial', 'tube', 'bottle', 'sachet', 'other']

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(date: string) {
  return Math.floor((new Date(date).getTime() - Date.now()) / 86400000)
}

function ExpiryBadge({ date, qty }: { date: string; qty: number }) {
  const { t } = useLanguage()
  if (qty <= 0) return <span className="text-xs text-slate-400">—</span>
  const days = daysUntil(date)
  if (days < 0)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{t('vetExpiredBadge')||'Expired'}</span>
  if (days <= 7)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{days}d</span>
  if (days <= 30) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{days}d</span>
  return <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(date).toLocaleDateString()}</span>
}

function StoreHelp() {
  const { t } = useLanguage()
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = { current: null as HTMLSpanElement | null }
  return (
    <span ref={r => { ref.current = r }} className="inline-flex items-center cursor-default"
      onMouseEnter={() => { const r = ref.current?.getBoundingClientRect(); if (r) setPos({ top: r.top, right: window.innerWidth - r.right }) }}
      onMouseLeave={() => setPos(null)}>
      <Info size={13} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {pos && createPortal(
        <div style={{ position: 'fixed', top: pos.top, right: pos.right, transform: 'translateY(-100%) translateY(-8px)', zIndex: 9999 }}
          className="w-64 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-2xl">
          <span className="block font-semibold text-violet-400 mb-1.5">{t('vetMedStore')||'Medicine Store'}</span>
          <span className="block mb-0.5">{t('vetMedStoreHelpDesc')||'Add medicines to the catalogue, then receive batches — each with its own expiry date and lot #.'}</span>
          <span className="block text-slate-300 mt-1">{t('vetMedStoreHelpLegend')||'🔴 Expired  🟡 Expiring ≤30d  🟠 Low stock'}</span>
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>, document.body
      )}
    </span>
  )
}

// ── Medicine Form ─────────────────────────────────────────────────────────────

function MedicineModal({ initial, onSave, onClose }: { initial?: Medicine | null; onSave: () => void; onClose: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: initial?.name ?? '', category: initial?.category ?? 'general',
    unit: initial?.unit ?? 'tablet', description: initial?.description ?? '',
    minimumStock: String(initial?.minimumStock ?? 0)
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const data = { ...form, minimumStock: parseFloat(form.minimumStock) || 0 }
      if (initial) await api.update(initial.id, data)
      else         await api.create(data)
      toast.success(initial ? t('vetMedicineUpdated')||'Medicine updated' : t('vetMedicineAdded')||'Medicine added')
      onSave()
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">{initial ? t('vetEditMedicine')||'Edit Medicine' : t('vetAddMedicine')||'Add Medicine'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedNameLabel')||'Name'} *</label>
            <input required value={form.name} onChange={set('name')} placeholder="e.g. Amoxicillin" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedCategory')||'Category'}</label>
              <select value={form.category} onChange={set('category')} className={inputCls}>
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedUnit')||'Unit'}</label>
              <select value={form.unit} onChange={set('unit')} className={inputCls}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedMinStock')||'Min. Stock Alert'}</label>
            <input type="number" min="0" step="any" value={form.minimumStock} onChange={set('minimumStock')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedDescription')||'Description'}</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className={inputCls + ' resize-none'} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl">{t('vetMedCancel')||'Cancel'}</button>
            <button type="submit" disabled={busy} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('vetMedSave')||'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Batch Form ────────────────────────────────────────────────────────────────

function BatchModal({ medicineId, unit, initial, onSave, onClose }: {
  medicineId: string; unit: string; initial?: Batch | null; onSave: () => void; onClose: () => void
}) {
  const toast = useToast()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    batchNumber: initial?.batchNumber ?? '', supplier: initial?.supplier ?? '',
    expiryDate: initial ? new Date(initial.expiryDate).toISOString().slice(0, 10) : '',
    quantity: String(initial?.quantity ?? ''), costPerUnit: String(initial?.costPerUnit ?? ''),
    receivedDate: initial ? new Date(initial.receivedDate).toISOString().slice(0, 10) : today,
    notes: initial?.notes ?? ''
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.expiryDate) { toast.error(t('vetExpiryDateRequired')||'Expiry date is required'); return }
    setBusy(true)
    try {
      const data = {
        medicineId, batchNumber: form.batchNumber || undefined, supplier: form.supplier || undefined,
        expiryDate: form.expiryDate, quantity: parseFloat(form.quantity) || 0,
        costPerUnit: parseFloat(form.costPerUnit) || 0,
        receivedDate: form.receivedDate || undefined, notes: form.notes || undefined
      }
      if (initial) await api.updateBatch(initial.id, data)
      else         await api.addBatch(data)
      toast.success(initial ? t('vetBatchUpdated')||'Batch updated' : t('vetBatchReceived')||'Batch received')
      onSave()
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">{initial ? t('vetEditBatch')||'Edit Batch' : t('vetReceiveBatch')||'Receive New Batch'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchLotNum')||'Batch / Lot #'}</label>
              <input value={form.batchNumber} onChange={set('batchNumber')} placeholder={t('vetOptional')||'Optional'} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchSupplier')||'Supplier'}</label>
              <input value={form.supplier} onChange={set('supplier')} placeholder={t('vetOptional')||'Optional'} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchExpiryDate')||'Expiry Date'} *</label>
              <input required type="date" value={form.expiryDate} onChange={set('expiryDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchReceivedDate')||'Received Date'}</label>
              <input type="date" value={form.receivedDate} onChange={set('receivedDate')} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchQtyLabel')||'Qty'} ({unit}) *</label>
              <input required type="number" min="0.01" step="any" value={form.quantity} onChange={set('quantity')} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchCostLabel')||'Cost'} / {unit}</label>
              <input type="number" min="0" step="any" value={form.costPerUnit} onChange={set('costPerUnit')} placeholder="0.00" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchNotesLabel')||'Notes'}</label>
            <input value={form.notes} onChange={set('notes')} className={inputCls} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl">{t('vetMedCancel')||'Cancel'}</button>
            <button type="submit" disabled={busy} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : initial ? t('vetMedUpdate')||'Update' : t('vetAddBatch')||'Add Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
  const toast = useToast()
  const { t } = useLanguage()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('all')
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())

  const [medModal, setMedModal]     = useState<{ open: boolean; item: Medicine | null }>({ open: false, item: null })
  const [batchModal, setBatchModal] = useState<{ open: boolean; medId: string; unit: string; item: Batch | null }>({ open: false, medId: '', unit: '', item: null })
  const [delTarget, setDelTarget]   = useState<{ type: 'medicine' | 'batch'; id: string; label: string } | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [showLowStock, setShowLowStock] = useState(false)
  const [disposeTarget, setDisposeTarget] = useState<{ batch: Batch; medicineName: string; unit: string } | null>(null)
  const [disposing, setDisposing]   = useState(false)

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
  const displayedMedicines = showLowStock ? lowStockMeds : medicines

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
          <div className="flex gap-0.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors
                  ${category === c
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {c === 'all' ? t('vetFilterAll')||'All' : c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMedModal({ open: true, item: null })}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="h-4 w-4" /> {t('vetAddMedicineBtn')||'Add Medicine'}
          </button>
          <StoreHelp />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('vetTotalMedicines')||'Total Medicines',   value: total,                                                                  icon: Pill,          color: 'text-violet-600 dark:text-violet-400', clickable: false },
          { label: t('vetExpiredBatches')||'Expired Batches',   value: medicines.filter(m => m.hasExpired).length,                            icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',        clickable: false },
          { label: t('vetExpiring30')||'Expiring ≤30 days', value: medicines.filter(m => m.expiresWithin30Days && !m.hasExpired).length,  icon: Clock,         color: 'text-amber-600 dark:text-amber-400',    clickable: false },
          { label: t('vetLowStockCard')||'Low Stock',         value: lowStockMeds.length,                                                   icon: Package,       color: 'text-orange-600 dark:text-orange-400',  clickable: true  },
        ].map(s => (
          <div key={s.label}
            onClick={s.clickable ? () => setShowLowStock(v => !v) : undefined}
            className={`border rounded-xl p-4 text-center transition-all
              ${s.clickable ? 'cursor-pointer select-none' : ''}
              ${s.label === 'Low Stock' && showLowStock
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 ring-1 ring-orange-400/40'
                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'}
              ${s.clickable && !(s.label === 'Low Stock' && showLowStock) ? 'hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/40 dark:hover:bg-orange-900/10' : ''}`}>
            <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{s.label}</p>
            {s.label === 'Low Stock' && showLowStock && (
              <span className="mt-1 inline-block text-[10px] font-medium text-orange-600 dark:text-orange-400">● filtered</span>
            )}
          </div>
        ))}
      </div>

      {/* Medicine list */}
      {loading && medicines.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : displayedMedicines.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{showLowStock ? t('vetAllStockedUp')||'No low-stock medicines — all stocked up!' : t('vetNoMedicinesFound')||'No medicines found'}</p>
          {showLowStock
            ? <button onClick={() => setShowLowStock(false)} className="mt-2 text-sm text-orange-600 dark:text-orange-400 hover:underline">{t('vetClearFilter')||'Clear filter'}</button>
            : <button onClick={() => setMedModal({ open: true, item: null })} className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline">{t('vetAddFirstMedicine')||'Add the first medicine'}</button>}
        </div>
      ) : (
        <div className="space-y-2">
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
          {displayedMedicines.map(med => (
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
                  <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, item: null })} title="Receive batch"
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
                      <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, item: null })}
                        className="text-violet-600 dark:text-violet-400 hover:underline">{t('vetReceiveFirstBatch')||'receive the first batch'}</button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                            {[t('vetBatchNumHeader')||'Batch #', t('vetExpiryHeader')||'Expiry', t('vetRemainingHeader')||'Remaining', t('vetInitialHeader')||'Initial', t('vetCostUnitHeader')||'Cost/unit', t('vetBatchSupplier')||'Supplier', ''].map(h => (
                                <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {med.batches.map(b => {
                              const days  = daysUntil(b.expiryDate)
                              const isExp = days < 0
                              const isWarn = !isExp && days <= 30
                              return (
                                <tr key={b.id} className={`transition-colors ${isExp ? 'bg-red-50/60 dark:bg-red-900/10' : isWarn ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/20'}`}>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.batchNumber ?? '—'}</td>
                                  <td className="px-4 py-2.5"><ExpiryBadge date={b.expiryDate} qty={b.quantity} /></td>
                                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{b.quantity} <span className="text-slate-400 font-normal">{med.unit}</span></td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.initialQty}</td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{b.costPerUnit > 0 ? `$${b.costPerUnit.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.supplier ?? '—'}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, item: b })}
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
                        <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, item: null })}
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
        </div>
      )}

      {/* Modals */}
      {medModal.open && (
        <MedicineModal initial={medModal.item}
          onSave={() => { setMedModal({ open: false, item: null }); load() }}
          onClose={() => setMedModal({ open: false, item: null })} />
      )}
      {batchModal.open && (
        <BatchModal medicineId={batchModal.medId} unit={batchModal.unit} initial={batchModal.item}
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
    </div>
  )
}
