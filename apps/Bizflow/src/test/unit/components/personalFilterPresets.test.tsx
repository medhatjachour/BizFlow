/**
 * The "Saved views" toolbar control.
 *
 * The interesting behaviour is not that it renders a list — it is that the
 * popover closes itself at the right moments, that an unnamed view is refused
 * *without* closing (so the user can fix the name), and that the trigger tells
 * you which view is currently active.
 */

import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import FilterPresets from '../../../renderer/src/plugins/personal/pages/components/FilterPresets'
import { translations } from '../../../renderer/src/i18n/translations'
import type { FilterPreset } from '../../../renderer/src/plugins/personal/pages/hooks/useFilterPresets'

const en = translations.en

type View = { search: string; status: string; openOnly: boolean }
const view = (search = '', status = '', openOnly = true): View => ({ search, status, openOnly })

/** Wraps the control the way a tab does: it owns the filter state. */
function Harness({
  initial = view(),
  presets = [] as FilterPreset<View>[],
  onRemove = () => {}
}: {
  initial?: View
  presets?: FilterPreset<View>[]
  onRemove?: (id: string) => void
}) {
  const [current, setCurrent] = useState<View>(initial)
  const [saved, setSaved] = useState<FilterPreset<View>[]>(presets)

  return (
    <LanguageProvider>
      <FilterPresets
        presets={saved}
        current={current}
        onApply={setCurrent}
        onSave={(name) => {
          if (!name.trim()) return false
          setSaved((prev) => [{ id: `id-${prev.length}`, name: name.trim(), filters: current }, ...prev])
          return true
        }}
        onRemove={(id) => {
          onRemove(id)
          setSaved((prev) => prev.filter((entry) => entry.id !== id))
        }}
      />
      <output data-testid="current">{JSON.stringify(current)}</output>
    </LanguageProvider>
  )
}

const openPopover = () => fireEvent.click(screen.getByRole('button', { name: /saved views|overdue/i }))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('language', 'en')
})

