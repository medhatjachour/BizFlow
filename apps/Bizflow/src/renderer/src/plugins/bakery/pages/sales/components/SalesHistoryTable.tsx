import React from 'react'
import { Calendar, Filter, X, Package, Trash2, Loader2, ShoppingBag } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Pagination from '../../components/Pagination'
import { PagedSalesResult, Recipe } from '../types'
import { formatCurrency, formatDate } from '../utils'
import { HISTORY_PAGE_SIZES } from '../constants'

interface Props {
  paged: PagedSalesResult | null
  recipes: Recipe[]
  loading: boolean
  filterRecipe: string
  onFilterRecipeChange: (id: string) => void
  filterStart: string
  onFilterStartChange: (d: string) => void
  filterEnd: string
  onFilterEndChange: (d: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  onClearFilters: () => void
  onPageChange: (p: number) => void
  pageSize: number
  onPageSizeChange: (ps: number) => void
  onDeleteClick: (id: string) => void
}

export const SalesHistoryTable: React.FC<Props> = ({
  paged,
  recipes,
  loading,
  filterRecipe,
  onFilterRecipeChange,
  filterStart,
  onFilterStartChange,
  filterEnd,
  onFilterEndChange,
  showFilters,
  onToggleFilters,
  onClearFilters,
  onPageChange,
  pageSize,
  onPageSizeChange,
  onDeleteClick,
}) => {
  const { t } = useLanguage()
  const hasFilters = Boolean(filterRecipe || filterStart || filterEnd)
  const pageSubtotal = paged?.data?.reduce((sum, item) => sum + item.totalAmount, 0) ?? 0

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>{t('bakerySaleHistory') || 'Sales Transactions'}</span>
        </h2>

        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 font-semibold"
            >
              <X className="h-3.5 w-3.5" /> {t('bakeryClearFilters') || 'Clear'}
            </button>
          )}

          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              showFilters
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{showFilters ? t('bakerySaleHideFilters') || 'Hide Filters' : t('bakerySaleFilters') || 'Filters'}</span>
            {hasFilters && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </button>
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Recipe
              </label>
              <select
                value={filterRecipe}
                onChange={e => onFilterRecipeChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
              >
                <option value="">All recipes</option>
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filterStart}
                onChange={e => onFilterStartChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filterEnd}
                onChange={e => onFilterEndChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table Body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
          <p className="text-xs">{t('bakerySaleLoading') || 'Loading sales records…'}</p>
        </div>
      ) : !paged || paged.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center px-6">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">
            {t('bakerySaleNoSales') || 'No sales transactions recorded'}
          </p>
          <p className="text-xs mt-1 text-slate-400 max-w-sm">
            {t('bakerySaleNoSalesDesc') || 'Use the POS Sell tab to record orders and batch deplete stock.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Item</th>
                  <th className="px-4 py-3.5">Source Batch</th>
                  <th className="px-4 py-3.5 text-right">Qty</th>
                  <th className="px-4 py-3.5 text-right">Unit Price</th>
                  <th className="px-4 py-3.5 text-right">Total</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {paged.data.map(sale => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-700/20 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {sale.itemName}
                      </div>
                      {sale.recipe && (
                        <span className="mt-0.5 inline-flex items-center text-[10.5px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.2">
                          {sale.recipe.name}
                        </span>
                      )}
                      {sale.notes && (
                        <p className="mt-0.5 text-xs text-slate-400 italic truncate max-w-xs">
                          {sale.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {sale.batch ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full px-2.5 py-0.5">
                          <Package className="h-3 w-3" />
                          {formatDate(sale.batch.batchDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">
                          Custom Sale
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      {sale.quantity.toLocaleString()}
                      {sale.recipe?.yieldUnit && (
                        <span className="ml-1 text-xs text-slate-400 font-normal">
                          {sale.recipe.yieldUnit}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                      ${formatCurrency(sale.unitPrice)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ${formatCurrency(sale.totalAmount)}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(sale.saleDate)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => onDeleteClick(sale.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50">
                  <td
                    colSpan={4}
                    className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 text-right uppercase tracking-wider"
                  >
                    Page Subtotal ({paged.data.length} records)
                  </td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700 dark:text-emerald-300 tabular-nums text-base">
                    ${formatCurrency(pageSubtotal)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700">
            <Pagination
              page={paged.page}
              totalPages={paged.totalPages}
              total={paged.total}
              onPage={onPageChange}
              pageSize={pageSize}
              pageSizes={HISTORY_PAGE_SIZES}
              onPageSize={ps => onPageSizeChange(ps)}
            />
          </div>
        </>
      )}
    </div>
  )
}