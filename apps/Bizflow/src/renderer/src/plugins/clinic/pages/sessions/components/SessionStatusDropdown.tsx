import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, CheckCircle2 } from 'lucide-react'
import { STATUS_CONFIG } from '../constants'
import { SessionStatus } from '../types'

interface Props {
  status: SessionStatus
  onChange: (status: SessionStatus) => void
  disabled?: boolean
}

export default function SessionStatusDropdown({ status, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: 9999,
        minWidth: 140
      })
    }
    setOpen(prev => !prev)
  }

  const current = STATUS_CONFIG[status] || STATUS_CONFIG.completed
  const CurrentIcon = current.icon

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        disabled={disabled}
        onClick={handleOpen}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${current.badgeCls} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-85 shadow-sm active:scale-95'
        }`}
      >
        <CurrentIcon className="h-3 w-3" />
        <span>{current.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {(Object.keys(STATUS_CONFIG) as SessionStatus[]).map(key => {
              const item = STATUS_CONFIG[key]
              const Icon = item.icon
              const isSelected = key === status
              return (
                <button
                  key={key}
                  onClick={e => {
                    e.stopPropagation()
                    setOpen(false)
                    if (!isSelected) onChange(key)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />}
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}