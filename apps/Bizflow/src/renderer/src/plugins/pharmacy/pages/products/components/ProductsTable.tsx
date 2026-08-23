import React from 'react'
import { History, Layers, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { PharmacyProductItem } from '../types'
import { money, expiryTone } from '../../components/_shared'
import { IconButton } from '../../components/ui'
import { computeExpiryDays } from '../utils'

interface ProductsTableProps {
  products: PharmacyProductItem[]
  loading: boolean
  onOpenHistory: (p: PharmacyProductItem) => void
  onOpenBatches: (p: PharmacyProductItem) => void
  onEdit: (p: PharmacyProductItem) => void
  onDelete: (p: PharmacyProductItem) => void
  t: (k: string) => string
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  loading,
  onOpenHistory,
  onOpenBatches,
  onEdit,
  onDelete,
  t,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mb-2" />
        <p className="text-xs">Loading product catalog...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-sm font-medium">{t('phNoProducts') || 'No products found'}</p>
        <p className="text-xs mt-0.5">Click "Add Product" above to create your first medicine record.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold bg-slate-50/40 dark:bg-slate-900/30">
            <th className="px-4 py-3">Product Name & Formula</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Available Stock</th>
            <th className="px-4 py-3">Nearest Expiry</th>
            <th className="px-4 py-3 text-right">Unit Price</th>
            <th className="px-4 py-3 text-right">Stock Value</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {products.map(p => {
            const days = computeExpiryDays(p.nearestExpiry)
            return (
              <tr
                key={p.id}
                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-slate-700 dark:text-slate-300 ${
                  !p.isActive ? 'opacity-40' : ''
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    {p.name}
                    {p.hasExpired && (
                      <span title="Contains expired batches">
                        <AlertTriangle size={12} className="text-red-500" />
                      </span>
                    )}
                  </div>
                  {p.genericName && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">{p.genericName}</p>
                  )}
                </td>

                <td className="px-4 py-2.5 capitalize text-slate-500 dark:text-slate-400 font-medium">
                  {p.category || 'General'}
                </td>

                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`font-bold ${
                      p.isOutOfStock
                        ? 'text-red-500'
                        : p.isLowStock
                        ? 'text-amber-500'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {p.isOutOfStock ? 'OUT' : `${p.totalStock} ${p.unit}`}
                  </span>
                  {p.isLowStock && !p.isOutOfStock && (
                    <span className="block text-[10px] text-amber-500 font-semibold">
                      Min: {p.minimumStock}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2.5">
                  {days === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className={`font-semibold ${expiryTone(days)}`}>
                      {new Date(p.nearestExpiry!).toLocaleDateString()}{' '}
                      <span className="text-[10px]">
                        {days < 0 ? '(expired)' : `(${days}d)`}
                      </span>
                    </span>
                  )}
                </td>

                <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  ${money(p.sellingPrice)}
                  {p.subUnit && p.subUnitPrice ? (
                    <span className="block text-[10px] text-slate-400 font-normal">
                      ${money(p.subUnitPrice)}/{p.subUnit}
                    </span>
                  ) : null}
                </td>

                <td className="px-4 py-2.5 text-right font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  ${money(p.stockValue)}
                </td>

                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-0.5">
                    <IconButton
                      icon={History}
                      tone="violet"
                      onClick={() => onOpenHistory(p)}
                      title="History & analytics"
                    />
                    <IconButton
                      icon={Layers}
                      tone="emerald"
                      onClick={() => onOpenBatches(p)}
                      title="Manage batches"
                    />
                    <IconButton
                      icon={Pencil}
                      tone="slate"
                      onClick={() => onEdit(p)}
                      title="Edit product"
                    />
                    <IconButton
                      icon={Trash2}
                      tone="red"
                      onClick={() => onDelete(p)}
                      title="Delete / disable product"
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}