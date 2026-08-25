import { useState } from 'react'
import { AlertCircle, Flame, RefreshCw } from 'lucide-react'
import { useKdsOrders } from './hooks/useKdsOrders'
import { OverviewKpiStrip } from './components/OverviewKpiStrip'
import { FloorMatrixCard } from './components/FloorMatrixCard'
import { KdsHeader } from './components/KdsHeader'
import { KdsTicketCard } from './components/KdsTicketCard'

interface Props {
  onNavigate?: (tab: string) => void
}

export default function OverviewAndKdsPage({ onNavigate }: Props) {
  const [kdsOnlyMode, setKdsOnlyMode] = useState(false)

  const {
    metrics,
    tickets,
    station,
    setStation,
    soundEnabled,
    setSoundEnabled,
    loading,
    error,
    refreshData,
    bumpItem,
    bumpTicket
  } = useKdsOrders()

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
        <p className="text-xs font-bold text-slate-400">Connecting to Restaurant Live Rail...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Telemetry Metrics & Floor Breakdown */}
      {!kdsOnlyMode && metrics && (
        <div className="space-y-3">
          <OverviewKpiStrip
            metrics={metrics}
            activeTicketsCount={tickets.length}
            onNavigate={onNavigate}
          />
          <FloorMatrixCard metrics={metrics} />
        </div>
      )}

      {/* KDS Kitchen Command Bar */}
      <KdsHeader
        station={station}
        onSelectStation={setStation}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        kdsOnlyMode={kdsOnlyMode}
        onToggleKdsOnly={() => setKdsOnlyMode(!kdsOnlyMode)}
        totalTickets={tickets.length}
        loading={loading}
        onRefresh={refreshData}
      />

      {/* KDS Tickets Live Rail */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {tickets.map((ticket) => (
          <KdsTicketCard
            key={ticket.id}
            ticket={ticket}
            onBumpItem={bumpItem}
            onBumpTicket={bumpTicket}
          />
        ))}

        {tickets.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 space-y-2">
            <Flame className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Kitchen Rail is Clear</h3>
            <p className="text-xs text-slate-400">No pending orders waiting for preparation.</p>
          </div>
        )}
      </div>
    </div>
  )
}