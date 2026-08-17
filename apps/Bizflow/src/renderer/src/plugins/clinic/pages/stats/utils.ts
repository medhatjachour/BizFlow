import { formatCurrency } from '@renderer/utils/formatNumber'
import type { ClinicOverview, MonthlyEntry, DiagnosisEntry, TrendMetric, InsightItem } from './types'

/**
 * Calculates comparative trend between the last 2 monthly entries
 */
export function calculateMonthlyTrend(monthly: MonthlyEntry[], key: 'revenue' | 'sessions'): TrendMetric {
  if (monthly.length < 2) return { pct: 0, dir: 'flat' }
  const last = monthly[monthly.length - 1]?.[key] ?? 0
  const prev = monthly[monthly.length - 2]?.[key] ?? 0
  if (prev === 0) return { pct: 0, dir: 'flat' }
  const diff = ((last - prev) / prev) * 100
  const pct = Math.round(Math.abs(diff))
  return {
    pct,
    dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  }
}

/**
 * Generates automated clinical & business advisory insights
 */
export function generateInsights(
  overview: ClinicOverview | null,
  collectionRate: number,
  avgSessionValue: number,
  revenueTrend: TrendMetric,
  diagnoses: DiagnosisEntry[]
): InsightItem[] {
  const list: InsightItem[] = []
  if (!overview) return list

  if (collectionRate >= 80) {
    list.push({
      id: 'coll-high',
      type: 'good',
      text: `Strong collection efficiency at ${collectionRate}% — optimal cashflow compliance.`
    })
  } else if (collectionRate < 50) {
    list.push({
      id: 'coll-low',
      type: 'warn',
      text: `Collection rate is ${collectionRate}%. ${formatCurrency(overview.outstandingThisMonth)} remains unpaid this month.`
    })
  }

  if (overview.followUpsDue > 0) {
    list.push({
      id: 'fu-due',
      type: 'warn',
      text: `${overview.followUpsDue} follow-up patient reminder${overview.followUpsDue > 1 ? 's are' : ' is'} due for scheduling.`
    })
  }

  if (overview.newPatientsThisMonth > 0) {
    list.push({
      id: 'new-pts',
      type: 'good',
      text: `${overview.newPatientsThisMonth} new patient${overview.newPatientsThisMonth > 1 ? 's' : ''} registered this month.`
    })
  }

  if (diagnoses.length > 0) {
    list.push({
      id: 'top-dx',
      type: 'info',
      text: `Primary clinical pathology: "${diagnoses[0].diagnosis}" (${diagnoses[0].count} sessions recorded).`
    })
  }

  if (avgSessionValue > 0) {
    list.push({
      id: 'avg-val',
      type: 'info',
      text: `Average visit ticket this month: ${formatCurrency(avgSessionValue)}.`
    })
  }

  if (revenueTrend.dir !== 'flat') {
    list.push({
      id: 'rev-trend',
      type: revenueTrend.dir === 'up' ? 'good' : 'warn',
      text: `Monthly revenue is ${revenueTrend.dir === 'up' ? 'up' : 'down'} ${revenueTrend.pct}% compared to the prior month.`
    })
  }

  return list.slice(0, 4)
}