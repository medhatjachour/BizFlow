import { useState, useEffect, useRef, useCallback } from 'react'
import { pharma } from '../../components/_shared'
import { PharmacyProduct } from '../types'

export function usePosProducts() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<PharmacyProduct[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadProducts = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const response = await pharma()?.products.getAll({
        status: 'active',
        search: query.trim(),
        take: 60,
        sortBy: 'name',
      })
      setProducts(response?.data ?? [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      loadProducts(search)
    }, 200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [search, loadProducts])

  const findProductByBarcode = useCallback(async (barcode: string): Promise<PharmacyProduct | undefined> => {
    const directMatch = products.find(p => p.barcode && p.barcode === barcode)
    if (directMatch) return directMatch

    try {
      const response = await pharma()?.products.getAll({ status: 'active', search: barcode, take: 5 })
      const list: PharmacyProduct[] = response?.data ?? []
      return list.find(p => p.barcode === barcode) ?? (list.length === 1 ? list[0] : undefined)
    } catch {
      return undefined
    }
  }, [products])

  return {
    search,
    setSearch,
    products,
    loading,
    refreshProducts: () => loadProducts(search),
    findProductByBarcode,
  }
}