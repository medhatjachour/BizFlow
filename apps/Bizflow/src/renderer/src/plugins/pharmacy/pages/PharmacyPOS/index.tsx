import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, AlertTriangle,  Layers } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { money, inputCls } from '../components/_shared'

import { useThermalReceipt } from './hooks/useThermalReceipt'
import { PosCart } from './components/PosCart'
import { PosReceiptModal } from './components/PosReceiptModal'
import { usePosProducts } from './hooks/usePOSProducts'
import { usePosCart } from './hooks/usePOSCart'

export default function PharmacyPOS() {
  const toast = useToast()
  const { t } = useLanguage()
  const { can } = useAuth()
  const canDiscount = can('give_discount')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [autoThermalPrint, setAutoThermalPrint] = useState(true)

  // Products & Search Hook
  const {
    search,
    setSearch,
    products,
    loading: productsLoading,
    refreshProducts,
    findProductByBarcode,
  } = usePosProducts()

  // Cart Hook
  const {
    cart,
    customer,
    discount,
    paymentMethod,
    amountPaid,
    subtotal,
    parsedDiscount,
    total,
    changeDue,
    busy,
    heldSales,
    addToCart,
    setQuantity,
    setUnitPrice,
    toggleSaleUnit,
    removeLine,
    clearCart,
    parkCurrentSale,
    resumeHeldSale,
    executeCheckout,
    setCustomer,
    setDiscount,
    setPaymentMethod,
    setAmountPaid,
  } = usePosCart(toast, t)

  // Thermal Printing Hook
  const { activeReceipt, setActiveReceipt, printReceipt } = useThermalReceipt()

  // Auto-focus helper
  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [])

  // Barcode Scanning / Enter key listener
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const query = search.trim()
    if (!query) return

    const product = await findProductByBarcode(query)
    if (product) {
      addToCart(product)
      setSearch('')
      focusSearch()
    } else {
      toast.error(t('phNoProducts') || 'No matching product found for scan')
    }
  }

  // Global POS Hotkeys (F1, F2, F4, Esc)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        focusSearch()
      } else if (e.key === 'F2') {
        e.preventDefault()
        setPaymentMethod('cash')
      } else if (e.key === 'F4') {
        e.preventDefault()
        parkCurrentSale()
      }
    }
    window.addEventListener('keydown', handleGlobalKeys)
    return () => window.removeEventListener('keydown', handleGlobalKeys)
  }, [focusSearch, parkCurrentSale, setPaymentMethod])

  const handleCheckoutProcess = async () => {
    const saleResult = await executeCheckout(autoThermalPrint)
    if (saleResult) {
      if (autoThermalPrint) {
        printReceipt(saleResult)
      } else {
        setActiveReceipt(saleResult)
      }
      refreshProducts()
      focusSearch()
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] p-4 flex flex-col lg:flex-row gap-4 overflow-hidden">
      {/* LEFT: Fast Product Grid & Barcode Search */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Barcode & Search Input Toolbar */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus
            placeholder="Scan barcode (Enter) or search medicine name / generic..."
            className={`${inputCls} pl-10 pr-24 py-2.5 text-sm font-medium shadow-xs`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-400">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold">F1</kbd> Search
          </div>
        </div>

        {/* Product Cards Container */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 overflow-y-auto shadow-xs">
          {productsLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
              <p className="text-xs">Loading pharmacy catalog...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <p className="text-sm font-medium">{t('phNoProducts') || 'No products found'}</p>
              <p className="text-xs mt-1">Try another search keyword or scan barcode</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
              {products.map(p => {
                const isOutOfStock = p.totalStock <= 0
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    className={`group relative text-left rounded-xl p-2.5 border transition-all flex flex-col justify-between select-none ${
                      isOutOfStock
                        ? 'opacity-40 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
                          {p.name}
                        </span>
                        {p.hasExpired && (
                          <AlertTriangle size={12} className="text-red-500 shrink-0 mt-0.5" />
                        )}
                      </div>

                      {p.genericName && (
                        <p className="text-[10px] text-slate-400 italic truncate mt-0.5">
                          {p.genericName}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                          {p.category || 'General'}
                        </span>
                        {p.subUnit && (
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1 rounded flex items-center gap-0.5">
                            <Layers size={8} /> {p.subUnit}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        ${money(p.sellingPrice)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isOutOfStock
                            ? 'text-red-500'
                            : p.isLowStock
                            ? 'text-amber-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {isOutOfStock ? 'OUT' : `${p.totalStock} ${p.unit}`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: High-Density Sticky Cart Panel */}
      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 h-full flex flex-col">
        <PosCart
          cart={cart}
          customer={customer}
          discount={discount}
          paymentMethod={paymentMethod}
          amountPaid={amountPaid}
          subtotal={subtotal}
          parsedDiscount={parsedDiscount}
          total={total}
          changeDue={changeDue}
          busy={busy}
          heldSales={heldSales}
          canDiscount={canDiscount}
          autoThermalPrint={autoThermalPrint}
          onToggleThermalPrint={setAutoThermalPrint}
          onSetCustomer={setCustomer}
          onSetDiscount={setDiscount}
          onSetPaymentMethod={setPaymentMethod}
          onSetAmountPaid={setAmountPaid}
          onQtyChange={setQuantity}
          onPriceChange={setUnitPrice}
          onToggleUnit={toggleSaleUnit}
          onRemoveItem={removeLine}
          onClearCart={clearCart}
          onParkSale={parkCurrentSale}
          onResumeHeldSale={resumeHeldSale}
          onCheckout={handleCheckoutProcess}
        />
      </div>

      {/* Thermal Receipt Modal Display */}
      {activeReceipt && (
        <PosReceiptModal
          sale={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  )
}