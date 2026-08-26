import { useState } from 'react'
import { VisitTypeStat } from '../types'
import { useVisitTypes } from '../../vet-sessions/hooks/useVisitTypes'
import { VISIT_TYPE_BAR } from '../../vet-sessions/constants'
import {  formatCurrency } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { getVisitTypeLabel } from '../../vet-sessions/utils'

export function SessionTypeComparisonCard({ visitTypes }: { visitTypes: VisitTypeStat[] }) {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'
  const { hexColor } = useVisitTypes()
  const [metric, setMetric] = useState<'count' | 'revenue'>('count')

  const totalCount = visitTypes.reduce((s, x) => s + Number(x.count || 0), 0)
  const totalRevenue = visitTypes.reduce((s, x) => s + Number(x.revenue || 0), 0)

  const sorted = [...visitTypes].sort((a, b) =>
    metric === 'revenue'
      ? Number(b.revenue || 0) - Number(a.revenue || 0)
      : Number(b.count || 0) - Number(a.count || 0)
  )

  const maxVal = Math.max(
    1,
    ...sorted.map((x) => (metric === 'revenue' ? Number(x.revenue || 0) : Number(x.count || 0)))
  )

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {isAr ? 'مقارنة أنواع الجلسات' : 'Session Breakdown'}
        </h3>
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900/60 p-0.5 text-xs font-semibold border border-slate-200/50 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => setMetric('count')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metric === 'count'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {isAr ? 'بالعدد' : 'Count'}
          </button>
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metric === 'revenue'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {isAr ? 'بالإيراد' : 'Revenue'}
          </button>
        </div>
      </div>

      <div className="space-y-3.5">
        {sorted.map((v) => {
          const val = metric === 'revenue' ? Number(v.revenue || 0) : Number(v.count || 0)
          const pct = Math.round((val / maxVal) * 100)
          const share =
            metric === 'revenue'
              ? totalRevenue > 0
                ? Math.round((Number(v.revenue || 0) / totalRevenue) * 100)
                : 0
              : totalCount > 0
              ? Math.round((Number(v.count || 0) / totalCount) * 100)
              : 0

          const customHex = hexColor(v.visitType)

          return (
            <div key={v.visitType} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {getVisitTypeLabel(v.visitType, language)}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {metric === 'revenue' ? formatCurrency(v.revenue) : v.count}
                  <span className="text-slate-400 font-normal text-[10px]"> ({share}%)</span>
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    customHex ? '' : VISIT_TYPE_BAR[v.visitType] ?? 'bg-teal-500'
                  }`}
                  style={{ width: `${pct}%`, backgroundColor: customHex || undefined }}
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <span>{v.count} {isAr ? 'جلسة' : 'sessions'}</span>
                <span>•</span>
                <span>{formatCurrency(v.revenue)}</span>
                <span>•</span>
                <span>{isAr ? 'متوسط' : 'avg'} {formatCurrency(v.avg)}</span>
              </div>
            </div>
          )
        })}

        {visitTypes.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">
            {isAr ? 'لا توجد بيانات جلسات في هذه الفترة' : 'No session data yet'}
          </p>
        )}
      </div>
    </div>
  )
}