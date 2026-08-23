import { useWarehouseDashboardData } from './hooks/useWarehouseDashboardData'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { DashboardHero } from './components/DashboardHero'
import { DashboardKPIs } from './components/DashboardKPIs'
import { TransferTrendCard } from './components/TransferTrendCard'
import { LocationUtilizationCard } from './components/LocationUtilizationCard'
import { TransferPipelineCard } from './components/TransferPipelineCard'
import { CriticalStockAlertsCard } from './components/CriticalStockAlertsCard'
import { QuickNavShortcuts } from './components/QuickNavShortcuts'

interface Props {
  refreshSignal?: number
}

export default function WarehouseDashboardSection({ refreshSignal }: Props) {
  const {
    raw,
    kpis,
    trendData,
    transferTrend,
    topLocations,
    loading,
    refresh
  } = useWarehouseDashboardData(refreshSignal)

  if (loading && raw.stockItems.length === 0) {
    return <DashboardSkeleton />
  }

  const doneToday = raw.todayTransfers.filter(t => t.status === 'completed').length

  return (
    <div className="space-y-5">
      {/* 1. Header Hero Banner */}
      <DashboardHero loading={loading} onRefresh={refresh} />

      {/* 2. Top Metric Cards */}
      <DashboardKPIs kpis={kpis} />

      {/* 3. Analytics & Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TransferTrendCard
          trendData={trendData}
          transferTrend={transferTrend}
          doneTodayCount={doneToday}
        />
        <LocationUtilizationCard locations={topLocations} />
        <TransferPipelineCard transfers={raw.todayTransfers} />
      </div>

      {/* 4. Critical Stock Alerts */}
      <CriticalStockAlertsCard items={raw.criticalItems} />

      {/* 5. Navigation Links */}
      <QuickNavShortcuts />
    </div>
  )
}