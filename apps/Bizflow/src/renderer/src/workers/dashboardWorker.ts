/**
 * dashboardWorker.ts — runs on a dedicated Web Worker thread.
 *
 * Handles CPU-intensive analytics so the UI thread stays responsive.
 * No imports allowed — must be self-contained.
 *
 * Message protocol:
 *   IN:  { id: string, type: TaskType, payload: any }
 *   OUT: { id: string, result: any, error?: string }
 */

type TaskType =
  | 'COMPUTE_TRENDS'
  | 'COMPUTE_HEATMAP'
  | 'COMPUTE_EFFICIENCY'
  | 'COMPUTE_STOCK_VALUE'
  | 'COMPUTE_AGE_DISTRIBUTION'
  | 'COMPUTE_TABLE_METRICS'
  | 'COMPUTE_INGREDIENT_COST'
  | 'COMPUTE_DIAGNOSIS_FREQ'

// ── Worker message handler ────────────────────────────────────────────────────

;(self as any).onmessage = (e: MessageEvent) => {
  const { id, type, payload } = e.data as { id: string; type: TaskType; payload: any }
  try {
    const result = dispatch(type, payload)
    ;(self as any).postMessage({ id, result })
  } catch (err) {
    ;(self as any).postMessage({ id, result: null, error: (err as Error).message })
  }
}

function dispatch(type: TaskType, payload: any): any {
  switch (type) {
    case 'COMPUTE_TRENDS':          return computeTrends(payload)
    case 'COMPUTE_HEATMAP':         return computeHeatmap(payload)
    case 'COMPUTE_EFFICIENCY':      return computeEfficiency(payload)
    case 'COMPUTE_STOCK_VALUE':     return computeStockValue(payload)
    case 'COMPUTE_AGE_DISTRIBUTION':return computeAgeDistribution(payload)
    case 'COMPUTE_TABLE_METRICS':   return computeTableMetrics(payload)
    case 'COMPUTE_INGREDIENT_COST': return computeIngredientCost(payload)
    case 'COMPUTE_DIAGNOSIS_FREQ':  return computeDiagnosisFreq(payload)
    default: throw new Error(`Unknown task: ${type}`)
  }
}

// ── Computation functions ─────────────────────────────────────────────────────

/**
 * Trend analysis on a time series of numbers.
 * Returns: slope (linear regression), % change, moving average, min/max.
 */
function computeTrends({ values, labels }: { values: number[]; labels?: string[] }) {
  if (!values || values.length < 2) {
    return { slope: 0, avg: 0, change: 0, trend: 'flat', movingAvg: [], min: 0, max: 0, labels: labels || [] }
  }

  const n = values.length
  const avg = values.reduce((a, b) => a + b, 0) / n
  const min = Math.min(...values)
  const max = Math.max(...values)

  // Linear regression slope (y = a + b*x)
  let sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumXY += i * (values[i] - avg)
    sumX2 += i * i
  }
  const slope = sumX2 !== 0 ? sumXY / sumX2 : 0

  // % change (first non-zero to last)
  const first = values.find(v => v > 0) ?? 0
  const last = values[n - 1]
  const change = first > 0 ? ((last - first) / first) * 100 : 0

  // 3-day moving average
  const movingAvg = values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 2), i + 1)
    return parseFloat((window.reduce((a, b) => a + b, 0) / window.length).toFixed(2))
  })

  const trend = slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'flat'
  return { slope: parseFloat(slope.toFixed(4)), avg: parseFloat(avg.toFixed(2)), change: parseFloat(change.toFixed(1)), trend, movingAvg, min, max, labels: labels || [] }
}

/**
 * Hourly + day-of-week heatmap from an array of ISO timestamp strings.
 */
function computeHeatmap({ timestamps }: { timestamps: string[] }) {
  const hourCounts = new Array(24).fill(0)
  const dayCounts = new Array(7).fill(0)

  for (const ts of timestamps) {
    if (!ts) continue
    const d = new Date(ts)
    if (isNaN(d.getTime())) continue
    hourCounts[d.getHours()]++
    dayCounts[d.getDay()]++
  }

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
  const peakDayIdx = dayCounts.indexOf(Math.max(...dayCounts))
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Business hours summary (8–22)
  const morningCount = hourCounts.slice(8, 12).reduce((a, b) => a + b, 0)
  const afternoonCount = hourCounts.slice(12, 17).reduce((a, b) => a + b, 0)
  const eveningCount = hourCounts.slice(17, 22).reduce((a, b) => a + b, 0)

  return {
    hourCounts,
    dayCounts,
    peakHour,
    peakDay: dayNames[peakDayIdx],
    peakDayIdx,
    periods: { morning: morningCount, afternoon: afternoonCount, evening: eveningCount },
  }
}

/**
 * Batch production efficiency: planned yield vs actual yield.
 */
function computeEfficiency({ batches }: { batches: { planned: number; actual: number; name?: string }[] }) {
  if (!batches?.length) return { overallPct: 0, items: [], belowTarget: 0, aboveTarget: 0 }

  const items = batches.map(b => {
    const pct = b.planned > 0 ? Math.min(150, ((b.actual ?? 0) / b.planned) * 100) : 0
    return { name: b.name || '', planned: b.planned, actual: b.actual ?? 0, pct: parseFloat(pct.toFixed(1)) }
  })

  const overallPct = items.reduce((s, x) => s + x.pct, 0) / items.length
  const belowTarget = items.filter(x => x.pct < 80).length
  const aboveTarget = items.filter(x => x.pct >= 100).length

  return { overallPct: parseFloat(overallPct.toFixed(1)), items, belowTarget, aboveTarget }
}

