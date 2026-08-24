// src/pages/shifts/index.tsx
import { useState } from 'react'
import { AlertCircle, Search, RefreshCw, Layers, DollarSign, HeartHandshake } from 'lucide-react'
import { useShiftsManagement } from './hooks/useShiftsManagement'
import { ShiftMetricCards } from './components/ShiftMetricCards'
import { ActiveShiftBanner } from './components/ActiveShiftBanner'
import { ShiftHistoryTable } from './components/ShiftHistoryTable'
import { OpenShiftModal } from './components/OpenShiftModal'
import { CloseShiftModal } from './components/CloseShiftModal'
import { ZReportModal } from './components/ZReportModal'
import { formatCurrency } from './utils'
import { sounds } from '../utils/sound'

export default function StaffShiftsPage() {
  const {
    activeShift,
    shiftHistory,
    historyStats,
    zReport,
    setZReport,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refreshShifts,
    openShift,
    closeShift,
    fetchZReport
  } = useShiftsManagement()

  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* ─── Active Shift Real-Time Telemetry ──────────────────────── */}
      <ShiftMetricCards activeShift={activeShift} />

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Main Drawer Status Banner ─────────────────────────────── */}
      <ActiveShiftBanner
        activeShift={activeShift}
        onOpenShiftModal={() => {
          sounds.playBump()
          setShowOpenModal(true)
        }}
        onCloseShiftModal={() => {
          sounds.playBump()
          setShowCloseModal(true)
        }}
        onViewReportModal={() => {
          if (activeShift) fetchZReport(activeShift.id)
        }}
      />

      {/* ─── Historical Lifetime KPIs ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Total Audited Sessions
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {historyStats.closedShiftsCount} Shifts
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Cumulative Settled Sales
            </span>
            <span className="text-xl font-black text-emerald-600">
              {formatCurrency(historyStats.totalSales)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Total Gratuity Distributed
            </span>
            <span className="text-xl font-black text-purple-600">
              {formatCurrency(historyStats.totalTips)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
            <HeartHandshake className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── Search & History Table ───────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff or shift ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            sounds.playBump()
            refreshShifts()
          }}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
        </button>
      </div>

      <ShiftHistoryTable shifts={shiftHistory} onViewZReport={fetchZReport} />

      {/* ─── Modals ───────────────────────────────────────────────── */}
      <OpenShiftModal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        onOpen={openShift}
      />

      <CloseShiftModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        shift={activeShift}
        onCloseShift={closeShift}
      />

      <ZReportModal
        isOpen={Boolean(zReport)}
        onClose={() => setZReport(null)}
        report={zReport}
      />
    </div>
  )
}