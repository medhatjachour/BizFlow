import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart, Search, X, Loader2, Receipt, Calendar, User, CreditCard,
  Package, CheckCircle2, ChevronLeft, ChevronRight, TrendingUp,
  Layers, ArrowRight, Pill, Plus, DollarSign, BarChart2
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

const api = (window as any).api?.vet?.medicines
const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MedicineLite {
  id: string; name: string; unit: string; category: string
  totalStock: number; isLowStock: boolean; hasExpired: boolean
  batches: BatchLite[]
}
interface BatchLite {
  id: string; batchNumber?: string | null; expiryDate: string
  quantity: number; costPerUnit: number; supplier?: string | null
}
interface Sale {
  id: string; quantity: number; unitPrice: number; totalPrice: number
  discount: number; patientName?: string | null; paymentMethod?: string | null
  notes?: string | null; saleDate: string
  medicine: { id: string; name: string; unit: string }
  batch: { id: string; batchNumber?: string | null; expiryDate: string; costPerUnit?: number }
  costPerUnit?: number; costTotal?: number; grossProfit?: number
}

const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'other']
const CATEGORIES = ['all', 'antibiotic', 'antiparasitic', 'vaccine', 'anesthetic', 'supplement', 'general', 'other']
const PAY_COLOR: Record<string, string> = {
  cash:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  card:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  other:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

function daysUntil(d: string) {
  return Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000)
}

// ── Batch Picker Modal ────────────────────────────────────────────────────────

