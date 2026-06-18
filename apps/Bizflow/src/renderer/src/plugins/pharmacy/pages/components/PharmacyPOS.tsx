import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, Loader2, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, AlertTriangle, UserPlus, X, User
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pharma, money, inputCls } from './_shared'
import { Button } from './ui'

interface CartLine {
  productId: string; name: string; unit: string
  subUnit?: string | null; ratio?: number | null; subUnitPrice?: number | null; baseSellingPrice: number
  saleUnit: 'base' | 'sub'; unitPrice: number; quantity: number; stockBase: number
}

export default function PharmacyPOS() {
  const toast = useToast()
  const { t } = useLanguage()
  const { can } = useAuth()
  const canDiscount = can('give_discount')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const focusSearch = () => requestAnimationFrame(() => searchRef.current?.focus())

  // Customer picker
  const [customer, setCustomer] = useState<{ id: string; name: string; defaultDiscount?: number } | null>(null)
  const [custSearch, setCustSearch] = useState('')
  const [custResults, setCustResults] = useState<any[]>([])
  const [custOpen, setCustOpen] = useState(false)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await pharma()?.products.getAll({ status: 'active', search: q, take: 60, sortBy: 'name' })
      setProducts(r?.data ?? [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { load('') }, [load])
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => load(search), 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [search, load])

  useEffect(() => {
    if (!custOpen) return
    const id = setTimeout(() => { pharma()?.customers.searchLite(custSearch).then(setCustResults).catch(() => {}) }, 200)
    return () => clearTimeout(id)
  }, [custSearch, custOpen])

  function unitPriceFor(p: any, saleUnit: 'base' | 'sub'): number {
    if (saleUnit === 'sub') return p.subUnitPrice ?? (p.subUnitsPerContainer ? (p.sellingPrice ?? 0) / p.subUnitsPerContainer : 0)
    return p.sellingPrice ?? 0
  }
  function stockInUnit(l: CartLine): number {
    return l.saleUnit === 'sub' && l.ratio ? Math.floor(l.stockBase * l.ratio) : l.stockBase
  }

  function addToCart(p: any) {
    if (p.totalStock <= 0) { toast.error(`${p.name} ${t('phIsOutOfStock') || 'is out of stock'}`); return }
    setCart(prev => {
      const ex = prev.find(l => l.productId === p.id && l.saleUnit === 'base')
      if (ex) {
        if (ex.quantity + 1 > stockInUnit(ex)) { toast.error(t('phNotEnoughStock') || 'Not enough stock'); return prev }
        return prev.map(l => l === ex ? { ...l, quantity: l.quantity + 1 } : l)
      }
      return [...prev, {
        productId: p.id, name: p.name, unit: p.unit,
        subUnit: p.subUnit, ratio: p.subUnitsPerContainer, subUnitPrice: p.subUnitPrice, baseSellingPrice: p.sellingPrice ?? 0,
        saleUnit: 'base', unitPrice: p.sellingPrice ?? 0, quantity: 1, stockBase: p.totalStock,
      }]
    })
  }
  function setQty(i: number, qty: number) {
    setCart(prev => prev.map((l, idx) => idx === i ? { ...l, quantity: Math.max(1, Math.min(qty, stockInUnit(l))) } : l))
  }
  function setPrice(i: number, price: number) { setCart(prev => prev.map((l, idx) => idx === i ? { ...l, unitPrice: Math.max(0, price) } : l)) }
  function toggleUnit(i: number) {
    setCart(prev => prev.map((l, idx) => {
      if (idx !== i || !l.ratio) return l
      const next: 'base' | 'sub' = l.saleUnit === 'base' ? 'sub' : 'base'
      const unitPrice = unitPriceFor({ sellingPrice: l.baseSellingPrice, subUnitPrice: l.subUnitPrice, subUnitsPerContainer: l.ratio }, next)
      const newLine = { ...l, saleUnit: next, unitPrice }
      return { ...newLine, quantity: Math.max(1, Math.min(l.quantity, stockInUnit(newLine))) }
    }))
  }
  function remove(i: number) { setCart(prev => prev.filter((_, idx) => idx !== i)) }

  // Barcode-first: scanner types the code then sends Enter. Prefer an exact
  // barcode match; if the scan outpaced the debounce, look it up directly.
  // Never fall back to an arbitrary product for a scan.
  async function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const code = search.trim()
    if (!code) return
    let target = products.find(p => p.barcode && p.barcode === code)
    if (!target) {
      try {
        const r = await pharma()?.products.getAll({ status: 'active', search: code, take: 5 })
        const list: any[] = r?.data ?? []
        target = list.find(p => p.barcode === code) ?? (list.length === 1 ? list[0] : undefined)
      } catch { /* ignore */ }
    }
    if (target) { addToCart(target); setSearch(''); focusSearch() }
    else toast.error(t('phNoProducts') || 'No matching product')
  }

  function pickCustomer(c: any) {
    setCustomer({ id: c.id, name: c.name, defaultDiscount: c.defaultDiscount })
    setCustOpen(false); setCustSearch('')
    if (c.defaultDiscount > 0) {
      const sub = cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
      setDiscount(((sub * c.defaultDiscount) / 100).toFixed(2))
    }
  }

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const disc = Math.min(Math.max(0, parseFloat(discount) || 0), subtotal)
  const total = Math.round((subtotal - disc) * 100) / 100
  const paid = amountPaid === '' ? total : Math.max(0, parseFloat(amountPaid) || 0)

  async function checkout() {
    if (cart.length === 0) return
    setBusy(true)
    try {
      const sale = await pharma()?.sales.create({
        items: cart.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, saleUnit: l.saleUnit })),
        discount: disc,
        amountPaid: amountPaid === '' ? undefined : paid,
        paymentMethod,
        customerId: customer?.id,
      })
      toast.success(`${t('phSaleComplete') || 'Sale completed'} #${sale?.saleNumber ?? ''}`)
      setLastSale(sale)
      setCart([]); setDiscount(''); setAmountPaid(''); setCustomer(null)
      setCartOpen(false)
      load(search)
      focusSearch() // ready for the next scan
    } catch (e: any) { toast.error(e?.message ?? 'Checkout failed') } finally { setBusy(false) }
  }

  // Cart content — reused both inline (large screens) and in the drawer (small).
  const cartBody = (
    <>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-500" /> {t('phCart') || 'Cart'}{cart.length > 0 && <span className="text-xs font-normal text-slate-400">({cart.length})</span>}</h3>
        <div className="flex items-center gap-2">
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-slate-400 hover:text-red-500">{t('phClear') || 'Clear'}</button>}
          <button onClick={() => setCartOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
      </div>

      {/* Customer picker */}
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 relative">
        {customer ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xs font-bold"><User size={13} /></div>
            <span className="font-medium text-slate-700 dark:text-slate-200">{customer.name}</span>
            {(customer.defaultDiscount ?? 0) > 0 && <span className="text-[10px] text-violet-500">{customer.defaultDiscount}% {t('phDiscount') || 'discount'}</span>}
            <button onClick={() => setCustomer(null)} className="ml-auto text-slate-400 hover:text-red-500"><X size={14} /></button>
          </div>
        ) : (
          <div className="relative">
            <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input value={custSearch} onFocus={() => setCustOpen(true)} onChange={e => { setCustSearch(e.target.value); setCustOpen(true) }}
              placeholder={t('phLinkCustomer') || 'Walk-in — link a customer (optional)'} className={inputCls + ' pl-8 py-1.5 text-xs'} />
            {custOpen && custResults.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {custResults.map(c => (
                  <button key={c.id} onClick={() => pickCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200">{c.name}</span>
                    <span className="text-[11px] text-slate-400">{c.phone || ''}{c.defaultDiscount > 0 ? ` · ${c.defaultDiscount}%` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 flex-1">
          {lastSale ? (
            <><CheckCircle2 size={36} className="mb-2 text-emerald-400" /><p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('phSaleComplete') || 'Sale completed'} #{lastSale.saleNumber}</p><p className="text-xs mt-1">${money(lastSale.total)} · {lastSale.items?.length} {t('phItems') || 'items'}</p><p className="text-xs mt-3 text-slate-400">{t('phAddToStartNew') || 'Add a product to start a new sale'}</p></>
          ) : (
            <><ShoppingCart size={36} className="mb-2 opacity-30" /><p className="text-sm">{t('phCartEmpty') || 'Cart is empty'}</p><p className="text-xs mt-1">{t('phTapProduct') || 'Tap a product to add it'}</p></>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
            {cart.map((l, i) => (
              <div key={i} className="px-4 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{l.name}</span>
                    {l.ratio ? (
                      <button onClick={() => toggleUnit(i)} className="mt-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-md hover:bg-violet-100">
                        {t('phSellBy') || 'by'}: {l.saleUnit === 'sub' ? (l.subUnit || 'sub') : l.unit} · {t('phTapToSwitch') || 'tap to switch'}
                      </button>
                    ) : null}
                  </div>
                  <button onClick={() => remove(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(i, l.quantity - 1)} className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200"><Minus size={12} /></button>
                    <input value={l.quantity} onChange={e => setQty(i, parseInt(e.target.value) || 1)} className="w-12 text-center text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-0.5" />
                    <button onClick={() => setQty(i, l.quantity + 1)} className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200"><Plus size={12} /></button>
                    <span className="text-[10px] text-slate-400">{l.saleUnit === 'sub' ? (l.subUnit || 'sub') : l.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">×<span className="relative"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400">$</span><input value={l.unitPrice} onChange={e => setPrice(i, parseFloat(e.target.value) || 0)} className="w-16 pl-4 pr-1 text-right text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-0.5" /></span></div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 w-16 text-right">${money(l.quantity * l.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">{t('phSubtotal') || 'Subtotal'}</span><span className="font-medium text-slate-700 dark:text-slate-200">${money(subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">{t('phDiscount') || 'Discount'}</span><span className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input value={discount} onChange={e => setDiscount(e.target.value)} disabled={!canDiscount} title={!canDiscount ? 'You do not have permission to give discounts' : undefined} placeholder="0.00" type="number" min="0" className="w-24 pl-5 pr-2 py-1 text-sm text-right border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" /></span></div>
            <div className="flex items-center justify-between text-base font-bold pt-1 border-t border-slate-100 dark:border-slate-700"><span className="text-slate-800 dark:text-white">{t('phTotal') || 'Total'}</span><span className="text-emerald-600 dark:text-emerald-400">${money(total)}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputCls + ' py-1.5 text-xs'}><option value="cash">{t('phCash') || 'Cash'}</option><option value="card">{t('phCard') || 'Card'}</option><option value="other">{t('phOther') || 'Other'}</option></select>
              <span className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={`${t('phPaid') || 'Paid'} ${money(total)}`} type="number" min="0" className="w-full pl-5 pr-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" /></span>
            </div>
            {paid < total - 0.005 && <p className="text-[11px] text-amber-600 dark:text-amber-400">{t('phOutstandingAfter') || 'Outstanding after payment'}: ${money(total - paid)}{!customer ? ` · ${t('phLinkCustomerForCredit') || 'link a customer to track credit'}` : ''}</p>}
            <Button block size="lg" loading={busy} icon={CheckCircle2} onClick={checkout}>{t('phCompleteSale') || 'Complete Sale'} · ${money(total)}</Button>
          </div>
        </>
      )}
    </>
  )

  return (
    <>
    <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Product picker */}
      <div className="lg:col-span-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={onSearchKey} autoFocus
            placeholder={t('phSearchProduct') || 'Search product, generic name or barcode…'} className={inputCls + ' pl-9'} />
        </div>
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
          : products.length === 0 ? <p className="text-sm text-slate-400 text-center py-12">{t('phNoProducts') || 'No products found'}</p>
          : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 max-h-[60vh] overflow-y-auto">
              {products.map(p => {
                const out = p.totalStock <= 0
                return (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={out}
                    className={`text-left rounded-xl border p-3 transition-colors ${out ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'}`}>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{p.name}</span>
                      {p.hasExpired && <AlertTriangle size={12} className="text-red-500 shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-[11px] text-slate-400 capitalize mt-0.5">{p.category}{p.subUnit ? ` · ${p.subUnit}` : ''}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${money(p.sellingPrice)}</span>
                      <span className={`text-[10px] font-medium ${out ? 'text-red-500' : p.isLowStock ? 'text-amber-500' : 'text-slate-400'}`}>{out ? (t('phOut') || 'OUT') : `${p.totalStock} ${p.unit}`}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart — docked on large screens */}
      <div className="hidden lg:block lg:col-span-2">
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col max-h-[80vh]">
          {cartBody}
        </div>
      </div>
    </div>

    {/* Floating cart button (small screens) */}
    <button onClick={() => setCartOpen(true)}
      className="lg:hidden fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-transform">
      <ShoppingCart size={18} />
      <span className="font-semibold text-sm">{cart.length > 0 ? `${cart.length} · $${money(total)}` : (t('phCart') || 'Cart')}</span>
    </button>

    {/* Cart drawer (small screens) */}
    {cartOpen && (
      <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setCartOpen(false)}>
        <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
          {cartBody}
        </div>
      </div>
    )}
    </>
  )
}
