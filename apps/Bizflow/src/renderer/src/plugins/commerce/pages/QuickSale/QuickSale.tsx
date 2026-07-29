/**
 * QuickSale Component
 * Fast table-based POS interface for quick product search and sales
 * Optimized for large datasets (1M+ products) with virtualization
 */

import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import AddCustomerModal from '../POS/components/AddCustomerModal'
import DiscountModal from '@renderer/components/DiscountModal'
import { ReceiptPreviewModal } from '../Sales/components/ReceiptPreviewModal'
import type { QuickSaleProps, Product, ProductVariant } from './types'
import { getVariantLabel, getMaxDiscountPercentage, getMaxDiscountAmount } from './utils'
import {
  CART_EMPTY_MESSAGE,
  LOGIN_REQUIRED_MESSAGE,
  SALE_COMPLETED_MESSAGE,
  SALE_FAILED_MESSAGE,
  INSTALLMENT_SALE_COMPLETED_MESSAGE,
  CUSTOMER_REQUIRED_FOR_INSTALLMENTS,
} from './constants'
import { useCart } from './hooks/useCart'
import { useProductSearch } from './hooks/useProductSearch'
import { useCustomers } from './hooks/useCustomers'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { SearchBar } from './components/SearchBar'
import { SearchDropdown } from './components/SearchDropdown'
import { CartTable } from './components/CartTable'
import { CartFooter } from './components/CartFooter'
import { PaymentModal } from './components/PaymentModal'
import logger from '@/shared/utils/logger'

