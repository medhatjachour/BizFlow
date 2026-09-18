import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, Check, Trash2, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Button from '@renderer/components/ui/Button'
import { MAX_PRESET_NAME, type FilterPreset } from '../hooks/useFilterPresets'

/** Shallow, key-order independent comparison so the active view can be ticked. */
function sameFilters<T extends object>(a: T, b: T): boolean {
  const aKeys = Object.keys(a) as (keyof T)[]
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a[key] === b[key])
}

interface FilterPresetsProps<T extends object> {
  presets: FilterPreset<T>[]
  current: T
  onApply: (filters: T) => void
  onSave: (name: string) => boolean
  onRemove: (id: string) => void
}

/**
 * Toolbar control for named filter combinations. Deliberately generic: the
 * filter shape is whatever the calling tab passes in, so a tab only has to
 * describe which pieces of state a view captures.
 */
export default function FilterPresets<T extends Record<string, unknown>>({
  presets,
  current,
  onApply,
  onSave,
  onRemove
}: FilterPresetsProps<T>) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [dirty, setDirty] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setName('')
  }, [open])

  const activeId = useMemo(
    () => presets.find((preset) => sameFilters(preset.filters, current))?.id ?? null,
    [presets, current]
  )

  const save = () => {
    if (!onSave(name)) {
      setDirty(true)
      inputRef.current?.focus()
      return
    }
    setDirty(false)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          activeId
            ? 'border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
            : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white'
        }`}
      >
        <Bookmark className="h-3.5 w-3.5" />
        {presets.length > 0
          ? (presets.find((preset) => preset.id === activeId)?.name ?? t('pwPresets'))
          : t('pwPresets')}
        {presets.length > 0 && (
          <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {presets.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-fade-in dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('pwPresets')}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {t('pwPresetsHint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                aria-label={t('pwClose')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {presets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t('pwPresetsEmpty')}
              </p>
            ) : (
              <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                {presets.map((preset) => {
                  const isActive = preset.id === activeId
                  return (
                    <li key={preset.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onApply(preset.filters)
                          setOpen(false)
                        }}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="w-3 shrink-0">
                          {isActive && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{preset.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(preset.id)}
                        aria-label={`${t('pwPresetDelete')} ${preset.name}`}
                        className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('pwPresetSaveCurrent')}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  maxLength={MAX_PRESET_NAME}
                  onChange={(event) => {
                    setName(event.target.value)
                    setDirty(false)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      save()
                    }
                  }}
                  placeholder={t('pwPresetNamePlaceholder')}
                  className={`min-w-0 flex-1 rounded-md border bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-[color:var(--accent)] dark:bg-slate-900 dark:text-white ${
                    dirty
                      ? 'border-rose-300 dark:border-rose-700'
                      : 'border-slate-200 focus:border-[color:var(--accent-line)] dark:border-slate-600'
                  }`}
                />
                <Button size="xs" variant="primary" onClick={save}>
                  {t('pwSave')}
                </Button>
              </div>
              {dirty && (
                <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {t('pwPresetNameRequired')}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
