import { useMemo } from 'react'
import { Warehouse, Package, ArrowRightLeft, AlertTriangle, ClipboardList } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { Tab, StatItemConfig } from './types'
import { useOverview } from './hooks/useOverview'
import { OverviewSkeleton } from './components/OverviewSkeleton'
import { OverviewError } from './components/OverviewError'
import { OverviewHero } from './components/OverviewHero'
import { StatCard } from './components/StatCard'
import { RecentTransfersCard } from './components/RecentTransfersCard'
import { RecentMovementsCard } from './components/RecentMovementsCard'

interface OverviewTabProps {
  onNavigate: (tab: Tab) => void
}

export default function OverviewTab({ onNavigate }: OverviewTabProps) {
  const { t } = useLanguage()
  const { data, isLoading, error, refetch } = useOverview()

  const statsConfig: StatItemConfig[] = useMemo(() => {
    if (!data) return []
    return [
      {
        id: 'locations',
        labelKey: t('warehouseTotalLocations') || 'Total Locations',
        hintKey: t('warehouseOverviewInfoTotalLocations') || 'Active physical and virtual storage zones',
        value: data.totalLocations,
        icon: Warehouse,
        color: 'blue',
        targetTab: 'locations'
      },
      {
        id: 'skus',
        labelKey: t('warehouseTotalSKUs') || 'Total SKUs',
        hintKey: t('warehouseOverviewInfoTotalSkus') || 'Unique catalog products tracked in warehouse',
        value: data.totalSKUs,
        icon: Package,
        color: 'indigo',
        targetTab: 'inventory'
      },
      {
        id: 'low-stock',
        labelKey: t('warehouseLowStockAlerts') || 'Low Stock Alerts',
        hintKey: t('warehouseOverviewInfoLowStock') || 'Items below their configured reorder thresholds',
        value: data.lowStockCount,
        icon: AlertTriangle,
        color: data.lowStockCount > 0 ? 'rose' : 'slate',
        badge: data.lowStockCount > 0 ? `${data.lowStockCount} Action Required` : undefined,
        targetTab: 'inventory'
      },
      {
        id: 'transfers',
        labelKey: t('warehousePendingTransfers') || 'Pending Transfers',
        hintKey: t('warehouseOverviewInfoPendingTransfers') || 'Stock transfers awaiting dispatch or receipt',
        value: data.pendingTransfers,
        icon: ArrowRightLeft,
        color: 'amber',
        targetTab: 'transfers'
      },
      {
        id: 'orders',
        labelKey: t('warehouseActiveOrders') || 'Active Orders',
        hintKey: t('warehouseOverviewInfoActiveOrders') || 'Fulfillment batches currently in process',
        value: data.activeOrders,
        icon: ClipboardList,
        color: 'emerald',
        targetTab: 'operations'
      }
    ]
  }, [data, t])

  if (isLoading) {
    return <OverviewSkeleton />
  }

  if (error) {
    return <OverviewError message={error.message} onRetry={refetch} />
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* 1. Hero / Operational Pipeline Banner */}
      <OverviewHero
        activeOrders={data.activeOrders}
        inboundPending={data.inboundPending}
        outboundPending={data.outboundPending}
        onNavigate={onNavigate}
        onRefresh={refetch}
      />

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {statsConfig.map(stat => (
          <StatCard
            key={stat.id}
            config={stat}
            onSelect={() => onNavigate(stat.targetTab)}
          />
        ))}
      </div>

      {/* 3. Dual-Feed Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecentTransfersCard
          transfers={data.recentTransfers}
          onViewAll={() => onNavigate('transfers')}
        />
        <RecentMovementsCard
          movements={data.recentMovements}
          onOpenOperations={() => onNavigate('operations')}
        />
      </div>
    </div>
  )
}