describe('FilterPresets', () => {
  it('shows the localised label and no count when nothing is saved', () => {
    render(<Harness />)

    const trigger = screen.getByRole('button', { name: en.pwPresets })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent(en.pwPresets)
    expect(trigger).not.toHaveTextContent('1')
  })

  it('is collapsed until the trigger is clicked', () => {
    render(<Harness />)

    expect(screen.queryByPlaceholderText(en.pwPresetNamePlaceholder)).not.toBeInTheDocument()

    openPopover()

    expect(screen.getByPlaceholderText(en.pwPresetNamePlaceholder)).toBeInTheDocument()
    expect(screen.getByText(en.pwPresetsHint)).toBeInTheDocument()
  })

  it('explains that there is nothing saved yet', () => {
    render(<Harness />)
    openPopover()

    expect(screen.getByText(en.pwPresetsEmpty)).toBeInTheDocument()
  })

  it('counts the saved views on the trigger', () => {
    render(<Harness presets={[{ id: 'a', name: 'Overdue', filters: view('late') }]} />)

    expect(screen.getByRole('button', { name: new RegExp(en.pwPresets) })).toHaveTextContent('1')
  })

  it('names the active view on the trigger instead of the generic label', () => {
    render(<Harness initial={view('late')} presets={[{ id: 'a', name: 'Overdue', filters: view('late') }]} />)

    expect(screen.getByRole('button', { name: /Overdue/ })).toHaveTextContent('Overdue')
  })

  it('ignores filter-key order and unrelated state when matching the active view', () => {
    // Same values, declared in a different order: still the active view.
    const shuffled = { openOnly: true, status: '', search: 'late' } as View
    render(<Harness initial={view('late')} presets={[{ id: 'a', name: 'Overdue', filters: shuffled }]} />)

    expect(screen.getByRole('button', { name: /Overdue/ })).toBeInTheDocument()
  })

  it('is neither active nor generic-labelled when the filters drifted', () => {
    render(
      <Harness
        initial={view('changed')}
        presets={[{ id: 'a', name: 'Overdue', filters: view('late') }]}
      />
    )

    const trigger = screen.getByRole('button', { name: new RegExp(en.pwPresets) })
    expect(trigger).toHaveTextContent(en.pwPresets)
    expect(trigger).not.toHaveTextContent('Overdue')
  })

  it('applies a view and closes the popover', () => {
    render(<Harness initial={view('')} presets={[{ id: 'a', name: 'Overdue', filters: view('late', 'overdue', false) }]} />)
    openPopover()

    fireEvent.click(screen.getByRole('button', { name: 'Overdue' }))

    expect(screen.getByTestId('current')).toHaveTextContent(JSON.stringify(view('late', 'overdue', false)))
    expect(screen.queryByPlaceholderText(en.pwPresetNamePlaceholder)).not.toBeInTheDocument()
  })

  it('saves the current filters under a typed name and closes', () => {
    render(<Harness initial={view('logo')} />)
    openPopover()

    fireEvent.change(screen.getByPlaceholderText(en.pwPresetNamePlaceholder), { target: { value: 'Logos' } })
    fireEvent.click(screen.getByRole('button', { name: en.pwSave }))

    expect(screen.queryByPlaceholderText(en.pwPresetNamePlaceholder)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Logos/ })).toHaveTextContent('Logos')
  })

  it('saves on Enter as well as on the button', () => {
    render(<Harness />)
    openPopover()

    const input = screen.getByPlaceholderText(en.pwPresetNamePlaceholder)
    fireEvent.change(input, { target: { value: 'Billable' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('button', { name: /Billable/ })).toBeInTheDocument()
  })

  it('refuses an empty name, stays open and explains why', () => {
    render(<Harness />)
    openPopover()

    fireEvent.click(screen.getByRole('button', { name: en.pwSave }))

    expect(screen.getByPlaceholderText(en.pwPresetNamePlaceholder)).toBeInTheDocument()
    expect(screen.getByText(en.pwPresetNameRequired)).toBeInTheDocument()
  })

  it('clears the validation warning once the user types', () => {
    render(<Harness />)
    openPopover()

    fireEvent.click(screen.getByRole('button', { name: en.pwSave }))
    expect(screen.getByText(en.pwPresetNameRequired)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(en.pwPresetNamePlaceholder), { target: { value: 'x' } })

    expect(screen.queryByText(en.pwPresetNameRequired)).not.toBeInTheDocument()
  })

  it('deletes a view without applying it', () => {
    const onRemove = vi.fn()
    render(<Harness initial={view()} presets={[{ id: 'a', name: 'Overdue', filters: view('late') }]} onRemove={onRemove} />)
    openPopover()

    fireEvent.click(screen.getByRole('button', { name: `${en.pwPresetDelete} Overdue` }))

    expect(onRemove).toHaveBeenCalledWith('a')
    expect(screen.getByText(en.pwPresetsEmpty)).toBeInTheDocument()
    // Deleting must not have touched the live filters.
    expect(screen.getByTestId('current')).toHaveTextContent(JSON.stringify(view()))
  })

  it('closes from the backdrop without changing the filters', () => {
    const { container } = render(<Harness presets={[{ id: 'a', name: 'Overdue', filters: view('late') }]} />)
    openPopover()

    const backdrop = container.querySelector('.fixed.inset-0')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)

    expect(screen.queryByPlaceholderText(en.pwPresetNamePlaceholder)).not.toBeInTheDocument()
    expect(screen.getByTestId('current')).toHaveTextContent(JSON.stringify(view()))
  })

  it('closes from its own close button', () => {
    render(<Harness />)
    openPopover()

    fireEvent.click(screen.getByRole('button', { name: en.pwClose }))

    expect(screen.queryByPlaceholderText(en.pwPresetNamePlaceholder)).not.toBeInTheDocument()
  })

  it('forgets the previous name when it is reopened', () => {
    render(<Harness />)
    openPopover()

    fireEvent.change(screen.getByPlaceholderText(en.pwPresetNamePlaceholder), { target: { value: 'Draft' } })
    fireEvent.click(screen.getByRole('button', { name: en.pwClose }))
    openPopover()

    expect(screen.getByPlaceholderText(en.pwPresetNamePlaceholder)).toHaveValue('')
  })
})
