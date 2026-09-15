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
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'

interface InventoryKpiGridProps {
  inv: InventoryReportData
}

export const InventoryKpiGrid: React.FC<InventoryKpiGridProps> = ({ inv }) => {
  const { t } = useLanguage()
  const marginSpread =
    inv.retailValue > 0 ? Math.round(((inv.retailValue - inv.stockValue) / inv.retailValue) * 100) : 0

  const kpis = [
    {
      id: 'assetCost',
      label: t('phAnInventoryAssetCost'),
      value: `$${money(inv.stockValue)}`,
      sub: t('phAnCostBasisSub'),
      icon: Boxes,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'retailValue',
      label: t('phAnPotentialRetailValue'),
      value: `$${money(inv.retailValue)}`,
      sub: t('phAnPotentialMargin', { percent: marginSpread }),
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'skus',
      label: t('phAnTotalActiveSkus'),
      value: int(inv.totalProducts),
      sub: t('phAnMedicinesFormulations'),
      icon: Layers,
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      id: 'lowStock',
      label: t('phAnLowStockItems'),
      value: int(inv.lowStock),
      sub: t('phAnUnderMinThreshold'),
      icon: AlertTriangle,
      color: inv.lowStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
    },
    {
      id: 'expiredValue',
      label: t('phAnExpiredLossValue'),
      value: `$${money(inv.expiredValue)}`,
      sub: t('phAnExpiredBatchesCount', { count: int(inv.expiredBatches) }),
      icon: PackageX,
      color: inv.expiredBatches > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400',
    },
    {
      id: 'expiringSoon',
      label: t('phAnExpiringSoon30'),
      value: `$${money(inv.expiringValue)}`,
      sub: t('phAnBatchesAtRisk', { count: int(inv.expiringSoon) }),
      icon: Clock,
      color: inv.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
    },
  ]

  return (
    <KpiSection sectionKey="pharmacy:analytics-InventoryKpiGrid">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {kpis.map(k => (
          <div
            key={k.id}
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
    </KpiSection>
  )
}