import { useMemo } from 'react'
import { PackageX, PackageMinus, AlertTriangle, DollarSign, ShoppingBag, CalendarClock, Loader2 } from 'lucide-react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

import { useVetStats } from './hooks/useVetStats'
import { VetStatsToolbar } from './components/VetStatsToolbar'
import { NeedsAttentionAlerts } from './components/NeedsAttentionAlerts'
import { OverviewKpiCards } from './components/OverviewKpiCards'
import { SpeciesMixCard } from './components/SpeciesMixCard'
import { SessionTypeComparisonCard } from './components/SessionTypeComparisonCard'
import { TopDiagnosesCard } from './components/TopDiagnosesCard'
import { MedicineSalesKpis } from './components/MedicineSalesKpis'
import { ProfitInventoryCard } from './components/ProfitInventoryCard'
import { MedicineProfitTable } from './components/MedicineProfitTable'
import { SalesBreakdownCard } from './components/SalesBreakdownCard'
import { ExpiryAlertsCard } from './components/ExpiryAlertsCard'
import { TopMedicinesRevenueCard } from './components/TopMedicinesRevenueCard'
import { ReorderListCard } from './components/ReorderListCard'
import { AttentionAlert } from './types'
import { formatCurrency } from './utils'

export default function VetStatsTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { can } = useAuth()
  const { t } = useLanguage()
  const showProfit = can('view_profit')

  const {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    loading,
    isRefreshing,
    refresh,
    overview,
    diagnoses,
    species,
    visitTypes,
    medSummary,
    profit,
    breakdown,
    pharmacyOutstanding,
    expiredBatches,
    expiring7Batches,
    expiring30Batches,
    expiredValue,
    expiring7Value,
    expiring30Value,
    totalExpiryValue,
    topExpired,
    lowStock,
    outOfStock
  } = useVetStats('month')

  const alerts = useMemo(() => {
    const sessionOutstanding = Number(overview?.outstanding) || 0
    const upcomingAppts = Number(overview?.upcomingAppts) || 0

    const list: (AttentionAlert | false)[] = [
      expiredBatches.length > 0 && {
        key: 'expired',
        tab: 'medicines',
        icon: PackageX,
        tone: 'red' as const,
        title: `${expiredBatches.length} expired ${expiredBatches.length === 1 ? 'batch' : 'batches'}`,
        sub: `${formatCurrency(expiredValue)} ${t('vetAtRisk') || 'at risk'} • ${t('vetReviewDispose') || 'review & dispose'}`
      },
      (outOfStock.length > 0 || lowStock.length > 0) && {
        key: 'stock',
        tab: 'medicines',
        icon: PackageMinus,
        tone: outOfStock.length > 0 ? ('red' as const) : ('amber' as const),
        title:
          outOfStock.length > 0
            ? `${outOfStock.length} ${t('vetOutOfStock') || 'out of stock'}${lowStock.length ? `, ${lowStock.length} low` : ''}`
            : `${lowStock.length} ${t('vetLowStock') || 'low on stock'}`,
        sub: t('vetReorderSoon') || 'Reorder to prevent shortages'
      },
      expiring7Batches.length > 0 && {
        key: 'expiring',
        tab: 'medicines',
        icon: AlertTriangle,
        tone: 'amber' as const,
        title: `${expiring7Batches.length} ${t('vetExpiringSoon') || 'expiring in 7 days'}`,
        sub: `${formatCurrency(expiring7Value)} • Prioritize dispensing`
      },
      sessionOutstanding > 0.005 && {
        key: 'sessionsDue',
        tab: 'sessions',
        icon: DollarSign,
        tone: 'amber' as const,
        title: `${formatCurrency(sessionOutstanding)} ${t('vetSessionsUnpaid') || 'unpaid clinical balance'}`,
        sub: t('vetCollectPayments') || 'Collect balances'
      },
      pharmacyOutstanding > 0.005 && {
        key: 'pharmacyDue',
        tab: 'sales',
        icon: ShoppingBag,
        tone: 'amber' as const,
        title: `${formatCurrency(pharmacyOutstanding)} ${t('vetPharmacyUnpaid') || 'unpaid pharmacy invoices'}`,
        sub: t('vetSettleFromOwner') || 'Settle from owner accounts'
      },
      upcomingAppts > 0 && {
        key: 'appts',
        tab: 'appointments',
        icon: CalendarClock,
        tone: 'sky' as const,
        title: `${upcomingAppts} ${t('vetUpcomingAppointments') || 'upcoming appointments'}`,
        sub: t('vetReviewSchedule') || 'Inspect calendar agenda'
      }
    ]

    return list.filter(Boolean) as AttentionAlert[]
  }, [expiredBatches, expiring7Batches, expiredValue, expiring7Value, outOfStock, lowStock, overview, pharmacyOutstanding, t])

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Dynamic Header & Filter Toolbar */}
      <VetStatsToolbar
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customRange.from}
        customTo={customRange.to}
        onCustomChange={(from, to) => setCustomRange({ from, to })}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Analyzing Clinic Telemetry...</p>
        </div>
      ) : !overview ? null : (
        <>
          {/* Action Signals */}
          <NeedsAttentionAlerts alerts={alerts} onNavigate={onNavigate} />

          {/* High-Level Clinic Overview KPIs */}
          <OverviewKpiCards overview={overview} />

          {/* Clinical Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SpeciesMixCard species={species} />
            <SessionTypeComparisonCard visitTypes={visitTypes} />
            <TopDiagnosesCard diagnoses={diagnoses} />
          </div>

          {/* Pharmacy & Medicine Insights */}
          {medSummary && (
            <div className="space-y-6">
              <MedicineSalesKpis medSummary={medSummary} showProfit={showProfit} />

              {showProfit && profit && (
                <>
                  <ProfitInventoryCard profit={profit} />
                  <MedicineProfitTable profit={profit} />
                </>
              )}

              {breakdown && <SalesBreakdownCard breakdown={breakdown} />}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExpiryAlertsCard
                  expiredBatches={expiredBatches}
                  expiring7Batches={expiring7Batches}
                  expiring30Batches={expiring30Batches}
                  expiredValue={expiredValue}
                  expiring7Value={expiring7Value}
                  expiring30Value={expiring30Value}
                  totalExpiryValue={totalExpiryValue}
                  topExpired={topExpired}
                />
                <TopMedicinesRevenueCard medSummary={medSummary} />
              </div>

              <ReorderListCard outOfStock={outOfStock} lowStock={lowStock} onNavigate={onNavigate} />
            </div>
          )}
        </>
      )}
    </div>
  )
}