import { DashboardOverview, OperationalAlertItem } from './types'
import { money } from '../components/_shared'

export function computeOperationalAlerts(ov: DashboardOverview, t: (k: string, params?: Record<string, any>) => string): OperationalAlertItem[] {
  const alerts: (OperationalAlertItem | false)[] = [
    ov.expiredBatches > 0 && {
      key: 'expired',
      tone: 'red',
      title: `${ov.expiredBatches} ${t('phExpiredBatches')}`,
      subtitle: `$${money(ov.expiredValue)} ${t('phDashWriteOffLossSub')}`,
      tab: 'inventory',
      iconKey: 'PackageX',
    },
    ov.outOfStock > 0 && {
      key: 'out',
      tone: 'red',
      title: `${ov.outOfStock} ${t('phOutOfStock')}`,
      subtitle: t('phDashCreatePoNow'),
      tab: 'products',
      iconKey: 'PackageX',
    },
    ov.expiringSoon > 0 && {
      key: 'expiring',
      tone: 'amber',
      title: `${ov.expiringSoon} ${t('phExpiringSoon')}`,
      subtitle: `$${money(ov.expiringValue)} ${t('phDashValueAtRiskSub')}`,
      tab: 'inventory',
      iconKey: 'AlertTriangle',
    },
    ov.lowStock > 0 && {
      key: 'low',
      tone: 'amber',
      title: `${ov.lowStock} ${t('phLowStock')}`,
      subtitle: t('phDashBelowThreshold'),
      tab: 'products',
      iconKey: 'PackageMinus',
    },
    (ov.outstanding || 0) > 0.005 && {
      key: 'due',
      tone: 'amber',
      title: `$${money(ov.outstanding)} ${t('phUnpaid')}`,
      subtitle: t('phDashCollectFromCustomers'),
      tab: 'sales',
      iconKey: 'Wallet',
    },
  ]

  return alerts.filter(Boolean) as OperationalAlertItem[]
}