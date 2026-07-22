import { ProductImg } from './ProductImg'
import type { Product, CartItem } from '../types'
import { formatMoney } from '../utils'

interface Props {
  product: Product
  inCart?: CartItem
  onClick: () => void
}

export function ProductCard({ product, inCart, onClick }: Props) {
  const isOut = product.stock <= 0
  const isLow = product.stock > 0 && product.stock <= (product.reorderPoint ?? 5)

  return (
    <button
      onClick={onClick}
      disabled={isOut}
      className={`bg-white dark:bg-slate-800 rounded-xl border-2 p-2.5 text-left hover:border-amber-400 hover:shadow-md transition-all active:scale-95 relative flex flex-col gap-2 ${
        isOut
          ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700'
          : inCart
            ? 'border-amber-400 dark:border-amber-600'
            : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Cart badge */}
      {inCart && (
        <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md z-10">
          {inCart.quantity}
        </span>
      )}

      {/* Image */}
      <div className="aspect-[4/3]  rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
        <ProductImg image={product.image} name={product.name} />
      </div>

      {/* Name */}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 leading-tight">
          {product.name}
        </p>
      </div>
      {/* Price + stock */}
      <div className="flex items-center justify-between w-full border-t border-slate-100 dark:border-slate-800 pt-1">
        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
          {formatMoney(product.price)}
        </span>

        {isOut ? (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Out of Stock
          </span>
        ) : isLow ? (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Low ({product.stock})
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {product.stock} in stock
          </span>
        )}
      </div>
    </button>
  )
}
