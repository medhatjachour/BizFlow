import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { GymStatsOverview } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  stats: GymStatsOverview
}

export const RevenueBreakdownCard: React.FC<Props> = ({ stats }) => {
  const chartData = [
    { name: 'Subscriptions', amount: stats.subRevenue, color: '#f97316' },
    { name: 'Walk-ins', amount: stats.walkRevenue, color: '#14b8a6' }
  ]

  const hasData = stats.subRevenue > 0 || stats.walkRevenue > 0

  return (
    <div className="flex flex-col justify-between bg-white dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Revenue Breakdown</h2>
          <p className="text-xs text-slate-400">Subscribed memberships vs direct walk-ins</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium">Gross Revenue</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(stats.revenue ?? stats.subRevenue + stats.walkRevenue)}
          </p>
        </div>
      </div>

      {hasData ? (
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-700/50" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                formatter={(val) => [formatCurrency(Number(val)), 'Total']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 12,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={56}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-xs text-slate-400 font-medium">
          No revenue recorded for this period
        </div>
      )}
    </div>
  )
}