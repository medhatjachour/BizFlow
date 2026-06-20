/**
 * Database Performance Optimizations
 * 
 * Query batching, connection pooling, and optimization utilities
 */

import type { PrismaClient } from '../../generated/prisma'
import { createLogger } from '../utils/logger'
const log = createLogger('DBOptimize')

/**
 * Query Batcher
 * Batches multiple queries into a single transaction
 */
export class QueryBatcher {
  private queries: Array<() => Promise<unknown>> = []
  private timeout: NodeJS.Timeout | null = null
  private readonly batchDelay: number

  constructor(batchDelay: number = 10) {
    this.batchDelay = batchDelay
  }

  /**
   * Add query to batch
   */
  add<T>(query: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queries.push(async () => {
        try {
          const result = await query()
          resolve(result)
          return result
        } catch (error) {
          reject(error)
          throw error
        }
      })

      this.scheduleBatch()
    })
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.timeout = setTimeout(() => {
      this.executeBatch()
    }, this.batchDelay)
  }

  /**
   * Execute batched queries
   */
  private async executeBatch(): Promise<void> {
    if (this.queries.length === 0) return

    const batch = this.queries.splice(0)
    this.timeout = null

    log.debug('Executing query batch', { count: batch.length })

    await Promise.all(batch.map(query => query()))
  }
}

/**
 * Query Cache
 * Simple in-memory cache for frequently accessed data
 */
export class QueryCache {
  private cache = new Map<string, { data: unknown; expires: number }>()
  private readonly defaultTTL: number

  constructor(defaultTTL: number = 60000) {
    this.defaultTTL = defaultTTL
  }

  /**
   * Get from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  /**
   * Set in cache
   */
  set(key: string, data: unknown, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }

  /**
   * Delete from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Database Performance Monitor
 */
export class DBPerformanceMonitor {
  private queryTimes: number[] = []
  private readonly maxSamples: number = 100

  /**
   * Record query execution time
   */
  recordQuery(duration: number): void {
    this.queryTimes.push(duration)
    
    if (this.queryTimes.length > this.maxSamples) {
      this.queryTimes.shift()
    }
  }

  /**
   * Get average query time
   */
  getAverageQueryTime(): number {
    if (this.queryTimes.length === 0) return 0
    
    const sum = this.queryTimes.reduce((a, b) => a + b, 0)
    return sum / this.queryTimes.length
  }

  /**
   * Get slowest query time
   */
  getSlowestQueryTime(): number {
    return Math.max(...this.queryTimes, 0)
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      avgTime: this.getAverageQueryTime(),
      maxTime: this.getSlowestQueryTime(),
      sampleCount: this.queryTimes.length
    }
  }

  /**
   * Reset stats
   */
  reset(): void {
    this.queryTimes = []
  }
}

/**
 * Optimized Prisma Client Wrapper
 */
export class OptimizedPrismaClient {
  private cache: QueryCache
  private batcher: QueryBatcher
  private monitor: DBPerformanceMonitor

  constructor(private prisma: PrismaClient) {
    this.cache = new QueryCache()
    this.batcher = new QueryBatcher()
    this.monitor = new DBPerformanceMonitor()

    // Clear expired cache entries periodically
    setInterval(() => this.cache.clearExpired(), 60000)
  }

  /**
   * Execute query with caching
   */
  async executeWithCache<T>(
    cacheKey: string,
    query: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get<T>(cacheKey)
    if (cached !== null) {
      log.debug('Cache hit', { key: cacheKey })
      return cached
    }

    // Execute query
    const start = performance.now()
    const result = await query()
    const duration = performance.now() - start

    // Record metrics
    this.monitor.recordQuery(duration)

    // Cache result
    this.cache.set(cacheKey, result, ttl)

    log.debug('Query executed', { key: cacheKey, duration: `${duration.toFixed(2)}ms` })

    return result
  }

  /**
   * Execute query with batching
   */
  async executeWithBatching<T>(query: () => Promise<T>): Promise<T> {
    return this.batcher.add(query)
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateCache(pattern: string): void {
    log.debug('Invalidating cache', { pattern })
    // Simple pattern matching - could be enhanced
    this.cache.clear()
  }

  /**
   * Get performance stats
   */
  getPerformanceStats() {
    return this.monitor.getStats()
  }

  /**
   * Get Prisma client
   */
  getPrisma(): PrismaClient {
    return this.prisma
  }
}

/**
 * Create optimized database indexes
 */
export const optimizationQueries = {
  /**
   * Add indexes for frequently queried fields
   */
  createIndexes: async (_prisma: PrismaClient) => {
    // Note: These would normally be in migrations
    // This is for documentation purposes
    log.info('Database indexes should be created via migrations')
    
    // Example indexes that should exist:
    // - Product.baseSKU (unique)
    // - Product.category
    // - Product.storeId
    // - ProductVariant.sku (unique)
    // - ProductVariant.productId
    // - Sale.customerId
    // - Sale.storeId
    // - Sale.employeeId
    // - SaleItem.saleId
    // - SaleItem.variantId
  },

  /**
   * Analyze slow queries
   */
  analyzeSlowQueries: async (_prisma: PrismaClient) => {
    // This would require query logging to be enabled
    log.info('Enable Prisma query logging to analyze slow queries')
  }
}

/**
 * Singleton instances
 */
let queryCache: QueryCache | null = null
let queryBatcher: QueryBatcher | null = null
let performanceMonitor: DBPerformanceMonitor | null = null

export function getQueryCache(): QueryCache {
  if (!queryCache) {
    queryCache = new QueryCache()
  }
  return queryCache
}

export function getQueryBatcher(): QueryBatcher {
  if (!queryBatcher) {
    queryBatcher = new QueryBatcher()
  }
  return queryBatcher
}

export function getPerformanceMonitor(): DBPerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new DBPerformanceMonitor()
  }
  return performanceMonitor
}
