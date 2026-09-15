import React from 'react'
import {
  DollarSign,
  TrendingUp,
  PackageX,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { InventoryStats } from '../types'
import { money, int } from '../../components/_shared'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'

interface InventoryKpiCardsProps {
  summary: InventoryStats | null
}

export const InventoryKpiCards: React.FC<InventoryKpiCardsProps> = ({ summary }) => {
  const { t } = useLanguage()
  if (!summary) return null

  const potentialMargin =
    summary.retailValue > 0
      ? Math.round(((summary.retailValue - summary.stockValue) / summary.retailValue) * 100)
      : 0

  return (
    <KpiSection sectionKey="pharmacy:inventory-InventoryKpiCards">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total Asset Cost */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <DollarSign size={14} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('cfCostValue')}</span>
          </div>
          <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
            ${money(summary.stockValue)}
          </p>
          <span className="text-[10px] text-slate-400">{t('phInvTotalPurchaseCost')}</span>
        </div>

        {/* Retail Valuation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <TrendingUp size={14} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('inventoryUiRetailValue')}</span>
          </div>
          <p className="text-base font-extrabold text-blue-600 dark:text-blue-400">
            ${money(summary.retailValue)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">{t('phInvEstMargin', { margin: potentialMargin })}</span>
        </div>

        {/* Expired Stock at Loss */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <PackageX size={14} className="text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('phInvExpiredLoss')}</span>
          </div>
          <p className="text-base font-extrabold text-red-600 dark:text-red-400">
            {int(summary.expiredBatches)} <span className="text-xs font-normal">{t('phInvBatchesLabel')}</span>
          </p>
          <span className="text-[10px] text-red-500 font-semibold">-${money(summary.expiredValue)} {t('phInvExpiredValueSuffix')}</span>
        </div>

        {/* Expiring Soon Watch */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Clock size={14} className="text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('vetExpiringValue')}</span>
          </div>
          <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">
            {int(summary.expiringSoon)} <span className="text-xs font-normal">{t('phInvBatchesLabel')}</span>
          </p>
          <span className="text-[10px] text-amber-600/90 font-medium">${money(summary.expiringValue)} {t('phInvAtRisk')}</span>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('inventoryUiLowStock')}</span>
          </div>
          <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
            {int(summary.lowStock)} <span className="text-xs font-normal">{t('phPrSkus')}</span>
          </p>
          <span className="text-[10px] text-amber-600 font-semibold">{t('phInvBelowMin')}</span>
        </div>

        {/* Out of Stock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <ShieldAlert size={14} className="text-rose-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('inventoryUiOutOfStock')}</span>
          </div>
          <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">
            {int(summary.outOfStock)} <span className="text-xs font-normal">{t('phPrSkus')}</span>
          </p>
          <span className="text-[10px] text-rose-500 font-semibold">{t('phInvNeedsPo')}</span>
        </div>
      </div>
    </KpiSection>
  )
}