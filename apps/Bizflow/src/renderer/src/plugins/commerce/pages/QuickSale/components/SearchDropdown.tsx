import { ShoppingCart } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Product, ProductVariant, CartItem } from '../types'
import { getVariantLabel } from '../utils'
import type { Ref } from 'react'

type SearchDropdownProps = {
  searchResults: Product[]
  selectedIndex: number
  expandedProductId: string | null
  selectedVariantIndex: number
  cartItems: CartItem[]
  dropdownRef: Ref<HTMLDivElement>
  onProductSelect: (product: Product) => void
  onToggleExpand: (productId: string | null) => void
  onAddVariant: (product: Product, variant: ProductVariant) => void
}

export function SearchDropdown({
  searchResults,
  selectedIndex,
  expandedProductId,
  selectedVariantIndex,
  cartItems,
  dropdownRef,
  onProductSelect,
  onToggleExpand,
  onAddVariant,
}: SearchDropdownProps) {
  const { t } = useLanguage()

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-80 overflow-auto z-40"
    >
      {searchResults.map((product, index) => {
        const cartItemsForProduct = cartItems.filter((item) => item.productId === product.id)
        const totalInCart = cartItemsForProduct.reduce((sum, item) => sum + item.quantity, 0)
        const inCart = cartItemsForProduct.length > 0
        const remainingStock = product.totalStock - totalInCart
        const isExpanded = expandedProductId === product.id
        const hasMultipleVariants =
          product.hasVariants && product.variants && product.variants.length > 1

        return (
          <div
            key={product.id}
            className="border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <div
              className={`w-full px-3 py-2 flex items-center gap-2 transition-colors ${
                index === selectedIndex
                  ? 'bg-primary/10 dark:bg-primary/20 border-l-4 border-l-primary'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              } ${product.totalStock === 0 ? 'opacity-50' : ''}`}
            >
              <button
                onClick={() => !hasMultipleVariants && onProductSelect(product)}
                disabled={product.totalStock === 0}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <div className="relative w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <ShoppingCart size={16} className="text-slate-400" />
                  )}
                  {inCart && totalInCart > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                      {totalInCart}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    {hasMultipleVariants && (
                      <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
                        {product.variants?.length || 0} variants
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {product.baseSKU}
                    </p>
                    {product.category && (
                      <>
                        <span className="text-xs text-slate-400">•</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {product.category}
                        </p>
                      </>
                    )}
                    {inCart && (
                      <>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-medium text-primary">{t('inCart')}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      remainingStock === 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : remainingStock < 10
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {inCart ? `${remainingStock}/${product.totalStock}` : product.totalStock}
                  </span>
                  <span className="text-base font-semibold text-primary">
                    ${product.basePrice.toFixed(2)}
                  </span>
                </div>
              </button>

              {hasMultipleVariants && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleExpand(isExpanded ? null : product.id)
                  }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors flex-shrink-0"
                  title={isExpanded ? 'Hide variants' : 'Show variants'}
                >
                  <svg
                    className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              )}
            </div>

            {isExpanded && hasMultipleVariants && (
              <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 space-y-1">
                {product.variants?.map((variant, variantIdx) => {
                  const variantLabel = getVariantLabel(variant)
                  const variantInCart = cartItems.find((item) => item.variantId === variant.id)
                  const isVariantSelected =
                    index === selectedIndex && variantIdx === selectedVariantIndex

                  return (
                    <button
                      key={variant.id}
                      onClick={() => onAddVariant(product, variant)}
                      disabled={variant.stock === 0}
                      className={`w-full px-3 py-2 rounded-lg flex items-center justify-between transition-all text-left ${
                        variant.stock === 0
                          ? 'bg-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                          : isVariantSelected
                            ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary shadow-md scale-[1.02]'
                            : 'bg-white dark:bg-slate-800 hover:bg-primary/5 dark:hover:bg-primary/10 hover:scale-[1.01] active:scale-[0.99] border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {variantLabel || 'Default'}
                          </p>
                          {variantInCart && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 dark:bg-primary/20 rounded">
                              <ShoppingCart size={10} className="text-primary" />
                              <span className="text-xs font-bold text-primary">
                                {variantInCart.quantity}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {variant.sku}
                          </p>
                          {variant.barcode && (
                            <>
                              <span className="text-xs text-slate-400">•</span>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                {variant.barcode}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            variant.stock === 0
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : variant.stock < 10
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {variant.stock}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          ${variant.price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}