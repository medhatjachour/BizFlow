import { Search, LayoutGrid, List, Filter, X } from 'lucide-react'
import { PatientFilterState } from '../types'

interface Props {
  filters: PatientFilterState
  onChange: (next: PatientFilterState) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  onNewPatient: () => void
}

export default function PatientFiltersBar({
  filters,
  onChange,
  viewMode,
  onViewModeChange,
  onNewPatient
}: Props) {
  const hasActiveFilters = Boolean(filters.gender || filters.bloodType || filters.hasOutstandingOnly)

  return (
    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            placeholder="Search by name, phone, national ID, folder #..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action buttons & View mode switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={onNewPatient}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-teal-600/20 transition-all whitespace-nowrap"
          >
            <span>+</span>
            <span>New Patient</span>
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-700/60 text-xs">
        <span className="flex items-center gap-1 text-slate-400 font-medium">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </span>

        {/* Gender Filter */}
        <select
          value={filters.gender}
          onChange={e => onChange({ ...filters, gender: e.target.value })}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        {/* Blood Type Filter */}
        <select
          value={filters.bloodType}
          onChange={e => onChange({ ...filters, bloodType: e.target.value })}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Blood Types</option>
          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Outstanding Toggle */}
        <button
          type="button"
          onClick={() => onChange({ ...filters, hasOutstandingOnly: !filters.hasOutstandingOnly })}
          className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
            filters.hasOutstandingOnly
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
          }`}
        >
          With Debt Only
        </button>

        {/* Sort selector */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-slate-400">Sort by:</span>
          <select
            value={filters.sortBy}
            onChange={e => onChange({ ...filters, sortBy: e.target.value as any })}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="name">Name</option>
            <option value="recentVisit">Last Visit</option>
            <option value="outstanding">Balance Due</option>
            <option value="createdAt">Date Added</option>
          </select>
          <button
            onClick={() => onChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => onChange({ ...filters, gender: '', bloodType: '', hasOutstandingOnly: false })}
            className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 ml-1"
          >
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>
    </div>
  )
}