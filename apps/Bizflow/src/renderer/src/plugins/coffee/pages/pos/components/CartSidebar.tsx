import { ShoppingCart, X, Zap, ArrowRight, Trash2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { CartItemRow } from './CartItemRow'
import { formatMoney } from '../utils'
import type { CartItem as CartItemType, ViewMode, PaymentMethod } from '../types'

interface Props {
  cart: CartItemType[]
  itemCount: number
  subtotal: number
  discount: number
  total: number
  viewMode: ViewMode
  checking: boolean
  onClear: () => void
  onClose: () => void
  onChangeQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onUpdatePrice: (id: string, price: number) => void
  onQuickSale: (pm: PaymentMethod) => void
  onCheckout: () => void
  onSetQty: (id: string, qty: number) => void   // <-- ADD
}

export function CartSidebar({
  cart,
  itemCount,
  subtotal,
  discount,
  total,
  checking,
  onClear,
  onSetQty, // <-- ADD
  onClose,
  onChangeQty,
  onRemove,
  onUpdatePrice,
  onQuickSale,
  onCheckout
}: Props) {
  const { t } = useLanguage()
  return (
    <div className="w-full h-full lg:w-80 xl:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-amber-500" />
          <span className="font-semibold text-slate-900 dark:text-white">
            {t('cfCart') || 'Cart'}
          </span>
          {itemCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
              {itemCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('cfClearCart') || 'Clear'}
            </button>
          )}
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <ShoppingCart className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('cfCartEmpty') || 'Cart Empty'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {t('cfTapToAdd') || 'Tap to add Product to cart'}
          </p>
        </div>
      ) : (
        <>
          {/* Items */}
          <div className="flex-1 overflow-y-auto px-3">
            {cart.map((item) => (
               <CartItemRow
                key={item.productId}
                item={item}
                onChangeQty={onChangeQty}
                onSetQty={onSetQty}
                onRemove={onRemove}
                onUpdatePrice={onUpdatePrice}
              />
            ))}
          </div>

          {/* Totals + actions */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-3">
            {discount > 0 && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span className="tabular-nums">−{formatMoney(discount)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('cfCartTotal') || 'Total'}
              </span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatMoney(total)}
              </span>
            </div>

            <div className="space-y-2">
              {/* Quick cash checkout */}
              <button
                onClick={() => onQuickSale('cash')}
                disabled={checking}
                className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> {t('cfCartQuickCash') || 'Quick Cash'}
              </button>
              {/* Full checkout */}
              <button
                onClick={onCheckout}
                disabled={checking}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {t('cfCartCheckout') || 'Checkout'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
