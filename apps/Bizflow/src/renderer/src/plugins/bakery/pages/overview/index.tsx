import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDailyOverview } from './hooks/useDailyOverview'
import { Header } from './components/Header'
import { KpiStrip } from './components/KpiStrip'
import { TodayProductionBanner } from './components/TodayProductionBanner'
import { PantryGuidanceBanner } from './components/PantryGuidanceBanner'
import { CapacitySection } from './components/CapacitySection'
import { ScheduleTable } from './components/ScheduleTable'
import { AlertsPanel } from './components/AlertsPanel'

export interface DailyOverviewTabProps {
  onEndOfDay?: () => void
}

export default function DailyOverviewTab({ onEndOfDay }: DailyOverviewTabProps) {
  const { t } = useLanguage()
  const [, setShowEODModal] = useState(false)

  const {
    data,
    loading,
    error,
    lastRefresh,
    capFilter,
    setCapFilter,
    searchQuery,
    setSearchQuery,
    expandedIds,
    toggleExpand,
    refresh,
    derived,
    filteredCapacity
  } = useDailyOverview()

  const handleOpenEOD = () => {
    if (onEndOfDay) onEndOfDay()
    setShowEODModal(true)
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t('bakeryLoadingRecipes')}
        </p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/40 p-5 text-rose-700 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6 shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-sm">Error Loading Dashboard</p>
          <p className="text-xs mt-0.5">{error}</p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
        >
          {t('bakeryRetry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <Header
        lastRefresh={lastRefresh}
        loading={loading}
        onRefresh={refresh}
        onOpenEOD={handleOpenEOD}
      />

      {/* KPI Cards */}
      <KpiStrip data={data} derived={derived} />

      {/* Today's Fresh Production summary */}
      <TodayProductionBanner
        batches={data?.todayBatches ?? []}
        totalUnits={derived?.todayProduced ?? 0}
      />

      {/* Guidance Banner if pantry is unlinked */}
      <PantryGuidanceBanner show={derived?.allUnlinked ?? false} />

      {/* Optional Financials / P&L Dropdown Area */}

      {/* Capacity: What Can We Make? */}
      <CapacitySection
        capacityList={filteredCapacity}
        totalRecipes={data?.capacity.length ?? 0}
        readyCount={derived?.ready.length ?? 0}
        limitedCount={derived?.limited.length ?? 0}
        blockedCount={derived?.blocked.length ?? 0}
        filter={capFilter}
        onFilterChange={setCapFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
      />

      {/* Schedule & Urgent Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <ScheduleTable
            scheduled={data?.scheduled ?? []}
            capacity={data?.capacity ?? []}
          />
        </div>
        <div>
          <AlertsPanel
            expiring={data?.expiringBatches ?? []}
            lowStock={data?.lowStock ?? []}
            reorderNeeded={data?.reorderNeeded ?? []}
          />
        </div>
      </div>

      {/* End of Day Reconciliation Modal */}
   
    </div>
  )
}