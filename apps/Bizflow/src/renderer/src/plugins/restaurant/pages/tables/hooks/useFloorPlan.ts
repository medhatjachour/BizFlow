// src/pages/tables/hooks/useFloorPlan.ts
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { RestaurantTableData, TableStatus } from '../types'

const VIEW_MODE_KEY = 'bizflow.restaurant.tables.viewMode'

/** Background refetches are coalesced so a busy POS does not refetch per keystroke. */
const REFRESH_DEBOUNCE_MS = 350

const readViewMode = (): 'grid' | 'canvas' => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'canvas' ? 'canvas' : 'grid'
  } catch {
    return 'grid'
  }
}

export function useFloorPlan() {
  const [tables, setTables] = useState<RestaurantTableData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewModeState] = useState<'grid' | 'canvas'>(readViewMode)
  const [selectedSection, setSelectedSection] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTable, setSelectedTable] = useState<RestaurantTableData | null>(null)

  // The drawer's target is tracked in a ref so that opening/closing it never
  // rebuilds `loadTables` — otherwise every one of the four event subscriptions
  // below would tear down and re-register on each drawer interaction.
  const selectedTableIdRef = useRef<string | null>(null)
  selectedTableIdRef.current = selectedTable?.id ?? null

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadTables = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await window.api.restaurant.getTables()
      setTables(data || [])
      setError('')
      const keepId = selectedTableIdRef.current
      if (keepId) {
        const fresh = (data || []).find((t: RestaurantTableData) => t.id === keepId)
        setSelectedTable((curr) => (curr && fresh ? { ...curr, ...fresh } : curr))
      }
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Failed to fetch floor layout')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTables()
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [loadTables])

  /** Coalesced background refresh for events that do not carry a full table row. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      void loadTables(true)
    }, REFRESH_DEBOUNCE_MS)
  }, [loadTables])

  // Real-Time Event Bus Subscriptions: Update UI instantly when any table changes
  useEffect(() => {
    const unsubTable = window.api.restaurant.onEvent('table:updated', (updatedTable: any) => {
      setTables((prev) =>
        prev.map((t) => (t.id === updatedTable.id ? { ...t, ...updatedTable } : t))
      )
      setSelectedTable((curr) =>
        curr && curr.id === updatedTable.id ? { ...curr, ...updatedTable } : curr
      )
    })

    const unsubOrderCreated = window.api.restaurant.onEvent('order:created', scheduleRefresh)
    const unsubOrderUpdated = window.api.restaurant.onEvent('order:updated', scheduleRefresh)
    const unsubOrderSettled = window.api.restaurant.onEvent('order:settled', scheduleRefresh)

    return () => {
      unsubTable()
      unsubOrderCreated()
      unsubOrderUpdated()
      unsubOrderSettled()
    }
  }, [scheduleRefresh])

  const setViewMode = useCallback((mode: 'grid' | 'canvas') => {
    setViewModeState(mode)
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode)
    } catch {
      /* storage unavailable — the in-memory mode still applies */
    }
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
      const query = searchQuery.trim().toLowerCase()
      const matchSearch =
        query === '' ||
        String(t.number).includes(query) ||
        (t.name && t.name.toLowerCase().includes(query)) ||
        (t.section && t.section.toLowerCase().includes(query))

      return matchSection && matchStatus && matchSearch
    })
  }, [tables, selectedSection, statusFilter, searchQuery])

  /**
   * Optimistically moves a tile and rolls the single row back if the write
   * fails. Returns whether the position was persisted so the canvas can toast.
   */
  const updatePosition = useCallback(
    async (id: string, posX: number, posY: number): Promise<boolean> => {
      const previous = tables.find((t) => t.id === id)
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, posX, posY } : t)))
      try {
        await window.api.restaurant.updateTablePosition({ id, posX, posY })
        return true
      } catch {
        if (previous) {
          setTables((prev) =>
            prev.map((t) => (t.id === id ? { ...t, posX: previous.posX, posY: previous.posY } : t))
          )
        }
        return false
      }
    },
    [tables]
  )

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
