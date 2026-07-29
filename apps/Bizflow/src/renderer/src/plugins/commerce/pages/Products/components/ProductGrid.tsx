/**
 * ProductGrid Component
 * Displays products in a responsive grid with action buttons
 */

import { memo } from 'react'
import { Edit2, Eye, Package, Archive } from 'lucide-react'
import type { Product } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProductGridProps {
  products: Product[]
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

function ProductGrid({ products, onView, onEdit, onDelete }: Readonly<ProductGridProps>) {
  const { t } = useLanguage()
  
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('noProductsFound')}</h3>
        <p className="text-slate-600 dark:text-slate-400">
          {t('tryAdjustingFilters')}
        </p>
      </div>
    )
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: t('outOfStock'), color: 'text-red-600 bg-red-50 dark:bg-red-900/20' }
    if (stock <= 10) return { text: t('lowStock'), color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' }
    return { text: t('inStock'), color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const stockStatus = getStockStatus(product.totalStock || 0)
        const hasImage = product.images && product.images.length > 0

        return (
          <div
            key={product.id}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Product Image */}
            <div className="aspect-square bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
              {hasImage && product.images ? (
                <img
                  src={product.images[0].imageData}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-16 h-16 text-slate-300 dark:text-slate-600" />
              )}
            </div>

            {/* Product Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {product.name}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${stockStatus.color}`}>
                  {stockStatus.text}
                </span>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {t('sku')}: {product.baseSKU}
              </p>

              {!product.hasVariants && product.baseBarcode && (
                <p className="text-xs font-mono text-green-600 dark:text-green-400 mb-2">
                  🔖 {product.baseBarcode}
                </p>
              )}

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-lg font-bold text-primary">
                    ${product.basePrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t('cost')}: ${product.baseCost.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('stock')}: {product.totalStock || 0}
                  </p>
                  {product.hasVariants && (
                    <p className="text-xs text-slate-500">
                      {product.variants?.length || 0} {t('variants')}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {product.category || t('uncategorized')}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onView(product)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  {t('view')}
                </button>
                <button
                  onClick={() => onEdit(product)}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  {t('edit')}
                </button>
                <button
                  onClick={() => onDelete(product)}
                  className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-1.5"
                  title={t('archive')}
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default memo(ProductGrid)
