import React from 'react'
import {
  Hash,
  ChefHat,
  TrendingUp,
  FileText,
  AlertCircle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { STATUS_META } from '../constants'
import { ScheduleItem, ScheduleStatus } from '../types'
import { isOverdue, getTodayStr } from '../utils'

interface Props {
  item: ScheduleItem
  isActioning: boolean
  onStatusUpdate: (id: string, status: ScheduleStatus) => void
  onCompleteClick: (item: ScheduleItem) => void
  onDeleteClick: (id: string) => void
}

export const ScheduleCard: React.FC<Props> = ({
  item,
  isActioning,
  onStatusUpdate,
  onCompleteClick,
  onDeleteClick,
}) => {
  const { t } = useLanguage()
  const todayStr = getTodayStr()
  const overdue = isOverdue(item, todayStr)
  const meta = STATUS_META[item.status]
  const Icon = meta.icon

  const totalYield =
    item.recipe.yieldQty > 0 ? item.plannedQuantity * item.recipe.yieldQty : null

  const progressPct =
    item.actualQuantity !== null && item.plannedQuantity > 0
      ? Math.round((item.actualQuantity / item.plannedQuantity) * 100)
      : null

  return (
    <div
      className={`group px-4 py-3.5 flex items-start gap-4 transition-all ${
        overdue
          ? 'bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50/70 dark:hover:bg-rose-950/20'
          : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/20'
      }`}
    >
      {/* Status Icon */}
      <div
        className={`mt-0.5 p-2 rounded-xl shrink-0 ${
          overdue
            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
            : meta.chip
        }`}
      >
        {overdue ? <AlertCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>

      {/* Main Info */}
      <div className="min-w-0 flex-1">
        {/* Title & Badges */}
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
            {item.recipe.name}
          </h4>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>

          {overdue && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-sm">
              <AlertCircle className="h-3 w-3" />
              <span>Overdue</span>
            </span>
          )}
        </div>

        {/* Metrics Bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <Hash className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Planned:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                {item.plannedQuantity} batches
              </strong>
            </span>
          </span>

          {item.actualQuantity !== null && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Produced:{' '}
                <strong
                  className={
                    item.actualQuantity >= item.plannedQuantity
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-amber-600 dark:text-amber-400 font-bold'
                  }
                >
                  {item.actualQuantity}
                </strong>
              </span>
            </span>
          )}

          {totalYield !== null && (
            <span className="flex items-center gap-1">
              <ChefHat className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Est. Output: ~{totalYield.toLocaleString()} {item.recipe.yieldUnit}
              </span>
            </span>
          )}

          {item.notes && (
            <span className="flex items-center gap-1 italic text-slate-400">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate max-w-xs">{item.notes}</span>
            </span>
          )}
        </div>

        {/* Progress Bar (if recorded) */}
        {progressPct !== null && (
          <div className="mt-2 flex items-center gap-2 max-w-md">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPct >= 100
                    ? 'bg-emerald-500'
                    : progressPct >= 75
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
              {progressPct}%
            </span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isActioning ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <>
            {item.status === 'planned' && (
              <button
                onClick={() => onStatusUpdate(item.id, 'in-progress')}
                title={t('bakeryMarkInProgress') || 'Start production'}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 transition-colors shadow-sm"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Start</span>
              </button>
            )}

            {item.status === 'in-progress' && (
              <button
                onClick={() => onCompleteClick(item)}
                title={t('bakeryMarkComplete') || 'Complete production run'}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Complete</span>
              </button>
            )}

            {item.status !== 'cancelled' && item.status !== 'completed' && (
              <button
                onClick={() => onStatusUpdate(item.id, 'cancelled')}
                title={t('bakeryStatusCancelled') || 'Cancel Run'}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => onDeleteClick(item.id)}
              title="Delete schedule"
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}