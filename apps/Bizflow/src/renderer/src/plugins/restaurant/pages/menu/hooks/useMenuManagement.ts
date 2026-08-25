import { useState, useEffect, useCallback, useMemo } from 'react'
import { MenuItemData, MenuItemFormData } from '../types'

export function useMenuManagement() {
  const [items, setItems] = useState<MenuItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedStation, setSelectedStation] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await window.api.restaurant.getMenuItems()
      setItems(data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean))
    return Array.from(set)
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory
      const matchStation = selectedStation === 'ALL' || item.station === selectedStation
      const matchStock = !showOutOfStockOnly || !item.isAvailable
      const query = searchQuery.trim().toLowerCase()
      const matchSearch =
        query === '' ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))

      return matchCategory && matchStation && matchStock && matchSearch
    })
  }, [items, selectedCategory, selectedStation, showOutOfStockOnly, searchQuery])

  const groupedByCategory = useMemo(() => {
    return filteredItems.reduce<Record<string, MenuItemData[]>>((acc, item) => {
      const cat = item.category || 'General'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  }, [filteredItems])

  const stats = useMemo(() => {
    const total = items.length
    const available = items.filter((i) => i.isAvailable).length
    const outOfStock = total - available
    const avgMargin =
      total > 0
        ? Math.round(
            items.reduce((acc, i) => {
              const profit = Math.max(0, i.price - i.cost)
              return acc + (i.price > 0 ? (profit / i.price) * 100 : 0)
            }, 0) / total
          )
        : 0

    return { total, available, outOfStock, avgMargin }
  }, [items])

  const toggleItem86 = async (id: string) => {
    // Optimistic local update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isAvailable: !i.isAvailable } : i))
    )
    try {
      await window.api.restaurant.toggleItem86(id)
    } catch {
      loadItems()
    }
  }

  const saveItem = async (data: MenuItemFormData, editingId?: string) => {
    try {
      if (editingId) {
        await window.api.restaurant.updateMenuItem({
          id: editingId,
          name: data.name,
          category: data.category,
          description: data.description || null,
          price: Number(data.price),
          cost: Number(data.cost || 0),
          preparationTime: Number(data.preparationTime || 15),
          station: data.station || 'Kitchen',
          colorTag: data.colorTag || null,
          notes: data.notes || null,
          modifierGroups: data.modifierGroups
        })
      } else {
        await window.api.restaurant.createMenuItem({
          name: data.name,
          category: data.category,
          description: data.description || undefined,
          price: Number(data.price),
          cost: Number(data.cost || 0),
          preparationTime: Number(data.preparationTime || 15),
          station: data.station || 'Kitchen',
          colorTag: data.colorTag || undefined,
          notes: data.notes || undefined,
          modifierGroups: data.modifierGroups
        })
      }
      loadItems()
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to save menu item')
      return false
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this dish from the menu?')) return
    try {
      await window.api.restaurant.deleteMenuItem(id)
      loadItems()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete menu item')
    }
  }

  return {
    items: filteredItems,
    groupedByCategory,
    categories,
    loading,
    error,
    stats,
    selectedCategory,
    setSelectedCategory,
    selectedStation,
    setSelectedStation,
    searchQuery,
    setSearchQuery,
    showOutOfStockOnly,
    setShowOutOfStockOnly,
    refreshMenu: loadItems,
    toggleItem86,
    saveItem,
    deleteItem
  }
}