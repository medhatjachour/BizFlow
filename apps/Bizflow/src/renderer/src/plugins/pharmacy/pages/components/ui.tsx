/**
 * Shared pharmacy UI kit — a cleaner, BizFlow-style toolbar / filter system
 * to replace the plain "search input + selects" rows.
 */
import { Search, X, SlidersHorizontal, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { ComponentType, ButtonHTMLAttributes, ReactNode } from 'react'

export const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]'

// ── Button ─────────────────────────────────────────────────────────────────
// One consistent button used everywhere in the pharmacy module.
type Variant = 'primary' | 'secondary' | 'danger' | 'subtle' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_CLS: Record<Variant, string> = {
  primary:   'text-[color:var(--accent-contrast)] bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] shadow-sm',
  secondary: 'text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600',
  danger:    'text-white bg-red-600 hover:bg-red-700 shadow-sm',
  subtle:    'text-[color:var(--accent-strong)] bg-[color:var(--accent-soft)] hover:brightness-95',
  ghost:     'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
}
const SIZE_CLS: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-1.5',
  lg: 'px-5 py-2.5 text-sm gap-2',
}

export function Button({
  variant = 'primary', size = 'md', loading, icon: Icon, block, children, className = '', disabled, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: Size; loading?: boolean; icon?: ComponentType<{ size?: number | string; className?: string }>; block?: boolean
}) {
  const iconSize = size === 'sm' ? 13 : 15
  return (
    <button {...props} disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${block ? 'w-full' : ''} ${className}`}>
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : Icon ? <Icon size={iconSize} /> : null}
      {children}
    </button>
  )
}

// ── Icon button (table row / inline actions) ────────────────────────────────
type Tone = 'slate' | 'emerald' | 'red' | 'amber' | 'violet'
const TONE_CLS: Record<Tone, string> = {
  slate:   'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
  emerald: 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  red:     'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
  amber:   'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20',
  violet:  'text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20',
}
export function IconButton({
  icon: Icon, tone = 'slate', size = 15, className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ComponentType<{ size?: number | string }>; tone?: Tone; size?: number
}) {
  return (
    <button {...props} className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${TONE_CLS[tone]} ${className}`}>
      <Icon size={size} />
    </button>
  )
}

// ── Modal shell ──────────────────────────────────────────────────────────────
export function Modal({
  title, subtitle, icon: Icon, onClose, children, footer, size = 'md',
}: {
  title: ReactNode; subtitle?: ReactNode; icon?: ComponentType<{ size?: number | string; className?: string }>
  onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg'
}) {
  const w = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const sel =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const panel = panelRef.current
    ;(panel?.querySelector<HTMLElement>(sel) ?? panel)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>(sel)).filter(el => el.offsetParent !== null)
      if (f.length === 0) { e.preventDefault(); panelRef.current.focus(); return }
      const first = f[0], last = f[f.length - 1], active = document.activeElement
      if (e.shiftKey && (active === first || active === panelRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
      previouslyFocused.current?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`w-full ${w} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] focus:outline-none`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <span className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0"><Icon size={16} className="text-emerald-500" /></span>}
            <div className="min-w-0">
              <h2 id={titleId} className="font-bold text-slate-900 dark:text-white truncate">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>
          <IconButton icon={X} size={18} onClick={onClose} aria-label="Close" />
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        {footer && <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, hint }: {
  icon?: ComponentType<{ size?: number | string; className?: string }>; title: ReactNode; hint?: ReactNode
}) {
  return (
    <div className="text-center py-14 px-4">
      {Icon && <Icon size={28} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />}
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, pageCount, total, onPage, label }: {
  page: number; pageCount: number; total?: number; onPage: (p: number) => void; label?: string
}) {
  if (pageCount <= 1) return total != null ? (
    <div className="flex justify-end px-1 pt-1"><span className="text-xs text-slate-400">{total} {label ?? 'total'}</span></div>
  ) : null
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <span className="text-xs text-slate-400">{total != null ? `${total} ${label ?? 'total'}` : ''}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 0} onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 tabular-nums">{page + 1} / {pageCount}</span>
        <button disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}

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
        className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900/40 border border-transparent focus:border-[color:var(--accent)] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition-colors"
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
      className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/40 border border-transparent rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] capitalize cursor-pointer">
      {children}
    </select>
  )
}
