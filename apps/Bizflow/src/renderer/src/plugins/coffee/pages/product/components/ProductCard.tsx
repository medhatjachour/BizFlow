import { Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatPrice, formatStock, isLowStock } from '../utils'
import type { Product } from '../types'
import { ImageLoader } from './ImageLoader'

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onToggleAvailability: (product: Product) => void
}

export default function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleAvailability
}: ProductCardProps) {
  const lowStock = isLowStock(product)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative">
        {product.image ? (
          <ImageLoader filename={product.image} name={product.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <span className="text-5xl">☕</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{product.name}</h3>

        {product.category && (
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            {product.category.icon && <span>{product.category.icon}</span>}
            <span>{product.category.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-amber-600 dark:text-amber-400 font-bold">
            {formatPrice(product.price)}
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              lowStock
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            Stock: {formatStock(product.stock, product.unit)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
          <button
            onClick={() => onToggleAvailability(product)}
            className={`px-3 py-3 mx-4 rounded-full transition-colors ${
              product.isAvailable
                ? 'text-green-500 hover:bg-green-50'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={product.isAvailable ? 'Mark unavailable' : 'Mark available'}
          >
            {product.isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <button
            onClick={() => onEdit(product)}
            className="px-3 py-3 mx-4  rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="px-3 py-3 mx-4 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
