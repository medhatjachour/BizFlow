import React from 'react'
import {
  ChevronDown,
  ChevronUp,
  PackagePlus,
  History,
  Pencil,
  Trash2,
  XCircle,
  Boxes
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ExpiryBadge } from './ExpiryBadge'
import { formatCurrency, daysUntil } from '../utils'
import type { Medicine, Batch } from '../types'

interface MedicineCardProps {
  medicine: Medicine
  expanded: boolean
  onToggle: () => void
  onReceiveBatch: () => void
  onEditMedicine: () => void
  onDeleteMedicine: () => void
  onViewHistory: () => void
  onEditBatch: (batch: Batch) => void
  onDisposeBatch: (batch: Batch) => void
  onDeleteBatch: (batch: Batch) => void
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  expanded,
  onToggle,
  onReceiveBatch,
  onEditMedicine,
  onDeleteMedicine,
  onViewHistory,
  onEditBatch,
  onDisposeBatch,
  onDeleteBatch
}) => {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onToggle}
            className="p-1.5 mt-0.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white text-sm">{medicine.name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 capitalize font-medium">
                {medicine.category}
              </span>
              {medicine.hasExpired && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold">
                  {t('vetExpiredBadge') || 'Expired'}
                </span>
              )}
              {!medicine.hasExpired && medicine.expiresWithin30Days && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold">
                  {t('vetExpiringSoon') || 'Expiring soon'}
                </span>
              )}
              {medicine.isLowStock && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold">
                  {t('vetLowStockBadge') || 'Low stock'}
                </span>
              )}
            </div>

            {medicine.description && (
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{medicine.description}</p>
            )}

            {medicine.subUnit && medicine.subUnitsPerContainer && (
              <p className="text-[11px] text-slate-400">
                1 {medicine.unit} = {medicine.subUnitsPerContainer} {medicine.subUnit}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-700/50">
          <div className="text-center">
            <p className={`text-base font-bold ${medicine.isLowStock ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
              {medicine.totalStock} <span className="text-xs font-normal text-slate-400">{medicine.unit}</span>
            </p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Stock</p>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{medicine.activeBatchCount}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('vetBatchesLabel') || 'batches'}
            </p>
          </div>

          <div className="text-right">
            <ExpiryBadge date={medicine.nearestExpiry} qty={medicine.totalStock} />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              {t('vetNearestLabel') || 'nearest'}
            </p>
          </div>

          <div className="flex items-center gap-1 border-l pl-3 border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onViewHistory}
              title={t('vetViewHistory') || 'View history'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <History size={15} />
            </button>
            <button
              type="button"
              onClick={onReceiveBatch}
              title="Receive batch"
              className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
            >
              <PackagePlus size={15} />
            </button>
            <button
              type="button"
              onClick={onEditMedicine}
              title="Edit"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onDeleteMedicine}
              title="Delete"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40">
          {medicine.batches.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Boxes className="w-6 h-6 stroke-1 text-slate-300" />
              <span>{t('vetNoBatches') || 'No batches yet'} — </span>
              <button
                type="button"
                onClick={onReceiveBatch}
                className="text-xs font-semibold text-violet-600 hover:underline"
              >
                {t('vetReceiveFirstBatch') || 'receive the first batch'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100/50 dark:bg-slate-800/80">
                    <th className="py-2.5 px-4">{t('vetBatchNumHeader') || 'Batch #'}</th>
                    <th className="py-2.5 px-4">{t('vetExpiryHeader') || 'Expiry'}</th>
                    <th className="py-2.5 px-4">{t('vetRemainingHeader') || 'Remaining'}</th>
                    <th className="py-2.5 px-4">{t('vetInitialHeader') || 'Initial'}</th>
                    <th className="py-2.5 px-4">{t('vetCostUnitHeader') || 'Cost/unit'}</th>
                    <th className="py-2.5 px-4">{t('vetSellPriceHeader') || 'Sell price'}</th>
                    <th className="py-2.5 px-4">{t('vetValueHeader') || 'Stock value'}</th>
                    <th className="py-2.5 px-4">{t('vetBatchSupplier') || 'Supplier'}</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {medicine.batches.map(b => {
                    const days = daysUntil(b.expiryDate)
                    const isExp = days < 0
                    const stockValue = b.quantity * (b.costPerUnit ?? 0)
                    const margin =
                      b.sellingPrice && b.costPerUnit && b.costPerUnit > 0
                        ? ((b.sellingPrice - b.costPerUnit) / b.costPerUnit) * 100
                        : null

                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-white dark:hover:bg-slate-800/80 transition-colors ${
                          isExp ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                          {b.batchNumber ?? '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <ExpiryBadge date={b.expiryDate} qty={b.quantity} />
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {b.quantity} <span className="text-slate-400 font-normal">{medicine.unit}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono">{b.initialQty}</td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                          {b.costPerUnit > 0 ? formatCurrency(b.costPerUnit) : '—'}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {b.sellingPrice != null ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-violet-600 dark:text-violet-400 font-semibold">
                                {formatCurrency(b.sellingPrice)}
                              </span>
                              {margin !== null && (
                                <span
                                  className={`text-[10px] font-semibold px-1 rounded ${
                                    margin >= 0
                                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                                      : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                                  }`}
                                >
                                  {margin >= 0 ? '+' : ''}
                                  {margin.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {stockValue > 0 ? formatCurrency(stockValue) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{b.supplier ?? '—'}</td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onEditBatch(b)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <Pencil size={13} />
                            </button>
                            {isExp && b.quantity > 0 && b.status !== 'disposed' && (
                              <button
                                type="button"
                                onClick={() => onDisposeBatch(b)}
                                title={t('vetWriteOffTitle') || 'Write off'}
                                className="p-1 rounded text-rose-400 hover:text-rose-600"
                              >
                                <XCircle size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteBatch(b)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}