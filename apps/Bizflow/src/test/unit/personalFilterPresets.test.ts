/**
 * Saved views — the storage contract behind the "Saved views" toolbar control.
 *
 * A saved view is the only plugin state that lives outside the database, in
 * `localStorage`, which means two failure modes matter more than usual:
 *
 *  1. a corrupt or hand-edited entry must never break the tab, and
 *  2. re-saving a tweaked view must not silently pile up duplicates.
 *
 * Both halves are covered here: the pure list helpers, then the hook's
 * persistence and per-tab namespacing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  addPreset,
  MAX_PRESETS,
  MAX_PRESET_NAME,
  presetsStorageKey,
  readPresets,
  removePreset,
  useFilterPresets,
  writePresets,
  type FilterPreset
} from '../../renderer/src/plugins/personal/pages/hooks/useFilterPresets'

type View = { search: string; status: string; openOnly: boolean }

const view = (search = '', status = '', openOnly = true): View => ({ search, status, openOnly })

const preset = (id: string, name: string, filters = view()): FilterPreset<View> => ({ id, name, filters })

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('presetsStorageKey', () => {
  it('namespaces each tab separately', () => {
    expect(presetsStorageKey('tasks')).not.toBe(presetsStorageKey('invoices'))
    expect(presetsStorageKey('tasks')).toContain('tasks')
  })
})

describe('readPresets', () => {
  it('returns an empty list when nothing has been saved', () => {
    expect(readPresets<View>('tasks')).toEqual([])
  })

  it('returns an empty list for malformed JSON instead of throwing', () => {
    window.localStorage.setItem(presetsStorageKey('tasks'), '{ not json')
    expect(readPresets<View>('tasks')).toEqual([])
  })

  it('returns an empty list when the stored value is not an array', () => {
    window.localStorage.setItem(presetsStorageKey('tasks'), JSON.stringify({ name: 'nope' }))
    expect(readPresets<View>('tasks')).toEqual([])
  })

  it('drops entries that are missing an id, a name or filters', () => {
    window.localStorage.setItem(
      presetsStorageKey('tasks'),
      JSON.stringify([
        { id: 'a', name: 'Good', filters: view('x') },
        { name: 'No id', filters: view() },
        { id: 'c', name: '', filters: view() },
        { id: 'd', name: 'No filters' },
        null,
        'garbage'
      ])
    )

    const result = readPresets<View>('tasks')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Good')
  })

  it('keeps the stored filter payload intact', () => {
    window.localStorage.setItem(
      presetsStorageKey('tasks'),
      JSON.stringify([preset('a', 'Overdue', view('logo', 'overdue', false))])
    )

    expect(readPresets<View>('tasks')[0].filters).toEqual(view('logo', 'overdue', false))
  })

  it('survives a storage backend that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(readPresets<View>('tasks')).toEqual([])
  })
})

describe('writePresets', () => {
  it('round-trips through storage', () => {
    writePresets('tasks', [preset('a', 'Overdue', view('x'))])

    const stored = readPresets<View>('tasks')
    expect(stored).toHaveLength(1)
    expect(stored[0]).toEqual(preset('a', 'Overdue', view('x')))
  })

  it('caps what it writes so one tab cannot grow without bound', () => {
    const many = Array.from({ length: MAX_PRESETS + 8 }, (_, index) => preset(`p${index}`, `View ${index}`))
    writePresets('tasks', many)

    expect(readPresets<View>('tasks')).toHaveLength(MAX_PRESETS)
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    expect(() => writePresets('tasks', [preset('a', 'Overdue')])).not.toThrow()
  })
})

describe('addPreset', () => {
  it('puts the newest view first', () => {
    const first = addPreset<View>([], 'Overdue', view('a'))
    const second = addPreset<View>(first, 'Billable', view('b'))

    expect(second.map((entry) => entry.name)).toEqual(['Billable', 'Overdue'])
  })

  it('replaces a view with the same name instead of duplicating it', () => {
    const first = addPreset<View>([], 'Overdue', view('old'), 'id-1')
    const second = addPreset<View>(first, 'Overdue', view('new'), 'id-2')

    expect(second).toHaveLength(1)
    expect(second[0].id).toBe('id-2')
    expect(second[0].filters.search).toBe('new')
  })

  it('compares names case-insensitively', () => {
    const first = addPreset<View>([], 'Overdue', view('old'), 'id-1')
    const second = addPreset<View>(first, '  OVERDUE ', view('new'), 'id-2')

    expect(second).toHaveLength(1)
    expect(second[0].name).toBe('OVERDUE')
    expect(second[0].filters.search).toBe('new')
  })

  it('ignores a blank or whitespace-only name', () => {
    const list = [preset('a', 'Overdue')]

    expect(addPreset<View>(list, '', view('x'))).toBe(list)
    expect(addPreset<View>(list, '   ', view('x'))).toBe(list)
  })

  it('trims the name and truncates it to the maximum length', () => {
    const name = 'x'.repeat(MAX_PRESET_NAME + 25)
    const result = addPreset<View>([], `  ${name}  `, view())

    expect(result[0].name).toHaveLength(MAX_PRESET_NAME)
    expect(result[0].name).toBe(name.slice(0, MAX_PRESET_NAME))
  })

  it('caps the list at the maximum number of views', () => {
    let list: FilterPreset<View>[] = []
    for (let index = 0; index < MAX_PRESETS + 5; index += 1) {
      list = addPreset<View>(list, `View ${index}`, view(String(index)))
    }

    expect(list).toHaveLength(MAX_PRESETS)
    expect(list[0].name).toBe(`View ${MAX_PRESETS + 4}`)
  })

  it('mints distinct ids', () => {
    let list: FilterPreset<View>[] = []
    for (let index = 0; index < 6; index += 1) {
      list = addPreset<View>(list, `View ${index}`, view())
    }

    expect(new Set(list.map((entry) => entry.id)).size).toBe(6)
  })
})

describe('removePreset', () => {
  it('removes only the requested view', () => {
    const list = [preset('a', 'One'), preset('b', 'Two'), preset('c', 'Three')]

    expect(removePreset(list, 'b').map((entry) => entry.id)).toEqual(['a', 'c'])
  })

  it('is a no-op for an unknown id', () => {
    const list = [preset('a', 'One')]

    expect(removePreset(list, 'nope')).toHaveLength(1)
  })
})

describe('useFilterPresets', () => {
  it('starts empty and persists what the mutators save', () => {
    const { result } = renderHook(() => useFilterPresets<View>('tasks'))

    expect(result.current.presets).toEqual([])

    act(() => {
      result.current.save('Overdue', view('late', 'overdue', true))
    })

    expect(result.current.presets).toHaveLength(1)
    expect(result.current.presets[0].name).toBe('Overdue')
    expect(readPresets<View>('tasks')[0].filters).toEqual(view('late', 'overdue', true))
  })

  it('reports whether a save was accepted', () => {
    const { result } = renderHook(() => useFilterPresets<View>('invoices'))

    let accepted = true
    act(() => {
      accepted = result.current.save('   ', view())
    })
    expect(accepted).toBe(false)

    act(() => {
      accepted = result.current.save('Paid', view())
    })
    expect(accepted).toBe(true)
    expect(result.current.presets).toHaveLength(1)
  })

  it('persists removals', () => {
    const { result } = renderHook(() => useFilterPresets<View>('tasks'))

    act(() => {
      result.current.save('One', view('a'))
    })
    act(() => {
      result.current.save('Two', view('b'))
    })

    const id = result.current.presets.find((entry) => entry.name === 'One')!.id
    act(() => {
      result.current.remove(id)
    })

    expect(result.current.presets.map((entry) => entry.name)).toEqual(['Two'])
    expect(readPresets<View>('tasks').map((entry) => entry.name)).toEqual(['Two'])
  })

  it('keeps each tab in its own bucket', () => {
    const tasks = renderHook(() => useFilterPresets<View>('tasks'))
    const invoices = renderHook(() => useFilterPresets<View>('invoices'))

    act(() => {
      tasks.result.current.save('Only tasks', view('t'))
    })

    expect(tasks.result.current.presets).toHaveLength(1)
    expect(invoices.result.current.presets).toEqual([])
  })

  it('reads a different tab when the key changes', () => {
    writePresets('invoices', [preset('i1', 'Unpaid')])

    const { result, rerender } = renderHook(({ tab }: { tab: string }) => useFilterPresets<View>(tab), {
      initialProps: { tab: 'tasks' }
    })

    expect(result.current.presets).toEqual([])

    rerender({ tab: 'invoices' })

    expect(result.current.presets.map((entry) => entry.name)).toEqual(['Unpaid'])
  })

  it('does not write the old tab views into the new tab slot', () => {
    const { result, rerender } = renderHook(({ tab }: { tab: string }) => useFilterPresets<View>(tab), {
      initialProps: { tab: 'tasks' }
    })

    act(() => {
      result.current.save('Tasks only', view())
    })

    rerender({ tab: 'notes' })

    expect(readPresets<View>('notes')).toEqual([])
    expect(readPresets<View>('tasks').map((entry) => entry.name)).toEqual(['Tasks only'])
  })
})
