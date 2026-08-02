import { useState, useMemo } from 'react'
import { Package, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { ProductRow, SortConfig } from '../types'
import { formatCurrency, sortData, calcMarginPct } from '../utils'

interface TopProductsTableProps {
  products: ProductRow[]
  loading: boolean
  t: (key: string) => string
}

export function TopProductsTable({ products, loading, t }: TopProductsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'revenue', direction: 'desc' })
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  const processedProducts = useMemo(() => {
    let result = products.map(p => ({
      ...p,
       marginPct: p.marginPct ?? calcMarginPct(p.revenue, p.cogs),
    }))

    if (search) {
      result = result.filter(
        p =>
          p.productName.toLowerCase().includes(search.toLowerCase()) ||
          p.categoryName.toLowerCase().includes(search.toLowerCase())
      )
    }

    return sortData(result, sortConfig.key as keyof ProductRow, sortConfig.direction)
  }, [products, sortConfig, search])

  const displayed = showAll ? processedProducts : processedProducts.slice(0, 10)

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-50" />
    return sortConfig.direction === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('cfTopProducts')}</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Package className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">No products found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    <button onClick={() => handleSort('productName')} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200">
                      Product <SortIcon column="productName" />
                    </button>
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Category</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    <button onClick={() => handleSort('quantity')} className="flex items-center gap-1 ml-auto hover:text-slate-700 dark:hover:text-slate-200">
                      Qty <SortIcon column="quantity" />
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    <button onClick={() => handleSort('revenue')} className="flex items-center gap-1 ml-auto hover:text-slate-700 dark:hover:text-slate-200">
                      Revenue <SortIcon column="revenue" />
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    <button onClick={() => handleSort('grossProfit')} className="flex items-center gap-1 ml-auto hover:text-slate-700 dark:hover:text-slate-200">
                      Profit <SortIcon column="grossProfit" />
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Margin</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((product, idx) => (
                  <tr
                    key={`${product.productId}-${idx}`}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                          {product.productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{product.categoryName}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{product.quantity}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(product.grossProfit)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          product.marginPct >= 60
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : product.marginPct >= 30
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {product.marginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {processedProducts.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-4 w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors font-medium"
            >
              {showAll ? 'Show Less' : `Show All (${processedProducts.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
