import { useState, useCallback } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useSales, useCategories } from './hooks/useSales'
import { exportToCSV } from './utils'
import { SummaryCards } from './components/SummaryCards'
import { PaymentBreakdown } from './components/PaymentBreakdown'
import { SalesFilters } from './components/SalesFilters'
import { SaleRow } from './components/SaleRow'
import { Pagination } from './components/Pagination'
import { EmptyState } from './components/EmptyState'
import { TopProducts } from './components/TopProducts'
import { HourlyChart } from './components/HourlyChart'
import type { SalesFilters as Filters, Sale } from './types'
import { RefundModal } from './components/RefundModal'

function getPeriods(t: any) {
  return [
    { label: t('cfToday'), value: 'today' },
    { label: t('cfWeek'), value: 'week' },
    { label: t('cfMonth'), value: 'month' },
    { label: t('cfAllTime'), value: 'all' }
  ]
}

export default function SalesTab() {
  const { t } = useLanguage()
  const periods = getPeriods(t)
  const categories = useCategories()

  const [filters, setFilters] = useState<Filters>({
    period: 'today',
    paymentMethod: 'all',
    type: 'all',
    categoryId: 'all',
    search: '',
    sort: 'date_desc'
  })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Inside SalesTab component:
  const [refundOrder, setRefundOrder] = useState<Sale | null>(null)
  const { sales, summary, loading, page, totalPages, total, setPage, reload } = useSales(filters)

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleExport = useCallback(() => {
    exportToCSV(sales, `sales-${filters.period}-${new Date().toISOString().split('T')[0]}.csv`)
  }, [sales, filters.period])

  return (
    <div className="space-y-4 p-4  mx-auto">
      {/* Filters */}
      <SalesFilters
        filters={filters}
        onChange={updateFilters}
        onRefresh={reload}
        onExport={handleExport}
        categories={categories}
        loading={loading}
        periods={periods}
      />

      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Breakdown + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <PaymentBreakdown summary={summary} />
        </div>
        <div className="space-y-3">
          <TopProducts summary={summary} />
        </div>
      </div>

      {/* Hourly Chart */}
      <HourlyChart summary={summary} />

      {/* Sales List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Orders
            <span className="ml-2 text-xs font-normal text-slate-400">({total} total)</span>
          </h2>
        </div>

        {sales.length === 0 ? (
          <EmptyState loading={loading} />
        ) : (
          <>
            {sales.map((sale) => (
              <SaleRow
                key={sale.id}
                sale={sale}
                expanded={expanded.has(sale.id)}
                onToggle={() => toggleExpand(sale.id)}
                onRefund={(s) => setRefundOrder(s)}
              />
            ))}
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </div>
      {/* Refund Modal */}
      {refundOrder && (
        <RefundModal 
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={reload}
        />
      )}
    </div>
  )
}
