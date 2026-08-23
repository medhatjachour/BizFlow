import React from 'react'
import { Activity, ArrowUpRight, MapPin, User } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { RecentMovement } from '../types'
import { formatQuantity } from '../utils'

interface Props {
  movements?: RecentMovement[]
  onOpenOperations: () => void
}

export const RecentMovementsCard: React.FC<Props> = ({ movements = [], onOpenOperations }) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col h-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
              {t('warehouseLatestActivity') || 'Latest Stock Activity'}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Audit log of inventory flow</p>
          </div>
        </div>
        <button
          onClick={onOpenOperations}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
        >
          {t('warehouseOpenOperations') || 'Operations'}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-y-auto">
        {movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <Activity className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('warehouseNoActivityYet') || 'No recent activity recorded'}
            </p>
          </div>
        ) : (
          movements.slice(0, 5).map(mv => {
            const { formattedText, isPositive } = formatQuantity(mv.quantity, mv.unit)

            return (
              <div
                key={mv.id}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate pr-2">
                      {mv.productName}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formattedText}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-semibold">
                      {mv.movementType}
                    </span>
                    <span className="inline-flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3" />
                      {mv.location?.name || t('warehouseNotAvailable') || 'N/A'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 truncate">
                      <User className="w-3 h-3" />
                      {mv.actedBy || t('warehouseSystem') || 'System'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}