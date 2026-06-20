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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

interface CategoryEntry {
  id: string
  nameKey: string
  total: number
}

interface Props {
  categoriesForCharts: CategoryEntry[]
  includeCOGS: boolean
  includeSalaries: boolean
  t: (key: string) => string
}

const CHART_COLORS = [
  'rgba(59, 130, 246, 0.8)',
  'rgba(234, 179, 8, 0.8)',
  'rgba(168, 85, 247, 0.8)',
  'rgba(34, 197, 94, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(251, 146, 60, 0.8)',
  'rgba(239, 68, 68, 0.8)',
  'rgba(99, 102, 241, 0.8)',
  'rgba(100, 116, 139, 0.8)',
  'rgba(147, 51, 234, 0.8)',
  'rgba(34, 197, 94, 0.8)',
]

const BAR_COLOR = (id: string) => {
  if (id === 'salaries') return { bg: 'rgba(147, 51, 234, 0.8)', border: 'rgb(147, 51, 234)' }
  if (id === 'cogs')     return { bg: 'rgba(34, 197, 94, 0.8)',  border: 'rgb(34, 197, 94)' }
  return { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgb(239, 68, 68)' }
}

export default function ExpenseCharts({ categoriesForCharts, includeCOGS, includeSalaries, t }: Props) {
  if (categoriesForCharts.length === 0) return null

  const labels = categoriesForCharts.map(c => t(c.nameKey))
  const values = categoriesForCharts.map(c => c.total)
  const chartTotal = values.reduce((sum, value) => sum + value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
          {t('categoryBreakdown')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Includes: {includeCOGS ? 'COGS' : 'No COGS'} • {includeSalaries ? 'Salaries' : 'No Salaries'}
        </p>
        <div className="h-64">
          <Pie
            data={{
              labels,
              datasets: [{
                data: values,
                backgroundColor: CHART_COLORS,
                borderWidth: 2,
                borderColor: '#fff',
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'right' },
                tooltip: {
                  callbacks: {
                    label: ctx => {
                      const pct = chartTotal > 0
                        ? ((ctx.parsed / chartTotal) * 100).toFixed(1)
                        : '0.0'
                      return `${ctx.label}: $${ctx.parsed.toFixed(2)} (${pct}%)`
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('categoryBreakdown')}</h3>
        <div className="h-64">
          <Bar
            data={{
              labels,
              datasets: [{
                label: 'Amount ($)',
                data: values,
                backgroundColor: categoriesForCharts.map(c => BAR_COLOR(c.id).bg),
                borderColor:     categoriesForCharts.map(c => BAR_COLOR(c.id).border),
                borderWidth: 1,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `$${(ctx.parsed.y ?? 0).toFixed(2)}` } },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { callback: v => '$' + v },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
