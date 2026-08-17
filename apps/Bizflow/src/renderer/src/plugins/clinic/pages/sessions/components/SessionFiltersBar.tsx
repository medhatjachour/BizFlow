import { Search, Plus,  X, ChevronDown,  CreditCard, Activity } from 'lucide-react'
import { SessionFilterState } from '../types'
import { TIMEFRAME_FILTERS } from '../constants'

interface Props {
  filters: SessionFilterState
  onChange: (next: SessionFilterState) => void
  onNewSession: () => void
}

export default function SessionFiltersBar({ filters, onChange, onNewSession }: Props) {
  return (
    <div className="relative z-10 w-full group">
      {/* Main Unified Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] shadow-sm hover:shadow-md transition-all duration-300">
        
        {/* SECTION 1: Timeframe Tabs (Pill Style) */}
        <div className="hidden xl:flex items-center bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
          {TIMEFRAME_FILTERS.map(t => {
            const active = filters.timeframe === t.key
            return (
              <button
                key={t.key}
                onClick={() => onChange({ ...filters, timeframe: t.key })}
                className={`px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-black/[0.03]'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Vertical Divider */}
        <div className="hidden xl:block w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* SECTION 2: Search (The Fluid Element) */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search diagnosis, patients..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-8 py-2.5 bg-transparent border-none text-[13px] font-medium text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
          />
          {filters.search && (
            <button 
              onClick={() => onChange({ ...filters, search: '' })} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* SECTION 3: Smart Dropdowns (Minimalist Style) */}
        <div className="hidden lg:flex items-center gap-1">
          {/* Status Select */}
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={filters.status}
              onChange={e => onChange({ ...filters, status: e.target.value })}
              className="appearance-none pl-8 pr-9 py-2 bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-400 outline-none transition-all cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Payment Select */}
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={filters.paymentStatus}
              onChange={e => onChange({ ...filters, paymentStatus: e.target.value })}
              className="appearance-none pl-8 pr-9 py-2 bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-400 outline-none transition-all cursor-pointer"
            >
              <option value="">All Billing</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Debt</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* SECTION 4: Primary Action Button */}
        <button
          onClick={onNewSession}
          className="group/btn relative flex items-center gap-2 px-5 py-2.5 bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-400 text-white rounded-[16px] text-[13px] font-bold transition-all duration-300 shadow-sm hover:shadow-teal-500/25 active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
          <Plus className="h-4 w-4 relative z-10" />
          <span className="relative z-10 whitespace-nowrap">New Session</span>
        </button>
      </div>
    </div>
  )
}