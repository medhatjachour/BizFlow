import { useState, useEffect, useMemo, useCallback } from 'react'
import { RestaurantTableData, TableStatus } from '../types'

export function useFloorPlan() {
  const [tables, setTables] = useState<RestaurantTableData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'canvas'>('grid')
  const [selectedSection, setSelectedSection] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTable, setSelectedTable] = useState<RestaurantTableData | null>(null)

  const loadTables = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await window.api.restaurant.getTables()
      setTables(data || [])
      if (selectedTable) {
        const fresh = data.find((t: RestaurantTableData) => t.id === selectedTable.id)
        setSelectedTable(fresh || null)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch restaurant floor tables')
    } finally {
      setLoading(false)
    }
  }, [selectedTable])

  useEffect(() => {
    loadTables()
    const interval = setInterval(loadTables, 20000) // 20s auto-refresh
    return () => clearInterval(interval)
  }, [])

  const sections = useMemo(() => {
    const list = tables.map((t) => t.section).filter(Boolean)
    return Array.from(new Set(list))
  }, [tables])

  const stats = useMemo(() => {
    const total = tables.length
    const available = tables.filter((t) => t.status === 'available').length
    const occupied = tables.filter((t) => t.status === 'occupied').length
    const billing = tables.filter((t) => t.status === 'billing').length
    const reserved = tables.filter((t) => t.status === 'reserved').length
    const cleaning = tables.filter((t) => t.status === 'cleaning').length
    const totalGuests = tables.reduce((acc, t) => {
      const openOrder = t.orders?.[0]
      return acc + (openOrder ? openOrder.guestCount : 0)
    }, 0)

    return { total, available, occupied, billing, reserved, cleaning, totalGuests }
  }, [tables])

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSection = selectedSection === 'ALL' || t.section === selectedSection
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter
      const matchSearch =
        searchQuery.trim() === '' ||
        String(t.number).includes(searchQuery) ||
        (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.section && t.section.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchSection && matchStatus && matchSearch
    })
  }, [tables, selectedSection, statusFilter, searchQuery])

  const updatePosition = async (id: string, posX: number, posY: number) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, posX, posY } : t)))
    try {
      await window.api.restaurant.updateTablePosition({ id, posX, posY })
    } catch {
      loadTables()
    }
  }

  return {
    tables,
    filteredTables,
    loading,
    error,
    sections,
    stats,
    viewMode,
    setViewMode,
    selectedSection,
    setSelectedSection,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedTable,
    setSelectedTable,
    loadTables,
    updatePosition
  }
}