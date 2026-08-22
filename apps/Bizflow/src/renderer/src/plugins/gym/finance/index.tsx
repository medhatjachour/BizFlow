import { useFinanceStats } from './hooks/useFinanceStats'
import { FinanceHeader } from './components/FinanceHeader'
import { FinanceSkeleton } from './components/FinanceSkeleton'
import { KpiMetricsGrid } from './components/KpiMetricsGrid'
import { RevenueBreakdownCard } from './components/RevenueBreakdownCard'
import { ExpenseCategoryCard } from './components/ExpenseCategoryCard'
import { ProfitComparisonCard } from './components/ProfitComparisonCard'

export default function GymFinanceSection() {
  const { period, setPeriod, stats, summary, loading, refresh } = useFinanceStats()

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1">
      {/* Top Bar with Period Controls and Actions */}
      <FinanceHeader
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={refresh}
        loading={loading}
        stats={stats}
        summary={summary}
      />

      {loading && !stats ? (
        <FinanceSkeleton />
      ) : stats ? (
        <div className="space-y-5">
          {/* Key Metric Highlights */}
          <KpiMetricsGrid stats={stats} />

          {/* Detailed Analytical Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RevenueBreakdownCard stats={stats} />
            <ExpenseCategoryCard summary={summary} />
          </div>

          {/* Revenue vs Expense Dynamic Bar & Net Margin */}
          <ProfitComparisonCard stats={stats} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            No financial metrics available
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try switching periods or verifying transaction synchronization.
          </p>
        </div>
      )}
    </div>
  )
}