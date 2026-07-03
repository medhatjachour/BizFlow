import { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'

const pad = (n: number) => String(n).padStart(2, '0')

function isValidYmd(y: number, m: number, d: number): boolean {
  if (y < 1000 || m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/**
 * Parse a freely-typed date into ISO `YYYY-MM-DD`, or null if unparseable.
 * Accepts `YYYY-MM-DD`, `YYYY/MM/DD`, and day-first `DD/MM/YYYY` / `DD-MM-YYYY`
 * (auto-swaps to MM/DD when day>12 makes it unambiguous).
 */
export function parseFlexibleDate(input: string): string | null {
  const t = (input || '').trim()
  if (!t) return null
  let m: RegExpExecArray | null
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t))) {
    const y = +m[1], mo = +m[2], d = +m[3]
    return isValidYmd(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null
  }
  if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t))) {
    let a = +m[1], b = +m[2]
    const y = +m[3]
    // a = day, b = month by default; swap if it only makes sense as MM/DD.
    if (b > 12 && a <= 12) { const tmp = a; a = b; b = tmp }
    return isValidYmd(y, b, a) ? `${y}-${pad(b)}-${pad(a)}` : null
  }
  return null
}

/**
 * Date input that supports BOTH free keyboard entry (type the date) AND a native
 * calendar picker (click the icon). Value is ISO `YYYY-MM-DD`; `onChange` returns
 * the same. Drop-in for `<input type="date" value onChange className />` — just
 * change `onChange={e => set(e.target.value)}` to `onChange={set}`.
 */
export default function DateField({
  value, onChange, className = '', wrapperClassName = '', placeholder = 'YYYY-MM-DD',
  required, disabled, min, max, id,
}: {
  value: string
  onChange: (iso: string) => void
  className?: string
  wrapperClassName?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  min?: string
  max?: string
  id?: string
}) {
  const [text, setText] = useState(value ?? '')
  const lastValid = useRef(value ?? '')
  const pickerRef = useRef<HTMLInputElement>(null)

  // Keep the text in sync when the value changes from outside.
  useEffect(() => { setText(value ?? ''); lastValid.current = value ?? '' }, [value])

  function commit(raw: string) {
    if (raw.trim() === '') { lastValid.current = ''; onChange(''); setText(''); return }
    const iso = parseFlexibleDate(raw)
    if (iso) { lastValid.current = iso; setText(iso); onChange(iso) }
    else { setText(lastValid.current) } // revert invalid input
  }

  function openPicker() {
    const el = pickerRef.current
    if (!el || disabled) return
    // Prefer the modern API; fall back to focus+click for older engines.
    if (typeof (el as any).showPicker === 'function') {
      try { (el as any).showPicker(); return } catch { /* fall through */ }
    }
    el.focus(); el.click()
  }

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        onChange={e => setText(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit((e.target as HTMLInputElement).value) } }}
        className={`${className} w-full pr-9`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={openPicker}
        title={placeholder}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-violet-500 disabled:opacity-40"
      >
        <Calendar size={15} />
      </button>
      {/* Hidden native date input that backs the calendar picker. */}
      <input
        ref={pickerRef}
        type="date"
        value={value || ''}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden
        onChange={e => onChange(e.target.value)}
        className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
      />
    </div>
  )
}
