import React from 'react'
import { ArrowRightLeft, ArrowRight, ArrowUpRight, Package } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { RecentTransfer } from '../types'
import { TRANSFER_STATUS_THEMES } from '../constants'
import { formatCompactDate } from '../utils'

interface Props {
  transfers: RecentTransfer[]
  onViewAll: () => void
}

export const RecentTransfersCard: React.FC<Props> = ({ transfers, onViewAll }) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col h-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
              {t('warehouseRecentTransfers') || 'Recent Transfers'}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Inter-location movements</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          {t('warehouseViewAll') || 'View All'}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-y-auto">
        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('warehouseNoTransfersYet') || 'No transfers recorded yet'}
            </p>
          </div>
        ) : (
          transfers.slice(0, 5).map(tr => {
            const statusConfig = TRANSFER_STATUS_THEMES[tr.status] || TRANSFER_STATUS_THEMES.draft
            return (
              <div
                key={tr.id}
                className="group flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Origin to Destination */}
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                    <span className="truncate max-w-[120px] sm:max-w-[150px] font-semibold text-slate-700 dark:text-slate-300">
                      {tr.fromLocation.name}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-[150px] font-semibold text-slate-900 dark:text-slate-100">
                      {tr.toLocation.name}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Package className="w-3 h-3 text-slate-400" />
                      {tr._count?.items ?? 0} {t('warehouseItems') || 'items'}
                    </span>
                    <span>•</span>
                    <span>{formatCompactDate(tr.transferDate)}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border capitalize ${statusConfig.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                  {tr.status.replace('_', ' ')}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}