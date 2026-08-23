import React from 'react'
import { BarChart3 } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import { DailyBucketPoint } from '../types'
import { TrendsResult } from '@renderer/hooks/useDashboardWorker'

interface Props {
  trendData: DailyBucketPoint[]
  transferTrend: TrendsResult | null
  doneTodayCount: number
}

export const TransferTrendCard: React.FC<Props> = ({
  trendData,
  transferTrend,
  doneTodayCount
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            7-Day Movement Velocity
          </h3>
        </div>

        {transferTrend && (
          <span
            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
              transferTrend.trend === 'up'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : transferTrend.trend === 'down'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {transferTrend.change >= 0 ? '+' : ''}
            {transferTrend.change.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-28 w-full">
        {trendData.length > 0 ? (
          <ResponsiveContainer
            width="100%"
            height={112}
            initialDimension={{ width: 0, height: 112 }}
            minWidth={0}
          >
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any) => [`${v} transfers`, 'Velocity']}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderRadius: '12px',
                  borderColor: '#334155',
                  color: '#fff',
                  fontSize: '11px'
                }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#velocityGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No transfer data logged
          </div>
        )}
      </div>

      {/* Sub-stats */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <span className="block font-bold text-slate-900 dark:text-white">
            {transferTrend?.avg.toFixed(1) ?? '—'}
          </span>
          <span className="text-[10px] text-slate-400">Daily Avg</span>
        </div>
        <div>
          <span className="block font-bold text-slate-900 dark:text-white">
            {transferTrend?.max ?? '—'}
          </span>
          <span className="text-[10px] text-slate-400">Peak Load</span>
        </div>
        <div>
          <span className="block font-bold text-slate-900 dark:text-white">{doneTodayCount}</span>
          <span className="text-[10px] text-slate-400">Done Today</span>
        </div>
      </div>
    </div>
  )
}
