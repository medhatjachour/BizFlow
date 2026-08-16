import React from 'react'
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ScheduleCard } from './ScheduleCard'
import { ScheduleItem, ScheduleStatus } from '../types'
import { getTodayStr, isOverdue } from '../utils'

interface Props {
  dateLabel: string
  items: ScheduleItem[]
  actioningId: string | null
  onStatusUpdate: (id: string, status: ScheduleStatus) => void
  onCompleteClick: (item: ScheduleItem) => void
  onDeleteClick: (id: string) => void
}

export const ScheduleDateGroup: React.FC<Props> = ({
  dateLabel,
  items,
  actioningId,
  onStatusUpdate,
  onCompleteClick,
  onDeleteClick,
}) => {
  const todayStr = getTodayStr()
  const completedCount = items.filter(i => i.status === 'completed').length
  const activeCount = items.filter(i => i.status === 'in-progress').length
  const overdueCount = items.filter(i => isOverdue(i, todayStr)).length
  const isToday = items.some(i => i.scheduledDate === todayStr)

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-800/90 border overflow-hidden shadow-sm ${
        overdueCount > 0
          ? 'border-rose-300 dark:border-rose-800/80'
          : 'border-slate-200/80 dark:border-slate-700/80'
      }`}
    >
      {/* Date Header */}
      <div
        className={`px-5 py-3 border-b flex items-center justify-between ${
          overdueCount > 0
            ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
            : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Calendar
            className={`h-4 w-4 ${
              overdueCount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : isToday
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400'
            }`}
          />
          <span
            className={`text-sm font-bold ${
              overdueCount > 0
                ? 'text-rose-800 dark:text-rose-300'
                : isToday
                ? 'text-indigo-700 dark:text-indigo-300'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {dateLabel}
          </span>

          {isToday && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
              Today
            </span>
          )}

          {overdueCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider shadow-sm">
              <AlertCircle className="h-3 w-3" />
              {overdueCount} Overdue
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {activeCount} Active
            </span>
          )}

          {completedCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completedCount} Done
            </span>
          )}

          <span className="text-xs text-slate-400 font-medium">
            {items.length} run{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Group Items */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {items.map(item => (
          <ScheduleCard
            key={item.id}
            item={item}
            isActioning={actioningId === item.id}
            onStatusUpdate={onStatusUpdate}
            onCompleteClick={onCompleteClick}
            onDeleteClick={onDeleteClick}
          />
        ))}
      </div>
    </div>
  )
}