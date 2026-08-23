import { Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { downloadCSV } from '../components/_shared'

import { usePharmacyReports } from './hooks/usePharmacyReports'
import { ReportHeaderControls } from './components/ReportHeaderControls'
import { SalesKpiGrid } from './components/SalesKpiGrid'
import { TopProductsPerformance } from './components/TopProductsPerformance'
import { ProfitMarginsBreakdown } from './components/ProfitMarginsBreakdown'
import { InventoryKpiGrid } from './components/InventoryKpiGrid'
import { CategoryValuationDistribution } from './components/CategoryValuationDistribution'
import { ExpiryRiskAuditCard } from './components/ExpiryRiskAuditCard'
import { buildSalesExportCSV, buildInventoryExportCSV } from './utils'

export default function PharmacyReports() {
  const toast = useToast()

  const {
    view,
    range,
    sales,
    inv,
    loading,
    setView,
    setRange,
    reload,
  } = usePharmacyReports(toast)

  const handleExportReport = () => {
    if (view === 'sales' && sales) {
      const csvData = buildSalesExportCSV(sales, range)
      downloadCSV(csvData, `pharmacy-sales-report-${range.from}_${range.to}.csv`)
      toast.success('Sales & Profitability report exported')
    } else if (view === 'inventory' && inv) {
      const csvData = buildInventoryExportCSV(inv)
      downloadCSV(csvData, `pharmacy-inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('Inventory valuation audit report exported')
    } else {
      toast.error('No report data available to export')
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Universal Header Controls */}
      <ReportHeaderControls
        view={view}
        range={range}
        loading={loading}
        onViewChange={setView}
        onRangeChange={setRange}
        onExport={handleExportReport}
        onRefresh={reload}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
          <p className="text-xs font-semibold">Generating analytics & financial metrics...</p>
        </div>
      ) : view === 'sales' && sales ? (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <SalesKpiGrid sales={sales} />

          {/* Detailed Performance Charts & Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopProductsPerformance products={sales.topProducts ?? []} />
            <ProfitMarginsBreakdown sales={sales} />
          </div>
        </div>
      ) : view === 'inventory' && inv ? (
        <div className="space-y-4">
          {/* Inventory Valuation KPI Cards */}
          <InventoryKpiGrid inv={inv} />

          {/* Category Spread & Expiry Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CategoryValuationDistribution categories={inv.byCategory ?? []} />
            <ExpiryRiskAuditCard inv={inv} />
          </div>
        </div>
      ) : null}
    </div>
  )
}