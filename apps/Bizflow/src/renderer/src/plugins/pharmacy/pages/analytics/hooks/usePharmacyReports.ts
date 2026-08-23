import { useState, useEffect, useCallback } from 'react'
import { pharma } from '../../components/_shared'
import { ReportViewType, DateRange, SalesReportData, InventoryReportData } from '../types'
import { computePresetDateRange } from '../utils'

export function usePharmacyReports(toast: any) {
  const [view, setView] = useState<ReportViewType>('sales')
  const [range, setRange] = useState<DateRange>(() => computePresetDateRange('month'))
  const [sales, setSales] = useState<SalesReportData | null>(null)
  const [inv, setInv] = useState<InventoryReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (view === 'sales' || view === 'financial') {
        const data = await pharma()?.stats.salesSummary({ from: range.from, to: range.to })
        setSales(data ?? null)
      } else {
        const data = await pharma()?.stats.inventory()
        setInv(data ?? null)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate report metrics')
    } finally {
      setLoading(false)
    }
  }, [view, range.from, range.to, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    view,
    range,
    sales,
    inv,
    loading,
    setView,
    setRange,
    reload: loadData,
  }
}