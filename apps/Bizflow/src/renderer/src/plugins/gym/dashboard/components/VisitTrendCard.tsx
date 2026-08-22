import React from 'react'
import { Zap } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VisitTrendPoint } from '../types'

interface Props {
  data?: VisitTrendPoint[]
}

export const VisitTrendCard: React.FC<Props> = ({ data = [] }) => {
  const { t } = useLanguage()

  if (data.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-slate-800/90 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <Zap size={13} />
        </div>
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
          {t('gymDayVisitTrend') ?? '7-Day Turnstile & Check-in Trajectory'}
        </h3>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="gymTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-700/50"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => d.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                borderRadius: 10,
                border: 'none',
                fontSize: 11,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              formatter={(v) => [v, 'Check-ins']}
              labelFormatter={(d) => `Date: ${d}`}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#f97316"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gymTrendFill)"
              dot={{ r: 3, fill: '#f97316' }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}