import React from 'react'
import { ShieldAlert, AlertTriangle } from 'lucide-react'
import { InventoryReportData } from '../types'
import { money, int } from '../../components/_shared'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ExpiryRiskAuditCardProps {
  inv: InventoryReportData
}

export const ExpiryRiskAuditCard: React.FC<ExpiryRiskAuditCardProps> = ({ inv }) => {
  const { t } = useLanguage()
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="text-red-500" />
        <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">
          {t('phAnShelfExpiryTitle')}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
            {t('phAnImmediateLoss')}
          </span>
          <p className="text-base font-extrabold text-red-600 dark:text-red-400">
            ${money(inv.expiredValue)}
          </p>
          <p className="text-[10px] text-slate-500">
            {t('phAnBatchesNeedWriteOff', { count: int(inv.expiredBatches) })}
          </p>
        </div>

        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
            {t('phAn30DayCriticalRisk')}
          </span>
          <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">
            ${money(inv.expiringValue)}
          </p>
          <p className="text-[10px] text-slate-500">
            {t('phAnBatchesApproachingExpiry', { count: int(inv.expiringSoon) })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <AlertTriangle size={13} className="text-amber-500 shrink-0" />
        <span>{t('phAnFifoNotice')}</span>
      </div>
    </div>
  )
}