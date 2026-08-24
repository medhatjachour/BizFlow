// src/pages/waste/index.tsx
import { useState } from 'react'
import { Plus, RefreshCw, AlertCircle, Trash2, DollarSign, TrendingDown, Package, Search } from 'lucide-react'
import { useWasteManagement } from './hooks/useWasteManagement'
import { WasteReasonBreakdown } from './components/WasteReasonBreakdown'
import { LogWasteModal } from './components/LogWasteModal'
import { sounds } from '../utils/sound'

export default function KitchenWasteLogPage() {
  const {
    logs,
    ingredients,
    analytics,
    loading,
    error,
    reasonFilter,
    setReasonFilter,
    searchQuery,
    setSearchQuery,
    refreshWaste,
    logWaste,
    deleteWaste
  } = useWasteManagement()

  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* ─── Financial Shrinkage KPI Banner ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Cumulative Shrinkage Loss
            </span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              -${analytics?.totalLoss.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Recorded Waste Incidents
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {analytics?.totalEntries || 0} Entries
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Top Shrinkage Item
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white truncate block max-w-[170px]">
              {analytics?.topLossItems[0]?.name || 'None'}
            </span>
            {analytics?.topLossItems[0] && (
              <span className="text-[10px] font-bold text-rose-500">
                -${analytics.topLossItems[0].totalCost.toFixed(2)} loss
              </span>
            )}
          </div>
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── Cause Breakdown Matrix ───────────────────────────────── */}
      <WasteReasonBreakdown
        breakdown={analytics?.reasonBreakdown || {}}
        totalLoss={analytics?.totalLoss || 0}
      />

      {/* ─── Search, Filter Ribbon & New Entry Button ─────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search wasted item or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <select
            value={reasonFilter}
            onChange={(e) => {
              sounds.playBump()
              setReasonFilter(e.target.value)
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Reasons</option>
            <option value="expired">Expired / Spoiled</option>
            <option value="dropped_spill">Dropped / Spilled</option>
            <option value="overcooked">Overcooked / Burnt</option>
            <option value="customer_returned">Customer Returned</option>
            <option value="prep_trim">Excess Prep Trim</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sounds.playBump()
              refreshWaste()
            }}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playBump()
              setShowModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/20 active:scale-[0.98] transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Waste Incident</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Detailed Loss Ledger Table ───────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex items-center justify-between text-xs gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 dark:text-white text-sm">{log.itemName}</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[10px] capitalize">
                    {log.reason.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Qty: {log.quantity} {log.unit} • Logged by: {log.loggedBy || 'Staff'} •{' '}
                  {new Date(log.createdAt).toLocaleString()}
                </div>
                {log.notes && (
                  <div className="text-[11px] text-slate-500 italic mt-0.5">
                    "{log.notes}"
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-rose-600 dark:text-rose-400 text-base">
                  -${log.costLoss.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => deleteWaste(log.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {logs.length === 0 && !loading && (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">
              No waste or spoilage entries recorded.
            </div>
          )}
        </div>
      </div>

      <LogWasteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        ingredients={ingredients}
        onLog={logWaste}
      />
    </div>
  )
}