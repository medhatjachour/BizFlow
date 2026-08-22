import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useGymDashboard } from './hooks/useGymDashboard'
import { DashboardHeader } from './components/DashboardHeader'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { KpiGridSection } from './components/KpiGridSection'
import { QuickActionsBar } from './components/QuickActionsBar'
import { AtRiskMembersCard } from './components/AtRiskMembersCard'
import { ExpiringSubsCard } from './components/ExpiringSubsCard'
import { VisitTrendCard } from './components/VisitTrendCard'
import { RevenueMetricsBar } from './components/RevenueMetricsBar'

interface Props {
  refreshSignal?: number
}

export default function GymDashboardSection({ refreshSignal }: Props) {
  const { t } = useLanguage()
  const { stats, atRisk, expiringSubs, loading, refresh } = useGymDashboard(refreshSignal)

  return (
    <div className="bg-white dark:bg-slate-800/95 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      {/* Top Header Command Bar */}
      <DashboardHeader stats={stats} loading={loading} onRefresh={refresh} />

      {loading && !stats ? (
        <DashboardSkeleton />
      ) : stats ? (
        <div className="p-5 space-y-5">
          {/* Main 8-Grid Bento KPI Metrics */}
          <KpiGridSection stats={stats} atRiskCount={atRisk.length} />

          {/* Quick Trigger Action Buttons */}
          <QuickActionsBar />

          {/* Retention & Churn Audits (At-Risk vs Expiring) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AtRiskMembersCard members={atRisk} />
            <ExpiringSubsCard subscriptions={expiringSubs} />
          </div>

          {/* Interactive Check-in Trajectory Chart */}
          {stats.visitTrend && stats.visitTrend.length > 0 && (
            <VisitTrendCard data={stats.visitTrend} />
          )}

          {/* Consolidated Financial Summary Strip */}
          <RevenueMetricsBar stats={stats} />
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t('gymNoDataAvailable') ?? 'No dashboard records currently available.'}
          </p>
        </div>
      )}
    </div>
  )
}