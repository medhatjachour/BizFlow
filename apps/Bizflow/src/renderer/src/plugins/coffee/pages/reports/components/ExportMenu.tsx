import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, Loader2 } from 'lucide-react'
import { ExportFormat } from '../types'
import { EXPORT_OPTIONS } from '../constants'

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void
  exporting: ExportFormat | null
  disabled?: boolean
}

export function ExportMenu({ onExport, exporting, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50 overflow-hidden">
          {EXPORT_OPTIONS.map(option => (
            <button
              key={option.format}
              onClick={() => {
                onExport(option.format)
                setOpen(false)
              }}
              disabled={exporting !== null}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
            >
              <span className="text-xl">{option.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{option.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
              </div>
              {exporting === option.format && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
