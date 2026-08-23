import React from 'react'
import { Warehouse, MapPin, ChevronDown } from 'lucide-react'
import { LocationRef } from '../types'

interface Props {
  locations: LocationRef[]
  selectedLocationId: string
  onSelectLocation: (id: string) => void
}

export const LocationNavigator: React.FC<Props> = ({
  locations,
  selectedLocationId,
  onSelectLocation
}) => {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-x-auto no-scrollbar">
      {/* Global / All Facilities Pill */}
      <button
        onClick={() => onSelectLocation('all')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
          selectedLocationId === 'all' || !selectedLocationId
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Warehouse className="w-3.5 h-3.5" />
        All Facilities (Global)
      </button>

      {/* Direct Quick Pills for Primary Zones */}
      {locations.slice(0, 6).map(loc => {
        const isSelected = selectedLocationId === loc.id
        return (
          <button
            key={loc.id}
            onClick={() => onSelectLocation(loc.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              isSelected
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 opacity-70" />
            <span>{loc.name}</span>
            <span className="text-[10px] font-mono opacity-50 uppercase">{loc.code}</span>
          </button>
        )
      })}

      {/* Dropdown for Remaining Locations */}
      {locations.length > 6 && (
        <div className="relative inline-flex items-center">
          <select
            value={locations.slice(6).some(l => l.id === selectedLocationId) ? selectedLocationId : ''}
            onChange={e => e.target.value && onSelectLocation(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-medium bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer focus:outline-none"
          >
            <option value="">+ {locations.length - 6} More Locations...</option>
            {locations.slice(6).map(l => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-slate-400" />
        </div>
      )}
    </div>
  )
}