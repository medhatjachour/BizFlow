import { useState, useEffect, useCallback } from 'react'
import type { Category, Product, CoffeeTable } from '../types'

interface Shift { id: string }

export function usePOSData(toast: any) {
  const [categories,  setCategories]  = useState<Category[]>([])
  const [products,    setProducts]    = useState<Product[]>([])
  const [tables,      setTables]      = useState<CoffeeTable[]>([])
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [loading,     setLoading]     = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, prods, tbls, shift] = await Promise.all([
        window.api.coffee.categories.getAll(),
        window.api.coffee.products.getAll({ available: true }),
        window.api.coffee.tables.getAll(),
        window.api.coffee.shifts.getActive(),
      ])
      setCategories(cats ?? [])
      setProducts(prods ?? [])
      setTables((tbls ?? []).filter((t: CoffeeTable) => t.status === 'available'))
      setActiveShift(shift)
    } catch {
      toast.error('Failed to load POS data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  return { categories, products, tables, activeShift, loading, loadData }
}
