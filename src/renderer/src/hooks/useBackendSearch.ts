/**
 * useBackendSearch Hook
 * Universal hook for backend-powered search and filtering
 * 
 * Features:
 * - Server-side filtering and pagination
 * - Debounced search to reduce database load
 * - Loading states and error handling
 * - Request cancellation for stale queries
 * - Configurable per-page behavior
 * 
 * Usage:
 * ```tsx
 * const { data, loading, totalCount, pagination } = useBackendSearch({
 *   endpoint: 'search:products',
 *   filters: { query: searchTerm, categoryIds: selectedCategories },
 *   options: { debounceMs: 300, limit: 50 }
 * })
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounce } from './useDebounce'
import logger from '../../../shared/utils/logger'

interface SearchFilters {
  query?: string
  categoryIds?: string[]
  stockStatus?: ('out' | 'low' | 'normal' | 'high')[]
  priceRange?: { min: number; max: number }
  stockRange?: { min: number; max: number }
  colors?: never
  sizes?: never
  storeId?: string
}

interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

interface SearchOptions {
  debounceMs?: number
  limit?: number
  includeImages?: boolean
  includeMetrics?: boolean
  enrichData?: boolean
  initialPage?: number
  abortControllerFactory?: () => AbortController
}

interface SearchParams {
  endpoint: 'search:products' | 'search:inventory'
  filters: SearchFilters
  sort?: SortOptions
  options?: SearchOptions
}

interface SearchResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  totalCount: number
  pagination: {
    currentPage: number
    totalPages: number
    hasMore: boolean
    setPage: (page: number) => void
    nextPage: () => void
    prevPage: () => void
  }
  refetch: () => void
  metrics?: any
}

/**
 * useBackendSearch - Universal backend search hook
 * Handles debouncing, pagination, and loading states
 */
export function useBackendSearch<T = any>(params: SearchParams): SearchResult<T> {
  const { endpoint, filters, sort, options = {} } = params
  
  const {
    debounceMs = 300,
    limit = 50,
    includeImages = false,
    includeMetrics = false,
    enrichData = false,
    initialPage = 1,
    abortControllerFactory = () => new AbortController()
  } = options

  // State
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)

  // Debounce search query
  const debouncedFilters = useDebounce(filters, debounceMs)
  
  // Track if component is mounted
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Fetch data from backend
   */
  const fetchData = useCallback(async (page: number = currentPage) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = abortControllerFactory()

    try {
      setLoading(true)
      setError(null)

      const api = (window as any).api
      if (!api) {
        throw new Error('API not available')
      }

      const result = await api[endpoint]({
        filters: debouncedFilters,
        sort,
        pagination: {
          page,
          limit
        },
        includeImages,
        includeMetrics,
        enrichData
      })

      if (isMountedRef.current) {
        setData(result.items || [])
        setTotalCount(result.totalCount || 0)
        setTotalPages(result.totalPages || 0)
        setHasMore(result.hasMore || false)
        setCurrentPage(result.page || page)
        
        if (result.metrics) {
          setMetrics(result.metrics)
        }
      }
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        return
      }

      if (isMountedRef.current) {
        logger.error('Backend search error:', err)
        setError(err.message || 'Failed to search')
        setData([])
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, debouncedFilters, sort, limit, includeImages, includeMetrics, enrichData])

  /**
   * Effect: Fetch data when filters or sort changes
   */
  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1)
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, sort])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Pagination helpers
   */
  const setPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      fetchData(page)
    }
  }, [totalPages, fetchData])

  const nextPage = useCallback(() => {
    if (hasMore) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      fetchData(newPage)
    }
  }, [hasMore, currentPage, fetchData])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      fetchData(newPage)
    }
  }, [currentPage, fetchData])

  /**
   * Manual refetch
   */
  const refetch = useCallback(() => {
    fetchData(currentPage)
  }, [fetchData, currentPage])

  return {
    data,
    loading,
    error,
    totalCount,
    pagination: {
      currentPage,
      totalPages,
      hasMore,
      setPage,
      nextPage,
      prevPage
    },
    refetch,
    metrics
  }
}

/**
 * Hook to get filter metadata (categories, colors, sizes, price range)
 * Used to populate filter dropdowns
 */
export function useFilterMetadata() {
  const [metadata, setMetadata] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoading(true)
        const api = (window as any).api
        const result = await api['search:getFilterMetadata']()
        setMetadata(result)
      } catch (err: any) {
        logger.error('Failed to load filter metadata:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadMetadata()
  }, [])

  return { metadata, loading, error }
}
