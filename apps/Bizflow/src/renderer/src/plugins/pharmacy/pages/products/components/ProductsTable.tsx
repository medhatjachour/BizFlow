import React from 'react'
import { History, Layers, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { PharmacyProductItem } from '../types'
import { money, expiryTone } from '../../components/_shared'
import { IconButton } from '../../components/ui'
import { computeExpiryDays } from '../utils'
import { unitLabelKey } from '../../components/units'

interface ProductsTableProps {
  products: PharmacyProductItem[]
  loading: boolean
  onOpenHistory: (p: PharmacyProductItem) => void
  onOpenBatches: (p: PharmacyProductItem) => void
  onEdit: (p: PharmacyProductItem) => void
  onDelete: (p: PharmacyProductItem) => void
  t: (k: string, params?: Record<string, any>) => string
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
        <p className="text-xs">{t('phPrLoadingCatalog')}</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-sm font-medium">{t('phNoProducts')}</p>
        <p className="text-xs mt-0.5">{t('phPrEmptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold bg-slate-50/40 dark:bg-slate-900/30">
            <th className="px-4 py-3">{t('phPrNameFormula')}</th>
            <th className="px-4 py-3">{t('Category')}</th>
            <th className="px-4 py-3 text-right">{t('phPrAvailableStock')}</th>
            <th className="px-4 py-3">{t('vetExpiry')}</th>
            <th className="px-4 py-3 text-right">{t('UnitPrice')}</th>
            <th className="px-4 py-3 text-right">{t('inventoryUiStockValue')}</th>
            <th className="px-4 py-3 text-right">{t('actions')}</th>
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
                      <span title={t('phPrHasExpired')}>
                        <AlertTriangle size={12} className="text-red-500" />
                      </span>
                    )}
                  </div>
                  {p.genericName && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">{p.genericName}</p>
                  )}
                </td>

                <td className="px-4 py-2.5 capitalize text-slate-500 dark:text-slate-400 font-medium">
                  {p.category || t('phGeneralCategory')}
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
                    {p.isOutOfStock ? t('phOutBadge') : `${p.totalStock} ${t(unitLabelKey(p.unit))}`}
                  </span>
                  {p.isLowStock && !p.isOutOfStock && (
                    <span className="block text-[10px] text-amber-500 font-semibold">
                      {t('phMinLabel')}: {p.minimumStock}
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
                        {days < 0 ? t('phExpiredSuffix') : t('phDaysSuffix', { days })}
                      </span>
                    </span>
                  )}
                </td>

                <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  ${money(p.sellingPrice)}
                  {p.subUnit && p.subUnitPrice ? (
                    <span className="block text-[10px] text-slate-400 font-normal">
                      ${money(p.subUnitPrice)}/{t(unitLabelKey(p.subUnit))}
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
                      title={t('phPrHistoryAnalytics')}
                    />
                    <IconButton
                      icon={Layers}
                      tone="emerald"
                      onClick={() => onOpenBatches(p)}
                      title={t('phPrManageBatchesBtn')}
                    />
                    <IconButton
                      icon={Pencil}
                      tone="slate"
                      onClick={() => onEdit(p)}
                      title={t('editProduct')}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="red"
                      onClick={() => onDelete(p)}
                      title={t('phPrDeleteProduct')}
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