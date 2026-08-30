import { Pie, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'
import { formatCurrency } from '../utils'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

interface Props {
  categoriesForCharts: { id: string; nameKey: string; color: string; total: number }[]
  includeCOGS: boolean
  includeSalaries: boolean
  t: (key: string) => string
}

const PALETTE = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899',
  '#f97316', '#ef4444', '#6366f1', '#64748b', '#14b8a6',
]

export default function ExpenseCharts({ categoriesForCharts, includeCOGS, includeSalaries, t }: Props) {
  if (categoriesForCharts.length === 0) return null

  const labels = categoriesForCharts.map((c) => t(c.nameKey) || c.id)
  const values = categoriesForCharts.map((c) => c.total)
  const chartTotal = values.reduce((sum, value) => sum + value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Category Pie Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t('expenseDistribution') || 'Category Breakdown'}
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            {formatCurrency(chartTotal)}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          COGS: {includeCOGS ? 'Active' : 'Off'} • Salaries: {includeSalaries ? 'Active' : 'Off'}
        </p>

        <div className="h-60 relative">
          <Pie
            data={{
              labels,
              datasets: [
                {
                  data: values,
                  backgroundColor: PALETTE,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.08)',
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    boxWidth: 10,
                    font: { size: 10 },
                    color: '#94a3b8',
                  },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const pct = chartTotal > 0 ? ((ctx.parsed / chartTotal) * 100).toFixed(1) : '0.0'
                      return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Magnitude Bar Comparison */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t('expenseMagnitudes') || 'Outflow Volume by Tier'}
          </h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          Visual scale of financial allocation across active departments
        </p>

        <div className="h-60 relative">
          <Bar
            data={{
              labels,
              datasets: [
                {
                  label: 'Outflow',
                  data: values,
                  backgroundColor: PALETTE.map((c) => `${c}CC`),
                  borderColor: PALETTE,
                  borderWidth: 1,
                  borderRadius: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${formatCurrency(Number(ctx.raw || 0))}`,
                  },
                },
              },
              scales: {
                x: {
                  ticks: { font: { size: 10 }, color: '#94a3b8' },
                  grid: { display: false },
                },
                y: {
                  beginAtZero: true,
                  ticks: {
                    font: { size: 10 },
                    color: '#94a3b8',
                    callback: (v) => formatCurrency(Number(v)),
                  },
                  grid: { color: 'rgba(148, 163, 184, 0.08)' },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}