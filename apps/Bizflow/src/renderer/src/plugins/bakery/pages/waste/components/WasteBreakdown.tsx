import React from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { WasteSummary } from '../types'
import { formatCurrency, getWasteTypeMeta } from '../utils'

interface Props {
  summary: WasteSummary | null
}

export const WasteBreakdown: React.FC<Props> = ({ summary }) => {
  const { t } = useLanguage()

  if (!summary || summary.totalCost <= 0 || !summary.byWasteType?.length) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('bakeryWasteTypeBreakdown') || 'Loss Breakdown by Category'}
        </h4>
        <span className="text-xs text-slate-400 font-medium">
          Total Lost: <strong className="text-rose-500">{formatCurrency(summary.totalCost)}</strong>
        </span>
      </div>

      <div className="space-y-3">
        {summary.byWasteType.map(item => {
          const cost = item._sum.cost ?? 0
          const pct = summary.totalCost > 0 ? (cost / summary.totalCost) * 100 : 0
          const meta = getWasteTypeMeta(item.wasteType ?? 'other')

          return (
            <div key={item.wasteType} className="flex items-center gap-3 text-sm">
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border shrink-0 min-w-[130px] text-center ${meta.badge}`}
              >
                {t(meta.labelKey) || meta.defaultLabel}
              </span>
              <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: meta.barColor }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 w-24 text-right">
                {formatCurrency(cost)}
              </span>
              <span className="text-xs text-slate-400 shrink-0 w-12 text-right tabular-nums">
                {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}