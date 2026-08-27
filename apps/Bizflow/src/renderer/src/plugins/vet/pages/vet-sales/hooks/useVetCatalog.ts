import { useState, useEffect, useCallback, useMemo } from 'react'
import type { MedicineLite } from '../types'

export function useVetCatalog() {
  const [medicines, setMedicines] = useState<MedicineLite[]>([])
  const [categories, setCategories] = useState<string[]>(['all'])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [medRes, catRes] = await Promise.all([
        (window as any).api?.vet?.medicines?.getAll({ skip: 0, take: 500 }),
        (window as any).api?.vet?.medicineCategories?.getAll().catch(() => [])
      ])
      setMedicines(medRes?.data ?? [])
      if (Array.isArray(catRes)) {
        setCategories(['all', ...catRes.map(c => c.name)])
      }
    } catch {
      // Fallback safe state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase()
    return medicines.filter(m => {
      const matchName = !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory
      return matchName && matchCat
    })
  }, [medicines, search, selectedCategory])

  return {
    medicines,
    filteredMedicines,
    categories,
    loading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    refreshCatalog: loadData
  }
}