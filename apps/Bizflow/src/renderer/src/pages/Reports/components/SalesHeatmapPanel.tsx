import React from 'react';
import { Clock, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { HeatmapResult } from '../../../hooks/useDashboardWorker';

interface SalesHeatmapPanelProps {
  heatmapResult: HeatmapResult | null;
}

const HOUR_LABELS = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a',
                      '12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p'];

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      <p className="text-primary font-bold">{payload[0].value} sale{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

const SalesHeatmapPanel: React.FC<SalesHeatmapPanelProps> = ({ heatmapResult }) => {
  if (!heatmapResult) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
            <Clock size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Hourly Sales Activity</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Distribution of today's sales</p>
          </div>
        </div>
        <div className="h-40 flex items-center justify-center text-slate-400 dark:text-slate-600 flex-col gap-2">
          <Clock size={32} className="opacity-30" />
          <p className="text-sm">No sales recorded today yet</p>
        </div>
      </div>
    );
  }

  const { hourCounts, peakHour, periods } = heatmapResult;
  const total = hourCounts.reduce((s, v) => s + v, 0);

  // Build chart data — only show active hours for cleaner chart
  // We aggregate into 12 2-hour buckets for readability
  const buckets: { label: string; count: number; hours: string }[] = [];
  for (let i = 0; i < 24; i += 2) {
    buckets.push({
      label: HOUR_LABELS[i],
      count: hourCounts[i] + (hourCounts[i + 1] ?? 0),
      hours: `${HOUR_LABELS[i]}–${HOUR_LABELS[i + 2] ?? '12a'}`
    });
  }

  const maxBucket = Math.max(...buckets.map(b => b.count), 1);
  const peakBucketIdx = Math.floor(peakHour / 2);

  const periodData = [
    { name: 'Morning', count: periods.morning, color: 'bg-amber-400', time: '6am–12pm' },
    { name: 'Afternoon', count: periods.afternoon, color: 'bg-orange-400', time: '12pm–5pm' },
    { name: 'Evening', count: periods.evening, color: 'bg-violet-400', time: '5pm–12am' }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
            <Clock size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Hourly Sales Activity</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Distribution of today's {total} sales</p>
          </div>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <Zap size={12} className="text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Peak: {HOUR_LABELS[peakHour]}
            </span>
          </div>
        )}
      </div>

      {/* Bar chart */}
      {total > 0 ? (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={buckets} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-slate-500 dark:text-slate-400"
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {buckets.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={idx === peakBucketIdx
                    ? '#f59e0b'
                    : _.count / maxBucket > 0.6
                      ? '#6366f1'
                      : _.count > 0
                        ? '#a5b4fc'
                        : '#e2e8f0'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-36 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
          No sales yet today
        </div>
      )}

      {/* Period breakdown */}
      {total > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-2">
          {periodData.map(p => (
            <div key={p.name} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <div className={`w-2 h-2 rounded-full ${p.color}`} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p.count}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">{p.name}</p>
              <p className="text-[10px] text-slate-400">{p.time}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesHeatmapPanel;
