/**
 * Unit tests for CacheService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CacheService } from '../../../main/services/CacheService'

describe('CacheService', () => {
  let cacheService: CacheService
  let mockNow: number

  beforeEach(() => {
    vi.useFakeTimers()
    mockNow = 1000000000 // Fixed starting time
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow)
    cacheService = CacheService.getInstance()
    cacheService.clear() // Clear between tests
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheService.getInstance()
      const instance2 = CacheService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Basic operations', () => {
    it('should set and get values', () => {
      cacheService.set('test', 'value')
      expect(cacheService.get('test')).toBe('value')
    })

    it('should return null for non-existent keys', () => {
      expect(cacheService.get('nonexistent')).toBeNull()
    })

    it('should check if key exists', () => {
      expect(cacheService.has('test')).toBe(false)
      cacheService.set('test', 'value')
      expect(cacheService.has('test')).toBe(true)
    })

    it('should delete specific keys', () => {
      cacheService.set('test', 'value')
      expect(cacheService.has('test')).toBe(true)
      cacheService.delete('test')
      expect(cacheService.has('test')).toBe(false)
    })

    it('should clear all entries', () => {
      cacheService.set('key1', 'value1')
      cacheService.set('key2', 'value2')
      expect(cacheService.getStats().size).toBe(2)
      cacheService.clear()
      expect(cacheService.getStats().size).toBe(0)
    })
  })

  describe('TTL functionality', () => {
    it('should expire entries after TTL', () => {
      cacheService.set('test', 'value', 1000) // 1 second TTL
      expect(cacheService.get('test')).toBe('value')

      // Advance time by more than 1 second
      mockNow += 1001
      expect(cacheService.get('test')).toBeNull()
    })

    it('should use default TTL when not specified', () => {
      cacheService.set('test', 'value')
      expect(cacheService.get('test')).toBe('value')

      // Advance time by more than default TTL (60 seconds)
      mockNow += 60 * 1000 + 1
      expect(cacheService.get('test')).toBeNull()
    })

    it('should not expire entries before TTL', () => {
      cacheService.set('test', 'value', 2000)
      mockNow += 1000
      expect(cacheService.get('test')).toBe('value')
    })
  })

  describe('Size limits', () => {
    it('should evict oldest entry when max size reached', () => {
      // Fill cache to max (100 entries)
      for (let i = 0; i < 100; i++) {
        cacheService.set(`key${i}`, `value${i}`)
      }

      expect(cacheService.getStats().size).toBe(100)

      // Add one more - should evict oldest
      cacheService.set('newKey', 'newValue')
      expect(cacheService.getStats().size).toBe(100) // Still 100
      expect(cacheService.has('key0')).toBe(false) // Oldest evicted
      expect(cacheService.has('newKey')).toBe(true)
    })

    it('should not evict when updating existing key', () => {
      for (let i = 0; i < 100; i++) {
        cacheService.set(`key${i}`, `value${i}`)
      }

      // Update existing key - should not evict
      cacheService.set('key50', 'updated')
      expect(cacheService.getStats().size).toBe(100)
      expect(cacheService.get('key50')).toBe('updated')
    })
  })

  describe('Pattern invalidation', () => {
    it('should invalidate entries matching pattern', () => {
      cacheService.set('user:1', 'user1')
      cacheService.set('user:2', 'user2')
      cacheService.set('product:1', 'product1')

      cacheService.invalidatePattern('user:*')
      expect(cacheService.has('user:1')).toBe(false)
      expect(cacheService.has('user:2')).toBe(false)
      expect(cacheService.has('product:1')).toBe(true)
    })

    it('should handle complex patterns', () => {
      cacheService.set('api:v1:users', 'users')
      cacheService.set('api:v1:products', 'products')
      cacheService.set('api:v2:users', 'usersv2')

      cacheService.invalidatePattern('api:v1:*')
      expect(cacheService.has('api:v1:users')).toBe(false)
      expect(cacheService.has('api:v1:products')).toBe(false)
      expect(cacheService.has('api:v2:users')).toBe(true)
    })
  })

  describe('getOrCompute', () => {
    it('should return cached value if available', async () => {
      const computeFn = vi.fn().mockResolvedValue('computed')
      cacheService.set('test', 'cached')

      const result = await cacheService.getOrCompute('test', computeFn)
      expect(result).toBe('cached')
      expect(computeFn).not.toHaveBeenCalled()
    })

    it('should compute and cache if not available', async () => {
      const computeFn = vi.fn().mockResolvedValue('computed')

      const result = await cacheService.getOrCompute('test', computeFn)
      expect(result).toBe('computed')
      expect(computeFn).toHaveBeenCalledTimes(1)

      // Should be cached now
      const cached = cacheService.get('test')
      expect(cached).toBe('computed')
    })

    it('should use custom TTL for computed values', async () => {
      const computeFn = vi.fn().mockResolvedValue('computed')

      await cacheService.getOrCompute('test', computeFn, 2000)
      expect(cacheService.has('test')).toBe(true)

      mockNow += 2001
      expect(cacheService.has('test')).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('should remove expired entries during cleanup', () => {
      cacheService.set('short', 'value', 1000)
      cacheService.set('long', 'value', 5000)

      mockNow += 2000
      // Trigger cleanup (normally called by interval)
      ;(cacheService as any).cleanup()

      expect(cacheService.has('short')).toBe(false)
      expect(cacheService.has('long')).toBe(true)
    })
  })

  describe('Statistics', () => {
    it('should return correct stats', () => {
      expect(cacheService.getStats()).toEqual({
        size: 0,
        maxSize: 100
      })

      cacheService.set('test', 'value')
      expect(cacheService.getStats()).toEqual({
        size: 1,
        maxSize: 100
      })
    })
  })

  describe('Type safety', () => {
    it('should maintain type information', () => {
      interface TestType {
        id: number
        name: string
      }

      const testData: TestType = { id: 1, name: 'test' }
      cacheService.set('typed', testData)

      const result = cacheService.get<TestType>('typed')
      expect(result).toEqual(testData)
      expect(result?.id).toBe(1)
      expect(result?.name).toBe('test')
    })
  })
})