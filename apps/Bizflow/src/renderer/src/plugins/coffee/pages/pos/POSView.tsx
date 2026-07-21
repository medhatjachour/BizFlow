import { useState, useMemo } from 'react'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useToast } from '@renderer/contexts/ToastContext'

import { usePOSData } from './hooks/usePOSData'
import { useCart } from './hooks/useCart'
import { useCheckout } from './hooks/useCheckout'
import { useCustomerSearch } from './hooks/useCustomerSearch'

import { ProductGrid } from './components/ProductGrid'
import { CartSidebar } from './components/CartSidebar'
import { CheckoutModal } from './components/CheckoutModal'
import { NewCustomerModal } from './components/NewCustomerModal'
import { SuccessToast } from './components/SuccessToast'
import { ReceiptPreview } from './components/ReceiptPreview'

import { EMPTY_CHECKOUT } from './constants'
import { getAutoPrintSale } from './utils'
import type { ViewMode, CheckoutForm, PaymentMethod } from './types'

export default function POSView() {
  const { user } = useAuth()
  const toast = useToast()

  // ── Data ──
  const { categories, products, tables, activeShift, loading, loadData } = usePOSData(toast)

  // ── Cart ──
  const {
    cart,
    subtotal,
    itemCount,
    addToCart,
    changeQty,
    removeItem,
    updateSalePrice,
    clearCart,
    validateStock,
  } = useCart(products, toast)

  // ── Checkout ──
  const { checking, checkout: doCheckout, quickCheckout, lastReceipt, reprintLast } = useCheckout()

  // ── Customer ──
  const cust = useCustomerSearch(toast)

  // ── UI state ──
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCat, setSelectedCat] = useState('all')
  const [search, setSearch] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  // ── Checkout form (grouped) ──
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({ ...EMPTY_CHECKOUT })

  const patchCheckout = (patch: Partial<CheckoutForm>) =>
    setCheckoutForm((prev) => ({ ...prev, ...patch }))

  const total = useMemo(
    () => Math.max(0, subtotal - checkoutForm.discount),
    [subtotal, checkoutForm.discount]
  )

  // ── Helpers ──
  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  function resetCheckout() {
    clearCart()
    setCheckoutForm({ ...EMPTY_CHECKOUT })
    cust.clear()
  }

  // ── Actions ──
  function handleAddToCart(product: any) {
    addToCart(product)
    setCartOpen(true)
  }

  async function handleQuickSale(pm: PaymentMethod) {
    if (!cart.length) {
      toast.error('Cart is empty')
      return
    }
    if (!validateStock()) return

    const result = await quickCheckout(
      {
        cart,
        cashierId: user?.id,
        shiftId: activeShift?.id,
        toast,
      },
      pm
    )

    if (result.success) {
      const autoPrint = getAutoPrintSale()
      showSuccess(
        autoPrint
          ? `✓ ${result.orderNumber} — ${pm.replace('_', ' ')} — ${result.total.toFixed(2)}`
          : `✓ ${result.orderNumber} — ${result.total.toFixed(2)} (receipt ready)`
      )
      clearCart()
      loadData()
      // Always show receipt preview
      setTimeout(() => setReceiptOpen(true), 300)
    }
  }

  async function handleCheckout() {
    if (!cart.length) {
      toast.error('Cart is empty')
      return
    }
    if (!validateStock()) return
    if (checkoutForm.orderType === 'delivery' && !checkoutForm.customerName) {
      toast.error('Enter customer name for delivery')
      return
    }
    if (checkoutForm.orderType === 'delivery' && !checkoutForm.customerAddress.trim()) {
      toast.error('Enter delivery address')
      return
    }

    const result = await doCheckout(
      {
        cart,
        checkout: checkoutForm,
        customerId: cust.selected?.id,
        cashierId: user?.id,
        shiftId: activeShift?.id,
        tables,
        toast,
      },
      checkoutForm.paymentMethod
    )

    if (result.success) {
      const autoPrint = getAutoPrintSale()
      const deliveryPart =
        checkoutForm.orderType === 'delivery' && checkoutForm.customerAddress
          ? ` • ${checkoutForm.customerAddress}`
          : ''
      showSuccess(
        autoPrint
          ? `Order ${result.orderNumber} — ${checkoutForm.paymentMethod.replace('_', ' ')} — ${result.total.toFixed(2)}${deliveryPart}`
          : `Order ${result.orderNumber} — ${result.total.toFixed(2)}${deliveryPart} (receipt ready)`
      )
      setCheckoutOpen(false)
      resetCheckout()
      loadData()
      // Always show receipt preview
      setTimeout(() => setReceiptOpen(true), 300)
    }
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* LEFT: Products */}
      <ProductGrid
        viewMode={viewMode}
        setViewMode={setViewMode}
        search={search}
        setSearch={setSearch}
        selectedCat={selectedCat}
        setSelectedCat={setSelectedCat}
        categories={categories}
        products={products}
        cart={cart}
        onAddToCart={handleAddToCart}
        checking={checking}
        loading={loading}
      />

      {/* RIGHT: Cart (desktop always visible, mobile slide-in) */}
      <CartSidebar
        cart={cart}
        itemCount={itemCount}
        subtotal={subtotal}
        discount={checkoutForm.discount}
        total={total}
        viewMode={viewMode}
        checking={checking}
        onClear={() => {
          clearCart()
          patchCheckout({ discount: 0, notes: '' })
        }}
        onClose={() => setCartOpen(false)}
        onChangeQty={changeQty}
        onRemove={removeItem}
        onUpdatePrice={updateSalePrice}
        onQuickSale={handleQuickSale}
        onCheckout={() => setCheckoutOpen(true)}
      />

      {/* Mobile cart FAB */}
      {!cartOpen && cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-20 lg:hidden w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        </button>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        subtotal={subtotal}
        total={total}
        checkout={checkoutForm}
        patchCheckout={patchCheckout}
        tables={tables}
        customerProps={{
          orderType: checkoutForm.orderType,
          search: cust.search,
          results: cust.results,
          showDrop: cust.showDrop,
          selected: cust.selected,
          customerName: checkoutForm.customerName,
          customerPhone: checkoutForm.customerPhone,
          customerAddress: checkoutForm.customerAddress,
          onSearch: cust.doSearch,
          onFocus: () => cust.setShowDrop(true),
          onBlur: () => cust.setShowDrop(false),
          onSelect: (c) => {
            cust.select(c)
            patchCheckout({ customerName: c.name, customerPhone: c.phone ?? '' })
          },
          onClear: () => {
            cust.clear()
            patchCheckout({ customerName: '', customerPhone: '' })
          },
          onNewCustomer: () => cust.setNewCustModal(true),
          onNameChange: (v) => patchCheckout({ customerName: v }),
          onPhoneChange: (v) => patchCheckout({ customerPhone: v }),
          onAddressChange: (v) => patchCheckout({ customerAddress: v }),
        }}
        onConfirm={handleCheckout}
        checking={checking}
      />

      {/* New Customer Modal */}
      <NewCustomerModal
        open={cust.newCustModal}
        onClose={() => cust.setNewCustModal(false)}
        form={cust.newCustForm}
        patchForm={cust.patchNewCustForm}
        onSave={cust.createNew}
        saving={cust.saving}
      />

      {/* Receipt Preview */}
      <ReceiptPreview
        open={receiptOpen}
        data={lastReceipt}
        onClose={() => setReceiptOpen(false)}
        onPrint={() => reprintLast(toast)}
        printing={checking}
      />

      {/* Success Toast */}
      <SuccessToast
        message={successMsg}
        onDismiss={() => setSuccessMsg(null)}
        onViewReceipt={() => setReceiptOpen(true)}
      />
    </div>
  )
}
