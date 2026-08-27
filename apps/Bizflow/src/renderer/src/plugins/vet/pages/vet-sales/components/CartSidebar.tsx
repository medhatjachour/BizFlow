import React from 'react'
import { ShoppingCart, Trash2, PanelRightClose } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { CartItem, SaleSubmitPayload, CustomerLite } from '../types'
import { CartItemRow } from './CartItemRow'
import { CheckoutSummary } from './CheckoutSummary'

interface Props {
  cart: CartItem[]
  cartTotals: {
    rawSubtotal: number
    itemDiscounts: number
    netItemsTotal: number
  }
  isSubmitting: boolean
  selectedCustomer: CustomerLite | null
  customerSearch: string
  customerResults: CustomerLite[]
  customerSearching: boolean
  customerDropdownOpen: boolean
  onEditItem: (item: CartItem) => void
  onRemoveItem: (id: string) => void
  onAdjustQty: (id: string, delta: number) => void
  onClearCart: () => void
  onHideSidebar: () => void
  onCustomerSearchChange: (q: string) => void
  onSelectCustomer: (c: CustomerLite) => void
  onClearCustomer: () => void
  setCustomerDropdownOpen: (open: boolean) => void
  onOpenNewCustomerModal: () => void
  onSubmitSale: (payload: SaleSubmitPayload) => void
}

export const CartSidebar: React.FC<Props> = ({
  cart,
  cartTotals,
  isSubmitting,
  selectedCustomer,
  customerSearch,
  customerResults,
  customerSearching,
  customerDropdownOpen,
  onEditItem,
  onRemoveItem,
  onAdjustQty,
  onClearCart,
  onHideSidebar,
  onCustomerSearchChange,
  onSelectCustomer,
  onClearCustomer,
  setCustomerDropdownOpen,
  onOpenNewCustomerModal,
  onSubmitSale
}) => {
  const { t } = useLanguage()

  return (
    <div className="w-80 2xl:w-96 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Active Cart
          </h3>
          {cart.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              {cart.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Clear Cart"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onHideSidebar}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <PanelRightClose size={15} />
          </button>
        </div>
      </div>

      {/* Cart List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingCart className="h-10 w-10 stroke-1 opacity-30 mb-2" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Cart is empty</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click any medicine card to add items</p>
          </div>
        ) : (
          cart.map(item => (
            <CartItemRow
              key={item.id}
              item={item}
              onEdit={() => onEditItem(item)}
              onRemove={() => onRemoveItem(item.id)}
              onAdjustQty={delta => onAdjustQty(item.id, delta)}
            />
          ))
        )}
      </div>

      {/* Checkout Section */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CheckoutSummary
          cartTotals={cartTotals}
          isSubmitting={isSubmitting}
          selectedCustomer={selectedCustomer}
          customerSearch={customerSearch}
          customerResults={customerResults}
          customerSearching={customerSearching}
          customerDropdownOpen={customerDropdownOpen}
          onCustomerSearchChange={onCustomerSearchChange}
          onSelectCustomer={onSelectCustomer}
          onClearCustomer={onClearCustomer}
          setCustomerDropdownOpen={setCustomerDropdownOpen}
          onOpenNewCustomerModal={onOpenNewCustomerModal}
          onSubmitSale={onSubmitSale}
        />
      </div>
    </div>
  )
}