import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShoppingCart, Search, X, Loader2, User,
  Package, CheckCircle2,
  Pill, Plus, Pencil, AlertCircle,
  UserCheck, UserPlus, PanelRightClose, PanelRightOpen, ExternalLink,
  Maximize2, Trash2, AlertTriangle, Minus, SlidersHorizontal, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import DateField from '@renderer/components/DateField'
import type {
  MedicineLite, BatchLite, CustomerLite, CartItem,
} from './vetSales.types'
import {
  inputCls, PAYMENT_METHODS, daysUntil, remainingDisplay,
} from './vetSales.shared'
import BatchPickerModal from './VetSaleBatchPicker'
import VetOwnerFormModal from '../../vet-owners/'

const api       = (window as any).api?.vet?.medicines
const ownersApi = (window as any).api?.vet?.owners

// ── Sale Operation ────────────────────────────────────────────────────────────

export default function SaleOperation({ onSaleRecorded, onCartCountChange }: {
  onSaleRecorded: () => void
  onCartCountChange?: (count: number) => void
}) {
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
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  // Collapsible checkout options (defaults: cash · full payment · no discount).
  const [showCheckoutDetails, setShowCheckoutDetails] = useState(false)

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
    cartDiscount: '', // whole-cart discount ($)
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

  // Report cart size up so the parent can warn before navigating away.
  useEffect(() => { onCartCountChange?.(cart.length) }, [cart.length, onCartCountChange])

  // Warn on window close / reload while the cart still holds unsaved items.
  useEffect(() => {
    if (cart.length === 0) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [cart.length])

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
  // Cap how many catalogue cards we render at once — large catalogues (500+)
  // stay snappy; users narrow down with search / category.
  const CATALOG_CAP = 80
  const catalogVisible = catalogList.slice(0, CATALOG_CAP)
  const catalogHidden = catalogList.length - catalogVisible.length

  // ── Medicine/batch selection helpers ──────────────────────────────────────
  // Add one whole unit of a (sub-unit-less) medicine straight to the cart.
  function quickAddContainer(med: MedicineLite, batch: BatchLite) {
    const committed = cart
      .filter(ci => ci.batch.id === batch.id)
      .reduce((s, ci) => {
        const q = parseFloat(ci.quantity) || 0
        const ratio = ci.medicine.subUnitsPerContainer ?? 1
        return s + (ci.saleUnit === 'sub' ? q / ratio : q)
      }, 0)
    if (batch.quantity - committed < 1 - 1e-9) {
      toast.error(`${med.name}: ${t('vetNoStockLeft') || 'no stock left'}`)
      return
    }
    const price = String((batch.sellingPrice ?? batch.costPerUnit) || 0)
    const existing = cart.find(ci => ci.batch.id === batch.id && ci.saleUnit === 'container')
    if (existing) {
      setCart(prev => prev.map(ci => ci.id === existing.id
        ? { ...ci, quantity: String((parseFloat(ci.quantity) || 0) + 1) }
        : ci))
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        medicine: med, batch,
        quantity: '1', unitPrice: price, discount: '0', saleUnit: 'container',
      }
      setCart(prev => [...prev, newItem])
    }
    toast.success(`${med.name} ${t('vetAddedToCart') || 'added to cart'}`)
  }

  function pickMed(med: MedicineLite) {
    setSaleError(null)
    const fefo = [...med.batches]
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0)
    const batch = fefo ?? null
    const hasSubUnit = !!(med.subUnit && med.subUnitsPerContainer)

    // No sub-unit + a sellable batch → quick-add 1 unit, skip the modal entirely.
    if (!hasSubUnit && batch) {
      quickAddContainer(med, batch)
      return
    }

    // Sub-unit meds (or no sellable batch) open the item configurator.
    setSelectedMed(med)
    setEditingId(null)
    const unitPrice = batch ? String(batch.sellingPrice ?? batch.costPerUnit ?? '') : ''
    const isPartial = batch !== null && batch.quantity < 1
    const defaultUnit: 'container' | 'sub' = (isPartial && med.subUnit && med.subUnitsPerContainer) ? 'sub' : 'container'
    let resolvedPrice = unitPrice
    if (defaultUnit === 'sub' && batch && med.subUnitsPerContainer) {
      const base = (batch.sellingPrice ?? batch.costPerUnit) || 0
      resolvedPrice = base > 0 ? (base / med.subUnitsPerContainer).toFixed(4) : ''
    }
    setItemForm({ batchId: batch?.id ?? '', quantity: batch ? '1' : '', unitPrice: resolvedPrice, discount: '0', saleUnit: defaultUnit })
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
    if (unit === itemForm.saleUnit) return
    const batch = selectedMed?.batches.find(b => b.id === itemForm.batchId) ?? null
    const ratio = selectedMed?.subUnitsPerContainer || 0
    // Resolve a single canonical CONTAINER price to convert from, so toggling
    // units any number of times always lands on the same values (no drift /
    // runaway amounts). Prefer the batch's price; otherwise read the shown
    // price and interpret it according to the unit currently in effect.
    let containerPrice = 0
    if (batch) {
      containerPrice = (batch.sellingPrice ?? batch.costPerUnit) || 0
    } else {
      const shown = parseFloat(itemForm.unitPrice) || 0
      containerPrice = itemForm.saleUnit === 'sub' && ratio > 0 ? shown * ratio : shown
    }
    let newPrice: string = itemForm.unitPrice
    if (containerPrice > 0) {
      newPrice = unit === 'sub' && ratio > 0
        ? (containerPrice / ratio).toFixed(4)
        : String(Math.round(containerPrice * 100) / 100)
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
      toast.error(`Only ${batchAvailableNet} ${activeUnit} available${alreadyInCartQty > 0 ? ` (${alreadyInCartQty} already in cart)` : ''}`); return
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

  // Quick +/- stepper for a cart line (clamped to the batch's net availability).
  function changeCartQty(ci: CartItem, delta: number) {
    setCart(prev => prev.map(c => {
      if (c.id !== ci.id) return c
      const ratio = c.medicine.subUnitsPerContainer ?? 1
      const step  = c.saleUnit === 'sub' ? ratio : 1
      const cur   = parseFloat(c.quantity) || 0
      let next    = cur + delta * step
      if (next < step) next = step
      // Cap at the batch's remaining stock expressed in the line's sale unit.
      const cap = c.saleUnit === 'sub' ? c.batch.quantity * ratio : c.batch.quantity
      if (next > cap) next = cap
      // Keep tidy decimals for sub-unit steps
      const rounded = Math.round(next * 10000) / 10000
      return { ...c, quantity: String(rounded) }
    }))
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
        cartDiscount:  (parseFloat(shared.cartDiscount) || 0) || undefined,
        amountPaid:    (() => { const p = parseFloat(shared.amountPaid); return !isNaN(p) && p < cartTotal ? p : undefined })()
      })
      toast.success(cart.length === 1
        ? t('vetSaleRecorded') || 'Sale recorded successfully'
        : `${cart.length} items sold successfully`)
      setCart([])
      clearItem()
      setSelectedCustomer(null)
      setCustomerSearch('')
      setCartModalOpen(false)
      setShared({ paymentMethod: 'cash', notes: '', saleDate: new Date().toISOString().slice(0, 10), amountPaid: '', cartDiscount: '' })
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
  const cartItemsTotal = cart.reduce((sum, ci) => {
    const qty   = parseFloat(ci.quantity)  || 0
    const price = parseFloat(ci.unitPrice) || 0
    const disc  = parseFloat(ci.discount)  || 0
    return sum + Math.max(0, qty * price - disc)
  }, 0)
  // Whole-cart discount, clamped so the order can't go negative.
  const cartDiscountAmount = Math.min(Math.max(0, parseFloat(shared.cartDiscount) || 0), cartItemsTotal)
  const cartTotal    = Math.max(0, cartItemsTotal - cartDiscountAmount)
  const cartSubtotal = cart.reduce((sum, ci) => {
    const qty   = parseFloat(ci.quantity)  || 0
    const price = parseFloat(ci.unitPrice) || 0
    return sum + qty * price
  }, 0)
  const cartDiscountTotal = cart.reduce((sum, ci) => sum + (parseFloat(ci.discount) || 0), 0)

  // ── Reusable cart renderers (shared by the side panel and the modal) ────────
  function renderCartLines(variant: 'panel' | 'modal' = 'panel') {
    if (cart.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
          <ShoppingCart className="h-10 w-10 text-slate-200 dark:text-slate-700 mb-3" />
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{t('vetCartEmpty') || 'Cart is empty'}</p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">{t('vetCartEmptyHint') || 'Add items from the configurator'}</p>
        </div>
      )
    }
    return (
      <div className={variant === 'modal' ? 'space-y-2' : 'p-3 space-y-2'}>
        {cart.map(ci => {
          const qty       = parseFloat(ci.quantity)  || 0
          const price     = parseFloat(ci.unitPrice) || 0
          const disc      = parseFloat(ci.discount)  || 0
          const lineTotal = Math.max(0, qty * price - disc)
          const isEditing = editingId === ci.id
          const unitLabel = ci.saleUnit === 'sub' ? (ci.medicine.subUnit ?? 'sub') : ci.medicine.unit
          return (
            <div key={ci.id}
              className={[
                'rounded-xl border p-3 transition-all',
                isEditing
                  ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-400/30'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm',
              ].join(' ')}>
              {/* Header: icon + prominent medicine name + actions */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                  <Pill className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white leading-snug break-words">{ci.medicine.name}</span>
                    {isEditing && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-bold shrink-0 mt-0.5">{t('vetEditing') || 'EDITING'}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t('vetLotPrefix') || 'Lot:'} {ci.batch.batchNumber ?? '—'} · {t('vetExpPrefix') || 'Exp:'} {new Date(ci.batch.expiryDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" onClick={() => editCartItem(ci)}
                    className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors" title={t('vetEditItem') || 'Edit item'}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeCartItem(ci.id)}
                    className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('vetRemoveItem') || 'Remove item'}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {/* Footer: qty stepper + unit×price + line total */}
              <div className="flex items-center justify-between gap-2 mt-2.5 pl-10">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                    <button type="button" onClick={() => changeCartQty(ci, -1)}
                      className="px-1.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Decrease">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 tabular-nums min-w-[2.5rem] text-center">{qty}</span>
                    <button type="button" onClick={() => changeCartQty(ci, +1)}
                      className="px-1.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Increase">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{unitLabel} × ${price.toFixed(2)}{disc > 0 && <span className="text-emerald-600 dark:text-emerald-400"> −${disc.toFixed(2)}</span>}</span>
                </div>
                <span className="font-bold text-violet-700 dark:text-violet-300 text-sm shrink-0">${lineTotal.toFixed(2)}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderCheckout(variant: 'panel' | 'modal' = 'panel') {
    if (cart.length === 0) {
      return (
        <div className="px-4 py-4 text-center text-xs text-slate-400 dark:text-slate-600">
          {t('vetAddItemsToCheckout') || 'Add items to check out'}
        </div>
      )
    }
    const paidNum   = parseFloat(shared.amountPaid)
    const isPartial = !isNaN(paidNum) && paidNum < cartTotal
    const isOver    = !isNaN(paidNum) && paidNum > cartTotal
    const remaining = isPartial ? cartTotal - paidNum : 0
    return (
      <>
        {/* Order summary */}
        <div className="px-4 py-3 space-y-1.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('vetSubtotal') || 'Subtotal'} ({cart.length} {cart.length !== 1 ? (t('vetItemsLabel') || 'items') : (t('vetItemLabel') || 'item')})</span>
            <span>${cartSubtotal.toFixed(2)}</span>
          </div>
          {cartDiscountTotal > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <span>{t('vetItemDiscounts') || 'Item discounts'}</span>
              <span>−${cartDiscountTotal.toFixed(2)}</span>
            </div>
          )}
          {cartDiscountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <span>{t('vetCartDiscount') || 'Cart discount'}</span>
              <span>−${cartDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>{t('vetTotal') || 'Total'}</span>
            <span className="text-violet-700 dark:text-violet-300 text-base">${cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout form */}
        <form onSubmit={submit} className="px-4 py-3 space-y-3">
          {/* Show / hide the payment & options section (Submit always stays visible). */}
          <button type="button" onClick={() => setShowCheckoutDetails(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-violet-400 transition-colors">
            <span className="flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" /> Payment & options</span>
            {showCheckoutDetails
              ? <ChevronUp className="h-4 w-4 text-slate-400" />
              : <span className="flex items-center gap-1 text-[10px] font-normal text-slate-400">Cash · Full · No discount <ChevronDown className="h-4 w-4" /></span>}
          </button>

          {showCheckoutDetails && (
          <>
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
                  className="p-1 rounded-lg text-slate-400 hover:text-violet-600 transition-colors" title={t('vetViewCustomerProfile') || 'View customer profile'}>
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
                      placeholder={t('vetSearchCustomer') || 'Search customer…'}
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
                    title={t('vetAddNewCustomer') || 'Add new customer'}>
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
                {showCustomerDropdown && customerSearch.trim() && (
                  <div className="absolute z-20 left-0 right-8 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                    {customerResults.length === 0 && !customerSearching ? (
                      <div className="px-3 py-3 text-xs text-slate-400 text-center">{t('vetNoCustomersFound') || 'No customers found'}</div>
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

          <div className={variant === 'modal' ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2'}>
            <DateField value={shared.saleDate}
              onChange={v => setShared(s => ({ ...s, saleDate: v }))}
              className={inputCls + ' text-xs'} />
            <input placeholder={t('vetNotesOptional') || 'Notes (optional)'}
              value={shared.notes} onChange={e => setShared(s => ({ ...s, notes: e.target.value }))}
              className={inputCls + ' text-xs'} />
          </div>

          {/* Payment method */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PAYMENT_METHODS.map(pm => (
              <button key={pm} type="button" onClick={() => setShared(s => ({ ...s, paymentMethod: pm }))}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-colors
                  ${shared.paymentMethod === pm
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400'}`}>
                {pm}
              </button>
            ))}
          </div>

          {/* Cart-wide discount */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('vetCartDiscount') || 'Cart discount'}</label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" max={cartItemsTotal} step="any"
                  placeholder="0.00"
                  value={shared.cartDiscount}
                  onChange={e => {
                    const num = parseFloat(e.target.value)
                    if (!isNaN(num) && num > cartItemsTotal) setShared(s => ({ ...s, cartDiscount: cartItemsTotal.toFixed(2) }))
                    else setShared(s => ({ ...s, cartDiscount: e.target.value }))
                  }}
                  className={inputCls + ' pl-6 text-xs'} />
              </div>
              {/* Quick percentage chips */}
              {[5, 10, 15].map(pct => (
                <button key={pct} type="button"
                  onClick={() => setShared(s => ({ ...s, cartDiscount: (cartItemsTotal * pct / 100).toFixed(2) }))}
                  className="px-2 py-1.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400 transition-colors">
                  {pct}%
                </button>
              ))}
              {cartDiscountAmount > 0 && (
                <button type="button" onClick={() => setShared(s => ({ ...s, cartDiscount: '' }))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title={t('vetClearFilter') || 'Clear'}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Amount Paid */}
          <div className="space-y-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number" min="0" max={cartTotal} step="any"
                placeholder={`${t('vetAmountPaid') || 'Amount paid'} (${t('vetTotal') || 'total'}: $${cartTotal.toFixed(2)})`}
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
                <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">{t('vetRemainingBalance') || 'Remaining balance'}</span>
                <span className="text-xs font-black text-amber-700 dark:text-amber-300">${remaining.toFixed(2)}</span>
              </div>
            )}
          </div>
          </>
          )}

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
              : <><ShoppingCart className="h-4 w-4" /> {cart.length === 1 ? (t('vetRecordSale') || 'Record Sale') : `${t('vetSubmit') || 'Submit'} ${cart.length} ${t('vetItemsLabel') || 'Items'}`}</>}
          </button>
        </form>
      </>
    )
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* ── Panel 1: Medicine Catalogue (main left column) ──────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="p-3 space-y-2 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={medSearch} onChange={e => setMedSearch(e.target.value)}
              placeholder={t('vetSearchMedicines') || 'Search medicines…'}
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]" />
            {medSearch && (
              <button onClick={() => setMedSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
          <select value={medCat} onChange={e => setMedCat(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]">
            {categories.map(c => (
              <option key={c} value={c} className="capitalize">
                {c === 'all' ? t('vetFilterAll') || 'All categories' : c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 content-start">
          {loadingMeds ? (
            <div className="col-span-full flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
          ) : catalogList.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-400">
              <Package className="h-7 w-7 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">{t('vetNoMedicinesFound') || 'No medicines found'}</p>
            </div>
          ) : catalogVisible.map(med => {
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
                    {(() => {
                      const s = remainingDisplay(med.totalStock, med.unit, med.subUnit, med.subUnitsPerContainer)
                      return (
                        <>
                          <p className={`text-sm font-bold ${med.isLowStock ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>{s.value}</p>
                          <p className="text-[10px] text-slate-400">{s.unit}</p>
                          {s.secondary && <p className="text-[9px] text-slate-300 dark:text-slate-500 mt-0.5">{s.secondary}</p>}
                        </>
                      )
                    })()}
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
          {catalogHidden > 0 && (
            <p className="col-span-full text-center text-[10px] text-slate-400 py-2">
              {catalogHidden} {t('vetMoreRefine') || 'more — search to narrow down'}
            </p>
          )}
        </div>
      </div>

      {/* ── Item Configurator (modal — opens when a medicine is picked) ── */}
      {selectedMed && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={clearItem} />
      )}
      {selectedMed && (
        <div className="fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2 w-[min(94vw,34rem)] max-h-[88vh] flex flex-col rounded-2xl shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">

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
                    <p className="text-xs text-slate-400 mt-0.5">{(() => {
                    const s = remainingDisplay(selectedMed.totalStock, selectedMed.unit, selectedMed.subUnit, selectedMed.subUnitsPerContainer)
                    return <>{s.value} {s.unit} in stock{s.secondary && <span className="text-slate-300 dark:text-slate-500"> ({s.secondary})</span>}</>
                  })()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={clearItem}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X size={16} />
                  </button>
                </div>
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
                            {(() => {
                              const s = remainingDisplay(selectedBatch.quantity, selectedMed.unit, selectedMed.subUnit, selectedMed.subUnitsPerContainer)
                              return <>{s.value} <span className="text-xs font-normal text-slate-400">{s.unit} remaining</span>{s.secondary && <span className="text-xs font-normal text-slate-300 dark:text-slate-500"> ({s.secondary})</span>}</>
                            })()}
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
        </div>
      )}

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
            <span className="font-bold text-slate-900 dark:text-white text-sm">{t('vetCart') || 'Cart'}</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.5 min-w-[20px] text-center text-[10px] font-black rounded-full bg-violet-600 text-white">{cart.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <>
                <button type="button" onClick={() => setCartModalOpen(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                  title={t('vetExpandCart') || 'Expand cart'}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setShowClearConfirm(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={t('vetClearCart') || 'Clear cart'}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button type="button" onClick={() => setCartVisible(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t('vetHideCart') || 'Hide cart'}>
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cart items (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {renderCartLines('panel')}
        </div>

        {/* Order summary + Checkout (sticky bottom) */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {renderCheckout('panel')}
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

      {/* {showNewOwnerModal && (
        <VetOwnerFormModal
          onSave={(owner) => {
            setSelectedCustomer({ id: owner.id, name: owner.name, phone: owner.phone })
            setCustomerSearch('')
            setShowNewOwnerModal(false)
          }}
          onClose={() => setShowNewOwnerModal(false)}
        />
      )} */}

      {/* ── Expanded Cart Modal ─────────────────────────────────────────────── */}
      {cartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6"
          onClick={() => setCartModalOpen(false)}>
          <div className="w-full max-w-4xl max-h-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <ShoppingCart className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">{t('vetShoppingCart') || 'Shopping Cart'}</h2>
                  <p className="text-xs text-slate-400">{cart.length} {cart.length === 1 ? (t('vetItemLabel') || 'item') : (t('vetItemsLabel') || 'items')} · ${cartTotal.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {cart.length > 0 && (
                  <button type="button" onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> {t('vetClearCart') || 'Clear cart'}
                  </button>
                )}
                <button type="button" onClick={() => setCartModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Body: items + checkout */}
            <div className="flex-1 min-h-0 grid md:grid-cols-2 overflow-hidden">
              <div className="overflow-y-auto p-4 border-r border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{t('vetItems') || 'Items'}</p>
                {renderCartLines('modal')}
              </div>
              <div className="overflow-y-auto bg-slate-50/60 dark:bg-slate-900/40 flex flex-col">
                {renderCheckout('modal')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Cart Confirmation ─────────────────────────────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('vetClearCartTitle') || 'Clear the cart?'}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {(t('vetClearCartBody') || 'This will remove all {n} item(s) from the cart. This cannot be undone.').replace('{n}', String(cart.length))}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">{t('vetMedCancel') || 'Cancel'}</button>
              <button onClick={() => { setCart([]); clearItem(); setShowClearConfirm(false); setCartModalOpen(false) }}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                {t('vetClearCartConfirm') || 'Clear cart'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
