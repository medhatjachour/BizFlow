import { useState } from 'react'
import { FinanceTabType } from './types'
import { useFinanceData } from './hooks/useFinanceData'
import { FinanceSkeleton } from './components/FinanceSkeleton'
import { FinanceHero } from './components/FinanceHero'
import { FinanceTabSwitcher } from './components/FinanceTabSwitcher'
import { OverviewTabView } from './components/OverviewTabView'
import { ValuationTabView } from './components/ValuationTabView'
import { CriticalImpactTabView } from './components/CriticalImpactTabView'

export default function WarehouseFinanceSection() {
  const [activeTab, setActiveTab] = useState<FinanceTabType>('overview')

  const {
    stockItems,
    overviewData,
    criticalImpacts,
    locationBreakdown,
    totalStockUnits,
    totalEstimatedAssetValue,
    loading,
    refreshing,
    refresh
  } = useFinanceData()

  if (loading && stockItems.length === 0) {
    return <FinanceSkeleton />
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Hero Banner */}
      <FinanceHero refreshing={refreshing} onRefresh={refresh} />

      {/* 2. Tab Switcher Pills */}
      <FinanceTabSwitcher activeTab={activeTab} onChange={setActiveTab} />

      {/* 3. Tab Views */}
      {activeTab === 'overview' && (
        <OverviewTabView
          overviewData={overviewData}
          totalSKUs={stockItems.length}
          locationData={locationBreakdown}
        />
      )}

      {activeTab === 'valuation' && (
        <ValuationTabView
          locationData={locationBreakdown}
          totalUnits={totalStockUnits}
          totalEstimatedValue={totalEstimatedAssetValue}
        />
      )}

      {activeTab === 'critical' && (
        <CriticalImpactTabView
          items={criticalImpacts}
          totalSKUs={stockItems.length}
        />
      )}
    </div>
  )
}