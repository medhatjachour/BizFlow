import { Search, X } from 'lucide-react'
import { ProductCard } from './ProductCard'
import { catCls } from '../constants'
import { hexToRgba } from '../utils'
import type { Category, Product, CartItem, ViewMode } from '../types'

interface Props {
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  search: string
  setSearch: (s: string) => void
  selectedCat: string
  setSelectedCat: (id: string) => void
  categories: Category[]
  products: Product[]
  cart: CartItem[]
  onAddToCart: (p: Product) => void
  checking: boolean
  loading: boolean
}

export function ProductGrid({
  search, setSearch,
  selectedCat, setSelectedCat, categories, products,
  cart, onAddToCart,  loading,
}: Props) {
  const visible = products.filter(p => {
    if (p.stock <= 0) return false
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {/* Search */}
        <div className="relative flex-1  ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-9 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">

        <button
          onClick={() => setSelectedCat('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedCat === 'all'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
          }`}
        >
          All
        </button>
        {categories.map(c => {
          const isSelected = selectedCat === c.id
            const color = c.color ?? '#78716c'          // ← always a string now
          const isHex = c.color?.startsWith('#')
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-3 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${
                isSelected
                  ? 'text-white shadow-sm'
                  : isHex
                  ? 'border border-slate-200 dark:border-slate-700'
                  : catCls(c.color)
              }`}
              style={isSelected && isHex
                ? { backgroundColor: c.color }
                : !isSelected && isHex
          ? { backgroundColor: hexToRgba(color, 0.12), color: color }
                : undefined
              }
            >
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </button>
          )
        })}
      </div>

      {/* Products */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2.5 animate-pulse">
                <div className="aspect-square rounded-lg bg-slate-200 dark:bg-slate-700 mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visible.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                inCart={cart.find(i => i.productId === product.id)}
                onClick={() => onAddToCart(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
