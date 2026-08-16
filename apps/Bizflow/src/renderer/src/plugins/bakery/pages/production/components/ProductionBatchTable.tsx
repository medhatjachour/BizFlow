import React from 'react'
import { Factory, ShoppingBag, Flame, Trash2, Clock, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Pagination from '../../components/Pagination'
import { ProductionBatch, PagedBatchesResult } from '../types'
import { formatCurrency, formatDate, getExpiryStatus } from '../utils'
import { PRODUCTION_PAGE_SIZES } from '../constants'

interface Props {
  batches: ProductionBatch[]
  pagedBatches: PagedBatchesResult | null
  loading: boolean
  page: number
  onPageChange: (p: number) => void
  pageSize: number
  onPageSizeChange: (ps: number) => void
  onSellClick: (batch: ProductionBatch) => void
  onLossClick: (batch: ProductionBatch) => void
  onDeleteClick: (id: string) => void
  onLogProductionClick: () => void
}

export const ProductionBatchTable: React.FC<Props> = ({
  batches,
  pagedBatches,
  loading,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  onSellClick,
  onLossClick,
  onDeleteClick,
  onLogProductionClick,
}) => {
  const { t } = useLanguage()

  if (loading && !pagedBatches) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
        <p className="text-xs">{t('bakeryLoadingBatches') || 'Loading production batch records…'}</p>
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/30 px-6">
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
          <Factory className="h-8 w-8" />
        </div>
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">
          {t('bakeryNoProductionBatches') || 'No production runs recorded'}
        </p>
        <p className="text-xs mt-1 text-slate-400 max-w-sm">
          {t('bakeryNoProductionDesc') ||
            'Log completed bakes to produce ready-to-sell stock and deplete pantry raw ingredients.'}
        </p>
        <button
          onClick={onLogProductionClick}
          className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm active:scale-95"
        >
          {t('bakeryLogProduction') || 'Log First Batch'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3.5">{t('bakeryBatchDateRecipe') || 'Date / Recipe'}</th>
              <th className="px-4 py-3.5 text-right">{t('bakeryProduced') || 'Produced'}</th>
              <th className="px-4 py-3.5 text-right">{t('bakerySold') || 'Sold'}</th>
              <th className="px-4 py-3.5 text-right">{t('bakeryLoss') || 'Loss'}</th>
              <th className="px-4 py-3.5 text-right">{t('bakeryAvailable') || 'Available Stock'}</th>
              <th className="px-4 py-3.5 text-right">{t('bakeryCost') || 'Batch Cost'}</th>
              <th className="px-4 py-3.5">{t('bakeryExpiry') || 'Expiry'}</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {batches.map(batch => {
              const exp = getExpiryStatus(batch.expiresAt)
              const availPct =
                batch.unitsProduced > 0
                  ? Math.round(((batch.unitsAvailable ?? batch.unitsProduced) / batch.unitsProduced) * 100)
                  : 0

              return (
                <tr
                  key={batch.id}
                  className="hover:bg-slate-50/75 dark:hover:bg-slate-700/20 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {batch.recipe.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatDate(batch.batchDate)} · {batch.quantity} batch
                      {batch.quantity !== 1 ? 'es' : ''}
                    </div>
                    {batch.notes && (
                      <p className="text-xs text-slate-400 italic truncate max-w-xs mt-0.5">
                        {batch.notes}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    {batch.unitsProduced}{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      {batch.recipe.yieldUnit}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {(batch.unitsSold ?? 0).toLocaleString()}
                  </td>

                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                    {(batch.unitsLost ?? 0) > 0 ? (
                      batch.unitsLost.toLocaleString()
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div
                      className={`font-black tabular-nums ${
                        (batch.unitsAvailable ?? 0) > 0
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {(batch.unitsAvailable ?? 0).toLocaleString()}
                    </div>
                    {batch.unitsProduced > 0 && (
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden w-20 ml-auto">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${availPct}%` }}
                        />
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    ${formatCurrency(batch.totalCost)}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${exp.badgeClass}`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{exp.label}</span>
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {(batch.unitsAvailable ?? 0) > 0 && (
                        <>
                          <button
                            onClick={() => onSellClick(batch)}
                            title="Quick sell from batch"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-all"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>Sell</span>
                          </button>

                          <button
                            onClick={() => onLossClick(batch)}
                            title="Log loss or waste"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-all"
                          >
                            <Flame className="h-3.5 w-3.5" />
                            <span>Loss</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => onDeleteClick(batch.id)}
                        title="Delete batch"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pagedBatches && (
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <Pagination
            page={page}
            totalPages={pagedBatches.totalPages}
            total={pagedBatches.total}
            onPage={onPageChange}
            pageSize={pageSize}
            pageSizes={PRODUCTION_PAGE_SIZES}
            onPageSize={ps => onPageSizeChange(ps)}
          />
        </div>
      )}
    </div>
  )
}