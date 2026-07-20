/**
 * Coffee POS
 * Two modes toggled from the header:
 *   GRID MODE  – browse products by category, add to cart, full checkout modal
 *   QUICK SALE – same grid but one-click checkout with the last-used payment method
 *
 * Features:
 *  • Product images loaded from disk via IPC (works in Electron)
 *  • Per-item price override in cart (tap the price to edit)
 *  • Discount at checkout
 *  • dine-in (table optional) / takeaway / delivery order types
 *  • Cash | Card | Vodafone Cash payment
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart, X, Plus, Minus, Coffee, ChevronDown,
 Check, Zap, Edit2,
  User, MapPin, UserPlus, Search
} from 'lucide-react'
import { useAuth }  from '@renderer/contexts/AuthContext'
import { useToast } from '@renderer/contexts/ToastContext'

// ── Types ────────────────────────────────────────────────────────────────────
import type { Category, Product, CartItem, CoffeeTable, CoffeeCustomer, OrderType, PaymentMethod, ReceiptSettings } from './type'
import { ORDER_TYPES, PAYMENT_METHODS, catCls } from './utils'
// ── Product image card — loads image from disk via IPC ────────────────────────
function ProductImg({ image, name }: { image?: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (image) {
      window.api.coffee.products.loadImage(image).then(setSrc).catch(() => setSrc(null))
    } else { setSrc(null) }
  }, [image])
  return src
    ? <img src={src} alt={name} className="w-full h-full object-cover" />
    : <Coffee className="w-8 h-8 text-amber-300" />
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function POSView() {
  const { user }  = useAuth()
  const toast     = useToast()

  const [categories,   setCategories]   = useState<Category[]>([])
  const [products,     setProducts]     = useState<Product[]>([])
  const [tables,       setTables]       = useState<CoffeeTable[]>([])
  const [activeShift,  setActiveShift]  = useState<any>(null)
  const [loading,      setLoading]      = useState(true)

  const [selectedCat,  setSelectedCat]  = useState<string>('all')
  const [search,       setSearch]       = useState('')

  // Cart
  const [cart,          setCart]          = useState<CartItem[]>([])
  const [cartOpen,      setCartOpen]      = useState(false)
  const [editPriceId,   setEditPriceId]   = useState<string | null>(null)
  const [editPriceVal,  setEditPriceVal]  = useState('')

  // Checkout
  const [orderType,       setOrderType]       = useState<OrderType>('dine_in')
  const [selectedTable,   setSelectedTable]   = useState('')
  const [customerName,    setCustomerName]    = useState('')
  const [customerPhone,   setCustomerPhone]   = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [paymentMethod,   setPaymentMethod]   = useState<PaymentMethod>('cash')
  const [discount,        setDiscount]        = useState(0)
  const [notes,           setNotes]           = useState('')
  const [checkoutOpen,    setCheckoutOpen]    = useState(false)
  const [checking,        setChecking]        = useState(false)

  // Customer selector
  const [customerSearch,    setCustomerSearch]    = useState('')
  const [customerResults,   setCustomerResults]   = useState<CoffeeCustomer[]>([])
  const [selectedCustomer,  setSelectedCustomer]  = useState<CoffeeCustomer | null>(null)
  const [showCustomerDrop,  setShowCustomerDrop]  = useState(false)
  const [newCustModal,      setNewCustModal]       = useState(false)
  const [newCustForm,       setNewCustForm]        = useState({ name: '', phone: '', email: '' })
  const [savingCust,        setSavingCust]         = useState(false)
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null)

  const productById = useCallback((productId: string) => products.find(p => p.id === productId), [products])

  const getProductStock = useCallback((productId: string) => {
    const p = productById(productId)
    return typeof p?.stock === 'number' ? p.stock : 0
  }, [productById])

  const validateCartStock = useCallback(() => {
    for (const item of cart) {
      const stock = getProductStock(item.productId)
      if (stock <= 0) {
        toast.error(`${item.productName} is out of stock`)
        return false
      }
      if (item.quantity > stock) {
        toast.error(`${item.productName}: max stock is ${stock}`)
        return false
      }
    }
    return true
  }, [cart, getProductStock, toast])

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, prods, tbls, shift] = await Promise.all([
        window.api.coffee.categories.getAll(),
        window.api.coffee.products.getAll({ available: true }),
        window.api.coffee.tables.getAll(),
        window.api.coffee.shifts.getActive()
      ])
      setCategories(cats ?? [])
      setProducts(prods ?? [])
      setTables((tbls ?? []).filter((t: CoffeeTable) => t.status === 'available'))
      setActiveShift(shift)
    } catch { toast.error('Failed to load POS data') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { loadData() }, [loadData])

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function addToCart(product: Product) {
    if (product.stock <= 0) {
      toast.error(`${product.name} is out of stock`)
      return
    }

    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id)
      if (idx >= 0) {
        const nextQty = prev[idx].quantity + 1
        if (nextQty > product.stock) {
          toast.error(`${product.name}: max stock is ${product.stock}`)
          return prev
        }
        const next = [...prev]; next[idx] = { ...next[idx], quantity: nextQty }; return next
      }
      return [...prev, { productId: product.id, productName: product.name, unitPrice: product.price, salePrice: product.price, quantity: 1 }]
    })
    setCartOpen(true)
  }

  function changeQty(productId: string, delta: number) {
    setCart(prev => {
      const current = prev.find(i => i.productId === productId)
      if (!current) return prev

      const nextQty = current.quantity + delta
      const stock = getProductStock(productId)
      if (nextQty > stock) {
        toast.error(`${current.productName}: max stock is ${stock}`)
        return prev
      }

      return prev
        .map(i => i.productId === productId ? { ...i, quantity: nextQty } : i)
        .filter(i => i.quantity > 0)
    })
  }

  function removeItem(productId: string) { setCart(prev => prev.filter(i => i.productId !== productId)) }
  function clearCart() { setCart([]); setCartOpen(false); setDiscount(0); setNotes(''); setSelectedCustomer(null); setCustomerSearch(''); setCustomerAddress('') }

  // Inline price edit
  function startPriceEdit(item: CartItem) { setEditPriceId(item.productId); setEditPriceVal(String(item.salePrice)) }
  function commitPriceEdit(productId: string) {
    const v = parseFloat(editPriceVal)
    if (!isNaN(v) && v >= 0) setCart(prev => prev.map(i => i.productId === productId ? { ...i, salePrice: v } : i))
    setEditPriceId(null)
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.salePrice * i.quantity, 0)
  const total    = Math.max(0, subtotal - discount)

  // ── Filtered products ─────────────────────────────────────────────────────
  const visible = products.filter(p => {
    if (p.stock <= 0) return false
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const paymentLabel = (pm: PaymentMethod) =>
    pm === 'cash' ? 'Cash' : pm === 'card' ? 'Card' : 'Vodafone Cash'

  const readReceiptSettings = (): ReceiptSettings => ({
    storeName: localStorage.getItem('storeName') || 'BizFlow Coffee',
    storeAddress: localStorage.getItem('storeAddress') || '',
    storePhone: localStorage.getItem('storePhone') || '',
    storeEmail: localStorage.getItem('storeEmail') || '',
    taxNumber: localStorage.getItem('taxNumber') || '',
    commercialRegister: localStorage.getItem('commercialRegister') || '',
    printerType: (localStorage.getItem('printerType') as ReceiptSettings['printerType']) || 'html',
    printerName: localStorage.getItem('printerName') || '',
    printerIP: localStorage.getItem('printerIP') || '',
    paperWidth: (localStorage.getItem('paperWidth') as ReceiptSettings['paperWidth']) || '80mm',
    receiptBottomSpacing: parseInt(localStorage.getItem('receiptBottomSpacing') || '4', 10),
    printLogo: localStorage.getItem('printLogo') === 'true',
    printQRCode: localStorage.getItem('printQRCode') === 'true',
    printBarcode: localStorage.getItem('printBarcode') === 'true',
    receiptLanguage: (localStorage.getItem('receiptLanguage') as ReceiptSettings['receiptLanguage']) || 'en',
    openCashDrawer: localStorage.getItem('openCashDrawer') === 'true'
  })

  async function printThermalReceipt(orderMeta: {
    orderNumber: string
    paymentMethod: PaymentMethod
    type: OrderType
    tableLabel?: string
    openedAt?: Date
    closedAt?: Date
  }) {
    try {
      const settings = readReceiptSettings()
      const taxRate = parseFloat(localStorage.getItem('taxRate') || '0')

      const receiptData = {
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        storeEmail: settings.storeEmail,
        taxNumber: settings.taxNumber,
        commercialRegister: settings.commercialRegister,
        receiptNumber: orderMeta.orderNumber,
        date: orderMeta.closedAt || new Date(),
        paymentMethod: paymentLabel(orderMeta.paymentMethod),
        username: user?.username || 'Cashier',
        customerName: customerName || (orderMeta.type === 'takeaway' ? 'Walk-in Customer' : undefined),
        customerPhone: customerPhone || undefined,
        deliveryAddress: orderMeta.type === 'delivery' ? (customerAddress || undefined) : undefined,
        orderType: orderMeta.type,
        tableName: orderMeta.tableLabel,
        openedAt: orderMeta.openedAt,
        closedAt: orderMeta.closedAt,
        notes: notes || undefined,
        items: cart.map(i => ({
          name: i.productName,
          quantity: i.quantity,
          price: i.salePrice,
          total: i.salePrice * i.quantity
        })),
        subtotal,
        tax: 0,
        taxRate,
        total
      }

      const shouldForceThermal = settings.printerType === 'none' || settings.printerType === 'html'
      const effectiveSettings = shouldForceThermal
        ? { ...settings, printerType: 'usb' as const, receiptLanguage: settings.receiptLanguage || 'en' }
        : { ...settings, receiptLanguage: settings.receiptLanguage || 'en' }

      const result = await window.api.thermalReceipts.print({ receiptData, settings: effectiveSettings })
      if (result.success) {
        if (result.detectedPrinter) {
          localStorage.setItem('printerName', result.detectedPrinter)
          localStorage.setItem('printerType', 'usb')
        }
      } else {
        toast.error(result.error || 'Receipt print failed')
      }
    } catch {
      toast.error('Receipt print failed')
    }
  }

  // ── Customer search ───────────────────────────────────────────────────────
  async function searchCustomers(q: string) {
    setCustomerSearch(q); setShowCustomerDrop(true)
    if (!q.trim()) { setCustomerResults([]); return }
    try { setCustomerResults(await window.api.coffee.customers.search(q) ?? []) }
    catch { setCustomerResults([]) }
  }

  function selectCustomer(c: CoffeeCustomer) {
    setSelectedCustomer(c); setCustomerName(c.name); setCustomerPhone(c.phone ?? '')
    setCustomerSearch(''); setShowCustomerDrop(false); setCustomerResults([])
  }

  async function saveNewCustomer() {
    if (!newCustForm.name.trim()) { return }
    setSavingCust(true)
    try {
      const c = await window.api.coffee.customers.create({ name: newCustForm.name.trim(), phone: newCustForm.phone || undefined, email: newCustForm.email || undefined })
      selectCustomer(c); setNewCustModal(false); setNewCustForm({ name: '', phone: '', email: '' })
    } catch { } finally { setSavingCust(false) }
  }

  // ── Checkout (shared) ─────────────────────────────────────────────────────
  async function doCheckout(pm: PaymentMethod = paymentMethod) {
    if (!cart.length) { toast.error('Cart is empty'); return }
    if (!validateCartStock()) return
    if (orderType === 'delivery' && !customerName) { toast.error('Enter customer name for delivery'); return }
    if (orderType === 'delivery' && !customerAddress.trim()) { toast.error('Enter delivery address'); return }
    setChecking(true)
    try {
      const order = await window.api.coffee.orders.create({
        type:            orderType,
        tableId:         orderType === 'dine_in' && selectedTable ? selectedTable : undefined,
        customerName:    customerName || undefined,
        customerPhone:   customerPhone || undefined,
        deliveryAddress: orderType === 'delivery' ? (customerAddress || undefined) : undefined,
        customerId:      selectedCustomer?.id ?? undefined,
        cashierId:       user?.id,
        shiftId:         activeShift?.id ?? undefined,
        notes:           notes || undefined,
        items: cart.map(i => ({ productId: i.productId, productName: i.productName, unitPrice: i.salePrice, quantity: i.quantity, notes: i.notes }))
      })
      const closed = await window.api.coffee.orders.close({ orderId: order.id, paymentMethod: pm, discount, cashierId: user?.id, shiftId: activeShift?.id ?? undefined })
      const tableLabel = orderType === 'dine_in' && selectedTable
        ? (() => {
            const t = tables.find(x => x.id === selectedTable)
            if (!t) return undefined
            return `Table ${t.number}${t.name ? ` (${t.name})` : ''}`
          })()
        : undefined

      await printThermalReceipt({
        orderNumber: order.orderNumber,
        paymentMethod: pm,
        type: orderType,
        tableLabel,
        openedAt: order.openedAt ? new Date(order.openedAt) : undefined,
        closedAt: closed?.closedAt ? new Date(closed.closedAt) : new Date()
      })

      const deliveryPart = orderType === 'delivery' && customerAddress ? ` • ${customerAddress}` : ''
      setSuccessMsg(`Order ${order.orderNumber} — ${pm.replace('_', ' ')} — ${total.toFixed(2)}${deliveryPart}`)
      setCheckoutOpen(false)
      clearCart(); setSelectedTable(''); setCustomerName(''); setCustomerPhone(''); setNotes(''); setDiscount(0)
      loadData()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) { toast.error(err?.message ?? 'Checkout failed') }
    finally { setChecking(false) }
  }

  // Quick Sale: immediate cash/card/vodafone checkout, no modal
  async function quickSale(pm: PaymentMethod) {
    if (!cart.length) { toast.error('Cart is empty'); return }
    if (!validateCartStock()) return
    setChecking(true)
    try {
      const order = await window.api.coffee.orders.create({
        type: 'takeaway', cashierId: user?.id, shiftId: activeShift?.id ?? undefined,
        items: cart.map(i => ({ productId: i.productId, productName: i.productName, unitPrice: i.salePrice, quantity: i.quantity }))
      })
      const closed = await window.api.coffee.orders.close({ orderId: order.id, paymentMethod: pm, discount: 0, cashierId: user?.id, shiftId: activeShift?.id ?? undefined })

      await printThermalReceipt({
        orderNumber: order.orderNumber,
        paymentMethod: pm,
        type: 'takeaway',
        openedAt: order.openedAt ? new Date(order.openedAt) : undefined,
        closedAt: closed?.closedAt ? new Date(closed.closedAt) : new Date()
      })

      setSuccessMsg(`✓ ${order.orderNumber} — ${pm.replace('_', ' ')} — ${total.toFixed(2)}`)
      clearCart(); loadData()
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err: any) { toast.error(err?.message ?? 'Quick sale failed') }
    finally { setChecking(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex h-full min-h-0">

      {/* ── LEFT: Product grid ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Header bar: view mode toggle + search */}
        <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-wrap">
        

          

          <div className="flex-1 min-w-36">
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
        </div>

        <div className="px-4 py-3 flex-1">
          {/* Category chips */}
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            <button onClick={() => setSelectedCat('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${selectedCat === 'all' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
              All
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${selectedCat === c.id ? 'bg-amber-500 text-white' : catCls(c.color)}`}>
                {c.icon && <span>{c.icon}</span>}{c.name}
              </button>
            ))}
          </div>

          {/* Products */}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Coffee className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No products</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visible.map(product => {
                const inCart = cart.find(i => i.productId === product.id)
                return (
                  <button key={product.id} onClick={() => addToCart(product)}
                    className={`bg-white dark:bg-slate-800 rounded-xl border-2 p-2.5 text-left hover:border-amber-400 hover:shadow-md transition-all active:scale-95 relative ${inCart ? 'border-amber-400 dark:border-amber-600' : 'border-slate-200 dark:border-slate-700'}`}>
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">
                        {inCart.quantity}
                      </span>
                    )}
                    <div className="rounded-lg bg-amber-50 dark:bg-slate-700 mb-2 flex items-center justify-center overflow-hidden aspect-square">
                      <ProductImg image={product.image} name={product.name} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-0.5">{product.name}</p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{product.price.toFixed(2)} {' '}$ </p>
                    { product.stock > 0 && <p className="text-[9px] text-orange-500">stock ({product.stock})</p>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart sidebar ─────────────────────────────────────────── */}
      <div className={`
        fixed lg:static inset-y-0 right-0 z-30 flex flex-col
        w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700
        transition-transform duration-300
        ${cartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-slate-900 dark:text-white text-sm">Cart</span>
            {cart.length > 0 && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
          </div>
          <div className="flex gap-2 items-center">
            {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear</button>}
            <button onClick={() => setCartOpen(false)} className="lg:hidden text-slate-400"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Cart empty</p>
            <p className="text-xs mt-1">Tap a product to add</p>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {cart.map(item => (
                <div key={item.productId} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{item.productName}</p>
                      {/* Price — click to edit */}
                      {editPriceId === item.productId ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input autoFocus type="number" min={0} step={0.01} value={editPriceVal}
                            onChange={e => setEditPriceVal(e.target.value)}
                            onBlur={() => commitPriceEdit(item.productId)}
                            onKeyDown={e => e.key === 'Enter' && commitPriceEdit(item.productId)}
                            className="w-20 px-1.5 py-0.5 text-xs border border-amber-400 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none" />
                          <span className="text-[10px] text-slate-400">× {item.quantity}</span>
                        </div>
                      ) : (
                        <button onClick={() => startPriceEdit(item)} className="flex items-center gap-1 mt-0.5 group">
                          <span className="text-xs text-slate-500">{item.salePrice.toFixed(2)}</span>
                          {item.salePrice !== item.unitPrice && <span className="text-[10px] line-through text-slate-400">{item.unitPrice.toFixed(2)}</span>}
                          <span className="text-[10px] text-slate-400">× {item.quantity}</span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-amber-500 ml-0.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white shrink-0">{(item.salePrice * item.quantity).toFixed(2)}</p>
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={() => changeQty(item.productId, -1)} className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-amber-100">
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold leading-5">{item.quantity}</span>
                      <button onClick={() => changeQty(item.productId, +1)} className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-amber-100">
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => removeItem(item.productId)} className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals + actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3 shrink-0">
              {discount > 0 && <>
                <div className="flex justify-between text-xs text-slate-500"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-green-600"><span>Discount</span><span>−{discount.toFixed(2)}</span></div>
              </>}
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>Total</span>
                <span className="text-amber-600 dark:text-amber-400 text-lg">{total.toFixed(2)}</span>
              </div>

              
                <div className="space-y-2">
                  {/* Quick cash checkout (walk-in, no form) */}
                  <button onClick={() => quickSale('cash')} disabled={checking}
                    className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" /> Quick Cash
                  </button>
                  {/* Full checkout with options */}
                  <button onClick={() => setCheckoutOpen(true)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors">
                    Checkout →
                  </button>
                </div>
              
            </div>
          </>
        )}
      </div>

      {/* Mobile cart toggle */}
      {!cartOpen && cart.length > 0 && (
        <button onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-20 lg:hidden w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg flex items-center justify-center">
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {cart.reduce((s, i) => s + i.quantity, 0)}
          </span>
        </button>
      )}

      {/* ── Full Checkout Modal (grid mode) ─────────────────────────────── */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCheckoutOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Checkout</h2>
              <button onClick={() => setCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Order type */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Order Type</label>
              <div className="grid grid-cols-3 gap-2">
                {ORDER_TYPES.map(({ value, label, icon: Icon }) => (
                  <button key={value} onClick={() => setOrderType(value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-colors ${orderType === value ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-amber-300'}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table (optional, dine-in) */}
            {orderType === 'dine_in' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Table <span className="text-slate-400">(optional)</span></label>
                <div className="relative">
                  <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none appearance-none">
                    <option value="">— Walk-in / No table —</option>
                    {tables.map(t => <option key={t.id} value={t.id}>Table {t.number}{t.name ? ` (${t.name})` : ''}{t.section ? ` · ${t.section}` : ''}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Customer (takeaway/delivery) */}
            {(orderType === 'takeaway' || orderType === 'delivery') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Find Customer</label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={e => searchCustomers(e.target.value)}
                        onFocus={() => setShowCustomerDrop(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDrop(false), 150)}
                        placeholder="Search by name, phone..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                      {showCustomerDrop && customerResults.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                          {customerResults.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={() => selectCustomer(c)}
                              className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                              <p className="text-xs text-slate-500">{c.phone || c.email || 'No contact info'}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewCustModal(true)}
                      className="px-3 py-2 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                  {selectedCustomer && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-medium">
                      <User className="w-3 h-3" />
                      {selectedCustomer.name}
                      <button
                        type="button"
                        onClick={() => { setSelectedCustomer(null); setCustomerName(''); setCustomerPhone('') }}
                        className="text-amber-600 hover:text-amber-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Name"
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="01x..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                {orderType === 'delivery' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Delivery Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        placeholder="Street, area, landmark..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment method */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <button key={value} onClick={() => setPaymentMethod(value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-colors ${paymentMethod === value ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-amber-300'}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Order items with price review */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Items</label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 max-h-36 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-slate-700 dark:text-slate-300">{item.quantity}× {item.productName}</span>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800 dark:text-white">{(item.salePrice * item.quantity).toFixed(2)}</span>
                      {item.salePrice !== item.unitPrice && <p className="text-[10px] text-amber-600">@ {item.salePrice.toFixed(2)} <span className="line-through text-slate-400">{item.unitPrice.toFixed(2)}</span></p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount + notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Discount</label>
                <input type="number" min={0} max={subtotal} value={discount} onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-1">
              {discount > 0 && <>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-green-600"><span>Discount</span><span>−{discount.toFixed(2)}</span></div>
              </>}
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>Total</span>
                <span className="text-amber-600 dark:text-amber-400 text-base">{total.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={() => doCheckout()} disabled={checking}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {checking ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Confirm & Pay</>}
            </button>
          </div>
        </div>
      )}

      {/* ── New Customer Modal ───────────────────────────────────────────── */}
      {newCustModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNewCustModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Customer</h3>
              <button onClick={() => setNewCustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
              <input
                type="text"
                value={newCustForm.name}
                onChange={e => setNewCustForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
              <input
                type="tel"
                value={newCustForm.phone}
                onChange={e => setNewCustForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={newCustForm.email}
                onChange={e => setNewCustForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNewCustModal(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNewCustomer}
                disabled={savingCust || !newCustForm.name.trim()}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
              >
                {savingCust ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success toast ────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 cursor-pointer" onClick={() => setSuccessMsg(null)}>
          <Check className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm">{successMsg}</p>
            <p className="text-xs opacity-80">Tap to dismiss</p>
          </div>
        </div>
      )}
    </div>
  )
}
