import React from 'react'
import { ArrowRight, RefreshCw, Boxes, Building2, Layers } from 'lucide-react'
import { WarehouseOrder} from '../types'
import { INBOUND_STEPS, OUTBOUND_STEPS, STATUS_THEMES, PRIORITY_THEMES } from '../constants'
import { getOrderCurrentStage, getStageLabel, getPrimaryActionLabel } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface OrderCardProps {
  order: WarehouseOrder
  onAdvance: (order: WarehouseOrder) => Promise<void>
  isActing: boolean
  compact?: boolean
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onAdvance, isActing, compact }) => {
  const { t } = useLanguage()
  const stage = getOrderCurrentStage(order)
  const steps = order.orderType === 'inbound' ? INBOUND_STEPS : OUTBOUND_STEPS
  const progressIndex = Math.max(0, steps.indexOf(stage))
  const actionText = getPrimaryActionLabel(order, t)

  const statusTheme = STATUS_THEMES[order.status] || STATUS_THEMES.draft
  const priorityTheme = PRIORITY_THEMES[order.priority || 'normal'] || PRIORITY_THEMES.normal
  const isCompleted = order.status === 'completed' || stage === 'done'
  const isDisabled = isCompleted || !order.locationId || isActing

  return (
    <div className="group relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all duration-200 space-y-2.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-slate-900 dark:text-white tracking-tight truncate">
              {order.orderNumber}
            </span>
            <span className={`text-[9.5px] px-1.5 py-0.2 rounded-md font-medium ${priorityTheme.badge}`}>
              {priorityTheme.text}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="capitalize font-medium text-slate-600 dark:text-slate-300">
              {order.orderType}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-0.5">
              <Boxes className="w-3 h-3" />
              {order.lines.length} {t('warehouseLines') || 'items'}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium border capitalize ${statusTheme.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusTheme.dot}`} />
          {order.status}
        </span>
      </div>

      {/* Meta details */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
        <div className="inline-flex items-center gap-1 truncate" title={order.partnerName || 'No Partner'}>
          <Building2 className="w-3 h-3 flex-shrink-0 text-slate-400" />
          <span className="truncate">{order.partnerName || '—'}</span>
        </div>
        <div className="inline-flex items-center gap-1 truncate" title={order.sourceRef || 'No Source Ref'}>
          <Layers className="w-3 h-3 flex-shrink-0 text-slate-400" />
          <span className="truncate font-mono">{order.sourceRef || '—'}</span>
        </div>
      </div>

      {/* Step Progress Pills (Full Card Mode) */}
      {!compact && (
        <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
          {steps.map((s, idx) => {
            const isPassed = idx <= progressIndex
            const isCurrent = idx === progressIndex
            return (
              <span
                key={s}
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap ${
                  isCurrent
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 ring-1 ring-indigo-500/30 font-bold'
                    : isPassed
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                }`}
              >
                {getStageLabel(s, t)}
              </span>
            )
          })}
        </div>
      )}

      {/* Action Button */}
      {!isCompleted && (
        <button
          onClick={() => void onAdvance(order)}
          disabled={isDisabled}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isActing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          )}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  )
}