/**
 * Shared pharmacy UI kit — a cleaner, BizFlow-style toolbar / filter system
 * to replace the plain "search input + selects" rows.
 */
import { Search, X, SlidersHorizontal } from 'lucide-react'

export const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'

/** A rounded card that groups the search + filters into one cohesive bar. */
export function Toolbar({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 shadow-sm">
      <SlidersHorizontal size={15} className="text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />
      {children}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  )
}

/** Prominent search box with a clear button. */
export function SearchBox({ value, onChange, placeholder, autoFocus, onKeyDown }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        autoFocus={autoFocus} onKeyDown={onKeyDown}
        className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900/40 border border-transparent focus:border-emerald-400 dark:focus:border-emerald-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export interface SegOption { value: string; label: string; count?: number; tone?: 'emerald' | 'amber' | 'red' | 'slate' }

/** Pill-style segmented control replacing a <select> for short option sets. */
export function Segmented({ options, value, onChange }: {
  options: SegOption[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1">
      {options.map(o => {
        const active = value === o.value
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              active ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            {o.label}
            {o.count != null && o.count > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 ${active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Compact styled dropdown that visually matches the toolbar. */
export function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/40 border border-transparent rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 capitalize cursor-pointer">
      {children}
    </select>
  )
}
