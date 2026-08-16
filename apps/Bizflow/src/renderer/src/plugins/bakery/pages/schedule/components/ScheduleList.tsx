import React, { useMemo } from 'react'
import { Calendar, Plus, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ScheduleDateGroup } from './ScheduleDateGroup'
import { ScheduleItem, ScheduleStatus } from '../types'
import { formatDateKey } from '../utils'

interface Props {
  items: ScheduleItem[]
  loading: boolean
  hasFilters: boolean
  actioningId: string | null
  onStatusUpdate: (id: string, status: ScheduleStatus) => void
  onCompleteClick: (item: ScheduleItem) => void
  onDeleteClick: (id: string) => void
  onAddClick: () => void
  onClearFilters: () => void
}

export const ScheduleList: React.FC<Props> = ({
  items,
  loading,
  hasFilters,
  actioningId,
  onStatusUpdate,
  onCompleteClick,
  onDeleteClick,
  onAddClick,
  onClearFilters,
}) => {
  const { t } = useLanguage()

  const grouped = useMemo(() => {
    return items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
      const key = formatDateKey(item.scheduledDate)
      ;(acc[key] = acc[key] || []).push(item)
      return acc
    }, {})
  }, [items])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-xs text-slate-400">Loading daily production schedule…</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/30">
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 mb-3">
          <Calendar className="h-8 w-8" />
        </div>
        {hasFilters ? (
          <>
            <p className="text-slate-800 dark:text-slate-200 font-bold text-base">
              No production runs match your criteria
            </p>
            <p className="text-slate-400 text-xs mt-1">Try relaxing date ranges or search queries</p>
            <button
              onClick={onClearFilters}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Clear all filters
            </button>
          </>
        ) : (
          <>
            <p className="text-slate-800 dark:text-slate-200 font-bold text-base">
              {t('bakeryNoSchedule') || 'No Production Runs Scheduled'}
            </p>
            <p className="text-slate-400 text-xs mt-1 max-w-sm text-center">
              {t('bakeryNoScheduleDesc') || 'Plan your baking runs in advance to track ingredient requirements and batches.'}
            </p>
            <button
              onClick={onAddClick}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule First Run</span>
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dateLabel, groupItems]) => (
        <ScheduleDateGroup
          key={dateLabel}
          dateLabel={dateLabel}
          items={groupItems}
          actioningId={actioningId}
          onStatusUpdate={onStatusUpdate}
          onCompleteClick={onCompleteClick}
          onDeleteClick={onDeleteClick}
        />
      ))}
    </div>
  )
}