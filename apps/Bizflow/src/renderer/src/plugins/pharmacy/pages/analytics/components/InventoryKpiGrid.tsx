import React from 'react'
import {
  Boxes,
  TrendingUp,
  PackageX,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react'
import { InventoryReportData } from '../types'
import { money, int } from '../../components/_shared'

interface InventoryKpiGridProps {
  inv: InventoryReportData
}

export const InventoryKpiGrid: React.FC<InventoryKpiGridProps> = ({ inv }) => {
  const marginSpread =
    inv.retailValue > 0 ? Math.round(((inv.retailValue - inv.stockValue) / inv.retailValue) * 100) : 0

  const kpis = [
    {
      label: 'Inventory Asset Cost',
      value: `$${money(inv.stockValue)}`,
      sub: 'Purchase cost basis',
      icon: Boxes,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Potential Retail Value',
      value: `$${money(inv.retailValue)}`,
      sub: `+${marginSpread}% potential margin`,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Total Active SKUs',
      value: int(inv.totalProducts),
      sub: 'Medicines & formulations',
      icon: Layers,
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Low Stock Items',
      value: int(inv.lowStock),
      sub: 'Under minimum threshold',
      icon: AlertTriangle,
      color: inv.lowStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
    },
    {
      label: 'Expired Loss Value',
      value: `$${money(inv.expiredValue)}`,
      sub: `${int(inv.expiredBatches)} expired batches`,
      icon: PackageX,
      color: inv.expiredBatches > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400',
    },
    {
      label: 'Expiring Soon (30d)',
      value: `$${money(inv.expiringValue)}`,
      sub: `${int(inv.expiringSoon)} batches at risk`,
      icon: Clock,
      color: inv.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {kpis.map(k => (
        <div
          key={k.label}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <k.icon size={14} className={k.color} />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">{k.label}</span>
            </div>
            <p className={`text-base font-extrabold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{k.sub}</p>
        </div>
      ))}
    </div>
  )
}