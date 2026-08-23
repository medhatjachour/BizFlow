import { TransferRawItem, DailyBucketPoint } from './types'

export function buildDailyTransferBuckets(transfers: TransferRawItem[], days = 7): DailyBucketPoint[] {
  const result: DailyBucketPoint[] = []

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - i)

    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    const count = transfers.filter(tr => {
      const d = new Date(tr.createdAt || tr.transferDate || tr.date || 0)
      return d >= start && d < end
    }).length

    result.push({
      label: start.toLocaleDateString('en-US', { weekday: 'short' }),
      count,
      v: count
    })
  }

  return result
}

export function formatCompactCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}