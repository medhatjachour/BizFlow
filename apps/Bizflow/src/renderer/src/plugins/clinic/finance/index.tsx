import React, { useState } from 'react'

import { useClinicFinanceOverview } from './hooks/useClinicFinanceOverview'
import { useClinicRevenue } from './hooks/useClinicRevenue'
import { useClinicMaterialsFinance } from './hooks/useClinicMaterialsFinance'

import { FinanceHeader } from './components/FinanceHeader'
import { FinanceTabNav } from './components/FinanceTabNav'
import { OverviewTabContent } from './components/OverviewTabContent'
import { RevenueTabContent } from './components/RevenueTabContent'
import { MaterialsFinanceContent } from './components/MaterialsFinanceContent'

import type { MainTab, Period } from './types'

export const ClinicFinanceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('overview')
  const [period, setPeriod] = useState<Period>('month')

  // Hook 1: Overview
  const {
    summary: overviewSummary,
    breakdown: spendBreakdown,
    loading: loadingOverview,
    reload: reloadOverview
  } = useClinicFinanceOverview(period)

  // Hook 2: Revenue & Debtors
  const {
    debtPatients,
    debtMeta,
    debtSearchInput,
    debtSearch,
    revBreakdown,
    loading: loadingRevenue,
    loadingMore: loadingMoreDebt,
    setDebtSearchInput,
    loadMore: loadMoreDebt,
    reload: reloadRevenue
  } = useClinicRevenue(period, activeTab === 'revenue')

  // Hook 3: Materials Valuation
  const {
    matFinance,
    loading: loadingMaterials,
    reload: reloadMaterials
  } = useClinicMaterialsFinance(period, activeTab === 'materials')

  const handleGlobalRefresh = () => {
    reloadOverview()
    if (activeTab === 'revenue') reloadRevenue()
    if (activeTab === 'materials') reloadMaterials()
  }

  const isGlobalLoading = loadingOverview || loadingRevenue || loadingMaterials

  return (
    <div className="space-y-0 max-w-7xl mx-auto w-full">
      {/* Global Header Bar */}
      <FinanceHeader
        period={period}
        loading={isGlobalLoading}
        onSelectPeriod={setPeriod}
        onRefresh={handleGlobalRefresh}
      />

      {/* Tab Navigation */}
      <FinanceTabNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Tab 1: Financial Overview */}
      {activeTab === 'overview' && (
        <OverviewTabContent
          summary={overviewSummary}
          breakdown={spendBreakdown}
          loading={loadingOverview}
          period={period}
        />
      )}

      {/* Tab 2: Revenue & Patient Debtors */}
      {activeTab === 'revenue' && (
        <RevenueTabContent
          summary={overviewSummary}
          debtPatients={debtPatients}
          debtMeta={debtMeta}
          debtSearchInput={debtSearchInput}
          debtSearch={debtSearch}
          revBreakdown={revBreakdown}
          loading={loadingRevenue}
          loadingMore={loadingMoreDebt}
          period={period}
          onSearchChange={setDebtSearchInput}
          onLoadMore={loadMoreDebt}
          onRefresh={reloadRevenue}
        />
      )}

      {/* Tab 3: Materials & Inventory Valuation */}
      {activeTab === 'materials' && (
        <MaterialsFinanceContent
          matFinance={matFinance}
          loading={loadingMaterials}
        />
      )}
    </div>
  )
}

export default ClinicFinanceSection