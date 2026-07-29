import { ShoppingCart, X, Percent } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { CartItem } from '../types'
import { canApplyDiscount } from '../utils'

type CartTableProps = {
  cartItems: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void
  onRemoveItem: (productId: string, variantId?: string) => void
  onOpenDiscount: (item: CartItem) => void
}

export function CartTable({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onOpenDiscount,
}: CartTableProps) {
  const { t } = useLanguage()

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
          <ShoppingCart size={32} className="text-slate-400" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">
          {t('yourCartIsEmpty')}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
          {t('searchForProducts')}
        </p>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-600 rounded border border-slate-300 dark:border-slate-500 font-mono">
              /
            </kbd>
            <span>{t('toFocusSearch')}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
            <div className="flex items-center gap-2 justify-center">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] border border-slate-300 dark:border-slate-500">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] border border-slate-300 dark:border-slate-500">
                ↓
              </kbd>
              <span>{t('navigate')}</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] border border-slate-300 dark:border-slate-500">
                →
              </kbd>
              <span>{t('expand')}</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] border border-slate-300 dark:border-slate-500">
                ←
              </kbd>
              <span>{t('collapse')}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
        <tr>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
            {t('product')}
          </th>
          <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
            {t('qty')}
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
            {t('price')}
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
            {t('total')}
          </th>
          <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-16" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
        {cartItems.map((item) => (
          <tr
            key={item.id}
            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <td className="px-3 py-3">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                {item.variantLabel && (
                  <p className="text-xs text-primary font-medium mt-0.5">
                    {item.variantLabel}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.sku}</p>
                  {item.availableStock !== undefined && (
                    <>
                      <span className="text-xs text-slate-400">•</span>
                      <span
                        className={`text-xs font-medium ${
                          item.availableStock < 10
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {item.availableStock} {t('inStock')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </td>

            <td className="px-3 py-3">
              <div className="relative flex items-center gap-1">
                <button
                  onClick={() =>
                    onUpdateQuantity(item.productId, item.quantity - 1, item.variantId)
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-all hover:scale-110 active:scale-95"
                  title="Decrease quantity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M20 12H4"
                    />
                  </svg>
                </button>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={item.availableStock || 9999}
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateQuantity(
                        item.productId,
                        parseInt(e.target.value) || 1,
                        item.variantId
                      )
                    }
                    className={`w-14 px-2 py-1.5 text-sm text-center border-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      item.availableStock && item.quantity >= item.availableStock
                        ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary/50'
                    }`}
                  />
                  {item.availableStock && item.quantity >= item.availableStock && (
                    <div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse"
                      title="Max stock reached"
                    />
                  )}
                </div>

                <button
                  onClick={() =>
                    onUpdateQuantity(item.productId, item.quantity + 1, item.variantId)
                  }
                  disabled={
                    item.availableStock ? item.quantity >= item.availableStock : false
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title="Increase quantity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </td>

            <td className="px-3 py-3 text-right">
              <div className="flex flex-col items-end gap-1">
                {item.discountValue && item.discountValue > 0 ? (
                  <>
                    <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                      ${item.price.toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      ${(item.finalPrice || item.price).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      -
                      {item.discountType === 'PERCENTAGE'
                        ? `${item.discountValue}%`
                        : `$${item.discountValue}`}
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-900 dark:text-white font-medium">
                      ${item.price.toFixed(2)}
                    </span>
                    {canApplyDiscount() && (
                      <button
                        onClick={() => onOpenDiscount(item)}
                        className="p-1 text-primary hover:bg-primary/10 rounded transition-all hover:scale-110 active:scale-95"
                        title="Apply discount"
                      >
                        <Percent size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </td>

            <td className="px-3 py-3 text-right">
              {item.discountValue && item.discountValue > 0 ? (
                <div className="flex flex-col items-end gap-0.5">
                  {(() => {
                    const originalPrice =
                      item.discountType === 'PERCENTAGE'
                        ? item.price / (1 - item.discountValue / 100)
                        : item.price + item.discountValue / item.quantity
                    const originalSubtotal = originalPrice * item.quantity

                    return (
                      <>
                        <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                          ${originalSubtotal.toFixed(2)}
                        </span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          ${item.subtotal.toFixed(2)}
                        </span>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <span className="font-bold text-slate-900 dark:text-white">
                  ${item.subtotal.toFixed(2)}
                </span>
              )}
            </td>

            <td className="px-3 py-3 text-center">
              <button
                onClick={() => onRemoveItem(item.productId, item.variantId)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                title="Remove item"
              >
                <X size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}