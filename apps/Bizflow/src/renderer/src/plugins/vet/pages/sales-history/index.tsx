import { useState } from 'react'
import { Receipt, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

import { useSalesHistory } from './hooks/useSalesHistory'
import type { Sale, RefundTarget } from './types'

import { HistoryFilterToolbar } from './components/HistoryFilterToolbar'
import { HistoryStatsKPI } from './components/HistoryStatsKPI'
import { SaleGroupCard } from './components/SaleGroupCard'
import { IndividualSalesTable } from './components/IndividualSalesTable'
import { HistoryPagination } from './components/HistoryPagination'
import { EditSaleModal } from './components/EditSaleModal'
import { RefundModal } from './components/RefundModal'

export default function SalesHistory() {
  const { t } = useLanguage()

  const {
    viewMode,
    setViewMode,
    sales,
    groups,
    totalRecords,
    loading,
    page,
    setPage,
    totalPages,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    search,
    setSearch,
    preset,
    applyPreset,
    category,
    setCategory,
    categories,
    hasActiveFilters,
    clearFilters,
    showFilters,
    setShowFilters,
    showStats,
    setShowStats,
    kpis,
    refreshHistory
  } = useSalesHistory()

  const [editTarget, setEditTarget] = useState<Sale | null>(null)
  const [refundTarget, setRefundTarget] = useState<RefundTarget | null>(null)

  const isListEmpty = viewMode === 'grouped' ? groups.length === 0 : sales.length === 0

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100/50 dark:bg-slate-950">
      {/* Search & Action Toolbar */}
      <HistoryFilterToolbar
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        preset={preset}
        onApplyPreset={applyPreset}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(v => !v)}
        showStats={showStats}
        onToggleStats={() => setShowStats(v => !v)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        category={category}
        categories={categories}
        onCategoryChange={setCategory}
      />

      {/* Summary KPI Cards */}
      {showStats && <HistoryStatsKPI viewMode={viewMode} kpis={kpis} />}

      {/* Main Records Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2 stroke-[2.5]" />
            <p className="text-xs font-semibold">Retrieving records…</p>
          </div>
        ) : isListEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <Receipt className="h-12 w-12 stroke-1 opacity-30 mb-3" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              {t('vetNoSalesFound') || 'No transactions found'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
              >
                Clear all applied filters
              </button>
            )}
          </div>
        ) : viewMode === 'grouped' ? (
          <div className="space-y-2.5 max-w-7xl mx-auto">
            {groups.map(g => (
              <SaleGroupCard
                key={g.groupKey}
                group={g}
                onPaid={refreshHistory}
                onEditItem={s => setEditTarget(s)}
                onRefundItem={s => setRefundTarget({ kind: 'sale', sale: s })}
                onRefundGroup={grp => setRefundTarget({ kind: 'group', group: grp })}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <IndividualSalesTable
              sales={sales}
              onPaid={refreshHistory}
              onEditSale={s => setEditTarget(s)}
              onRefundSale={s => setRefundTarget({ kind: 'sale', sale: s })}
            />
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && (
        <HistoryPagination
          page={page}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={setPage}
        />
      )}

      {/* Edit Line Item Modal */}
      {editTarget && (
        <EditSaleModal
          sale={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={refreshHistory}
        />
      )}

      {/* Refund Processor Modal */}
      {refundTarget && (
        <RefundModal
          target={refundTarget}
          onClose={() => setRefundTarget(null)}
          onDone={refreshHistory}
        />
      )}
    </div>
  )
}