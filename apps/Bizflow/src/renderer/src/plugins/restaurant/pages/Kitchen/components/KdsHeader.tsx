import React from 'react'
import { Flame, Volume2, VolumeX, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { KdsStation } from '../types'
import { KDS_STATIONS } from '../constants'

interface Props {
  station: KdsStation
  onSelectStation: (station: KdsStation) => void
  soundEnabled: boolean
  onToggleSound: () => void
  kdsOnlyMode: boolean
  onToggleKdsOnly: () => void
  totalTickets: number
  loading: boolean
  onRefresh: () => void
}

export const KdsHeader: React.FC<Props> = ({
  station,
  onSelectStation,
  soundEnabled,
  onToggleSound,
  kdsOnlyMode,
  onToggleKdsOnly,
  totalTickets,
  loading,
  onRefresh
}) => {
  return (
    <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3">
      {/* Stations */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <div className="flex items-center gap-2 mr-2 pr-3 border-r border-slate-800">
          <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200">
            Kitchen Display
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">
            {totalTickets}
          </span>
        </div>

        {KDS_STATIONS.map((st) => (
          <button
            key={st}
            onClick={() => onSelectStation(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              station === st
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Audio, Focus Toggle & Refresh */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors ${
            soundEnabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}
          title="Audio alerts"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleKdsOnly}
          className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors ${
            kdsOnlyMode
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
          title={kdsOnlyMode ? 'Show Metrics' : 'Expand KDS Full'}
        >
          {kdsOnlyMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
        </button>
      </div>
    </div>
  )
}