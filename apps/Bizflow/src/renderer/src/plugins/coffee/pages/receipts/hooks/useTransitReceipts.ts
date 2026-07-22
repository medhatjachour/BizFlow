import { useState, useEffect, useCallback } from 'react'
import { TransitReceipt, TransitSummary } from '../types'

export function useTransitReceipts(filters: any) {
  const [receipts, setReceipts] = useState<TransitReceipt[]>([])
  const [summary, setSummary] = useState<TransitSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        window.api.coffee.transitReceipts.getAll(filters),
        window.api.coffee.transitReceipts.getSummary({})
      ])
      setReceipts(list?.items ?? [])
      setTotalPages(list?.totalPages ?? 1)
      setSummary(sum)
    } catch (error) {
      console.error('Failed to load transit receipts', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  return { receipts, summary, loading, totalPages, reload: load }
}
