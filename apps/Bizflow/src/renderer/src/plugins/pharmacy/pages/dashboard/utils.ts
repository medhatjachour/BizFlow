import { DashboardOverview, OperationalAlertItem } from './types'
import { money } from '../components/_shared'

export function computeOperationalAlerts(ov: DashboardOverview, t: (k: string) => string): OperationalAlertItem[] {
  const alerts: (OperationalAlertItem | false)[] = [
    ov.expiredBatches > 0 && {
      key: 'expired',
      tone: 'red',
      title: `${ov.expiredBatches} ${t('phExpiredBatches') || 'expired batches'}`,
      subtitle: `$${money(ov.expiredValue)} immediate write-off loss`,
      tab: 'inventory',
      iconKey: 'PackageX',
    },
    ov.outOfStock > 0 && {
      key: 'out',
      tone: 'red',
      title: `${ov.outOfStock} ${t('phOutOfStock') || 'out of stock items'}`,
      subtitle: 'Create purchase order now',
      tab: 'products',
      iconKey: 'PackageX',
    },
    ov.expiringSoon > 0 && {
      key: 'expiring',
      tone: 'amber',
      title: `${ov.expiringSoon} ${t('phExpiringSoon') || 'expiring in ≤30 days'}`,
      subtitle: `$${money(ov.expiringValue)} stock value at risk`,
      tab: 'inventory',
      iconKey: 'AlertTriangle',
    },
    ov.lowStock > 0 && {
      key: 'low',
      tone: 'amber',
      title: `${ov.lowStock} ${t('phLowStock') || 'low stock alerts'}`,
      subtitle: 'Below threshold level',
      tab: 'products',
      iconKey: 'PackageMinus',
    },
    (ov.outstanding || 0) > 0.005 && {
      key: 'due',
      tone: 'amber',
      title: `$${money(ov.outstanding)} ${t('phUnpaid') || 'unpaid credit balance'}`,
      subtitle: 'Collect from customer accounts',
      tab: 'sales',
      iconKey: 'Wallet',
    },
  ]

  return alerts.filter(Boolean) as OperationalAlertItem[]
}