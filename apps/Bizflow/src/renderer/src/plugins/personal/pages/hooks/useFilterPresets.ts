import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Named filter combinations ("saved views") for a single tab, persisted in
 * `localStorage` so a solo operator's habitual views — *Overdue this week*,
 * *Billable only*, *Waiting on client* — survive a restart without any round
 * trip to the database.
 *
 * The list helpers are exported separately from the hook so the storage
 * contract can be unit-tested without rendering anything.
 */

export interface FilterPreset<T> {
  id: string
  name: string
  filters: T
}

const STORAGE_PREFIX = 'personal:filterPresets:'
export const MAX_PRESETS = 12
export const MAX_PRESET_NAME = 40

export function presetsStorageKey(tabKey: string): string {
  return `${STORAGE_PREFIX}${tabKey}`
}

function isPreset(value: unknown): value is FilterPreset<unknown> {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0 &&
    candidate.filters !== undefined &&
    candidate.filters !== null &&
    typeof candidate.filters === 'object'
  )
}

/**
 * Reads the stored views for a tab, dropping anything malformed. A corrupt or
 * hand-edited entry must never break the tab, so every failure path returns `[]`.
 */
export function readPresets<T>(tabKey: string): FilterPreset<T>[] {
  try {
    const raw = window.localStorage.getItem(presetsStorageKey(tabKey))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPreset).slice(0, MAX_PRESETS) as FilterPreset<T>[]
  } catch {
    return []
  }
}

export function writePresets<T>(tabKey: string, presets: FilterPreset<T>[]): void {
  try {
    window.localStorage.setItem(
      presetsStorageKey(tabKey),
      JSON.stringify(presets.slice(0, MAX_PRESETS))
    )
  } catch {
    // Storage full or unavailable (private mode): views simply stop persisting.
  }
}

function newPresetId(): string {
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Adds a view, replacing any existing view with the same (case-insensitive)
 * name so re-saving a tweaked filter does not pile up duplicates. The newest
 * view goes first; the list is capped at {@link MAX_PRESETS}.
 */
export function addPreset<T>(
  presets: FilterPreset<T>[],
  name: string,
  filters: T,
  id: string = newPresetId()
): FilterPreset<T>[] {
  const trimmed = name.trim().slice(0, MAX_PRESET_NAME)
  if (!trimmed) return presets
  const without = presets.filter((preset) => preset.name.toLowerCase() !== trimmed.toLowerCase())
  return [{ id, name: trimmed, filters }, ...without].slice(0, MAX_PRESETS)
}

export function removePreset<T>(presets: FilterPreset<T>[], id: string): FilterPreset<T>[] {
  return presets.filter((preset) => preset.id !== id)
}

export function useFilterPresets<T>(tabKey: string) {
  const [presets, setPresets] = useState<FilterPreset<T>[]>(() => readPresets<T>(tabKey))
  const keyRef = useRef(tabKey)

  useEffect(() => {
    if (keyRef.current === tabKey) return
    keyRef.current = tabKey
    setPresets(readPresets<T>(tabKey))
  }, [tabKey])

  // Persisting from the mutators rather than an effect keeps a `tabKey` change
  // from writing the previous tab's views into the new tab's storage slot.
  const save = useCallback(
    (name: string, filters: T) => {
      const trimmed = name.trim()
      if (!trimmed) return false
      setPresets((prev) => {
        const next = addPreset(prev, trimmed, filters)
        writePresets(tabKey, next)
        return next
      })
      return true
    },
    [tabKey]
  )

  const remove = useCallback(
    (id: string) => {
      setPresets((prev) => {
        const next = removePreset(prev, id)
        writePresets(tabKey, next)
        return next
      })
    },
    [tabKey]
  )

  return { presets, save, remove }
}
