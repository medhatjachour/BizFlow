import React from 'react'
import { DollarSign, RefreshCw } from 'lucide-react'

interface Props {
  refreshing: boolean
  onRefresh: () => void
}

export const FinanceHero: React.FC<Props> = ({ refreshing, onRefresh }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-md">
      <div className="absolute top-0 right-1/4 -mt-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <DollarSign className="w-3 h-3" />
              Capital & Stock Valuation
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Warehouse Financial Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitor asset concentration across storage nodes, calculate depletion risks, and track capital allocation.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>
    </div>
  )
}