/**
 * Professional Desktop POS Shopping Cart
 * Table-style layout for easy scanning and quick edits
 */

import { memo } from 'react'
import { ShoppingCart as CartIcon, Trash2, AlertCircle, Percent } from 'lucide-react'
import type { CartItem } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

type Props = {
  cart: CartItem[]
  totalItems: number
  onUpdateQuantity: (id: string, delta: number) => void
  onRemoveFromCart: (id: string) => void
  onClearCart: () => void
  canApplyDiscount?: () => boolean
  onApplyDiscount?: (item: CartItem) => void
}

function ShoppingCart({ 
  cart, 
  totalItems,
  onUpdateQuantity, 
  onRemoveFromCart, 
  onClearCart,
  canApplyDiscount,
  onApplyDiscount
}: Props) {
  const { t } = useLanguage()
  
  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-300 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <CartIcon size={16} className="text-primary" />
          <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">{t('items')}</span>
          <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">
            {cart.length}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1"
            title={t('clearAllItems')}
          >
            <Trash2 size={12} />
            {t('clear').toUpperCase()}
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 px-4 py-8">
          <CartIcon size={48} className="mb-2 opacity-20" />
          <p className="text-base font-semibold mb-1">{t('noItems')}</p>
          <p className="text-xs text-center">{t('addProductsToStart')}</p>
        </div>
      ) : (
        <>
          {/* Compact Table Header */}
          <div className="grid grid-cols-12 gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">{t('product')}</div>
            <div className="col-span-3 text-center">{t('qty')}</div>
            <div className="col-span-2 text-right">{t('price')}</div>
            <div className="col-span-2 text-right">{t('total')}</div>
            <div className="col-span-1"></div>
          </div>

          {/* Scrollable Items - Optimized for space */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {cart.map((item, index) => (
              <div
                key={item.id}
                className={`
                  grid grid-cols-12 gap-1 px-2 py-2 border-b border-slate-200 dark:border-slate-700
                  hover:bg-primary/5 transition-colors
                  ${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}
                `}
              >
                {/* Product Name + Variant (More compact) */}
                <div className="col-span-4 flex flex-col justify-center min-w-0 pr-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight" title={item.name}>
                    {item.name}
                  </div>
                  {item.variant && (
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                      {item.variant}
                    </div>
                  )}
                  {/* Inline Stock Warning */}
                  {item.quantity >= item.stock * 0.9 && (
                    <div className="flex items-center gap-0.5 mt-0.5 text-[9px] text-orange-600 dark:text-orange-400 font-semibold">
                      <AlertCircle size={9} />
                      <span>{item.stock} {t('left')}</span>
                    </div>
                  )}
                </div>

                {/* Quantity Controls (Smaller) */}
                <div className="col-span-3 flex items-center justify-center">
                  <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700 rounded p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded bg-white dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs transition-colors"
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold text-xs text-slate-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      disabled={item.quantity >= item.stock}
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                        item.quantity >= item.stock
                          ? 'bg-slate-300 dark:bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Unit Price */}
                <div className="col-span-2 flex items-center justify-end">
                  {item.discountType && item.discountType !== 'NONE' ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 line-through">
                        ${item.price.toFixed(2)}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-green-600 dark:text-green-400">
                        ${(item.finalPrice || item.price).toFixed(2)}
                      </span>
                      <span className="text-[8px] text-green-600 dark:text-green-400">
                        {item.discountType === 'PERCENTAGE'
                          ? `-${item.discountValue}%`
                          : `-$${item.discountValue?.toFixed(2)}`}
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      ${item.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Line Total */}
                <div className="col-span-2 flex items-center justify-end">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    ${((item.finalPrice || item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Action Buttons (Discount + Remove) */}
                <div className="col-span-1 flex items-center justify-center gap-0.5">
                  {onApplyDiscount && canApplyDiscount?.() && (
                    <button
                      onClick={() => onApplyDiscount(item)}
                      className="w-5 h-5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center transition-colors"
                      title="Apply Discount"
                      aria-label={`Apply discount to ${item.name}`}
                    >
                      <Percent size={11} />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveFromCart(item.id)}
                    className="w-5 h-5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center transition-colors"
                    title="Remove"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Summary (Very Compact) */}
          <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">
                {totalItems} items • {cart.length} products
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Memoize component - only re-render when cart changes
export default memo(ShoppingCart, (prevProps, nextProps) => {
  // Deep comparison for cart array
  if (prevProps.cart.length !== nextProps.cart.length) return false
  if (prevProps.totalItems !== nextProps.totalItems) return false
  
  // Check each cart item
  for (let i = 0; i < prevProps.cart.length; i++) {
    const prev = prevProps.cart[i]
    const next = nextProps.cart[i]
    if (prev.id !== next.id || prev.quantity !== next.quantity) {
      return false
    }
  }
  
  return true
})
