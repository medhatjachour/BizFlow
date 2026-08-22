import { GymStatsOverview, GymExpenseSummary } from './types'

export function formatCurrency(amount: number, currency: string = '$'): string {
  const isNegative = amount < 0
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${isNegative ? '-' : ''}${currency}${formatted}`
}

export function formatPercentage(rate: number): string {
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`
}

export function calculateProfitMargin(revenue: number, netIncome: number): number {
  if (revenue <= 0) return 0
  return (netIncome / revenue) * 100
}

export function exportFinanceCsv(stats: GymStatsOverview | null, summary: GymExpenseSummary | null, period: string) {
  if (!stats) return

  const rows = [
    ['Gym Financial Report', `Period: ${period.toUpperCase()}`],
    ['Date Exported', new Date().toLocaleDateString()],
    [],
    ['Metric', 'Amount ($)'],
    ['Subscription Revenue', stats.subRevenue.toFixed(2)],
    ['Walk-in Revenue', stats.walkRevenue.toFixed(2)],
    ['Total Revenue', stats.revenue.toFixed(2)],
    ['Total Expenses', stats.totalExpenses.toFixed(2)],
    ['Net Income', stats.netIncome.toFixed(2)],
    [],
    ['Expense Category', 'Total ($)']
  ]

  if (summary?.byCategory) {
    summary.byCategory.forEach((c) => {
      rows.push([c.category, c.total.toFixed(2)])
    })
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `finance_report_${period}_${Date.now()}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}