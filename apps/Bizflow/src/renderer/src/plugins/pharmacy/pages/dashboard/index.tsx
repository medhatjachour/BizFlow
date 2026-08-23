import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'

import { usePharmacyDashboard } from './hooks/usePharmacyDashboard'
import { CashflowPulseBanner } from './components/CashflowPulseBanner'
import { DashboardKpiGrid } from './components/DashboardKpiGrid'
import { OperationalAlertsCard } from './components/OperationalAlertsCard'
import { TopSellingMedicinesCard } from './components/TopSellingMedicinesCard'
import { QuickActionShortcuts } from './components/QuickActionShortcuts'
import { DASHBOARD_PERIODS } from './constants'
import { computeOperationalAlerts } from './utils'

interface PharmacyDashboardProps {
  onNavigate?: (tab: string) => void
}

export default function PharmacyDashboard({ onNavigate }: PharmacyDashboardProps) {
  const toast = useToast()
  const { t } = useLanguage()
  const { can } = useAuth()
  const showProfit = can('view_profit')

  const {
    period,
    overview,
    cashflow,
    loading,
    setPeriod,
    reload,
  } = usePharmacyDashboard(toast)

  const alerts = useMemo(() => {
    if (!overview) return []
    return computeOperationalAlerts(overview, t)
  }, [overview, t])

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
        <p className="text-xs font-semibold">Loading pharmacy executive dashboard...</p>
      </div>
    )
  }

  if (!overview) return null

  return (
    <div className="p-4 space-y-4">
      {/* Top Quick Actions Bar */}
      <QuickActionShortcuts
        onNavigate={onNavigate}
        onRefresh={reload}
        loading={loading}
      />

      {/* Owner Cashflow & Critical Pulse */}
      <CashflowPulseBanner cashflow={cashflow} onNavigate={onNavigate} />

      {/* Scope Period Pill Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {DASHBOARD_PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                period === p.value
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <DashboardKpiGrid
        overview={overview}
        period={period}
        showProfit={showProfit}
      />

      {/* Operational Attention Required Alerts */}
      <OperationalAlertsCard alerts={alerts} onNavigate={onNavigate} />

      {/* Top Dispensed Medicines Breakdown */}
      <TopSellingMedicinesCard
        products={overview.sales?.topProducts ?? []}
        period={period}
      />
    </div>
  )
}