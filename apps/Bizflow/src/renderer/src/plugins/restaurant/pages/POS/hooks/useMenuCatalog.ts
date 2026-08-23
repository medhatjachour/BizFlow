import { useState, useEffect, useMemo } from 'react'
import { PosMenuItem } from '../types'

export function useMenuCatalog() {
  const [items, setItems] = useState<PosMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const loadMenu = async () => {
    setLoading(true)
    try {
      const data = await window.api.restaurant.getMenuItems()
      setItems(data || [])
    } catch (err) {
      console.error('Failed to load menu catalog', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean))
    return ['ALL', ...Array.from(set)]
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory
      const matchSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchCat && matchSearch
    })
  }, [items, selectedCategory, searchQuery])

  return {
    items: filteredItems,
    allCount: items.length,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    loading,
    refreshMenu: loadMenu
  }
}