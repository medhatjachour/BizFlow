import { X, ShoppingCart } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Product, ProductVariant, CartItem } from '../types'
import { getVariantLabel } from '../utils'

type VariantModalProps = {
  product: Product
  cartItems: CartItem[]
  onAddVariant: (product: Product, variant: ProductVariant) => void
  onClose: () => void
}

export function VariantModal({
  product,
  cartItems,
  onAddVariant,
  onClose,
}: VariantModalProps) {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {product.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('selectAVariant')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {product.variants?.map((variant) => {
              const variantLabel = getVariantLabel(variant)
              const inCart = cartItems.find((item) => item.variantId === variant.id)

              return (
                <button
                  key={variant.id}
                  onClick={() => {
                    onAddVariant(product, variant)
                    onClose()
                  }}
                  disabled={variant.stock === 0}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    variant.stock === 0
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 opacity-50 cursor-not-allowed'
                      : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white text-base">
                        {variantLabel || 'Default'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {variant.sku}
                      </p>
                    </div>
                    {inCart && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded-full">
                        <ShoppingCart size={12} className="text-primary" />
                        <span className="text-xs font-bold text-primary">
                          {inCart.quantity}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      ${variant.price.toFixed(2)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        variant.stock === 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : variant.stock < 10
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {variant.stock === 0
                        ? t('outOfStock')
                        : `${variant.stock} ${t('inStock')}`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}