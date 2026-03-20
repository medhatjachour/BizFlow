/**
 * useInventoryFilters Hook
 * Manages filtering and sorting logic for inventory
 */

import { useMemo } from 'react'
import type { InventoryFilters, InventorySortOptions } from './types'
import { InventoryItem } from '@/shared/types'

export function useInventoryFilters(
  items: InventoryItem[],
  filters: InventoryFilters,
  sortOptions: InventorySortOptions
) {
  return useMemo(() => {
    let filtered = [...items]

    // Apply search filter
    if (filters.search) {
      const query = filters.search.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.baseSKU.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(item => item.category && filters.categories.includes(item.category))
    }

    // Apply stock status filter
    if (filters.stockStatus.length > 0) {
      filtered = filtered.filter(item => filters.stockStatus.includes(item.stockStatus))
    }

    // Apply price range filter
    if (filters.priceRange.min > 0 || filters.priceRange.max < Infinity) {
      filtered = filtered.filter(item =>
        item.basePrice >= filters.priceRange.min &&
        item.basePrice <= filters.priceRange.max
      )
    }

    // Apply stock range filter
    if (filters.stockRange.min > 0 || filters.stockRange.max < Infinity) {
      filtered = filtered.filter(item =>
        item.totalStock >= filters.stockRange.min &&
        item.totalStock <= filters.stockRange.max
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { field, direction } = sortOptions
      let comparison = 0

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'baseSKU':
          comparison = a.baseSKU.localeCompare(b.baseSKU)
          break
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '')
          break
        case 'totalStock':
          comparison = a.totalStock - b.totalStock
          break
        case 'basePrice':
          comparison = a.basePrice - b.basePrice
          break
        case 'stockValue':
          comparison = a.stockValue - b.stockValue
          break
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
      }

      return direction === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [items, filters, sortOptions])
}
