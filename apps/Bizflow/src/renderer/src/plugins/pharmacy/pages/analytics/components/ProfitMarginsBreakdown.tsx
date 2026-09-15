import React from 'react'
import { PieChart, ArrowUpRight } from 'lucide-react'
import { SalesReportData } from '../types'
import { money } from '../../components/_shared'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProfitMarginsBreakdownProps {
  sales: SalesReportData
}

export const ProfitMarginsBreakdown: React.FC<ProfitMarginsBreakdownProps> = ({ sales }) => {
  const { t } = useLanguage()
  const cogsShare = sales.revenue > 0 ? (sales.cogs / sales.revenue) * 100 : 0
  const profitShare = sales.revenue > 0 ? (sales.grossProfit / sales.revenue) * 100 : 0

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart size={16} className="text-blue-500" />
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">
            {t('phAnRevenueCostStructure')}
          </h3>
        </div>
        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
          <ArrowUpRight size={12} />{' '}
          {t('phAnGrossMarginSuffix', { percent: profitShare.toFixed(1) })}
        </span>
      </div>

      {/* Segmented Stack Bar */}
      <div className="space-y-1.5">
        <div className="h-4 rounded-xl overflow-hidden flex bg-slate-100 dark:bg-slate-800 p-0.5">
          <div
            className="h-full bg-emerald-500 rounded-l-lg transition-all"
            style={{ width: `${profitShare}%` }}
            title={`${t('phAnGrossProfitLabel')}: $${money(sales.grossProfit)}`}
          />
          <div
            className="h-full bg-orange-400 rounded-r-lg transition-all"
            style={{ width: `${cogsShare}%` }}
            title={`${t('phAnCogsShort')}: $${money(sales.cogs)}`}
          />
        </div>

        <div className="flex justify-between text-[11px] font-semibold pt-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">
              {t('phAnGrossProfitLabel')}: <strong>${money(sales.grossProfit)}</strong>{' '}
              {t('phAnShareParenthetical', { percent: profitShare.toFixed(1) })}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <span className="text-slate-600 dark:text-slate-300">
              {t('phAnProductCogsLabel')}: <strong>${money(sales.cogs)}</strong>{' '}
              {t('phAnShareParenthetical', { percent: cogsShare.toFixed(1) })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}