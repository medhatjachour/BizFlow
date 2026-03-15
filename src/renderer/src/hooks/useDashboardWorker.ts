/**
 * useDashboardWorker
 *
 * Singleton Web Worker wrapper for dashboard analytics.
 * Falls back to synchronous main-thread computation if Worker instantiation
 * fails (e.g., CSP restrictions or test environments).
 *
 * Usage:
 *   const { compute } = useDashboardWorker()
 *   const trends = await compute('COMPUTE_TRENDS', { values: [...] })
 */

import { useCallback } from 'react'

export type WorkerTaskType =
  | 'COMPUTE_TRENDS'
  | 'COMPUTE_HEATMAP'
  | 'COMPUTE_EFFICIENCY'
  | 'COMPUTE_STOCK_VALUE'
  | 'COMPUTE_AGE_DISTRIBUTION'
  | 'COMPUTE_TABLE_METRICS'
  | 'COMPUTE_INGREDIENT_COST'
  | 'COMPUTE_DIAGNOSIS_FREQ'

export interface TrendsResult {
  slope: number; avg: number; change: number; trend: 'up' | 'down' | 'flat'
  movingAvg: number[]; min: number; max: number; labels: string[]
}
export interface HeatmapResult {
  hourCounts: number[]; dayCounts: number[]; peakHour: number; peakDay: string
  peakDayIdx: number; periods: { morning: number; afternoon: number; evening: number }
}
export interface EfficiencyResult {
  overallPct: number; items: { name: string; planned: number; actual: number; pct: number }[]
  belowTarget: number; aboveTarget: number
}
export interface StockValueResult {
  totalValue: number; totalQty: number; totalCapacity: number; utilization: number
  topLocations: { name: string; value: number; qty: number; capacity: number; utilization: number }[]
}
export interface AgeDistResult {
  buckets: Record<string, number>; avgAge: number; total: number; dominant: string
}
export interface TableMetricsResult {
  avgTurnoverMin: number; avgOrderValue: number; completionRate: number
  tableRevenue: Record<string, number>
}
export interface IngredientCostResult {
  batches: { name: string; totalCost: number; costPerUnit: number; quantity: number }[]
  totalCost: number
}
export interface DiagnosisFreqResult {
  ranked: { name: string; count: number }[]; total: number; unique: number
}

// ── Singleton infrastructure ──────────────────────────────────────────────────

let _worker: Worker | null = null
let _workerFailed = false
const _pending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>()

function getWorker(): Worker | null {
  if (_workerFailed) return null
  if (_worker) return _worker
  try {
    _worker = new Worker(new URL('../workers/dashboardWorker.ts', import.meta.url), { type: 'module' })
    _worker.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data
      const cb = _pending.get(id)
      if (!cb) return
      _pending.delete(id)
      if (error) cb.reject(new Error(error))
      else cb.resolve(result)
    }
    _worker.onerror = () => { _workerFailed = true; _worker = null }
  } catch {
    _workerFailed = true
  }
  return _worker
}

// ── Fallback inline computations (runs on main thread if worker unavailable) ──

function fallback(type: WorkerTaskType, payload: any): any {
  switch (type) {
    case 'COMPUTE_TRENDS': {
      const { values = [], labels = [] } = payload
      if (values.length < 2) return { slope: 0, avg: 0, change: 0, trend: 'flat', movingAvg: [], min: 0, max: 0, labels }
      const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
      const first = values.find((v: number) => v > 0) ?? 0
      const last = values[values.length - 1]
      const change = first > 0 ? ((last - first) / first) * 100 : 0
      const movingAvg = values.map((_: number, i: number) => {
        const w = values.slice(Math.max(0, i - 2), i + 1)
        return w.reduce((a: number, b: number) => a + b, 0) / w.length
      })
      return { slope: 0, avg, change, trend: change > 5 ? 'up' : change < -5 ? 'down' : 'flat', movingAvg, min: Math.min(...values), max: Math.max(...values), labels }
    }
    case 'COMPUTE_HEATMAP': {
      const { timestamps = [] } = payload
      const hourCounts = new Array(24).fill(0)
      const dayCounts = new Array(7).fill(0)
      for (const ts of timestamps) {
        const d = new Date(ts)
        if (!isNaN(d.getTime())) { hourCounts[d.getHours()]++; dayCounts[d.getDay()]++ }
      }
      const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      const peakDayIdx = dayCounts.indexOf(Math.max(...dayCounts))
      return { hourCounts, dayCounts, peakHour, peakDay: days[peakDayIdx], peakDayIdx, periods: { morning: 0, afternoon: 0, evening: 0 } }
    }
    case 'COMPUTE_AGE_DISTRIBUTION': {
      const { birthDates = [] } = payload
      const buckets: Record<string, number> = { '0–17': 0, '18–35': 0, '36–50': 0, '51–65': 0, '65+': 0 }
      const now = Date.now()
      let totalAge = 0, valid = 0
      for (const bd of birthDates) {
        if (!bd) continue
        const age = Math.floor((now - new Date(bd).getTime()) / (1000*60*60*24*365.25))
        totalAge += age; valid++
        if (age < 18) buckets['0–17']++
        else if (age < 36) buckets['18–35']++
        else if (age < 51) buckets['36–50']++
        else if (age < 66) buckets['51–65']++
        else buckets['65+']++
      }
      return { buckets, avgAge: valid ? Math.round(totalAge / valid) : 0, total: valid, dominant: '—' }
    }
    default:
      return null
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardWorker() {
  const compute = useCallback(<T = any>(type: WorkerTaskType, payload: any): Promise<T> => {
    const worker = getWorker()
    if (!worker) {
      // Run on main thread asynchronously
      return new Promise(resolve => setTimeout(() => resolve(fallback(type, payload)), 0))
    }

    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return new Promise<T>((resolve, reject) => {
      _pending.set(id, { resolve, reject })
      worker.postMessage({ id, type, payload })
    })
  }, [])

  return { compute }
}
