import { TrendSeries } from '../types'
import { formatCurrency } from '../utils'

interface TrendSparklineProps {
  series: TrendSeries
}

export function TrendSparkline({ series }: TrendSparklineProps) {
  const profits = series.data.map(d => d.profit)
  const min = Math.min(...profits, 0)
  const max = Math.max(...profits, 1)
  const range = max - min || 1
  const w = 140
  const h = 42

  const pts = profits
    .map((p, i) => {
      const x = (i / Math.max(profits.length - 1, 1)) * w
      const y = h - ((p - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const lastProfit = profits[profits.length - 1] ?? 0
  const isUp = lastProfit >= 0

  return (
    <div className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
          {series.recipeName}
        </p>
        <span
          className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
            isUp
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}
        >
          {isUp ? '+' : ''}
          {formatCurrency(lastProfit)}
        </span>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible" style={{ height: 42 }}>
        {min < 0 && (
          <line
            x1={0}
            y1={h - ((0 - min) / range) * h}
            x2={w}
            y2={h - ((0 - min) / range) * h}
            stroke="#cbd5e1"
            strokeDasharray="2 2"
            strokeWidth={0.7}
          />
        )}
        <polyline
          points={pts}
          fill="none"
          stroke={isUp ? '#10b981' : '#f43f5e'}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {profits.length > 0 && (() => {
          const lastIdx = profits.length - 1
          const lx = (lastIdx / Math.max(profits.length - 1, 1)) * w
          const ly = h - ((profits[lastIdx] - min) / range) * h
          return <circle cx={lx} cy={ly} r={3} fill={isUp ? '#10b981' : '#f43f5e'} />
        })()}
      </svg>
      <p className="text-[10px] text-slate-400 mt-2 text-right font-medium">
        {series.data.length} wks tracked
      </p>
    </div>
  )
}