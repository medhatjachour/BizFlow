/**
 * Command palette (Ctrl/Cmd + K) for the Personal Work plugin.
 *
 * Two kinds of entry: navigation to a permitted tab, and actions that either
 * run locally (guide, focus view, blackout) or land on a tab and open its
 * create form. Creation goes through `requestIntent` because the target tab
 * may not be mounted yet.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CornerDownLeft, Search, SearchX, Sparkles } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export interface PaletteEntry {
  id: string
  /** i18n key of the row label. */
  labelKey: string
  /** Seeded on the entry so the row can be rendered before the key settles. */
  fallback: string
  /** Extra lower-cased terms that should also match, e.g. a shortcut. */
  keywords?: string
  group: 'navigate' | 'create' | 'action'
  icon: ReactNode
  shortcut?: string
  run: () => void
}

const GROUP_ORDER: PaletteEntry['group'][] = ['navigate', 'create', 'action']

const GROUP_LABEL_KEY: Record<PaletteEntry['group'], string> = {
  navigate: 'pwCmdGroupNavigate',
  create: 'pwCmdGroupCreate',
  action: 'pwCmdGroupAction'
}

function matches(entry: PaletteEntry, label: string, needle: string): boolean {
  if (!needle) return true
  return `${label} ${entry.fallback} ${entry.keywords ?? ''}`.toLowerCase().includes(needle)
}

export default function PersonalCommandPalette({
  entries,
  onClose
}: {
  entries: PaletteEntry[]
  onClose: () => void
}): JSX.Element {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const needle = query.trim().toLowerCase()
  const results = useMemo(
    () => entries.filter((entry) => matches(entry, t(entry.labelKey), needle)),
    [entries, needle, t]
  )

  useEffect(() => {
    setActive(0)
  }, [needle])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keep the highlighted row inside the scroll viewport while arrowing through.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const row = list.querySelector<HTMLElement>(`[data-index="${active}"]`)
    // Not every embedded renderer implements scrollIntoView.
    row?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: results.filter((entry) => entry.group === group)
  })).filter((bucket) => bucket.items.length > 0)

  // The flat index has to match `results`, so walk the buckets in order.
  const offsets = new Map<string, number>()
  let cursor = 0
  for (const bucket of grouped) {
    offsets.set(bucket.group, cursor)
    cursor += bucket.items.length
  }

  const runAt = (index: number) => {
    const entry = results[index]
    if (!entry) return
    onClose()
    entry.run()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      runAt(active)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((prev) => (results.length === 0 ? 0 : (prev - 1 + results.length) % results.length))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center px-4 pt-[10vh] pb-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('pwCmdTitle')}
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-scale-up">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('pwCmdPlaceholder')}
            aria-label={t('pwCmdPlaceholder')}
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          <kbd className="hidden shrink-0 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 sm:inline dark:border-slate-600 dark:text-slate-400">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <SearchX className="h-5 w-5" />
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('pwCmdEmpty', { query: query.trim() })}
              </p>
            </div>
          )}

          {grouped.map((bucket) => (
            <div key={bucket.group} className="mb-1">
              <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t(GROUP_LABEL_KEY[bucket.group])}
              </p>
              {bucket.items.map((entry, position) => {
                const index = (offsets.get(bucket.group) ?? 0) + position
                const isActive = index === active
                return (
                  <button
                    key={entry.id}
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => runAt(index)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors ${
                      isActive
                        ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                        isActive
                          ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {entry.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {t(entry.labelKey)}
                    </span>
                    {entry.shortcut && (
                      <kbd className="shrink-0 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:border-slate-600 dark:text-slate-400">
                        {entry.shortcut}
                      </kbd>
                    )}
                    {isActive && !entry.shortcut && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/60">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <Sparkles className="h-3 w-3 shrink-0 text-[color:var(--accent-text)]" />
            {t('pwCmdHint')}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
            {results.length}
          </span>
        </div>
      </div>
    </div>
  )
}
