import { useState, useEffect, useCallback } from 'react'
import { OverviewData } from '../types'

interface UseOverviewReturn {
  data: OverviewData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useOverview(): UseOverviewReturn {
  const [data, setData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await window.api.warehouse.getOverview()
      setData(res)
    } catch (err: any) {
      console.error('[useOverview] Failed to fetch overview:', err)
      setError(err instanceof Error ? err : new Error(err?.message || 'Failed to fetch warehouse overview'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}