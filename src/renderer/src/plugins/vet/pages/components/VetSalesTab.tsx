import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShoppingCart, Search, X, Loader2, Receipt, Calendar, User, CreditCard,
  Package, CheckCircle2, ChevronLeft, ChevronRight, TrendingUp,
  Pill, Plus, DollarSign, BarChart2, Pencil, AlertCircle,
  UserCheck, UserPlus, PanelRightClose, PanelRightOpen, ExternalLink
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import VetOwnerFormModal from './VetOwnerFormModal'

const api       = (window as any).api?.vet?.medicines
const ownersApi = (window as any).api?.vet?.owners
const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MedicineLite {
  id: string; name: string; unit: string; category: string
  subUnit?: string | null; subUnitsPerContainer?: number | null
  totalStock: number; minimumStock: number
  isLowStock: boolean; hasExpired: boolean
  batches: BatchLite[]
}
interface BatchLite {
  id: string; batchNumber?: string | null; expiryDate: string
  quantity: number; costPerUnit: number; sellingPrice?: number | null
  supplier?: string | null
}
interface Sale {
  id: string; quantity: number; unitPrice: number; totalPrice: number
  discount: number; patientName?: string | null; ownerName?: string | null; ownerId?: string | null
  paymentMethod?: string | null; amountPaid?: number | null; paymentStatus?: string | null
  notes?: string | null; saleDate: string
  medicine: { id: string; name: string; unit: string; category?: string }
  batch: { id: string; batchNumber?: string | null; expiryDate: string; costPerUnit?: number }
  costPerUnit?: number; costTotal?: number; grossProfit?: number
}
interface CustomerLite { id: string; name: string; phone: string }

const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'other']
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

interface CartItem {
  id: string
  medicine: MedicineLite
  batch: BatchLite
  quantity: string
  unitPrice: string
  discount: string
  saleUnit: 'container' | 'sub'
}

