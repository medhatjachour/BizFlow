import React from 'react'
import { FileSpreadsheet, RefreshCw } from 'lucide-react'

interface Props {
  loading: boolean
  onRefresh: () => void
}

export const ReportsHero: React.FC<Props> = ({ loading, onRefresh }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-md">
      <div className="absolute top-0 right-1/4 -mt-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <FileSpreadsheet className="w-3 h-3" />
              Intelligence & Auditing
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Warehouse Reports & Valuations
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Generate audit-ready PDF manifests, analyze stock capital allocation, and monitor critical thresholds.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 transition-all text-slate-300 hover:text-white self-start sm:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}