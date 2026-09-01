/**
 * InventoryTable Component
 * Virtualized table with sortable columns and skeleton loading
 */

import { ArrowUpDown, ChevronRight, Package2, Image as ImageIcon } from 'lucide-react'
import type { InventorySortOptions, SortField } from '../types'
import type { InventoryItem } from '@/shared/types'
import { TableSkeleton } from '@renderer/components/ui/SkeletonVariants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  items: InventoryItem[]
  loading: boolean
  sortOptions: InventorySortOptions
  onSortChange: (options: InventorySortOptions) => void
  onItemClick: (item: InventoryItem) => void
}

export default function InventoryTable({ items, loading, sortOptions, onSortChange, onItemClick }: Props) {
  const { t } = useLanguage()
  const handleSort = (field: SortField) => {
    onSortChange({
      field,
      direction: sortOptions.field === field && sortOptions.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  const getStockStatusBadge = (status: string) => {
    const badges = {
      out: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
      low: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
      normal: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900',
      high: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
    }
    const labels = {
      out: t('inventoryUiOutOfStock'),
      low: t('inventoryUiLowStock'),
      normal: t('inventoryUiNormalStock'),
      high: t('inventoryUiHighStock')
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold whitespace-nowrap ${badges[status as keyof typeof badges] || badges.normal}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortOptions.field !== field) return <ArrowUpDown size={14} className="opacity-30" />
    return <ArrowUpDown size={14} className={sortOptions.direction === 'desc' ? 'rotate-180' : ''} />
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto p-4 bg-white dark:bg-slate-900">
        <TableSkeleton rows={10} columns={6} showHeader />
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900">
        <div className="text-center max-w-xs px-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Package2 className="text-slate-400" size={22} />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            {t('inventoryUiNoMatches')}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('inventoryUiNoMatchesDescription')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-white dark:bg-slate-900">
      <table className="w-full min-w-[780px] text-left border-collapse">
        <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 z-10">
          <tr>
            <th className="px-4 py-2.5 text-left min-w-[280px]">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-600 transition-colors"
              >
                {t('Product')}
                <SortIcon field="name" />
              </button>
            </th>
            <th className="hidden lg:table-cell px-4 py-2.5 text-left">
              <button
                onClick={() => handleSort('category')}
                className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-600 transition-colors"
              >
                {t('Category')}
                <SortIcon field="category" />
              </button>
            </th>
            <th className="px-4 py-2.5 text-right">
              <button
                onClick={() => handleSort('totalStock')}
                className="flex items-center justify-end gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-600 transition-colors ml-auto"
              >
                {t('OnHand')}
                <SortIcon field="totalStock" />
              </button>
            </th>
            <th className="px-4 py-2.5 text-left min-w-[112px]">
              <span className="text-[10px] font-bold uppercase text-slate-500">{t('Health')}</span>
            </th>
            <th className="px-4 py-2.5 text-right">
              <button
                onClick={() => handleSort('basePrice')}
                className="flex items-center justify-end gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-600 transition-colors ml-auto"
              >
                {t('UnitPrice')}
                <SortIcon field="basePrice" />
              </button>
            </th>
            <th className="hidden xl:table-cell px-4 py-2.5 text-right">
              <button
                onClick={() => handleSort('stockValue')}
                className="flex items-center justify-end gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-600 transition-colors ml-auto"
              >
                {t('InventoryValue')}
                <SortIcon field="stockValue" />
              </button>
            </th>
            <th className="hidden 2xl:table-cell px-4 py-2.5 text-right">
              <button
                onClick={() => handleSort('updatedAt')}
                className="flex items-center justify-end gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-600 transition-colors ml-auto"
              >
                {t('Updated')}
                <SortIcon field="updatedAt" />
              </button>
            </th>
            <th className="w-10" aria-label={t('inventoryUiOpenDetails')} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onItemClick(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onItemClick(item)
              }}
              tabIndex={0}
              className="group hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 focus-visible:bg-emerald-50 dark:focus-visible:bg-emerald-950/20 focus-visible:outline-none cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex items-center justify-center border border-slate-200/70 dark:border-slate-700">
                    {item.images?.[0] ? (
                      <img src={item.images[0].imageData} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={17} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[260px]">{item.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-mono">{item.baseSKU}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                      <span>{item.variantCount} {t(item.variantCount === 1 ? 'inventoryUiVariant' : 'inventoryUiVariants')}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden lg:table-cell px-4 py-3">
                <span className="text-xs text-slate-600 dark:text-slate-300">{item.category || t('uncategorized')}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{item.totalStock.toLocaleString()}</span>
                <span className="block text-[9px] uppercase text-slate-400">{t('inventoryUiUnits')}</span>
              </td>
              <td className="px-4 py-3">
                {getStockStatusBadge(item.stockStatus)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">${item.basePrice.toFixed(2)}</span>
                <span className="block text-[9px] text-slate-400">{t('inventoryUiCost')} ${item.baseCost.toFixed(2)}</span>
              </td>
              <td className="hidden xl:table-cell px-4 py-3 text-right">
                <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">${item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </td>
              <td className="hidden 2xl:table-cell px-4 py-3 text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </td>
              <td className="pr-3 text-right">
                <ChevronRight size={15} className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
