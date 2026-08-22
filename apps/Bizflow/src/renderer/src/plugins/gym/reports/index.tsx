import { useGymReports } from './hooks/useGymReports'
import { ReportHeader } from './components/ReportHeader'
import { ReportSkeleton } from './components/ReportSkeleton'
import { ReportKpiGrid } from './components/ReportKpiGrid'
import { FinancialSplitCards } from './components/FinancialSplitCards'
import { DailySessionsTable } from './components/DailySessionsTable'

interface Props {
  refreshSignal?: number
}

export default function GymReportSection({ refreshSignal }: Props) {
  const {
    period,
    setPeriod,
    selectedDate,
    setSelectedDate,
    stats,
    sessions,
    loading,
    filters,
    setFilters,
    refresh
  } = useGymReports(refreshSignal)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header with Date Picker, Period Switcher & Export */}
      <ReportHeader
        period={period}
        onPeriodChange={setPeriod}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={refresh}
        loading={loading}
        stats={stats}
        sessions={sessions}
      />

      {loading && !stats ? (
        <ReportSkeleton />
      ) : stats ? (
        <div className="space-y-5">
          {/* Main Key Metrics */}
          <ReportKpiGrid stats={stats} />

          {/* Revenue vs Outflow Splits */}
          <FinancialSplitCards stats={stats} />

          {/* Detailed Daily Session Log Table */}
          <DailySessionsTable
            sessions={sessions}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            No gym report metrics available for this selection
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Pick another date from the picker above or trigger a refresh.
          </p>
        </div>
      )}
    </div>
  )
}