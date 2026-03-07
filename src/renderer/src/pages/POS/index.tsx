/**
 * Point of Sale (POS) Main Component
 * Modular architecture with separated concerns:
 * - ProductSearch: Product browsing and selection (Grid View)
 * - QuickSale: Fast table-based sale interface (Quick Sale View)
 * - ShoppingCart: Cart display and management
 * - CustomerSelect: Customer search and selection
 * - PaymentSection: Payment method and checkout
 * - SuccessModal: Success feedback
 * - usePOS: Business logic and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Grid, Zap } from 'lucide-react'
import ProductSearch from './ProductSearch'
import QuickSale from './QuickSale'
import ShoppingCart from './ShoppingCart'
import SuccessModal from './SuccessModal'
import AddCustomerModal from './AddCustomerModal'
import DiscountModal from '../../components/DiscountModal'
import { PaymentFlowSelector } from './PaymentFlowSelector'
import { ReceiptPreviewModal } from '../Sales/ReceiptPreviewModal'
import { usePOS } from './usePOS'
import { useLanguage } from '../../contexts/LanguageContext'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import { useToast } from '../../contexts/ToastContext'
import { ipc } from '../../utils/ipc'
import type { Customer } from './types'
import logger from '../../../../shared/utils/logger'

type ViewMode = 'grid' | 'quick'

export default function POS(): JSX.Element {
  const {
    customers,
    cart,
    paymentMethod,
    showSuccess,
    showDiscountModal,
    discountingItem,
    subtotal,
    tax,
    total,
    totalItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    completeSale,
    completeSaleFromQuickView,
    setPaymentMethod,
    refreshCustomers,
    canApplyDiscount,
    openDiscountModal,
    handleApplyDiscount,
    setShowDiscountModal,
  } = usePOS()

  const { t, language } = useLanguage()
  const toast = useToast()

  const [cartOpen, setCartOpen] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [isCompletingSale, setIsCompletingSale] = useState(false)
  
  // Receipt preview modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [completedTransaction, setCompletedTransaction] = useState<any>(null)
  
  // Grid view has its own local customer state (like QuickSale does)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')

  // Keep a ref to the current selectedCustomer so we can access it in cleanup effects
  // without stale closure issues
  const selectedCustomerRef = useRef<Customer | null>(null)
  useEffect(() => {
    selectedCustomerRef.current = selectedCustomer
  }, [selectedCustomer])

  // Cleanup orphaned installments/deposits when navigating away from POS
  useEffect(() => {
    return () => {
      const customer = selectedCustomerRef.current
      if (customer) {
        Promise.all([
          (window as any).api.delete.cleanupUnlinkedDeposits(customer.id),
          (window as any).api.delete.cleanupUnlinkedInstallments(customer.id)
        ]).catch(() => {})
      }
    }
  }, [])

  // Barcode scanner integration - add products directly to cart
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      const result = await ipc.inventory.searchByBarcode(barcode)
      
      if (!result) {
        toast.error(`No product found with barcode: ${barcode}`)
        return
      }

      // Add the scanned product to cart
      if (result.selectedVariant) {
        // Product with variant
        addToCart(result, result.selectedVariant)
        toast.success(`Added ${result.name} (${result.selectedVariant.color || ''} ${result.selectedVariant.size || ''})`)
      } else {
        // Product without variant
        addToCart(result)
        toast.success(`Added ${result.name}`)
      }

      // Auto-open cart in grid view if closed
      if (viewMode === 'grid' && !cartOpen) {
        setCartOpen(true)
      }
    } catch (error) {
      logger.error('Error scanning barcode:', error)
      toast.error('Failed to add product')
    }
  }, [addToCart, toast, viewMode, cartOpen, setCartOpen])

  // Enable barcode scanner
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    minLength: 3,
    maxLength: 50,
    preventDuplicates: false // Allow scanning same variant multiple times
  })

  // Clear local customer state when sale is completed successfully
  useEffect(() => {
    if (showSuccess) {
      setSelectedCustomer(null)
      setCustomerQuery('')
    }
  }, [showSuccess])

  // Cancel payment modal — clean up any orphaned installments/deposits that were
  // pre-created for the live preview but whose sale was never completed
  const handleCancelPaymentModal = async () => {
    if (selectedCustomer) {
      try {
        await Promise.all([
          (window as any).api.delete.cleanupUnlinkedDeposits(selectedCustomer.id),
          (window as any).api.delete.cleanupUnlinkedInstallments(selectedCustomer.id)
        ])
        logger.info('🧹 Cleaned up unlinked payments on modal cancel for customer:', selectedCustomer.id)
      } catch (error) {
        logger.error('Failed to cleanup unlinked payments on modal cancel:', error)
      }
    }
    setShowPaymentModal(false)
  }

  const handleCustomerAdded = (newCustomer: Customer) => {
    // Refresh customers list and select the new customer immediately
    refreshCustomers()
    setSelectedCustomer(newCustomer)
    // Don't clear the query - leave it so the customer name shows
    // The CustomerSelect component will display selectedCustomer.name
  }
  
  // Wrapper to call completeSale with the local customer
  const handleCompleteSale = async () => {
    setIsCompletingSale(true)
    try {
      const transaction = await completeSale(selectedCustomer)
      if (transaction) {
        setCompletedTransaction(transaction)
        setShowReceiptModal(true)
      }
    } finally {
      setIsCompletingSale(false)
      setShowPaymentModal(false) // Ensure modal closes
    }
  }

  // Quick checkout with cash, no customer
  const handleQuickCheckout = async () => {
    if (cart.length === 0) {
      alert(t('cartIsEmpty'))
      return
    }

    // Set payment method and customer state synchronously
    setPaymentMethod('cash')
    setSelectedCustomer(null)
    setCustomerQuery('')
    setIsCompletingSale(true)

    try {
      // Call completeSale with null customer (no override needed since we set state above)
      const transaction = await completeSale(null)
      if (transaction) {
        setCompletedTransaction(transaction)
        setShowReceiptModal(true)
      }
    } catch (error) {
      logger.error('Quick checkout failed:', error)
    } finally {
      setIsCompletingSale(false)
    }
  }

  return (
    <div className=" flex bg-slate-50 h-full dark:bg-slate-900 relative">
      <SuccessModal show={showSuccess} total={total} paymentMethod={paymentMethod} />
      <AddCustomerModal 
        show={showAddCustomerModal} 
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={handleCustomerAdded}
      />

      {/* Main Content Area - Left Side */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* View Mode Tabs */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 pt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-100 dark:bg-slate-700 text-primary font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Grid size={18} />
              {t('gridView')}
            </button>
            <button
              onClick={() => setViewMode('quick')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                viewMode === 'quick'
                  ? 'bg-slate-100 dark:bg-slate-700 text-primary font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Zap size={18} />
              {t('quickSale')}
            </button>
           
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'grid' ? (
          <ProductSearch 
            onAddToCart={addToCart}
            cartOpen={cartOpen}
          />
        ) : (
          <QuickSale onCompleteSale={completeSaleFromQuickView} />
        )}
      </div>

      {/* Backdrop Overlay (visible when cart is open) - Only in Grid View */}
      {cartOpen && viewMode === 'grid' && (
        <div 
          role="button"
          tabIndex={0}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden"
          onClick={() => setCartOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setCartOpen(false)}
          aria-label={t('closeCartOverlay')}
        />
      )}

      {/* Floating Cart Toggle Button (when closed) - Only in Grid View */}
      {!cartOpen && viewMode === 'grid' && (
        <button
          onClick={() => setCartOpen(true)}
          className={`fixed bottom-6 z-50 group ${language === 'ar' ? 'left-6' : 'right-6'}`}
          aria-label={t('openShoppingCart')}
        >
          <div className="relative">
            {/* Cart Icon with Badge */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-2xl flex items-center justify-center transform hover:scale-110 transition-all duration-300 group-hover:shadow-primary/50">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            
            {/* Item Count Badge */}
            {totalItems > 0 && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center shadow-lg animate-bounce">
                {totalItems}
              </div>
            )}
            
            {/* Ripple Effect */}
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping"></div>
          </div>
          
          {/* Tooltip */}
          <div className={`absolute bottom-full mb-2 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl ${language === 'ar' ? 'left-0' : 'right-0'}`}>
            {t('viewCart')} ({totalItems} {t('items')})
            <div className={`absolute top-full -mt-1 w-2 h-2 bg-slate-900 transform rotate-45 ${language === 'ar' ? 'left-4' : 'right-4'}`}></div>
          </div>
        </button>
      )}

      {/* Cart Sidebar Panel - Right Side with Fixed Sections - Only in Grid View */}
      {viewMode === 'grid' && (
        <div 
          className={`
            fixed lg:relative top-0 min-h-full  overflow-y-scroll z-10
            w-full sm:w-[420px] lg:w-[380px] xl:w-[420px] 2xl:w-[480px]
            bg-white dark:bg-slate-800 
            shadow-2xl lg:shadow-none
            transform transition-all duration-300 ease-out
            flex flex-col
            ${language === 'ar' 
              ? 'left-0 border-r border-slate-200 dark:border-slate-700' 
              : 'right-0 border-l border-slate-200 dark:border-slate-700'
            }
            ${cartOpen 
              ? 'translate-x-0' 
              : language === 'ar' 
                ? '-translate-x-full lg:hidden' 
                : 'translate-x-full lg:hidden'
            }
          `}
        >
        {/* Compact Header with Close/Minimize Button */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-primary bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('currentOrder')}</h2>
            </div>
          </div>
          
          {/* Close/Minimize Button - Works on all screen sizes */}
          <button
            onClick={() => setCartOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
            aria-label={t('minimizeCart')}
            title={`${t('minimizeCart')} (${t('moreSpaceForProducts')})`}
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={language === 'ar' ? "M11 19l-7-7 7-7" : "M13 5l7 7-7 7"} />
            </svg>
          </button>
        </div>

        {/* Main Content Area - Scrollable with fixed sections */}
        <div className="flex-1 flex flex-col overflow-scroll">
          {/* Cart Items - Takes full space now */}
          <div className="flex-1 overflow-auto">
            <ShoppingCart
              cart={cart}
              totalItems={totalItems}
              onUpdateQuantity={updateQuantity}
              onRemoveFromCart={removeFromCart}
              onClearCart={clearCart}
              canApplyDiscount={canApplyDiscount}
              onApplyDiscount={openDiscountModal}
            />
          </div>

          {/* Checkout Buttons - Always visible at bottom */}
          {cart.length > 0 && (
            <div className="border-t-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              {/* Order Summary - Compact */}
              <div className="space-y-1 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>{t('subtotal')}:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                {/* Discount line - only show if there are discounts */}
                {(() => {
                  const totalDiscount = cart.reduce((sum, item) => {
                    if (item.discountType === 'PERCENTAGE') {
                      return sum + (item.price * item.quantity * (item.discountValue ?? 0) / 100)
                    } else if (item.discountType??"FIXED" === 'FIXED') {
                      return sum + (item.discountValue ?? 0 )
                    }
                    return sum
                  }, 0)
                  return totalDiscount > 0 ? (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>{t('discount')}:</span>
                      <span className="font-semibold">-${totalDiscount.toFixed(2)}</span>
                    </div>
                  ) : null
                })()}
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>{t('tax')} ({(parseFloat(localStorage.getItem('taxRate') || '10'))}%):</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-slate-600">
                  <span className="text-base font-bold text-slate-900 dark:text-white">{t('total')}:</span>
                  <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Buttons */}
              <div className="space-y-2">
                {/* Quick Cash Checkout */}
                <button
                  onClick={handleQuickCheckout}
                  disabled={isCompletingSale}
                  className="w-full py-3 text-base font-bold rounded-lg flex items-center justify-center gap-2 bg-gradient-to-r from-success to-emerald-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isCompletingSale ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('quickCheckoutCash')}
                    </>
                  )}
                </button>

                {/* More Options Button */}
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={isCompletingSale}
                  className="w-full py-3 text-sm font-semibold rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('paymentOptions')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Discount Modal */}
      {discountingItem && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          onApply={handleApplyDiscount}
          productName={`${discountingItem.name}${discountingItem.variant ? ` (${discountingItem.variant})` : ''}`}
          originalPrice={discountingItem.price}
          maxDiscountPercentage={parseFloat(localStorage.getItem('maxDiscountPercentage') || '50')}
          maxDiscountAmount={parseFloat(localStorage.getItem('maxDiscountAmount') || '100')}
          requireReason={true}
        />
      )}

      {/* Payment Options Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isCompletingSale ? 'Processing Payment...' : t('paymentOptions')}
              </h2>
              <button
                onClick={handleCancelPaymentModal}
                disabled={isCompletingSale}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-auto">
              <PaymentFlowSelector
                selectedCustomer={selectedCustomer}
                customers={customers}
                customerQuery={customerQuery}
                onCustomerSelect={setSelectedCustomer}
                onCustomerQueryChange={setCustomerQuery}
                onAddNewCustomer={() => setShowAddCustomerModal(true)}
                total={total}
                isProcessing={isCompletingSale}
                onFullPayment={(method) => {
                  setPaymentMethod(method)
                  setShowPaymentModal(false)
                  handleCompleteSale()
                }}
                onPartialPayment={() => {
                  // Just switch to installment view, no immediate action needed
                }}
                onCompleteInstallmentSale={() => {
                  setShowPaymentModal(false)
                  handleCompleteSale()
                }}
                onDepositAdded={() => {
                }}
                onInstallmentAdded={() => {
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptModal && completedTransaction && (
        <ReceiptPreviewModal
          transaction={completedTransaction}
          onClose={() => {
            setShowReceiptModal(false)
            setCompletedTransaction(null)
          }}
        />
      )}
     
    </div>
  )
}
