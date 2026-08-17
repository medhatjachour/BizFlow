import { Loader2 } from 'lucide-react'

import { useClinicStats } from './hooks/useClinicStats'
import { StatsToolbar } from './components/StatsToolbar'
import { StatsKpiGrid } from './components/StatsKpiGrid'
import { FinancialPerformanceBar } from './components/FinancialPerformanceBar'
import { AutomatedInsightsCard } from './components/AutomatedInsightsCard'
import { RevenueSessionTrendChart } from './components/RevenueSessionTrendChart'
import { MonthlyComparisonChart } from './components/MonthlyComparisonChart'
import { TopDiagnosesChart } from './components/TopDiagnosesChart'
import { PatientBreakdownDonuts } from './components/PatientBreakdownDonuts'
import { DoctorPerformanceTable } from './components/DoctorPerformanceTable'

export default function StatsTab() {
  const {
    trendDays,
    setTrendDays,
    overview,
    diagnoses,
    fullTrend,
    monthly,
    breakdowns,
    byDoctor,
    loading,
    refreshing,
    collectionRate,
    avgSessionValue,
    revenueTrend,
    sessionsTrend,
    insights,
    reload
  } = useClinicStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-28">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full">
      {/* Analytics Toolbar */}
      <StatsToolbar
        trendDays={trendDays}
        refreshing={refreshing}
        onSelectRange={setTrendDays}
        onRefresh={reload}
      />

      {/* 7-Card Overview Grid */}
      {overview && (
        <StatsKpiGrid
          overview={overview}
          collectionRate={collectionRate}
          sessionsTrendDir={sessionsTrend.dir}
          sessionsTrendPct={sessionsTrend.pct}
          revenueTrendDir={revenueTrend.dir}
          revenueTrendPct={revenueTrend.pct}
        />
      )}

      {/* Financial Health & Cashflow Gauge */}
      {overview && (
        <FinancialPerformanceBar
          overview={overview}
          collectionRate={collectionRate}
          avgSessionValue={avgSessionValue}
          revenueTrend={revenueTrend}
        />
      )}

      {/* Automated Advisory Insights */}
      <AutomatedInsightsCard insights={insights} />

      {/* Combined Revenue & Volume Area Trend */}
      <RevenueSessionTrendChart data={fullTrend} trendDays={trendDays} />

      {/* 6-Month Comparison & Top Diagnoses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MonthlyComparisonChart data={monthly} />
        <TopDiagnosesChart data={diagnoses} />
      </div>

      {/* Classification & Payment Donuts */}
      {breakdowns && <PatientBreakdownDonuts breakdowns={breakdowns} />}

      {/* Multidoctor Capacity & Contribution */}
      <DoctorPerformanceTable doctors={byDoctor} />
    </div>
  )
}