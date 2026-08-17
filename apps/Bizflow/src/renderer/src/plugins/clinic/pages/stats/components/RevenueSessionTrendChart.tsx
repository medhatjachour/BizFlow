import React from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { CHART_TOOLTIP_STYLE, AXIS_TICK_STYLE } from '../constants'
import type { FullTrendEntry, TrendRange } from '../types'

interface Props {
  data: FullTrendEntry[]
  trendDays: TrendRange
}

export const RevenueSessionTrendChart: React.FC<Props> = ({ data, trendDays }) => {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        {t('revenueTrendTitle') || 'Throughput Volume & Financial Trends'} ({trendDays} Days)
      </h3>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
          <defs>
            <linearGradient id="sessionAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/60" />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK_STYLE}
            tickFormatter={(v) => v.slice(5)}
            interval={trendDays <= 7 ? 0 : trendDays <= 30 ? 4 : 9}
          />
          <YAxis yAxisId="left" tick={AXIS_TICK_STYLE} allowDecimals={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={AXIS_TICK_STYLE}
            tickFormatter={(v) => `$${v}`}
          />

          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            formatter={((value: number, name: string) => {
              if (name === 'sessions') return [String(value), t('sessionsLabel') || 'Sessions']
              if (name === 'paid') return [formatCurrency(value), t('revenueLabel') || 'Collected']
              if (name === 'charged') return [formatCurrency(value), t('chargedLabel') || 'Billed']
              return [String(value), name]
            }) as any}
          />

          <Legend
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: '10px' }}
            formatter={(value) => {
              if (value === 'sessions') return t('sessionsLabel') || 'Sessions'
              if (value === 'paid') return t('revenueLabel') || 'Collected'
              if (value === 'charged') return t('chargedLabel') || 'Billed'
              return value
            }}
          />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="sessions"
            fill="url(#sessionAreaGrad)"
            stroke="#0d9488"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="paid"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="charged"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}