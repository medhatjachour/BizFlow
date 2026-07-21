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
      <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
        <ProductImg image={product.image} name={product.name} />
      </div>

      {/* Name */}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 leading-tight">
          {product.name}
        </p>
      </div>

      {/* Price + stock */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
          {formatMoney(product.price)}
        </span>
        {isOut ? (
          <span className="text-[10px] font-semibold text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
            Out
          </span>
        ) : isLow ? (
          <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
            Low ({product.stock})
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">
            {product.stock} in stock
          </span>
        )}
      </div>
    </button>
  )
}