export default function QuickSale(_props: QuickSaleProps) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()

  const {
    cartItems,
    subtotal,
    tax,
    taxRate,
    totalDiscount,
    total,
    discountingItem,
    showDiscountModal,
    setShowDiscountModal,
    setDiscountingItem,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    openDiscountModal,
    handleApplyDiscount,
    refreshCartStock,
    resetCart,
  } = useCart()

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showDropdown,
    setShowDropdown,
    selectedIndex,
    expandedProductId,
    setExpandedProductId,
    selectedVariantIndex,
    searchInputRef,
    dropdownRef,
    handleProductSelect,
    handleSearchKeyDown,
    resetSearch,
  } = useProductSearch({ onAddToCart: addToCart })

  const {
    customers,
    selectedCustomer,
    setSelectedCustomer,
    customerQuery,
    setCustomerQuery,
    showAddCustomerModal,
    setShowAddCustomerModal,
    handleCustomerAdded,
    resetCustomer,
  } = useCustomers()

  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [completedTransaction, setCompletedTransaction] = useState<any>(null)

  // Initial stock refresh
  useEffect(() => {
    refreshCartStock()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useKeyboardShortcuts({
    searchInputRef,
    showDropdown,
    onCloseDropdown: () => {
      setShowDropdown(false)
      setExpandedProductId(null)
    },
    onClearSearch: () => setSearchQuery(''),
  })

  const handleAddVariant = useCallback(
    (product: Product, variant: ProductVariant) => {
      addToCart(product, variant)
      showToast('success', `Added ${product.name} (${getVariantLabel(variant)})`)
      setExpandedProductId(null)
    },
    [addToCart, showToast, setExpandedProductId]
  )

  const completeSale = useCallback(
    async (paymentMethod: string = 'cash') => {
      if (cartItems.length === 0) {
        showToast('error', CART_EMPTY_MESSAGE)
        return
      }

      try {
        if (!user?.id) {
          showToast('error', LOGIN_REQUIRED_MESSAGE)
          return
        }

        // Installment flow
        if (paymentMethod === 'installment') {
          if (!selectedCustomer) {
            showToast('error', CUSTOMER_REQUIRED_FOR_INSTALLMENTS)
            return
          }

          const saleData = {
            items: cartItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.finalPrice || item.price,
              discountType: item.discountType || 'NONE',
              discountValue: item.discountValue || 0,
              discountReason: item.discountReason,
              discountAppliedBy: item.discountAppliedBy,
            })),
            transactionData: {
              userId: user.id,
              paymentMethod: 'installment',
              customerName: selectedCustomer.name,
              customerId: selectedCustomer.id,
              subtotal,
              tax,
              total,
            },
          }

          const result = await (window as any).api.saleTransactions.create(saleData)

          if (!result.success) {
            throw new Error(result.error || 'Failed to create installment sale')
          }

          // Link unlinked deposits / installments
          const [customerDeposits, customerInstallments] = await Promise.all([
            (window as any).api.deposits.getByCustomer(selectedCustomer.id),
            (window as any).api.installments.getByCustomer(selectedCustomer.id),
          ])

          const unlinkedDeposits = customerDeposits.filter((d: any) => !d.saleId)
          const unlinkedInstallments = customerInstallments.filter((i: any) => !i.saleId)

          if (unlinkedDeposits.length > 0 || unlinkedInstallments.length > 0) {
            try {
              await (window as any).api.installments.linkToSale({
                installmentIds: unlinkedInstallments.map((i: any) => i.id),
                depositIds: unlinkedDeposits.map((d: any) => d.id),
                saleId: result.transaction.id,
              })
            } catch (linkError) {
              logger.error('Failed to link deposits/installments to sale:', linkError)
            }
          }

          showToast('success', INSTALLMENT_SALE_COMPLETED_MESSAGE)

          const fullTransaction = await (window as any).api.saleTransactions.getById(
            result.transaction.id
          )

          const itemsWithProducts = (result.items || []).map((item: any, index: number) => ({
            ...item,
            product: { name: cartItems[index]?.name || 'Unknown Product' },
          }))

          setCompletedTransaction({ ...fullTransaction, items: itemsWithProducts })
          setShowReceiptModal(true)

          resetCart()
          resetCustomer()
          resetSearch()
          setShowPaymentOptions(false)
          return
        }

        // Standard sale flow
        const saleData = {
          items: cartItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.finalPrice || item.price,
            discountType: item.discountType || 'NONE',
            discountValue: item.discountValue || 0,
            discountReason: item.discountReason,
            discountAppliedBy: item.discountAppliedBy,
          })),
          transactionData: {
            userId: user.id,
            paymentMethod,
            customerName: selectedCustomer?.name,
            customerId: selectedCustomer?.id,
            subtotal,
            tax,
            total,
          },
        }

        const result = await (window as any).api.saleTransactions.create(saleData)

        showToast('success', SALE_COMPLETED_MESSAGE)

        if (result.success && result.transaction) {
          const itemsWithProducts = (result.items || []).map((item: any, index: number) => ({
            ...item,
            product: { name: cartItems[index]?.name || 'Unknown Product' },
          }))

          setCompletedTransaction({
            ...result.transaction,
            items: itemsWithProducts,
          })
          setShowReceiptModal(true)
        }

        resetCart()
        resetCustomer()
        resetSearch()
        setShowPaymentOptions(false)
      } catch (error) {
        logger.error('Sale error:', error)
        showToast('error', SALE_FAILED_MESSAGE)
      }
    },
    [
      cartItems,
      user,
      selectedCustomer,
      subtotal,
      tax,
      total,
      showToast,
      resetCart,
      resetCustomer,
      resetSearch,
    ]
  )

  return (
    <div className="h-full flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900 overflow-y-scroll">
      {/* Search */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onKeyDown={handleSearchKeyDown}
        onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
        isSearching={isSearching}
        searchInputRef={searchInputRef}
      >
        {showDropdown && searchResults.length > 0 && (
          <SearchDropdown
            searchResults={searchResults}
            selectedIndex={selectedIndex}
            expandedProductId={expandedProductId}
            selectedVariantIndex={selectedVariantIndex}
            cartItems={cartItems}
            dropdownRef={dropdownRef}
            onProductSelect={handleProductSelect}
            onToggleExpand={setExpandedProductId}
            onAddVariant={handleAddVariant}
          />
        )}
      </SearchBar>

      {/* Cart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex-1 flex flex-col min-h-0 relative z-10">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Cart ({cartItems.length})
            </h3>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
            >
              <Trash2 size={14} />
              {t('clear')}
            </button>
          )}
        </div>

        <div className="overflow-auto flex-1">
          <CartTable
            cartItems={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onOpenDiscount={openDiscountModal}
          />
        </div>

        <CartFooter
          subtotal={subtotal}
          tax={tax}
          taxRate={taxRate}
          totalDiscount={totalDiscount}
          total={total}
          cartItemCount={cartItems.length}
          onClearCart={clearCart}
          onCheckout={() => setShowPaymentOptions(true)}
        />
      </div>

      {/* Payment Modal */}
      {showPaymentOptions && (
        <PaymentModal
          selectedCustomer={selectedCustomer}
          customers={customers}
          customerQuery={customerQuery}
          total={total}
          onCustomerSelect={setSelectedCustomer}
          onCustomerQueryChange={setCustomerQuery}
          onAddNewCustomer={() => setShowAddCustomerModal(true)}
          onFullPayment={completeSale}
          onCompleteInstallmentSale={() => completeSale('installment')}
          onClose={() => setShowPaymentOptions(false)}
        />
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        show={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={handleCustomerAdded}
      />

      {/* Discount Modal */}
      {discountingItem && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={() => {
            setShowDiscountModal(false)
            setDiscountingItem(null)
          }}
          onApply={handleApplyDiscount}
          productName={discountingItem.name}
          originalPrice={discountingItem.price}
          maxDiscountPercentage={getMaxDiscountPercentage()}
          maxDiscountAmount={getMaxDiscountAmount()}
          requireReason={true}
        />
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