/**
 * Total stock value, utilization %, and distribution across locations.
 */
function computeStockValue({
  stocks,
}: {
  stocks: { locationId?: string; locationName?: string; qty: number; unitCost: number; capacity?: number }[]
}) {
  let totalValue = 0
  let totalQty = 0
  let totalCapacity = 0
  const byLocation: Record<string, { name: string; value: number; qty: number; capacity: number; utilization: number }> = {}

  for (const s of stocks) {
    const val = (s.qty || 0) * (s.unitCost || 0)
    totalValue += val
    totalQty += s.qty || 0
    totalCapacity += s.capacity || 0

    if (s.locationId) {
      if (!byLocation[s.locationId]) {
        byLocation[s.locationId] = { name: s.locationName || s.locationId, value: 0, qty: 0, capacity: 0, utilization: 0 }
      }
      byLocation[s.locationId].value += val
      byLocation[s.locationId].qty += s.qty || 0
      byLocation[s.locationId].capacity += s.capacity || 0
    }
  }

  // Compute per-location utilization
  for (const loc of Object.values(byLocation)) {
    loc.utilization = loc.capacity > 0 ? parseFloat(((loc.qty / loc.capacity) * 100).toFixed(1)) : 0
  }

  const utilization = totalCapacity > 0 ? parseFloat(((totalQty / totalCapacity) * 100).toFixed(1)) : 0
  const topLocations = Object.values(byLocation)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalQty,
    totalCapacity,
    utilization,
    topLocations,
  }
}

/**
 * Patient age distribution bucketing + average age.
 */
function computeAgeDistribution({ birthDates }: { birthDates: string[] }) {
  const buckets: Record<string, number> = { '0–17': 0, '18–35': 0, '36–50': 0, '51–65': 0, '65+': 0 }
  const now = Date.now()
  let totalAge = 0
  let validCount = 0

  for (const bd of birthDates) {
    if (!bd) continue
    const d = new Date(bd)
    if (isNaN(d.getTime())) continue
    const age = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    totalAge += age
    validCount++

    if (age < 18) buckets['0–17']++
    else if (age < 36) buckets['18–35']++
    else if (age < 51) buckets['36–50']++
    else if (age < 66) buckets['51–65']++
    else buckets['65+']++
  }

  const avgAge = validCount > 0 ? Math.round(totalAge / validCount) : 0

  // Most common age group
  const dominant = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  return { buckets, avgAge, total: validCount, dominant }
}

/**
 * Table turnover time + avg order value for restaurant orders.
 */
function computeTableMetrics({
  orders,
}: {
  orders: { startTime: string; endTime?: string; total?: number; tableId?: string }[]
}) {
  const completed = orders.filter(o => o.endTime && o.startTime)

  const turnoverTimes = completed.map(o => {
    const ms = new Date(o.endTime!).getTime() - new Date(o.startTime).getTime()
    return ms > 0 ? ms : 0
  })

  const avgTurnoverMin = turnoverTimes.length
    ? parseFloat((turnoverTimes.reduce((a, b) => a + b, 0) / turnoverTimes.length / 60000).toFixed(1))
    : 0

  const avgOrderValue = completed.length
    ? parseFloat((completed.reduce((s, o) => s + (o.total || 0), 0) / completed.length).toFixed(2))
    : 0

  const completionRate = orders.length
    ? parseFloat(((completed.length / orders.length) * 100).toFixed(1))
    : 0

  // Revenue by table
  const tableRevenue: Record<string, number> = {}
  for (const o of completed) {
    if (o.tableId) {
      tableRevenue[o.tableId] = parseFloat(((tableRevenue[o.tableId] || 0) + (o.total || 0)).toFixed(2))
    }
  }

  return { avgTurnoverMin, avgOrderValue, completionRate, tableRevenue }
}

/**
 * Ingredient cost analysis: cost to produce each batch.
 */
function computeIngredientCost({
  batches,
}: {
  batches: {
    name: string
    ingredients: { name: string; qty: number; unitCost: number }[]
    quantity: number
  }[]
}) {
  const result = batches.map(batch => {
    const totalIngredientCost = batch.ingredients.reduce(
      (sum, ing) => sum + (ing.qty || 0) * (ing.unitCost || 0),
      0
    )
    const costPerUnit = batch.quantity > 0 ? totalIngredientCost / batch.quantity : 0
    return {
      name: batch.name,
      totalCost: parseFloat(totalIngredientCost.toFixed(2)),
      costPerUnit: parseFloat(costPerUnit.toFixed(4)),
      quantity: batch.quantity,
    }
  })

  const totalCost = result.reduce((s, r) => s + r.totalCost, 0)
  return { batches: result, totalCost: parseFloat(totalCost.toFixed(2)) }
}

/**
 * Diagnosis frequency distribution — rank diagnoses by frequency.
 */
function computeDiagnosisFreq({ diagnoses }: { diagnoses: string[] }) {
  const freq: Record<string, number> = {}
  for (const d of diagnoses) {
    if (!d) continue
    const key = d.trim()
    freq[key] = (freq[key] || 0) + 1
  }

  const ranked = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const total = diagnoses.filter(Boolean).length
  return { ranked, total, unique: Object.keys(freq).length }
}
