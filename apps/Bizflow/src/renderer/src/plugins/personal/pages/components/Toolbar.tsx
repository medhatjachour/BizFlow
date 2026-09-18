import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

interface ToolbarProps {
  children: ReactNode
  /** Pinned to the far end of the row, e.g. the tab's primary action. */
  end?: ReactNode
  className?: string
}

/** A wrapping filter row: search field, selects and the primary action. */
export default function Toolbar({ children, end, className = '' }: ToolbarProps) {
  return (
    <div className={`mb-3 flex flex-wrap items-center gap-2 ${className}`}>
      {children}
      {end && <div className="ms-auto flex shrink-0 items-center gap-2">{end}</div>}
    </div>
  )
}

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchField({ value, onChange, placeholder, className = '' }: SearchFieldProps) {
  return (
    <div className={`relative min-w-[12rem] flex-1 ${className}`}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pe-3 ps-9 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  )
}
