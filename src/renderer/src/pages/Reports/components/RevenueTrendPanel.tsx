import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { TrendsResult } from '../../../hooks/useDashboardWorker';
import { formatCurrency } from '../types';

interface RevenueTrendPanelProps {
  weeklyData: { day: string; revenue: number; label: string }[];
  trendResult: TrendsResult | null;
  loading?: boolean;
}

const TrendBadge: React.FC<{ trend: 'up' | 'down' | 'flat'; change: number }> = ({ trend, change }) => {
  if (trend === 'up') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
      <TrendingUp size={12} /> +{Math.abs(change).toFixed(1)}%
    </span>
  );
  if (trend === 'down') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">
      <TrendingDown size={12} /> -{Math.abs(change).toFixed(1)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-full">
      <Minus size={12} /> Stable
    </span>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</p>
      <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

const RevenueTrendPanel: React.FC<RevenueTrendPanelProps> = ({ weeklyData, trendResult, loading }) => {
  const hasData = weeklyData.some(d => d.revenue > 0);
  const avg = trendResult?.avg ?? 0;
  const maxRev = weeklyData.reduce((m, d) => Math.max(m, d.revenue), 0);

  if (loading && weeklyData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-4" />
        <div className="h-48 bg-slate-100 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart2 size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">7-Day Revenue Trend</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Net revenue, last 7 days</p>
          </div>
        </div>
        {trendResult && <TrendBadge trend={trendResult.trend} change={trendResult.change} />}
      </div>

      {/* Stat row */}
      {trendResult && hasData && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400">Daily Avg</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(avg)}</p>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400">Best Day</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(trendResult.max)}</p>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400">vs Prev Day</p>
            <p className={`text-sm font-bold ${trendResult.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trendResult.change >= 0 ? '+' : ''}{trendResult.change.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-500 dark:text-slate-400"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-slate-500 dark:text-slate-400"
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke="rgba(148,163,184,0.5)"
                strokeDasharray="4 3"
                label={{ value: 'avg', position: 'right', fontSize: 10, fill: '#94a3b8' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-primary, #6366f1)"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={{ r: 3, fill: 'var(--color-primary, #6366f1)', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-48 flex items-center justify-center flex-col gap-2 text-slate-400 dark:text-slate-600">
          <BarChart2 size={36} className="opacity-30" />
          <p className="text-sm">No revenue data for the past 7 days</p>
        </div>
      )}

      {/* Moving average sparkline row */}
      {trendResult && trendResult.movingAvg.length > 0 && hasData && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-400/50" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            3-day moving average: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(trendResult.movingAvg[trendResult.movingAvg.length - 1] ?? avg)}</span>
          </p>
          {maxRev > 0 && (
            <span className="ml-auto text-xs text-slate-500">
              Peak: <span className="font-semibold text-slate-700 dark:text-slate-300">{weeklyData.find(d => d.revenue === trendResult.max)?.label ?? ''}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RevenueTrendPanel;
