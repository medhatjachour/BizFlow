/**
 * Data caching hook for smooth page navigation
 * Preloads and caches page data to eliminate loading delays
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import logger from '../../../shared/utils/logger'

type CacheEntry<T> = {
  data: T
  timestamp: number
}

type CacheStore = {
  [key: string]: CacheEntry<any>
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const cache: CacheStore = {}

export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    /** Time in ms to keep cached data (default: 5 min) */
    ttl?: number
    /** If true, fetch immediately on mount */
    immediate?: boolean
    /** If true, preload in background without showing loading state */
    preload?: boolean
  } = {}
) {
  const { ttl = CACHE_DURATION, immediate = true, preload = false } = options
  const [data, setData] = useState<T | null>(() => {
    // Return cached data immediately if available and fresh
    const cached = cache[key]
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data
    }
    return null
  })
  const [loading, setLoading] = useState(!data && !preload)
  const [error, setError] = useState<Error | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      
      const result = await fetcher()
      
      if (isMountedRef.current) {
        // Update cache
        cache[key] = {
          data: result,
          timestamp: Date.now()
        }
        setData(result)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      }
    } finally {
      if (isMountedRef.current && !silent) {
        setLoading(false)
      }
    }
  }, [key, fetcher])

  const invalidate = useCallback(() => {
    delete cache[key]
    fetchData()
  }, [key, fetchData])

  useEffect(() => {
    isMountedRef.current = true
    
    // Check if we have fresh cached data
    const cached = cache[key]
    const isFresh = cached && Date.now() - cached.timestamp < ttl
    
    if (isFresh) {
      setData(cached.data)
      setLoading(false)
    } else if (immediate) {
      fetchData(preload)
    }

    return () => {
      isMountedRef.current = false
    }
  }, [key, ttl, immediate, fetchData, preload])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate,
    /** Check if data exists in cache */
    isCached: !!cache[key]
  }
}

/**
 * Preload data for a specific cache key
 * Use this on link hover or idle time to prefetch page data
 */
export function preloadData<T>(key: string, fetcher: () => Promise<T>, ttl = CACHE_DURATION) {
  const cached = cache[key]
  const isFresh = cached && Date.now() - cached.timestamp < ttl
  
  if (!isFresh) {
    fetcher().then(data => {
      cache[key] = {
        data,
        timestamp: Date.now()
      }
    }).catch(err => {
      logger.warn(`Failed to preload ${key}:`, err)
    })
  }
}

/**
 * Clear all cached data
 */
export function clearCache() {
  Object.keys(cache).forEach(key => delete cache[key])
}

/**
 * Get cached data without triggering a fetch
 */
export function getCachedData<T>(key: string, ttl = CACHE_DURATION): T | null {
  const cached = cache[key]
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }
  return null
}
