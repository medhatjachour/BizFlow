import { Search, LayoutGrid, List,  X, ChevronDown, User,  ArrowUpDown, DollarSign, Plus } from 'lucide-react'
import { PatientFilterState } from '../types'

interface Props {
  filters: PatientFilterState
  onChange: (next: PatientFilterState) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  onNewPatient: () => void
}

export default function PatientFiltersBar({ filters, onChange, viewMode, onViewModeChange, onNewPatient }: Props) {
  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[22px] shadow-sm transition-all duration-300">
        
        {/* GROUP 1: View Modes (Left-aligned) */}
        <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-100 dark:border-slate-800/50">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-black/[0.03]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-black/[0.03]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block" />

        {/* GROUP 2: The Command Search (The Fluid Element) */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-10 pr-8 py-2.5 bg-transparent border-none text-[13px] font-medium text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
            placeholder="Search name, phone, folder..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button onClick={() => onChange({ ...filters, search: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* GROUP 3: Granular Refinement (Desktop Only) */}
        <div className="hidden xl:flex items-center gap-1.5 mr-1">
          {/* Debt Toggle: Styled as a Badge-Button */}
          <button
            type="button"
            onClick={() => onChange({ ...filters, hasOutstandingOnly: !filters.hasOutstandingOnly })}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold border transition-all ${
              filters.hasOutstandingOnly
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500 hover:border-slate-200'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Debt Only</span>
          </button>

          {/* Gender Select */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={filters.gender}
              onChange={e => onChange({ ...filters, gender: e.target.value })}
              className="appearance-none pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-400 outline-none transition-all cursor-pointer"
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Control */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <select
                value={filters.sortBy}
                onChange={e => onChange({ ...filters, sortBy: e.target.value as any })}
                className="appearance-none pl-8 pr-7 py-2 bg-transparent text-[12px] font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
              >
                <option value="name">Name</option>
                <option value="recentVisit">Last Visit</option>
                <option value="outstanding">Balance</option>
              </select>
            </div>
            <button
              onClick={() => onChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              className="pr-2 text-slate-400 hover:text-teal-600 transition-colors"
            >
              <span className="text-[10px] font-black">{filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}</span>
            </button>
          </div>
        </div>

        {/* GROUP 4: The Execute Action */}
        <button
          onClick={onNewPatient}
          className="group relative flex items-center gap-2 px-5 py-2.5 bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-400 text-white rounded-[16px] text-[13px] font-bold transition-all duration-300 shadow-sm hover:shadow-teal-500/25 active:scale-95 overflow-hidden"
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">New Patient</span>
        </button>
      </div>
    </div>
  )
}