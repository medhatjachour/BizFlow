import React from 'react'
import { MapPin, Plus, RefreshCw, Layers, LayoutGrid, Server, Box } from 'lucide-react'
import { LocationItem } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  locations: LocationItem[]
  loading: boolean
  onRefresh: () => void
  onAddLocation: () => void
}

export const LocationsHero: React.FC<Props> = ({
  locations,
  loading,
  onRefresh,
  onAddLocation
}) => {
  const { t } = useLanguage()

  const counts = {
    zone: locations.filter(l => l.type === 'zone').length,
    aisle: locations.filter(l => l.type === 'aisle').length,
    shelf: locations.filter(l => l.type === 'shelf').length,
    bin: locations.filter(l => l.type === 'bin').length
  }

  const statCards = [
    { label: 'Zones', value: counts.zone, icon: LayoutGrid, color: 'text-purple-400' },
    { label: 'Aisles', value: counts.aisle, icon: Server, color: 'text-sky-400' },
    { label: 'Shelves', value: counts.shelf, icon: Layers, color: 'text-amber-400' },
    { label: 'Bins', value: counts.bin, icon: Box, color: 'text-emerald-400' }
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-md">
      <div className="absolute top-0 right-1/4 -mt-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
        <div className="space-y-1 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <MapPin className="w-3 h-3" />
              Facility Topology
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {t('warehouseLocationsTitle') || 'Location Hierarchy & Bins'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            {t('warehouseLocationsSubtitle') ||
              'Organize warehouse zones, aisle routes, shelving racks, and specific storage bin slots.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {statCards.map(s => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <Icon className={`w-4 h-4 ${s.color}`} />
                <div>
                  <div className="text-sm font-bold leading-none text-white">{s.value}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{s.label}</div>
                </div>
              </div>
            )
          })}

          <div className="flex items-center gap-2 ml-auto lg:ml-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 transition-all text-slate-300 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onAddLocation}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('warehouseAddLocation') || 'Add Location'}
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono bg-indigo-700/80 rounded border border-indigo-400/40 ml-1">
                ⌘N
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}