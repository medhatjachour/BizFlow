import { Calendar, AlertTriangle } from 'lucide-react'
import { ScheduleItem, CapacityEntry } from '../types'
import { StatusBadge } from './StatusBadge'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ScheduleTableProps {
  scheduled: ScheduleItem[]
  capacity: CapacityEntry[]
}

export function ScheduleTable({ scheduled, capacity }: ScheduleTableProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Calendar className="h-5 w-5" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white text-base">
          {t('bakeryTodaySchedule')}
        </h3>
      </div>

      {scheduled.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
          <Calendar className="h-10 w-10 stroke-[1.5] opacity-40" />
          <p className="text-sm">{t('bakeryOverviewNoSchedule')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
                <th className="pb-3 pr-4">{t('bakeryRecipeCol')}</th>
                <th className="pb-3 pr-4 text-right">{t('bakeryColQty')}</th>
                <th className="pb-3 pr-4">{t('bakeryScheduleStatus')}</th>
                <th className="pb-3 text-right">{t('bakeryColTime')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {scheduled.map(item => {
                const cap = capacity.find(c => c.recipeId === item.recipe.id)
                const canMake = cap ? (cap.availableBatches ?? 0) >= item.plannedQuantity : null

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.recipe.name}</span>
                        {canMake === false && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded-full font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            {t('bakeryStockLow')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-slate-700 dark:text-slate-300">
                      {item.plannedQuantity}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 text-right text-xs font-medium text-slate-400">
                      {new Date(item.scheduledDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}