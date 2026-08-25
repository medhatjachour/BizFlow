import { useState } from 'react'
import { AlertCircle, CalendarDays, RefreshCw } from 'lucide-react'
import { useReservations } from './hooks/useReservations'

import { ReservationData } from './types'
import { ReservationToolbar } from './components/ReservationToolbar'
import { ReservationCard } from './components/ReservationCard'
import { ReservationFormModal } from './components/ReservationFormModal'

interface Props {
  onNavigateToFloor?: () => void
}

export default function ReservationsHostStandPage({ onNavigateToFloor }: Props) {
  const {
    reservations,
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
    refreshReservations,
    saveReservation,
    seatReservation,
    updateStatus,
    deleteReservation
  } = useReservations()

  const [showAddModal, setShowAddModal] = useState(false)

  const handleSeat = async (res: ReservationData) => {
    let targetTableId = res.tableId
    if (!targetTableId) {
      const availableTable = tables.find((t) => t.status === 'available' && t.capacity >= res.partySize)
      if (!availableTable) {
        alert('No available table found with sufficient capacity. Please assign a table manually.')
        return
      }
      targetTableId = availableTable.id
    }

    const ok = await seatReservation(res.id, targetTableId)
    if (ok && onNavigateToFloor) {
      onNavigateToFloor()
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Toolbar & Metric Ribbons */}
      <ReservationToolbar
        filterDate={filterDate}
        onDateChange={setFilterDate}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        stats={stats}
        onOpenAddModal={() => setShowAddModal(true)}
        onRefresh={refreshReservations}
        loading={loading}
      />

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reservations Stream */}
      {loading && reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-xs font-bold text-slate-400">Loading guest bookings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {reservations.map((res) => (
            <ReservationCard
              key={res.id}
              reservation={res}
              onSeat={handleSeat}
              onUpdateStatus={updateStatus}
              onDelete={deleteReservation}
            />
          ))}

          {reservations.length === 0 && (
            <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 space-y-2">
              <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Bookings for {filterDate}
              </h3>
              <p className="text-xs text-slate-400">
                Click "+ New Booking" to schedule a table reservation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Booking Modal */}
      <ReservationFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        tables={tables}
        onSave={saveReservation}
      />
    </div>
  )
}