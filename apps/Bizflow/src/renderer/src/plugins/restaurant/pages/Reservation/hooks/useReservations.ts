import { useState, useEffect, useCallback, useMemo } from 'react'
import { ReservationData, TableBrief, ReservationFormData, ReservationStatus } from '../types'

export function useReservations() {
  const [reservations, setReservations] = useState<ReservationData[]>([])
  const [tables, setTables] = useState<TableBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resList, tblList] = await Promise.all([
        window.api.restaurant.getReservations({ date: filterDate }),
        window.api.restaurant.getTables()
      ])
      setReservations(resList || [])
      setTables(tblList || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load reservations')
    } finally {
      setLoading(false)
    }
  }, [filterDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter
      const query = searchQuery.trim().toLowerCase()
      const matchSearch =
        query === '' ||
        r.customerName.toLowerCase().includes(query) ||
        (r.customerPhone && r.customerPhone.includes(query)) ||
        (r.table?.number && String(r.table.number).includes(query)) ||
        (r.guestTags && r.guestTags.toLowerCase().includes(query))

      return matchStatus && matchSearch
    })
  }, [reservations, statusFilter, searchQuery])

  const stats = useMemo(() => {
    const total = reservations.length
    const confirmed = reservations.filter((r) => r.status === 'confirmed').length
    const seated = reservations.filter((r) => r.status === 'seated').length
    const pending = reservations.filter((r) => r.status === 'pending').length
    const completed = reservations.filter((r) => r.status === 'completed').length
    const totalGuests = reservations.reduce((s, r) => s + (r.partySize || 0), 0)

    return { total, confirmed, seated, pending, completed, totalGuests }
  }, [reservations])

  const saveReservation = async (data: ReservationFormData, editingId?: string) => {
    try {
      if (editingId) {
        await window.api.restaurant.updateReservation({
          id: editingId,
          tableId: data.tableId || undefined,
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          partySize: Number(data.partySize),
          date: new Date(data.date).toISOString(),
          durationMins: Number(data.durationMins),
          guestTags: data.guestTags.join(', '),
          notes: data.notes || undefined
        })
      } else {
        await window.api.restaurant.createReservation({
          tableId: data.tableId || undefined,
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          partySize: Number(data.partySize),
          date: new Date(data.date).toISOString(),
          durationMins: Number(data.durationMins),
          guestTags: data.guestTags.join(', '),
          notes: data.notes || undefined
        })
      }
      loadData()
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to save reservation')
      return false
    }
  }

  const seatReservation = async (id: string, tableId?: string) => {
    try {
      await window.api.restaurant.seatReservation({ reservationId: id, tableId })
      loadData()
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to seat reservation')
      return false
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await window.api.restaurant.updateReservation({ id, status })
      loadData()
    } catch (err: any) {
      alert(err?.message || 'Failed to update reservation status')
    }
  }

  const deleteReservation = async (id: string) => {
    if (!confirm('Are you sure you want to remove this booking?')) return
    try {
      await window.api.restaurant.deleteReservation(id)
      loadData()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete reservation')
    }
  }

  return {
    reservations: filteredReservations,
    allReservations: reservations,
    tables,
    loading,
    error,
    filterDate,
    setFilterDate,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    stats,
    refreshReservations: loadData,
    saveReservation,
    seatReservation,
    updateStatus,
    deleteReservation
  }
}