import { useState, useRef, useEffect } from 'react'

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
  const ref = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 10)
    : suggestions.slice(0, 10)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

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
          {filtered.map(s => (
            <li
              key={s}
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false) }}
              className="px-3 py-2 text-sm text-slate-800 dark:text-white hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
