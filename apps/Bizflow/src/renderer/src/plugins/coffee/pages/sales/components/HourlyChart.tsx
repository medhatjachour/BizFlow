import { Clock } from 'lucide-react'
import type { SummaryData } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  summary: SummaryData | null
}

export function HourlyChart({ summary }: Props) {
  if (!summary?.hourlyBreakdown?.length) return null

  const maxRevenue = Math.max(...summary.hourlyBreakdown.map(h => h.revenue))
  const peakHour = summary.hourlyBreakdown.reduce((max, h) => (h.revenue > max.revenue ? h : max), summary.hourlyBreakdown[0])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          Hourly Revenue
        </h3>
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          Peak: {peakHour.hour}:00
        </span>
      </div>
      <div className="flex items-end justify-between gap-1 h-32">
        {summary.hourlyBreakdown.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t transition-all duration-500 ${
                  h.hour === peakHour.hour
                    ? 'bg-gradient-to-t from-amber-500 to-orange-400'
                    : 'bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-500'
                } group-hover:from-amber-500 group-hover:to-orange-400`}
                style={{ height: `${(h.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
                title={`${h.hour}:00 — ${formatCurrency(h.revenue)}`}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{h.hour}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
