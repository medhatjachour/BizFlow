import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { CHART_TOOLTIP_STYLE, AXIS_TICK_STYLE } from '../constants'
import type { MonthlyEntry } from '../types'

interface Props {
  data: MonthlyEntry[]
}

export const MonthlyComparisonChart: React.FC<Props> = ({ data }) => {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        {t('monthlyTrendTitle') || '6-Month Performance Comparison'}
      </h3>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 6, right: 10, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/60" />
          <XAxis dataKey="month" tick={AXIS_TICK_STYLE} />
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
              if (name === 'revenue') return [formatCurrency(value), t('revenueLabel') || 'Revenue']
              return [String(value), name]
            }) as any}
          />

          <Legend
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: '8px' }}
            formatter={(value) => (value === 'sessions' ? t('sessionsLabel') || 'Sessions' : t('revenueLabel') || 'Revenue')}
          />

          <Bar yAxisId="left" dataKey="sessions" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar yAxisId="right" dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}