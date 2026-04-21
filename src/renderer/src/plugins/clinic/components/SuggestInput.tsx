import { useState, useRef, useEffect, useMemo } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
  rows?: number          // if > 1 renders a textarea
  required?: boolean
  id?: string
}

export default function SuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className = '',
  rows = 1,
  required,
  id,
}: Props) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const trimmed = value.trim()
    return trimmed
      ? suggestions.filter(s => s.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 10)
      : suggestions.slice(0, 10)
  }, [value, suggestions])

  useEffect(() => { setHighlighted(-1) }, [filtered])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, -1))
    } else if (e.key === 'Enter') {
      const pick = highlighted >= 0 ? filtered[highlighted] : null
      if (pick) {
        e.preventDefault()
        onChange(pick)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  const shared = {
    id,
    className,
    placeholder,
    required,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value)
      setOpen(true)
    },
    onFocus: () => setOpen(true),
    onKeyDown: handleKeyDown,
    autoComplete: 'off',
  }

  return (
    <div className="relative" ref={ref}>
      {rows > 1 ? (
        <textarea {...shared} rows={rows} />
      ) : (
        <input {...shared} />
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.map((s, i) => (
            <li
              key={s}
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false) }}
              className={`px-3 py-2 text-sm text-slate-800 dark:text-white cursor-pointer ${i === highlighted ? 'bg-teal-50 dark:bg-teal-900/30' : 'hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
