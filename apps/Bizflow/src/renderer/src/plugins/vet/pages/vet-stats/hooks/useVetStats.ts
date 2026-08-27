import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import {
  PeriodPreset,
  VetOverviewStats,
  DiagnosisStat,
  SpeciesStat,
  VisitTypeStat,
  MedSummaryStat,
  ProfitAnalysis,
  SalesBreakdown,
  MedicineItem
} from '../types'
import { computePresetRange, analyzeMedicineInventory } from '../utils'

export function useVetStats(initialPreset: PeriodPreset = 'month') {
  const toast = useToast()
  const [period, setPeriod] = useState<PeriodPreset>(initialPreset)
  const [customRange, setCustomRange] = useState<{ from?: string; to?: string }>({})
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [overview, setOverview] = useState<VetOverviewStats | null>(null)
  const [diagnoses, setDiagnoses] = useState<DiagnosisStat[]>([])
  const [species, setSpecies] = useState<SpeciesStat[]>([])
  const [visitTypes, setVisitTypes] = useState<VisitTypeStat[]>([])
  const [medSummary, setMedSummary] = useState<MedSummaryStat | null>(null)
  const [profit, setProfit] = useState<ProfitAnalysis | null>(null)
  const [breakdown, setBreakdown] = useState<SalesBreakdown | null>(null)
  const [allMedicines, setAllMedicines] = useState<MedicineItem[]>([])
  const [pharmacyOutstanding, setPharmacyOutstanding] = useState(0)

  // Compute ISO date range based on preset or custom dates
  const activeRange = useMemo(() => {
    if (period === 'custom' && customRange.from && customRange.to) {
      const f = new Date(customRange.from)
      f.setHours(0, 0, 0, 0)
      const t = new Date(customRange.to)
      t.setHours(23, 59, 59, 999)
      return { from: f.toISOString(), to: t.toISOString() }
    }
    return computePresetRange(period === 'custom' ? 'month' : period)
  }, [period, customRange])

  const loadData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true)
    else setIsRefreshing(true)

    try {
      const { from, to } = activeRange
      // Map custom to a valid backend preset or fallback to 'month'
      const overviewPeriod = period === 'custom' ? 'month' : period

      const [ov, dx, sp, vt, ms, meds, pa, sb] = await Promise.all([
        // 1. Overview takes only (period)
        window.api.vet?.stats.overview(overviewPeriod),

        // 2. Top diagnoses takes only { limit: number }
        window.api.vet?.stats.topDiagnoses({ limit: 8 }),

        // 3. Species breakdown takes no arguments
        window.api.vet?.stats.speciesBreakdown(),

        // 4. Visit trend with range (safe invoke across types)
        (window.api.vet?.stats.visitTrend as any)?.({ from, to }),

        // 5. Medicine summary with date boundaries
        window.api.vet?.medicines.getSummary({ from, to }),

        // 6. Active medicine list
        window.api.vet?.medicines.getAll({ take: 200 }),

        // 7. Profit analysis with range
        window.api.vet?.stats.profitAnalysis({ from, to }),

        // 8. Sales breakdown with range
        window.api.vet?.stats.salesBreakdown({ from, to })
      ])

      setOverview(ov ?? null)
      setDiagnoses(dx ?? [])
      setSpecies(sp ?? [])
      setVisitTypes(vt ?? [])
      setMedSummary(ms ?? null)
      setProfit(pa ?? null)
      setBreakdown(sb ?? null)
      setPharmacyOutstanding(Number(ms?.pharmacyOutstanding) || 0)
      setAllMedicines(meds?.data ?? [])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load statistical metrics')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [activeRange, period, toast])

  useEffect(() => {
    loadData(true)
  }, [loadData])

  const inventoryStats = useMemo(
    () => analyzeMedicineInventory(allMedicines),
    [allMedicines]
  )

  return {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    loading,
    isRefreshing,
    refresh: () => loadData(false),
    overview,
    diagnoses,
    species,
    visitTypes,
    medSummary,
    profit,
    breakdown,
    pharmacyOutstanding,
    allMedicines,
    ...inventoryStats
  }
}