function BatchPickerModal({
  medicine, selectedBatchId, onSelect, onClose,
}: {
  medicine: MedicineLite; selectedBatchId: string
  onSelect: (b: BatchLite) => void; onClose: () => void
}) {
  const { t } = useLanguage()
  const sorted = [...medicine.batches].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  )
  const fefoId = sorted.find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0)?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">{t('vetSelectBatch')||'Select Batch'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{medicine.name} · {t('vetFefoHint')||'sorted earliest expiry first (FEFO)'}</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
          {sorted.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('vetNoBatchesAvailable')||'No batches available'}</p>
            </div>
          ) : sorted.map(b => {
            const days     = daysUntil(b.expiryDate)
            const expired  = days < 0
            const warnSoon = !expired && days <= 7
            const warnMid  = !expired && !warnSoon && days <= 30
            const isEmpty  = b.quantity <= 0
            const isBlocked = expired || isEmpty  // expired batches must be written off, not sold
            const isSel    = b.id === selectedBatchId

            return (
              <button key={b.id} type="button" disabled={isBlocked}
                onClick={() => { onSelect(b); onClose() }}
                className={[
                  'w-full text-left rounded-xl border p-4 transition-all relative',
                  isBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  isSel
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-500/30'
                    : expired
                    ? 'border-red-300 dark:border-red-700 bg-red-50/70 dark:bg-red-900/20'
                    : warnSoon || warnMid
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 hover:border-amber-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-violet-400 dark:hover:border-violet-600',
                ].join(' ')}>

                {isSel && <CheckCircle2 className="absolute top-3.5 right-3.5 h-4 w-4 text-violet-500" />}

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {b.batchNumber ?? 'No lot #'}
                      </span>
                      {b.id === fefoId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-bold">
                          FEFO
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {b.quantity} <span className="text-xs font-normal text-slate-400">{medicine.unit} {t('remaining')||'remaining'}</span>
                    </p>
                    {b.supplier && <p className="text-xs text-slate-400 truncate">{b.supplier}</p>}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    {expired
                      ? <>
                          <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{t('vetExpiredBadge')||'Expired'}</span>
                          <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold">{t('vetWriteOffFirst')||'Write off first'}</p>
                        </>
                    : warnSoon ? <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{days}d</span>
                    : warnMid  ? <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{days}d</span>
                    :            <span className="inline-block text-[11px] text-slate-400">{t('vetExpPrefix')||'Exp:'} {new Date(b.expiryDate).toLocaleDateString()}</span>}
                    {b.costPerUnit > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">${b.costPerUnit.toFixed(2)}/unit</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sale Operation ────────────────────────────────────────────────────────────

function SaleOperation({ onSaleRecorded }: { onSaleRecorded: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [medicines, setMedicines] = useState<MedicineLite[]>([])
  const [loadingMeds, setLoadingMeds] = useState(true)
  const [medSearch, setMedSearch] = useState('')
  const [medCat, setMedCat] = useState('all')
  const [selectedMed, setSelectedMed] = useState<MedicineLite | null>(null)
  const [batchModal, setBatchModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    batchId: '', quantity: '', unitPrice: '', discount: '0',
    patientName: '', paymentMethod: 'cash', notes: '',
    saleDate: new Date().toISOString().slice(0, 10),
  })

  const load = useCallback(async () => {
    setLoadingMeds(true)
    try {
      const res = await api.getAll({ skip: 0, take: 500 })
      setMedicines(res.data ?? [])
    } catch { /* silent */ }
    finally { setLoadingMeds(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const catalogList = medicines.filter(m => {
    const matchS = !medSearch || m.name.toLowerCase().includes(medSearch.toLowerCase())
    const matchC = medCat === 'all' || m.category === medCat
    return matchS && matchC
  })

  function pickMed(med: MedicineLite) {
    setSelectedMed(med)
    const fefo = [...med.batches]
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0)
    // never auto-select an expired batch — force user to dispose it first
    const batch = fefo ?? null
    setForm(f => ({ ...f, batchId: batch?.id ?? '', unitPrice: batch?.costPerUnit ? String(batch.costPerUnit) : '' }))
  }

  function pickBatch(b: BatchLite) {
    setForm(f => ({ ...f, batchId: b.id, unitPrice: b.costPerUnit ? String(b.costPerUnit) : f.unitPrice }))
  }

  function clearForm() {
    setSelectedMed(null)
    setForm({ batchId: '', quantity: '', unitPrice: '', discount: '0', patientName: '', paymentMethod: 'cash', notes: '', saleDate: new Date().toISOString().slice(0, 10) })
  }

  const selectedBatch = selectedMed?.batches.find(b => b.id === form.batchId) ?? null
  const batchDays = selectedBatch ? daysUntil(selectedBatch.expiryDate) : null
  const subtotal = (parseFloat(form.quantity) || 0) * (parseFloat(form.unitPrice) || 0)
  const discount = parseFloat(form.discount) || 0
  const total = Math.max(0, subtotal - discount)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMed || !form.batchId) { toast.error(t('vetSelectMedAndBatch')||'Select a medicine and batch'); return }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { toast.error(t('vetEnterValidQty')||'Enter a valid quantity'); return }
    setBusy(true)
    try {
      await api.sell({
        medicineId: selectedMed.id, batchId: form.batchId,
        quantity: parseFloat(form.quantity), unitPrice: parseFloat(form.unitPrice) || 0,
        discount, patientName: form.patientName || undefined,
        paymentMethod: form.paymentMethod, notes: form.notes || undefined,
        saleDate: form.saleDate || undefined,
      })
      toast.success(t('vetSaleRecorded')||'Sale recorded successfully')
      clearForm(); load(); onSaleRecorded()
    } catch (err: any) { toast.error(err?.message ?? 'Sale failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* Left panel: Medicine catalogue */}
      <div className="w-72 xl:w-80 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
        {/* Search + category */}
        <div className="p-3 space-y-2 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={medSearch} onChange={e => setMedSearch(e.target.value)} placeholder={t('vetSearchMedicines')||'Search medicines…'}
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            {medSearch && (
              <button onClick={() => setMedSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setMedCat(c)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize transition-colors
                  ${medCat === c
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600'}`}>
                {c === 'all' ? t('vetFilterAll')||'All' : c}
              </button>
            ))}
          </div>
        </div>

        {/* Medicine list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingMeds ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
          ) : catalogList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Package className="h-7 w-7 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">{t('vetNoMedicinesFound')||'No medicines found'}</p>
            </div>
          ) : catalogList.map(med => {
            const isSel = selectedMed?.id === med.id
            const validBatches = med.batches.filter(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0).length
            return (
              <button key={med.id} type="button" onClick={() => pickMed(med)}
                className={[
                  'w-full text-left rounded-xl border px-3 py-2.5 transition-all',
                  isSel
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-500/30'
                    : 'border-transparent bg-white dark:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm',
                ].join(' ')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{med.name}</p>
                      {isSel && <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 capitalize mt-0.5">{med.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${med.isLowStock ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>{med.totalStock}</p>
                    <p className="text-[10px] text-slate-400">{med.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">{validBatches} valid batch{validBatches !== 1 ? 'es' : ''}</span>
                  {med.isLowStock && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Low stock</span>}
                  {med.hasExpired && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Expired batch</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel: Sale form */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900">
        {!selectedMed ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-12 text-slate-400">
            <div className="w-20 h-20 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <ShoppingCart className="h-9 w-9 text-violet-400 dark:text-violet-500" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-slate-600 dark:text-slate-400 text-base">{t('vetNoMedSelected')||'No medicine selected'}</p>
              <p className="text-sm text-slate-400">{t('vetChooseMedPrompt')||'Choose a medicine from the left panel to begin a sale'}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-violet-400">
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>{t('vetPickMedHint')||'Pick any medicine to continue'}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">

            {/* Selected medicine header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                    <Pill className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white">{selectedMed.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 capitalize">{selectedMed.category}</span>
                      {selectedMed.isLowStock && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Low stock</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedMed.totalStock} {selectedMed.unit} {t('vetInStock')||'in stock'} · {selectedMed.batches.filter(b => b.quantity > 0).length} {t('vetBatchesLabel')||'batches'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={clearForm}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Batch */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Layers className="h-3 w-3" /> {t('vetBatchSectionLabel')||'Batch'}
                </p>
                {selectedBatch ? (
                  <div className="flex items-stretch gap-2">
                    <div className={[
                      'flex-1 rounded-xl border px-4 py-3',
                      batchDays !== null && batchDays < 0   ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                      : batchDays !== null && batchDays <= 30 ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                      : 'border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-900/10',
                    ].join(' ')}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-mono text-slate-500">{selectedBatch.batchNumber ?? (t('vetNoLotNum')||'No lot #')}</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                            {selectedBatch.quantity} <span className="text-slate-400 font-normal text-xs">{selectedMed.unit} {t('remaining')||'remaining'}</span>
                          </p>
                          {selectedBatch.supplier && <p className="text-xs text-slate-400 mt-0.5">{selectedBatch.supplier}</p>}
                        </div>
                        <div className="text-right space-y-0.5">
                          {batchDays !== null && batchDays < 0  ? <span className="text-xs font-bold text-red-600 dark:text-red-400">{t('vetExpiredBadge')||'Expired'}</span>
                          : batchDays !== null && batchDays <= 7  ? <span className="text-xs font-bold text-red-500">{batchDays}d</span>
                          : batchDays !== null && batchDays <= 30 ? <span className="text-xs font-bold text-amber-600">{batchDays}d</span>
                          : <span className="text-xs text-slate-400">{new Date(selectedBatch.expiryDate).toLocaleDateString()}</span>}
                          {selectedBatch.costPerUnit > 0 && (
                            <p className="text-xs text-slate-500">${selectedBatch.costPerUnit.toFixed(2)}/unit</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setBatchModal(true)}
                      className="px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-violet-400 dark:hover:border-violet-600 transition-colors whitespace-nowrap">
                      {t('vetChangeBatch')||'Change'}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setBatchModal(true)}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> {t('vetSelectBatchBtn')||'Select batch'}
                  </button>
                )}
              </div>

              {/* Pricing */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{t('vetPricing')||'Pricing'}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchQtyLabel')||'Qty'} ({selectedMed.unit}) *</label>
                    <input required type="number" min="0.01" step="any" placeholder="0"
                      value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetUnitPrice')||'Unit Price'}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" min="0" step="any" placeholder="0.00"
                        value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                        className={inputCls + ' pl-6'} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetDiscountLabel')||'Discount'}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" min="0" step="any" placeholder="0.00"
                        value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                        className={inputCls + ' pl-6'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient & Payment */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{t('vetPatientPayment')||'Patient & Payment'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetPatientName')||'Patient Name'}</label>
                    <div className="relative">
                      <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input placeholder={t('vetOptional')||'Optional'}
                        value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                        className={inputCls + ' pl-8'} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t('vetPaymentMethod')||'Payment Method'}</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {PAYMENT_METHODS.map(m => (
                        <button key={m} type="button" onClick={() => setForm(f => ({ ...f, paymentMethod: m }))}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors
                            ${form.paymentMethod === m
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-violet-400'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Date + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <Calendar className="inline h-3 w-3 mr-0.5" /> {t('vetSaleDate')||'Sale Date'}
                  </label>
                  <input type="date" value={form.saleDate} onChange={e => setForm(f => ({ ...f, saleDate: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchNotesLabel')||'Notes'}</label>
                  <input placeholder={t('vetOptional')||'Optional'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Total + submit footer */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4 space-y-3">
              <div className="flex items-end justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">
                    {t('vetSubtotal')||'Subtotal'}: <span className="text-slate-600 dark:text-slate-300">${subtotal.toFixed(2)}</span>
                  </p>
                  {discount > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">− Discount: ${discount.toFixed(2)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-0.5">{t('vetTotal')||'Total'}</p>
                  <p className="text-3xl font-black text-violet-700 dark:text-violet-300 leading-none">${total.toFixed(2)}</p>
                </div>
              </div>
              <button type="submit" disabled={busy}
                className="w-full py-3 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> {t('vetRecordSale')||'Record Sale'}</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {batchModal && selectedMed && (
        <BatchPickerModal
          medicine={selectedMed}
          selectedBatchId={form.batchId}
          onSelect={pickBatch}
          onClose={() => setBatchModal(false)}
        />
      )}
    </div>
  )
}

// ── Sales History ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

function SalesHistory() {
  const toast = useToast()
  const { t } = useLanguage()
  const [sales, setSales]       = useState<Sale[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [medSearch, setMedSearch] = useState('')
  const [payFilter, setPayFilter] = useState('')
  const [page, setPage]           = useState(1)

  function handleDateFrom(v: string) { setDateFrom(v); setPage(1) }
  function handleDateTo(v: string)   { setDateTo(v);   setPage(1) }
  function clearFilters() { setDateFrom(''); setDateTo(''); setMedSearch(''); setPayFilter(''); setPage(1) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getSales({
        from: dateFrom || undefined,
        to:   dateTo   || undefined,
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      })
      setSales(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch (err: any) { toast.error(err?.message ?? 'Failed to load sales') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = !!(dateFrom || dateTo || medSearch || payFilter)

  const displayed = sales.filter(s => {
    const okMed = !medSearch || s.medicine.name.toLowerCase().includes(medSearch.toLowerCase())
    const okPay = !payFilter || s.paymentMethod === payFilter
    return okMed && okPay
  })

  const revenue    = displayed.reduce((sum, s) => sum + s.totalPrice, 0)
  const totalCogs  = displayed.reduce((sum, s) => sum + (s.costTotal ?? s.quantity * (s.batch?.costPerUnit ?? 0)), 0)
  const grossProfit = revenue - totalCogs
  const margin     = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const avg        = displayed.length ? revenue / displayed.length : 0

  function pageNumbers() {
    const pages: number[] = []
    let start = Math.max(1, page - 2)
    const end  = Math.min(totalPages, start + 4)
    start = Math.max(1, end - 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <input type="date" value={dateFrom} onChange={e => handleDateFrom(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <span className="text-slate-400">–</span>
            <input type="date" value={dateTo} onChange={e => handleDateTo(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={medSearch} onChange={e => setMedSearch(e.target.value)} placeholder={t('vetFilterByMedicine')||'Filter by medicine…'}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-44" />
          </div>
          <div className="flex gap-1">
            {['', ...PAYMENT_METHODS].map(m => (
              <button key={m} onClick={() => setPayFilter(m)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors
                  ${payFilter === m
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400 dark:hover:border-violet-600'}`}>
                {m === '' ? t('vetFilterAll')||'All' : m}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <X className="h-3 w-3" /> {t('vetClearFilters')||'Clear filters'}
            </button>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="px-5 py-4 grid grid-cols-5 gap-3 shrink-0">
        {[
          { label: t('vetTotalSales')||'Total Sales',   val: String(total),              icon: Receipt,    color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: t('vetRevenue')||'Revenue',       val: `$${revenue.toFixed(2)}`,   icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: t('vetCOGS')||'COGS',          val: `$${totalCogs.toFixed(2)}`,  icon: DollarSign, color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: t('vetGrossProfit')||'Gross Profit',  val: `$${grossProfit.toFixed(2)}`, icon: BarChart2,  color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: t('vetMargin')||'Margin',        val: `${margin.toFixed(1)}%`,     icon: CreditCard, color: 'text-slate-600 dark:text-slate-300',   bg: 'bg-slate-100 dark:bg-slate-800' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 flex items-center gap-3`}>
            <s.icon className={`h-6 w-6 shrink-0 ${s.color}`} />
            <div className="min-w-0">
              <p className={`text-lg font-black ${s.color} leading-none truncate`}>{s.val}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">{t('vetNoSalesFound')||'No sales found'}</p>
            {hasFilters && <button onClick={clearFilters} className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline">{t('vetClearFilters')||'Clear filters'}</button>}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    {[t('vetDateHeader')||'Date', t('vetMedicineHeader')||'Medicine', t('vetBatchHeader')||'Batch', t('vetPatientHeader')||'Patient', t('vetQtyHeader')||'Qty', t('vetUnitPriceHeader')||'Unit Price', t('vetDiscountHeader')||'Discount', t('vetTotalHeader')||'Total', t('vetCOGSHeader')||'COGS', t('vetProfitHeader')||'Profit', t('vetPaymentHeader')||'Payment'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {displayed.map(s => {
                    const cogs   = s.costTotal ?? s.quantity * (s.batch?.costPerUnit ?? 0)
                    const profit = s.grossProfit ?? (s.totalPrice - cogs)
                    return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(s.saleDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{s.medicine.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-mono text-slate-600 dark:text-slate-300">{s.batch.batchNumber ?? (t('vetNoLotNum')||'—')}</p>
                        <p className="text-[10px] text-slate-400">{new Date(s.batch.expiryDate).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.patientName ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {s.quantity} <span className="text-slate-400 font-normal">{s.medicine.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.unitPrice > 0 ? `$${s.unitPrice.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3">{s.discount > 0 ? <span className="text-emerald-600 dark:text-emerald-400">-${s.discount.toFixed(2)}</span> : <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3 font-black text-violet-700 dark:text-violet-300 whitespace-nowrap">${s.totalPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-orange-600 dark:text-orange-400 whitespace-nowrap">{cogs > 0 ? `$${cogs.toFixed(2)}` : '—'}</td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PAY_COLOR[s.paymentMethod ?? 'cash'] ?? PAY_COLOR.other}`}>
                          {s.paymentMethod ?? 'cash'}
                        </span>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40">
          <p className="text-xs text-slate-400">
            {t('vetPageLabel')||'Page'} <span className="font-semibold text-slate-600 dark:text-slate-300">{page}</span> {t('vetOfLabel')||'of'} <span className="font-semibold text-slate-600 dark:text-slate-300">{totalPages}</span>
             · {total} {t('vetRecordsLabel')||'records'}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={14} />
            </button>
            {pageNumbers().map(pg => (
              <button key={pg} onClick={() => setPage(pg)}
                className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors
                  ${page === pg
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
                {pg}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function VetSalesTab() {
  const { t } = useLanguage()
  const [subTab, setSubTab] = useState<'operation' | 'history'>('operation')
  const [historyKey, setHistoryKey] = useState(0)

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 shrink-0">
        {([
          { key: 'operation', label: t('vetNewSale')||'New Sale',      icon: ShoppingCart },
          { key: 'history',   label: t('vetSalesHistory')||'Sales History', icon: Receipt },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={[
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
              subTab === t.key
                ? 'border-violet-500 text-violet-700 dark:text-violet-300'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            ].join(' ')}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'operation' && (
        <SaleOperation onSaleRecorded={() => setHistoryKey(k => k + 1)} />
      )}
      {subTab === 'history' && (
        <SalesHistory key={historyKey} />
      )}
    </div>
  )
}
