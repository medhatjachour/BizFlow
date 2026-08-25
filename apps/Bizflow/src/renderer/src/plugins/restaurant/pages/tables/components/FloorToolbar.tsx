import React from 'react'
import {
  Plus,
  RefreshCw,
  Search,
  LayoutGrid,
  MapPin,
  Layers
} from 'lucide-react'
import { TableStatus } from '../types'
import { TABLE_STATUS_CONFIG } from '../constants'

interface Props {
  sections: string[]
  selectedSection: string
  onSelectSection: (section: string) => void
  statusFilter: TableStatus | 'ALL'
  onSelectStatus: (status: TableStatus | 'ALL') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMode: 'grid' | 'canvas'
  onToggleViewMode: (mode: 'grid' | 'canvas') => void
  stats: {
    total: number
    available: number
    occupied: number
    billing: number
    reserved: number
    cleaning: number
    totalGuests: number
  }
  onOpenAddModal: () => void
  onRefresh: () => void
  loading: boolean
}

export const FloorToolbar: React.FC<Props> = ({
  sections,
  selectedSection,
  onSelectSection,
  statusFilter,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
  stats,
  onOpenAddModal,
  onRefresh,
  loading
}) => {
  return (
    <div className="space-y-3">
      {/* Upper Bar: Section Badges, View Toggle & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm backdrop-blur-sm">
        {/* Section Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => onSelectSection('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
              selectedSection === 'ALL'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Areas ({stats.total})
          </button>
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => onSelectSection(sec)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                selectedSection === sec
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* View Switcher, Search, Refresh, Add */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-32 sm:w-44 transition-all"
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onToggleViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleViewMode('canvas')}
              title="Spatial Floor Map"
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'canvas'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          {/* Add Table */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-orange-500/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Table</span>
          </button>
        </div>
      </div>

      {/* Lower Bar: Metric Status Quick Filter Ribbons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <button
          onClick={() => onSelectStatus('ALL')}
          className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Total</span>
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">{stats.total}</span>
        </button>

        {(['available', 'occupied', 'billing', 'reserved', 'cleaning'] as TableStatus[]).map((st) => {
          const cfg = TABLE_STATUS_CONFIG[st]
          const count = stats[st]
          return (
            <button
              key={st}
              onClick={() => onSelectStatus(st)}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                statusFilter === st
                  ? `${cfg.bg} ${cfg.border} ring-1 ring-amber-500/20 shadow-xs`
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{cfg.label}</span>
              </div>
              <span className={`text-xs font-bold ${cfg.text}`}>{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}