function SaleOperation({ onSaleRecorded }: { onSaleRecorded: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const navigate = useNavigate()

  // ── Catalogue ─────────────────────────────────────────────────────────────
  const [medicines, setMedicines] = useState<MedicineLite[]>([])
  const [loadingMeds, setLoadingMeds] = useState(true)
  const [medSearch, setMedSearch] = useState('')
  const [medCat, setMedCat] = useState('all')

  // ── Medicine Categories (DB-loaded) ─────────────────────────────────────
  const [categories, setCategories] = useState<string[]>(['all'])

  useEffect(() => {
    ;(window as any).api?.vet?.medicineCategories?.getAll()
      .then((rows: { name: string }[]) => {
        setCategories(['all', ...(rows ?? []).map(r => r.name)])
      })
      .catch(() => {})
  }, [])

  // ── Cart ──────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cartVisible, setCartVisible] = useState(true)

  // ── Current item being configured ─────────────────────────────────────────
  const [selectedMed, setSelectedMed] = useState<MedicineLite | null>(null)
  const [batchModal, setBatchModal] = useState(false)
  const [itemForm, setItemForm] = useState({
    batchId: '', quantity: '', unitPrice: '', discount: '0',
    saleUnit: 'container' as 'container' | 'sub',
  })

  // ── Customer (owner) linking ───────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLite | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerLite[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showNewOwnerModal, setShowNewOwnerModal] = useState(false)
  const customerSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Shared sale fields ────────────────────────────────────────────────────
  const [shared, setShared] = useState({
    paymentMethod: 'cash', notes: '',
    saleDate: new Date().toISOString().slice(0, 10),
    amountPaid: '',   // empty = full payment
  })

  const [busy, setBusy] = useState(false)
  const [saleError, setSaleError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadingMeds(true)
    try {
      const res = await api.getAll({ skip: 0, take: 500 })
      setMedicines(res.data ?? [])
    } catch { /* silent */ }
    finally { setLoadingMeds(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Customer search (debounced) ───────────────────────────────────────────
  useEffect(() => {
    if (customerSearchRef.current) clearTimeout(customerSearchRef.current)
    const q = customerSearch.trim()
    if (!q) { setCustomerResults([]); setCustomerSearching(false); return }
    setCustomerSearching(true)
    customerSearchRef.current = setTimeout(async () => {
      try {
        const res = await ownersApi.searchLite(q)
        setCustomerResults(res ?? [])
      } catch { setCustomerResults([]) }
      finally { setCustomerSearching(false) }
    }, 280)
  }, [customerSearch])

  const catalogList = medicines.filter(m => {
    const matchS = !medSearch || m.name.toLowerCase().includes(medSearch.toLowerCase())
    const matchC = medCat === 'all' || m.category === medCat
    return matchS && matchC
  })

  // ── Medicine/batch selection helpers ──────────────────────────────────────
  function pickMed(med: MedicineLite) {
    setSelectedMed(med)
    setSaleError(null)
    setEditingId(null)
    const fefo = [...med.batches]
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0)
    const batch = fefo ?? null
    const unitPrice = batch ? String(batch.sellingPrice ?? batch.costPerUnit ?? '') : ''
    // If the FEFO batch is a partial container (<1) and subUnit is available, default to sub-unit mode
    const isPartial = batch !== null && batch.quantity < 1
    const defaultUnit: 'container' | 'sub' = (isPartial && med.subUnit && med.subUnitsPerContainer) ? 'sub' : 'container'
    let resolvedPrice = unitPrice
    if (defaultUnit === 'sub' && batch && med.subUnitsPerContainer) {
      const base = (batch.sellingPrice ?? batch.costPerUnit) || 0
      resolvedPrice = base > 0 ? (base / med.subUnitsPerContainer).toFixed(4) : ''
    }
    setItemForm({ batchId: batch?.id ?? '', quantity: '', unitPrice: resolvedPrice, discount: '0', saleUnit: defaultUnit })
  }

  function pickBatch(b: BatchLite) {
    const basePrice = (b.sellingPrice ?? b.costPerUnit) || 0
    // If newly selected batch is partial and subUnit available, switch to sub-unit mode
    const isPartial = b.quantity < 1
    const currentUnit = (isPartial && selectedMed?.subUnit && selectedMed?.subUnitsPerContainer) ? 'sub' : itemForm.saleUnit
    let price = basePrice ? String(basePrice) : ''
    if (price && currentUnit === 'sub' && selectedMed?.subUnitsPerContainer) {
      price = (basePrice / selectedMed.subUnitsPerContainer).toFixed(4)
    }
    setItemForm(f => ({ ...f, batchId: b.id, unitPrice: price, saleUnit: currentUnit, quantity: '' }))
  }

  function pickUnit(unit: 'container' | 'sub') {
    const batch = selectedMed?.batches.find(b => b.id === itemForm.batchId) ?? null
    const basePrice = (batch ? (batch.sellingPrice ?? batch.costPerUnit) : parseFloat(itemForm.unitPrice)) || 0
    let newPrice: string = itemForm.unitPrice
    if (unit === 'sub' && selectedMed?.subUnitsPerContainer && basePrice > 0) {
      newPrice = (basePrice / selectedMed.subUnitsPerContainer).toFixed(4)
    } else if (unit === 'container' && basePrice > 0) {
      newPrice = String(basePrice)
    }
    setItemForm(f => ({ ...f, saleUnit: unit, quantity: '', unitPrice: newPrice }))
  }

  function clearItem() {
    setSelectedMed(null)
    setEditingId(null)
    setSaleError(null)
    setItemForm({ batchId: '', quantity: '', unitPrice: '', discount: '0', saleUnit: 'container' })
  }

  // ── Cart operations ───────────────────────────────────────────────────────
  function addToCart() {
    if (!selectedMed || !itemForm.batchId) {
      toast.error(t('vetSelectMedAndBatch') || 'Select a medicine and batch'); return
    }
    if (!itemForm.quantity || parseFloat(itemForm.quantity) <= 0) {
      toast.error(t('vetEnterValidQty') || 'Enter a valid quantity'); return
    }
    const batch = selectedMed.batches.find(b => b.id === itemForm.batchId)
    if (!batch) { toast.error('Batch not found'); return }

    const enteredQtyNum = parseFloat(itemForm.quantity)

    if (!editingId) {
      // Check if this exact batch+saleUnit combo is already in the cart
      const existing = cart.find(ci => ci.batch.id === itemForm.batchId && ci.saleUnit === itemForm.saleUnit)
      if (existing) {
        // batchAvailableNet already deducts ALL cart items for this batch (cross-unit converted),
        // so we just need to check whether the new qty fits in what's left.
        if (enteredQtyNum > batchAvailableNet) {
          toast.error(`Only ${batchAvailableNet.toFixed(4).replace(/\.?0+$/, '')} ${activeUnit} available — ${alreadyInCartQty.toFixed(4).replace(/\.?0+$/, '')} ${activeUnit} already committed in cart`)
          return
        }
        // Merge: update quantity on the existing cart line
        const mergedQty = (parseFloat(existing.quantity) || 0) + enteredQtyNum
        setCart(prev => prev.map(ci =>
          ci.id === existing.id
            ? { ...ci, quantity: String(mergedQty) }
            : ci
        ))
        clearItem()
        return
      }
    }

    if (exceedsBatch) {
      toast.error(`Only ${batchAvailable} ${activeUnit} available in this batch`); return
    }
    const newItem: CartItem = {
      id: editingId ?? (Date.now().toString(36) + Math.random().toString(36).slice(2)),
      medicine: selectedMed,
      batch,
      quantity: itemForm.quantity,
      unitPrice: itemForm.unitPrice,
      discount: itemForm.discount,
      saleUnit: itemForm.saleUnit,
    }
    if (editingId) {
      setCart(prev => prev.map(ci => ci.id === editingId ? newItem : ci))
    } else {
      setCart(prev => [...prev, newItem])
    }
    clearItem()
  }

  function editCartItem(ci: CartItem) {
    const med = medicines.find(m => m.id === ci.medicine.id) ?? ci.medicine
    setSelectedMed(med)
    setEditingId(ci.id)
    setItemForm({ batchId: ci.batch.id, quantity: ci.quantity, unitPrice: ci.unitPrice, discount: ci.discount, saleUnit: ci.saleUnit })
  }

  function removeCartItem(id: string) {
    setCart(prev => prev.filter(ci => ci.id !== id))
    if (editingId === id) clearItem()
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) { toast.error('Add at least one item to the cart'); return }
    setSaleError(null)
    setBusy(true)
    try {
      await api.sellCombo({
        items: cart.map(ci => ({
          medicineId: ci.medicine.id,
          batchId: ci.batch.id,
          quantity: parseFloat(ci.quantity),
          unitPrice: parseFloat(ci.unitPrice) || 0,
          discount: parseFloat(ci.discount) || 0,
          saleUnit: ci.saleUnit,
        })),
        ownerId:       selectedCustomer?.id   || undefined,
        ownerName:     selectedCustomer?.name || undefined,
        paymentMethod: shared.paymentMethod,
        notes:         shared.notes || undefined,
        saleDate:      shared.saleDate || undefined,
        amountPaid:    (() => { const p = parseFloat(shared.amountPaid); return !isNaN(p) && p < cartTotal ? p : undefined })()
      })
      toast.success(cart.length === 1
        ? t('vetSaleRecorded') || 'Sale recorded successfully'
        : `${cart.length} items sold successfully`)
      setCart([])
      clearItem()
      setSelectedCustomer(null)
      setCustomerSearch('')
      setShared({ paymentMethod: 'cash', notes: '', saleDate: new Date().toISOString().slice(0, 10), amountPaid: '' })
      load(); onSaleRecorded()
    } catch (err: any) {
      const msg = err?.message ?? 'Sale failed'
      setSaleError(msg)
      toast.error(msg)
    } finally { setBusy(false) }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedBatch = selectedMed?.batches.find(b => b.id === itemForm.batchId) ?? null
  const batchDays = selectedBatch ? daysUntil(selectedBatch.expiryDate) : null
  const hasSubUnit = !!(selectedMed?.subUnit && selectedMed?.subUnitsPerContainer)
  const activeUnit = hasSubUnit && itemForm.saleUnit === 'sub' ? selectedMed!.subUnit! : (selectedMed?.unit ?? '')

  // ── Qty validation ────────────────────────────────────────────────────────
  const enteredQty = parseFloat(itemForm.quantity) || 0
  const batchAvailable = selectedBatch
    ? (itemForm.saleUnit === 'sub' && selectedMed?.subUnitsPerContainer
        ? selectedBatch.quantity * selectedMed.subUnitsPerContainer
        : selectedBatch.quantity)
    : 0
  // How much of this batch is already committed in the cart (excluding the line being edited),
  // converted to the current saleUnit so bottles + ml are compared on the same scale.
  const alreadyInCartQty = cart
    .filter(ci => ci.batch.id === itemForm.batchId && ci.id !== editingId)
    .reduce((s, ci) => {
      const qty   = parseFloat(ci.quantity) || 0
      const ratio = selectedMed?.subUnitsPerContainer ?? 1
      if (ci.saleUnit === itemForm.saleUnit) return s + qty
      if (itemForm.saleUnit === 'sub'       && ci.saleUnit === 'container') return s + qty * ratio
      if (itemForm.saleUnit === 'container' && ci.saleUnit === 'sub')       return s + qty / ratio
      return s + qty
    }, 0)
  const batchAvailableNet = Math.max(0, batchAvailable - alreadyInCartQty)
  const qtyInContainers = (selectedMed?.subUnitsPerContainer && itemForm.saleUnit === 'sub')
    ? enteredQty / selectedMed.subUnitsPerContainer
    : enteredQty
  const stockAfter    = (selectedMed?.totalStock ?? 0) - qtyInContainers
  const exceedsBatch  = enteredQty > 0 && enteredQty > batchAvailableNet
  const belowMinStock = !exceedsBatch && enteredQty > 0
    && (selectedMed?.minimumStock ?? 0) > 0
    && stockAfter < (selectedMed?.minimumStock ?? 0)

  const itemSubtotal = enteredQty * (parseFloat(itemForm.unitPrice) || 0)
  const itemDiscount = parseFloat(itemForm.discount) || 0
  const itemTotal    = Math.max(0, itemSubtotal - itemDiscount)
  const cartTotal    = cart.reduce((sum, ci) => {
    const qty   = parseFloat(ci.quantity)  || 0
    const price = parseFloat(ci.unitPrice) || 0
    const disc  = parseFloat(ci.discount)  || 0
    return sum + Math.max(0, qty * price - disc)
  }, 0)
  const cartSubtotal = cart.reduce((sum, ci) => {
    const qty   = parseFloat(ci.quantity)  || 0
    const price = parseFloat(ci.unitPrice) || 0
    return sum + qty * price
  }, 0)
  const cartDiscountTotal = cart.reduce((sum, ci) => sum + (parseFloat(ci.discount) || 0), 0)

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* ── Panel 1: Medicine Catalogue ─────────────────────────────────────────── */}
      <div className="w-64 xl:w-72 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="p-3 space-y-2 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={medSearch} onChange={e => setMedSearch(e.target.value)}
              placeholder={t('vetSearchMedicines') || 'Search medicines…'}
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            {medSearch && (
              <button onClick={() => setMedSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map(c => (
              <button key={c} onClick={() => setMedCat(c)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize transition-colors
                  ${medCat === c ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600'}`}>
                {c === 'all' ? t('vetFilterAll') || 'All' : c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingMeds ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
          ) : catalogList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Package className="h-7 w-7 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">{t('vetNoMedicinesFound') || 'No medicines found'}</p>
            </div>
          ) : catalogList.map(med => {
            const isActive = selectedMed?.id === med.id
            const inCart   = cart.some(ci => ci.medicine.id === med.id)
            const validBatches = med.batches.filter(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0).length
            return (
              <button key={med.id} type="button" onClick={() => pickMed(med)}
                className={[
                  'w-full text-left rounded-xl border px-3 py-2.5 transition-all',
                  isActive ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-500/30'
                    : inCart ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-900/10'
                    : 'border-transparent bg-white dark:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm',
                ].join(' ')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{med.name}</p>
                      {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
                      {!isActive && inCart && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
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
                  {inCart    && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">In cart</span>}
                  {med.isLowStock && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Low stock</span>}
                  {med.hasExpired && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Expired batch</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Panel 2: Item Configurator ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
        {selectedMed ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">

              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                    <Pill className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedMed.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 capitalize">{selectedMed.category}</span>
                      {editingId && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                          <Pencil className="h-2.5 w-2.5" /> Editing
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedMed.totalStock} {selectedMed.unit} in stock</p>
                  </div>
                </div>
                <button type="button" onClick={clearItem}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Batch selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Batch</label>
                {selectedBatch ? (
                  <div className="flex items-stretch gap-2">
                    <div className={[
                      'flex-1 rounded-xl border px-4 py-3',
                      batchDays !== null && batchDays < 0    ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                      : batchDays !== null && batchDays <= 30 ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                      : 'border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-900/10',
                    ].join(' ')}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-mono text-slate-500">{selectedBatch.batchNumber ?? 'No lot #'}</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                            {selectedBatch.quantity} <span className="text-xs font-normal text-slate-400">{selectedMed.unit} remaining</span>
                          </p>
                          {selectedBatch.supplier && <p className="text-xs text-slate-400 mt-0.5">{selectedBatch.supplier}</p>}
                        </div>
                        <div className="text-right space-y-0.5">
                          {batchDays !== null && batchDays < 0   ? <span className="text-xs font-bold text-red-600 dark:text-red-400">Expired</span>
                          : batchDays !== null && batchDays <= 7  ? <span className="text-xs font-bold text-red-500">{batchDays}d left</span>
                          : batchDays !== null && batchDays <= 30 ? <span className="text-xs font-bold text-amber-600">{batchDays}d left</span>
                          : <span className="text-xs text-slate-400">Exp: {new Date(selectedBatch.expiryDate).toLocaleDateString()}</span>}
                          {selectedBatch.sellingPrice != null && (
                            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                              ${selectedBatch.sellingPrice.toFixed(2)}/unit
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setBatchModal(true)}
                      className="px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-violet-400 transition-colors">
                      Change
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setBatchModal(true)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Select batch
                  </button>
                )}
              </div>

              {/* Sub-unit toggle */}
              {hasSubUnit && (() => {
                const containerDisabled = !!(selectedBatch && selectedBatch.quantity < 1)
                return (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sale Unit</label>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                    <button type="button"
                      onClick={() => !containerDisabled && pickUnit('container')}
                      disabled={containerDisabled}
                      title={containerDisabled ? `Less than 1 ${selectedMed!.unit} remaining — sell by ${selectedMed!.subUnit} instead` : undefined}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors
                        ${itemForm.saleUnit === 'container' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}
                        ${containerDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      By {selectedMed!.unit}
                    </button>
                    <button type="button" onClick={() => pickUnit('sub')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${itemForm.saleUnit === 'sub' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                      By {selectedMed!.subUnit}
                    </button>
                  </div>
                  {containerDisabled && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Only {selectedBatch!.quantity.toFixed(4)} {selectedMed!.unit} left — selling by {selectedMed!.subUnit} only
                    </p>
                  )}
                  {itemForm.saleUnit === 'sub' && itemForm.quantity && (
                    <p className="text-[11px] text-violet-600 dark:text-violet-400">
                      {itemForm.quantity} {selectedMed!.subUnit} = {(parseFloat(itemForm.quantity) / selectedMed!.subUnitsPerContainer!).toFixed(4)} {selectedMed!.unit} deducted
                    </p>
                  )}
                </div>
                )
              })()}

              {/* Qty / Price / Discount */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pricing</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Qty ({activeUnit}) *</label>
                    <input type="number" min="0.01" step="any" placeholder="0"
                      value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))}
                      className={inputCls + (exceedsBatch ? ' border-red-400 dark:border-red-600 ring-1 ring-red-400/40' : belowMinStock ? ' border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/40' : '')} />
                    {selectedBatch && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Available: <span className="font-semibold text-slate-600 dark:text-slate-300">{batchAvailableNet} {activeUnit}</span>
                        {alreadyInCartQty > 0 && (
                          <span className="text-violet-500 dark:text-violet-400"> ({alreadyInCartQty} in cart)</span>
                        )}
                      </p>
                    )}
                    {exceedsBatch && (
                      <p className="mt-1 text-[10px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        Only {batchAvailableNet} {activeUnit} remaining{alreadyInCartQty > 0 ? ` (${alreadyInCartQty} already in cart)` : ''}
                      </p>
                    )}
                    {belowMinStock && (
                      <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        Stock will drop below minimum ({selectedMed!.minimumStock} {selectedMed!.unit})
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Unit Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" min="0" step="any" placeholder="0.00"
                        value={itemForm.unitPrice} onChange={e => setItemForm(f => ({ ...f, unitPrice: e.target.value }))}
                        className={inputCls + ' pl-6'} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Discount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" min="0" step="any" placeholder="0.00"
                        value={itemForm.discount} onChange={e => setItemForm(f => ({ ...f, discount: e.target.value }))}
                        className={inputCls + ' pl-6'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Item preview */}
              {itemSubtotal > 0 && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      {parseFloat(itemForm.quantity) || 0} × ${(parseFloat(itemForm.unitPrice) || 0).toFixed(2)}
                      {itemDiscount > 0 && <span className="text-emerald-600 dark:text-emerald-400"> − ${itemDiscount.toFixed(2)}</span>}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">${itemTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Add / Update button */}
              <button type="button" onClick={addToCart}
                className="w-full py-3 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                {editingId
                  ? <><Pencil className="h-4 w-4" /> Update Cart Item</>
                  : <><Plus className="h-4 w-4" /> Add to Cart</>}
              </button>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-5">
              <Pill className="h-9 w-9 text-violet-300 dark:text-violet-600" />
            </div>
            <p className="font-semibold text-slate-600 dark:text-slate-400 text-base">Pick a medicine</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
              Select from the catalogue on the left, then configure quantity and pricing here
            </p>
          </div>
        )}
      </div>

      {/* ── Panel 3: Cart + Checkout ────────────────────────────────────────────── */}

      {/* Collapsed cart tab — visible only when cart is hidden */}
      {!cartVisible && (
        <button
          type="button"
          onClick={() => setCartVisible(true)}
          className="shrink-0 w-10 flex flex-col items-center justify-center gap-1 border-l border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
        >
          <PanelRightOpen className="h-4 w-4 text-violet-500" />
          {cart.length > 0 && (
            <span className="px-1.5 py-0.5 min-w-[20px] text-center text-[10px] font-black rounded-full bg-violet-600 text-white">
              {cart.length}
            </span>
          )}
          <span className="text-[9px] font-semibold text-slate-400 [writing-mode:vertical-rl] rotate-180 mt-1">Cart</span>
        </button>
      )}

      {cartVisible && (
      <div className="w-80 xl:w-96 shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">

        {/* Cart header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-violet-500" />
            <span className="font-bold text-slate-900 dark:text-white text-sm">Cart</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.5 min-w-[20px] text-center text-[10px] font-black rounded-full bg-violet-600 text-white">{cart.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button type="button" onClick={() => { setCart([]); clearItem() }}
                className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors">
                Clear all
              </button>
            )}
            <button type="button" onClick={() => setCartVisible(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Hide cart">
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cart items (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
              <ShoppingCart className="h-10 w-10 text-slate-200 dark:text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Cart is empty</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Add items from the configurator</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map(ci => {
                const qty       = parseFloat(ci.quantity)  || 0
                const price     = parseFloat(ci.unitPrice) || 0
                const disc      = parseFloat(ci.discount)  || 0
                const lineTotal = Math.max(0, qty * price - disc)
                const isEditing = editingId === ci.id
                return (
                  <div key={ci.id}
                    className={[
                      'rounded-xl border p-3 transition-all cursor-pointer',
                      isEditing
                        ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-400/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm',
                    ].join(' ')}
                    onClick={() => !isEditing && editCartItem(ci)}>
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Pill className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{ci.medicine.name}</span>
                          {isEditing && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-bold">EDITING</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Lot: {ci.batch.batchNumber ?? '—'} · Exp: {new Date(ci.batch.expiryDate).toLocaleDateString()}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {qty} {ci.saleUnit === 'sub' ? ci.medicine.subUnit : ci.medicine.unit} × ${price.toFixed(2)}
                            {disc > 0 && <span className="text-emerald-600 dark:text-emerald-400"> −${disc.toFixed(2)}</span>}
                          </span>
                          <span className="text-xs font-bold text-violet-700 dark:text-violet-300">${lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); removeCartItem(ci.id) }}
                        className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Order summary + Checkout (sticky bottom) */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {cart.length > 0 ? (
            <>
              {/* Order summary */}
              <div className="px-4 py-3 space-y-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                  <span>${cartSubtotal.toFixed(2)}</span>
                </div>
                {cartDiscountTotal > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span>−${cartDiscountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span>Total</span>
                  <span className="text-violet-700 dark:text-violet-300 text-base">${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout form */}
              <form onSubmit={submit} className="px-4 py-3 space-y-3">

                {/* Customer search / link */}
                <div className="space-y-1">
                  {selectedCustomer ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20">
                      <UserCheck className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{selectedCustomer.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{selectedCustomer.phone}</p>
                      </div>
                      <button type="button" onClick={() => navigate(`/vet/owners/${selectedCustomer.id}`)}
                        className="p-1 rounded-lg text-slate-400 hover:text-violet-600 transition-colors" title="View customer profile">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setSelectedCustomer(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="flex gap-1">
                        <div className="relative flex-1">
                          <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            placeholder="Search customer…"
                            value={customerSearch}
                            onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }}
                            onFocus={() => setShowCustomerDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 160)}
                            className={inputCls + ' pl-8'}
                          />
                          {customerSearching && (
                            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                          )}
                        </div>
                        <button type="button" onClick={() => setShowNewOwnerModal(true)}
                          className="px-2.5 py-2 rounded-lg border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors shrink-0"
                          title="Add new customer">
                          <UserPlus className="h-4 w-4" />
                        </button>
                      </div>
                      {showCustomerDropdown && customerSearch.trim() && (
                        <div className="absolute z-20 left-0 right-8 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                          {customerResults.length === 0 && !customerSearching ? (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center">No customers found</div>
                          ) : customerResults.map(c => (
                            <button key={c.id} type="button"
                              onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false) }}
                              className="w-full text-left px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">{c.name}</p>
                              <p className="text-[10px] text-slate-400">{c.phone}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" value={shared.saleDate}
                      onChange={e => setShared(s => ({ ...s, saleDate: e.target.value }))}
                      className={inputCls + ' pl-7 text-xs'} />
                  </div>
                  <input placeholder="Notes (optional)"
                    value={shared.notes} onChange={e => setShared(s => ({ ...s, notes: e.target.value }))}
                    className={inputCls + ' text-xs'} />
                </div>

                {/* Amount Paid */}
                {cart.length > 0 && (() => {
                  const paidNum  = parseFloat(shared.amountPaid)
                  const isPartial = !isNaN(paidNum) && paidNum < cartTotal
                  const isOver    = !isNaN(paidNum) && paidNum > cartTotal
                  const remaining = isPartial ? cartTotal - paidNum : 0
                  return (
                    <div className="space-y-1">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input
                          type="number" min="0" max={cartTotal} step="any"
                          placeholder={`Amount paid (total: $${cartTotal.toFixed(2)})`}
                          value={shared.amountPaid}
                          onChange={e => {
                            const raw = e.target.value
                            const num = parseFloat(raw)
                            if (!isNaN(num) && num > cartTotal) {
                              setShared(s => ({ ...s, amountPaid: cartTotal.toFixed(2) }))
                            } else {
                              setShared(s => ({ ...s, amountPaid: raw }))
                            }
                          }}
                          className={inputCls + ' pl-6 text-xs' + (isOver ? ' border-red-400 ring-1 ring-red-300' : '')}
                        />
                      </div>
                      {isPartial && (
                        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                          <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">Remaining balance</span>
                          <span className="text-xs font-black text-amber-700 dark:text-amber-300">${remaining.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {saleError && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{saleError}</p>
                  </div>
                )}

                <button type="submit" disabled={busy}
                  className="w-full py-3 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {busy
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><ShoppingCart className="h-4 w-4" /> {cart.length === 1 ? 'Record Sale' : `Submit ${cart.length} Items`}</>}
                </button>
              </form>
            </>
          ) : (
            <div className="px-4 py-4 text-center text-xs text-slate-400 dark:text-slate-600">
              Add items to check out
            </div>
          )}
        </div>

      </div>
      )} {/* end cartVisible */}

      {batchModal && selectedMed && (
        <BatchPickerModal
          medicine={selectedMed}
          selectedBatchId={itemForm.batchId}
          onSelect={pickBatch}
          onClose={() => setBatchModal(false)}
        />
      )}

      {showNewOwnerModal && (
        <VetOwnerFormModal
          onSave={(owner) => {
            setSelectedCustomer({ id: owner.id, name: owner.name, phone: owner.phone })
            setCustomerSearch('')
            setShowNewOwnerModal(false)
          }}
          onClose={() => setShowNewOwnerModal(false)}
        />
      )}
    </div>
  )
}
// ── Sale Row (with inline pay) ────────────────────────────────────────────────
function SaleRow({ s, cogs, profit, paidAmt, remaining, pstatus, statusMap, onPaid }: {
  s: Sale; cogs: number; profit: number; paidAmt: number; remaining: number
  pstatus: string; statusMap: Record<string, string>; onPaid: () => void
}) {
  const [paying, setPaying] = useState(false)
  const [payAmt, setPayAmt]  = useState('')
  const [busy, setBusy]      = useState(false)
  const toast = useToast()

  async function handlePay() {
    const val = parseFloat(payAmt)
    if (isNaN(val) || val <= 0) { toast.error('Enter a valid amount'); return }
    const total = Math.min(paidAmt + val, s.totalPrice)
    setBusy(true)
    try {
      await window.api.vet?.medicines.updateSalePayment(s.id, total)
      toast.success('Payment recorded')
      setPaying(false); setPayAmt('')
      onPaid()
    } catch { toast.error('Failed to record payment') }
    finally { setBusy(false) }
  }

  return (
    <>
      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(s.saleDate).toLocaleDateString()}</td>
        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{s.medicine.name}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="font-mono text-slate-600 dark:text-slate-300">{s.batch.batchNumber ?? '—'}</p>
          <p className="text-[10px] text-slate-400">{new Date(s.batch.expiryDate).toLocaleDateString()}</p>
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.ownerName ?? s.patientName ?? '—'}</td>
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
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="font-semibold text-slate-700 dark:text-slate-300">${paidAmt.toFixed(2)}</p>
          {remaining > 0.005 && <p className="text-[10px] text-red-500">-${remaining.toFixed(2)}</p>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusMap[pstatus] ?? statusMap.paid}`}>
              {pstatus}
            </span>
            {pstatus !== 'paid' && (
              <button onClick={() => setPaying(v => !v)}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200 transition-colors">
                Pay
              </button>
            )}
          </div>
        </td>
      </tr>
      {paying && (
        <tr className="bg-amber-50/60 dark:bg-amber-900/10">
          <td colSpan={12} className="px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Record payment for {s.medicine.name} (remaining: ${remaining.toFixed(2)})</span>
              <input type="number" min="0" max={remaining} step="any"
                placeholder={remaining.toFixed(2)}
                value={payAmt} onChange={e => setPayAmt(e.target.value)}
                className="w-28 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              <button onClick={handlePay} disabled={busy}
                className="px-3 py-1 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {busy ? '...' : 'Record'}
              </button>
              <button onClick={() => { setPaying(false); setPayAmt('') }}
                className="px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
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
  const [search, setSearch]   = useState('')
  const [preset, setPreset]   = useState<'today' | 'week' | 'month' | ''>('')
  const [page, setPage]       = useState(1)
  const [catFilter, setCatFilter] = useState('all')
  const [catOptions, setCatOptions] = useState<string[]>(['all'])

  useEffect(() => {
    ;(window as any).api?.vet?.medicineCategories?.getAll()
      .then((rows: { name: string }[]) => setCatOptions(['all', ...(rows ?? []).map((r: { name: string }) => r.name)]))
      .catch(() => {})
  }, [])

  function handleDateFrom(v: string) { setDateFrom(v); setPreset(''); setPage(1) }
  function handleDateTo(v: string)   { setDateTo(v);   setPreset(''); setPage(1) }

  function applyPreset(p: 'today' | 'week' | 'month') {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    const today = fmt(now)
    if (p === 'today') { setDateFrom(today); setDateTo(today) }
    else if (p === 'week') {
      const w = new Date(now); w.setDate(now.getDate() - 6)
      setDateFrom(fmt(w)); setDateTo(today)
    } else {
      const m = new Date(now); m.setDate(now.getDate() - 29)
      setDateFrom(fmt(m)); setDateTo(today)
    }
    setPreset(p); setPage(1)
  }

  function clearFilters() { setDateFrom(''); setDateTo(''); setSearch(''); setPreset(''); setCatFilter('all'); setPage(1) }

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
  const hasFilters = !!(dateFrom || dateTo || search || catFilter !== 'all')

  const displayed = sales.filter(s => {
    if (search) {
      const q = search.toLowerCase()
      if (!s.medicine.name.toLowerCase().includes(q) && !(s.ownerName ?? s.patientName ?? '').toLowerCase().includes(q)) return false
    }
    if (catFilter !== 'all' && s.medicine.category !== catFilter) return false
    return true
  })

  const revenue    = displayed.reduce((sum, s) => sum + s.totalPrice, 0)
  const totalCogs  = displayed.reduce((sum, s) => sum + (s.costTotal ?? s.quantity * (s.batch?.costPerUnit ?? 0)), 0)
  const grossProfit = revenue - totalCogs
  const margin     = revenue > 0 ? (grossProfit / revenue) * 100 : 0

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
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 shrink-0 space-y-2">
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
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder={t('vetSearchSales')||'Search medicine or customer…'}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-56" />
          </div>
          <div className="flex gap-1">
            {(['today', 'week', 'month'] as const).map(p => (
              <button key={p} onClick={() => applyPreset(p)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors
                  ${preset === p
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400 dark:hover:border-violet-600'}`}>
                {p === 'today' ? (t('vetToday')||'Today') : p === 'week' ? (t('vetThisWeek')||'Week') : (t('vetThisMonth')||'Month')}
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
        {/* Category filter row */}
        {catOptions.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Category:</span>
            {catOptions.map(c => (
              <button key={c} onClick={() => { setCatFilter(c); setPage(1) }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize transition-colors
                  ${catFilter === c ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600'}`}>
                {c === 'all' ? (t('vetFilterAll')||'All') : c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="px-5 py-4 grid grid-cols-5 gap-3 shrink-0">
        {(() => {
          const outstanding = displayed.reduce((sum, s) => {
            const paid = s.amountPaid ?? s.totalPrice
            return sum + Math.max(0, s.totalPrice - paid)
          }, 0)
          return [
            { label: t('vetTotalSales')||'Total Sales',   val: String(total),              icon: Receipt,    color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-900/20' },
            { label: t('vetRevenue')||'Revenue',       val: `$${revenue.toFixed(2)}`,   icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: t('vetCOGS')||'COGS',          val: `$${totalCogs.toFixed(2)}`,  icon: DollarSign, color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: t('vetGrossProfit')||'Gross Profit',  val: `$${grossProfit.toFixed(2)}`, icon: BarChart2,  color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Outstanding',  val: `$${outstanding.toFixed(2)}`,icon: AlertCircle, color: outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400', bg: outstanding > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-800' },
          ]
        })().map(s => (
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
                    {['Date', 'Medicine', 'Batch', 'Customer', 'Qty', 'Unit Price', 'Discount', 'Total', 'COGS', 'Profit', 'Paid', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {displayed.map(s => {
                    const cogs       = s.costTotal ?? s.quantity * (s.batch?.costPerUnit ?? 0)
                    const profit     = s.grossProfit ?? (s.totalPrice - cogs)
                    const paidAmt    = s.amountPaid ?? s.totalPrice
                    const remaining  = Math.max(0, s.totalPrice - paidAmt)
                    const pstatus    = s.paymentStatus ?? (remaining > 0.005 ? 'partial' : 'paid')
                    const statusMap: Record<string, string> = {
                      paid:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                      partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                      unpaid:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
                    }
                    return (
                    <SaleRow key={s.id} s={s} cogs={cogs} profit={profit} paidAmt={paidAmt}
                      remaining={remaining} pstatus={pstatus} statusMap={statusMap}
                      onPaid={load} />
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
