import { GymReportStats, GymSessionRecord } from './types'

export function formatCurrency(amount: number, currency: string = '$'): string {
  const isNegative = amount < 0
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${isNegative ? '-' : ''}${currency}${formatted}`
}

export function formatSessionTime(dateString: string | Date): { date: string; time: string } {
  const d = new Date(dateString)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
}

export function downloadGymReportCSV(
  stats: GymReportStats | null,
  sessions: GymSessionRecord[],
  period: string,
  customDate?: string
) {
  if (!stats) return

  const periodLabel = customDate ? `Date: ${customDate}` : `Period: ${period.toUpperCase()}`

  const rows: (string | number)[][] = [
    ['GYM EXECUTIVE & DAILY OPERATIONAL REPORT', periodLabel],
    ['Export Timestamp', new Date().toLocaleString()],
    [],
    ['KEY PERFORMANCE INDICATORS', 'VALUE'],
    ['Active Memberships', stats.activeMembers],
    ['Memberships Expiring Soon', stats.expiringSoon],
    ['Check-in Attendance Count', stats.todayCheckIns],
    ['Total Period Revenue', stats.revenue.toFixed(2)],
    ['Subscription Income', stats.subRevenue.toFixed(2)],
    ['Walk-in Income', stats.walkRevenue.toFixed(2)],
    ['Operational Expenses', stats.totalExpenses.toFixed(2)],
    ['Net Profit / Income', stats.netIncome.toFixed(2)],
    [],
    ['SESSION ID', 'DATE', 'TIME', 'TYPE', 'TRAINEE / MEMBER', 'ASSIGNED COACH', 'AMOUNT ($)']
  ]

  sessions.forEach((s) => {
    const { date, time } = formatSessionTime(s.date)
    rows.push([
      s.id,
      date,
      time,
      s.type.toUpperCase(),
      s.trainee?.name ?? 'Anonymous / Walk-in Guest',
      s.coach?.name ?? 'Unassigned',
      s.amount.toFixed(2)
    ])
  })

  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gym_report_${period}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}