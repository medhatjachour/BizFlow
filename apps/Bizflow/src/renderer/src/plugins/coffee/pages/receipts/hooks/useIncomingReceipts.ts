import { useState, useEffect, useCallback } from 'react'
import type { IncomingReceipt, IncomingSummary } from '../types'

interface Filters {
  page?: number
  categoryId?: string
  search?: string
}

export function useIncomingReceipts(filters: Filters) {
  const [receipts, setReceipts] = useState<IncomingReceipt[]>([])
  const [summary, setSummary] = useState<IncomingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        window.api.coffee.incomingReceipts.getAll(filters),
        window.api.coffee.incomingReceipts.getSummary({ categoryId: filters.categoryId })
      ])
      setReceipts(list?.items ?? [])
      setTotalPages(list?.totalPages ?? 1)
      setSummary(sum)
    } catch (error) {
      console.error('Failed to load incoming receipts', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  return { receipts, summary, loading, totalPages, reload: load }
}
