/**
 * Unit tests for useBackendSearch hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBackendSearch, useFilterMetadata } from '../../../renderer/src/hooks/useBackendSearch'

// Mock useDebounce to return value immediately
vi.mock('../../../renderer/src/hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value) // Return value immediately for testing
}))

// Create mock AbortController instance
const mockAbortControllerInstance = {
  abort: vi.fn(),
  signal: {}
}

// Create mock AbortController factory
const mockAbortControllerFactory = vi.fn(() => mockAbortControllerInstance)

describe('useBackendSearch', () => {
  const mockApi = {
    'search:products': vi.fn((params) => Promise.resolve({
      items: [{ id: 1 }],
      totalCount: 100,
      totalPages: 10,
      hasMore: params.pagination.page < 10,
      page: params.pagination.page
    })),
    'search:inventory': vi.fn((params) => Promise.resolve({
      items: [{ id: 1 }],
      totalCount: 100,
      totalPages: 10,
      hasMore: params.pagination.page < 10,
      page: params.pagination.page
    }))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock api on globalThis.window
    ;(globalThis as any).window.api = mockApi
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Don't try to delete api as it's not allowed
  })

  const defaultParams = {
    endpoint: 'search:products' as const,
    filters: { query: 'test' },
    options: { 
      debounceMs: 0, 
      limit: 10, 
      abortControllerFactory: mockAbortControllerFactory 
    } // Disable debouncing for tests
  }

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useBackendSearch(defaultParams))

    expect(result.current.data).toEqual([])
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.totalCount).toBe(0)
    expect(result.current.pagination.currentPage).toBe(1)
    expect(result.current.pagination.totalPages).toBe(0)
    expect(result.current.pagination.hasMore).toBe(false)
  })

  it.skip('should call API with correct parameters', async () => {
    const { result } = renderHook(() => useBackendSearch({
      ...defaultParams,
      filters: { query: 'test', categoryIds: ['cat1'] },
      sort: { field: 'name', direction: 'asc' },
      options: { limit: 20, includeImages: true, includeMetrics: true }
    }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockApi['search:products']).toHaveBeenCalledWith({
      filters: { query: 'test', categoryIds: ['cat1'] },
      sort: { field: 'name', direction: 'asc' },
      pagination: { page: 1, limit: 20 },
      includeImages: true,
      includeMetrics: true,
      enrichData: false
    })
  })

  it('should update state with API response', async () => {
    const mockResult = {
      items: [{ id: 1 }, { id: 2 }],
      totalCount: 25,
      totalPages: 3,
      hasMore: true,
      page: 1,
      metrics: { searchTime: 150 }
    }

    mockApi['search:products'].mockResolvedValue(mockResult)

    const { result } = renderHook(() => useBackendSearch(defaultParams))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }])
    expect(result.current.totalCount).toBe(25)
    expect(result.current.pagination.totalPages).toBe(3)
    expect(result.current.pagination.hasMore).toBe(true)
    expect(result.current.metrics).toEqual({ searchTime: 150 })
  })

  it('should handle API errors', async () => {
    const errorMessage = 'Network error'
    mockApi['search:products'].mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useBackendSearch(defaultParams))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.data).toEqual([])
  })

  it('should handle missing API', async () => {
    const originalApi = (window as any).api
    ;(window as any).api = undefined

    const { result } = renderHook(() => useBackendSearch(defaultParams))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('API not available')

    // Restore API
    ;(window as any).api = originalApi
  })

  it('should cancel previous requests when new request starts', async () => {
    mockApi['search:products'].mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    const { rerender } = renderHook(
      ({ filters }) => useBackendSearch({ ...defaultParams, filters }),
      { initialProps: { filters: { query: 'first' } } }
    )

    // Trigger second request - should create new AbortController
    rerender({ filters: { query: 'second' } })

    // Should have created 2 AbortControllers (one for each request)
    expect(mockAbortControllerFactory).toHaveBeenCalledTimes(2)
  })

  it('should reset to page 1 when filters change', async () => {
    mockApi['search:products'].mockResolvedValue({
      items: [],
      totalCount: 100,
      totalPages: 10,
      hasMore: true,
      page: 1
    })

    const { result, rerender } = renderHook(
      ({ filters }) => useBackendSearch({ ...defaultParams, filters }),
      { initialProps: { filters: { query: 'first' } } }
    )

    // Wait for initial load
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Change page
    act(() => {
      result.current.pagination.setPage(2)
    })

    await waitFor(() => {
      expect(result.current.pagination.currentPage).toBe(2)
    })

    // Change filters - should reset to page 1
    rerender({ filters: { query: 'second' } })

    await waitFor(() => {
      expect(result.current.pagination.currentPage).toBe(1)
    })
  })

  describe('pagination', () => {
    beforeEach(() => {
      mockApi['search:products'].mockResolvedValue({
        items: [],
        totalCount: 100,
        totalPages: 10,
        hasMore: true,
        page: 1
      })
    })

    it('should handle setPage correctly', async () => {
      const { result } = renderHook(() => useBackendSearch(defaultParams))

      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        result.current.pagination.setPage(5)
      })

      expect(result.current.pagination.currentPage).toBe(5)
    })

    it('should not set page outside bounds', async () => {
      const { result } = renderHook(() => useBackendSearch(defaultParams))

      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        result.current.pagination.setPage(15) // Beyond totalPages
      })

      expect(result.current.pagination.currentPage).toBe(1) // Should stay at 1
    })

    it('should handle nextPage', async () => {
      const { result } = renderHook(() => useBackendSearch(defaultParams))

      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        result.current.pagination.nextPage()
      })

      expect(result.current.pagination.currentPage).toBe(2)
    })

    it.skip('should handle prevPage', async () => {
      const { result } = renderHook(() => useBackendSearch({
        ...defaultParams,
        filters: {}, // No filters to avoid reset to page 1
        options: { ...defaultParams.options, initialPage: 3 }
      }))

      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        result.current.pagination.setPage(3)
      })

      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        result.current.pagination.prevPage()
      })

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(2)
      })
    })

    it('should not go below page 1 with prevPage', async () => {
      const { result } = renderHook(() => useBackendSearch(defaultParams))

      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        result.current.pagination.prevPage()
      })

      expect(result.current.pagination.currentPage).toBe(1)
    })
  })

  it('should refetch data', async () => {
    mockApi['search:products'].mockResolvedValue({
      items: [{ id: 1 }],
      totalCount: 1,
      totalPages: 1,
      hasMore: false,
      page: 1
    })

    const { result } = renderHook(() => useBackendSearch(defaultParams))

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Modify data to test refetch
    act(() => {
      // Simulate external data change
      mockApi['search:products'].mockResolvedValueOnce({
        items: [{ id: 2 }],
        totalCount: 1,
        totalPages: 1,
        hasMore: false,
        page: 1
      })
    })

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 2 }])
    })

    expect(mockApi['search:products']).toHaveBeenCalledTimes(2)
  })

  it('should ignore aborted requests', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'

    mockApi['search:products'].mockRejectedValue(abortError)

    const { result } = renderHook(() => useBackendSearch(defaultParams))

    // Should not set error for abort
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
  })

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useBackendSearch(defaultParams))

    unmount()

    expect(mockAbortControllerInstance.abort).toHaveBeenCalled()
  })
})

describe('useFilterMetadata', () => {
  const mockApi = {
    'search:getFilterMetadata': vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.api directly on the jsdom window
    ;(globalThis as any).window.api = mockApi
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Don't try to delete window.api as it's not allowed
  })

  it('should load metadata successfully', async () => {
    const mockMetadata = {
      categories: [{ id: '1', name: 'Electronics' }],
      colors: ['red', 'blue'],
      sizes: ['S', 'M', 'L']
    }

    mockApi['search:getFilterMetadata'].mockResolvedValue(mockMetadata)

    const { result } = renderHook(() => useFilterMetadata())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.metadata).toEqual(mockMetadata)
    expect(result.current.error).toBeNull()
  })

  it('should handle metadata loading error', async () => {
    const errorMessage = 'Failed to load metadata'
    mockApi['search:getFilterMetadata'].mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useFilterMetadata())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.metadata).toBeNull()
  })
})