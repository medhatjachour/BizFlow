/**
 * useProductFilters Hook
 * Handles product filtering and search logic
 */

import { useMemo, useState, useEffect } from 'react'
import type { Product, ProductFilters } from './types'
import logger from '../../../../shared/utils/logger'

export function useProductFilters(products: Product[], filters: ProductFilters) {
  // Load categories from database
  const [dbCategories, setDbCategories] = useState<Array<{ id: string; name: string }>>([])
  
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const ipc = (window as any).api
        const result = await ipc.categories.getAll()
        if (result.success) {
          setDbCategories(result.categories || [])
        }
      } catch (error) {
        logger.error('Failed to load categories:', error)
      }
    }
    loadCategories()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesName = product.name.toLowerCase().includes(query)
        const matchesSKU = product.baseSKU.toLowerCase().includes(query)
        const matchesCategory = product.category?.toLowerCase().includes(query)
        if (!matchesName && !matchesSKU && !matchesCategory) return false
      }

      // Category filter
      if (filters.category && product.category && product.category !== filters.category) {
        return false
      }

      // Store filter
      if (filters.store && product.storeId !== filters.store) {
        return false
      }

      // Color filter - check if product has the selected color
      if (filters.color) {
        if (!product.hasVariants || !product.variants) return false
        const hasColor = product.variants.some(v => v.color === filters.color)
        if (!hasColor) return false
      }

      // Size filter - check if product has the selected size
      if (filters.size) {
        if (!product.hasVariants || !product.variants) return false
        const hasSize = product.variants.some(v => v.size === filters.size)
        if (!hasSize) return false
      }

      // Stock status filter
      if (filters.stockStatus) {
        const stock = product.totalStock ?? 0
        
        switch (filters.stockStatus) {
          case 'in-stock':
            // Has stock (greater than 0)
            if (stock <= 0) return false
            break
          case 'low-stock':
            // Between 1 and 10 (inclusive) - low but still available
            if (stock < 1 || stock > 10) return false
            break
          case 'out-of-stock':
            // FIXED: Only show products where ALL stock is 0
            // Check totalStock across all variants
            if (stock !== 0) return false
            break
        }
      }

      return true
    })
  }, [products, filters])

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const colors = new Set<string>()
    const sizes = new Set<string>()

    for (const product of products) {
      if (product.hasVariants && product.variants) {
        for (const variant of product.variants) {
          if (variant.color) colors.add(variant.color)
          if (variant.size) sizes.add(variant.size)
        }
      }
    }

    return {
      categories: dbCategories.map(c => c.name).sort((a, b) => a.localeCompare(b)),
      colors: Array.from(colors).sort((a, b) => a.localeCompare(b)),
      sizes: Array.from(sizes).sort((a, b) => a.localeCompare(b))
    }
  }, [products, dbCategories])

  return { filteredProducts, filterOptions }
}
