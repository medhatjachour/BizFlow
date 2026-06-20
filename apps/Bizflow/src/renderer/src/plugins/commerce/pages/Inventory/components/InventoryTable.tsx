/**
 * InventoryTable Component
 * Virtualized table with sortable columns and skeleton loading
 */

import { ArrowUpDown, Package2, Image as ImageIcon } from 'lucide-react'
import type { InventorySortOptions, SortField } from '../types'
import { InventoryItem } from '@/shared/types'
import { TableSkeleton } from '@renderer/components/ui/SkeletonVariants'

interface Props {
  items: InventoryItem[]
  loading: boolean
  sortOptions: InventorySortOptions
  onSortChange: (options: InventorySortOptions) => void
  onItemClick: (item: InventoryItem) => void
}

export default function InventoryTable({ items, loading, sortOptions, onSortChange, onItemClick }: Props) {
  const handleSort = (field: SortField) => {
    onSortChange({
      field,
      direction: sortOptions.field === field && sortOptions.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  const getStockStatusBadge = (status: string) => {
    const badges = {
      out: 'bg-error/20 text-error',
      low: 'bg-accent/20 text-accent',
      normal: 'bg-blue-500/20 text-blue-600',
      high: 'bg-success/20 text-success'
    }
    const labels = {
      out: 'Out of Stock',
      low: 'Low Stock',
      normal: 'Normal',
      high: 'High Stock'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortOptions.field !== field) return <ArrowUpDown size={14} className="opacity-30" />
    return <ArrowUpDown size={14} className={sortOptions.direction === 'desc' ? 'rotate-180' : ''} />
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto p-6">
        <TableSkeleton rows={10} columns={7} showHeader />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Package2 className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-600 dark:text-slate-400">No items found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
          <tr>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Image</span>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('baseSKU')}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                SKU
                <SortIcon field="baseSKU" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                Product Name
                <SortIcon field="name" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('category')}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                Category
                <SortIcon field="category" />
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Variants</span>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort('totalStock')}
                className=" flex items-center justify-end gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors ml-auto"
              >
                Total Stock
                <SortIcon field="totalStock" />
              </button>
            </th>
            <th className="px-4 py-3 text-center min-w-[120px]">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</span>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort('basePrice')}
                className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors ml-auto"
              >
                Price
                <SortIcon field="basePrice" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort('stockValue')}
                className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors ml-auto"
              >
                Stock Value
                <SortIcon field="stockValue" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort('updatedAt')}
                className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors ml-auto"
              >
                Last Updated
                <SortIcon field="updatedAt" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onItemClick(item)}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
                  {item.images && item.images.length > 0 && item.images[0] ? (
                    <img src={item.images[0].imageData} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} className="text-slate-400" />
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-sm text-slate-900 dark:text-white">{item.baseSKU}</span>
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{item.description}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.category || 'Uncategorized'}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm font-medium text-slate-900 dark:text-white">{item.variantCount}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{item.totalStock}</span>
              </td>
              <td className="px-4 py-3 text-center min-w-[120px]">
                {getStockStatusBadge(item.stockStatus)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-medium text-slate-900 dark:text-white">${item.basePrice.toFixed(2)}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-semibold text-primary">${item.stockValue.toFixed(2)}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
