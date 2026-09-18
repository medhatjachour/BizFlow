import { useEffect, useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import PersonalCommandPalette, {
  type PaletteEntry
} from '../../../renderer/src/plugins/personal/pages/components/PersonalCommandPalette'
import { requestIntent, useIntent } from '../../../renderer/src/plugins/personal/pages/hooks/useIntent'
import { translations } from '../../../renderer/src/i18n/translations'

const en = translations.en

/** A host component that claims a pending intent the way a real tab does. */
function IntentHost({ target, handler }: { target: string; handler: () => void }): JSX.Element {
  const [, bump] = useState(0)
  useIntent(target, handler)
  // Mirrors the page shell: closing the palette re-renders the whole tree.
  useEffect(() => {
    bump((value) => value)
  }, [])
  return <p>host</p>
}

describe('PersonalCommandPalette', () => {
  const navigate = vi.fn()
  const create = vi.fn()
  const action = vi.fn()
  const onClose = vi.fn()

  const entries: PaletteEntry[] = [
    {
      id: 'tab:tasks',
      labelKey: 'pwTabTasks',
      fallback: 'Daily 3 & Tasks',
      group: 'navigate',
      icon: <span>t</span>,
      shortcut: 'Alt 6',
      run: navigate
    },
    {
      id: 'new:client',
      labelKey: 'pwCmdNewClient',
      fallback: 'New client',
      group: 'create',
      icon: <span>c</span>,
      run: create
    },
    {
      id: 'action:guide',
      labelKey: 'pwCmdOpenGuide',
      fallback: 'Open the guide',
      group: 'action',
      icon: <span>g</span>,
      run: action
    }
  ]

  const renderPalette = (items: PaletteEntry[] = entries) =>
    render(
      <LanguageProvider>
        <PersonalCommandPalette entries={items} onClose={onClose} />
      </LanguageProvider>
    )

  beforeEach(() => {
    vi.clearAllMocks()
    // Labels come from the shared i18n dictionaries, so pin the language.
    localStorage.setItem('language', 'en')
  })

  it('renders every group with its localised label', () => {
    renderPalette()

    expect(screen.getByText(en.pwCmdGroupNavigate)).toBeInTheDocument()
    expect(screen.getByText(en.pwCmdGroupCreate)).toBeInTheDocument()
    expect(screen.getByText(en.pwCmdGroupAction)).toBeInTheDocument()
    expect(screen.getByText(en.pwTabTasks)).toBeInTheDocument()
    expect(screen.getByText(en.pwCmdNewClient)).toBeInTheDocument()
    expect(screen.getByText(en.pwCmdOpenGuide)).toBeInTheDocument()
  })

  it('advertises each entry shortcut', () => {
    renderPalette()

    expect(screen.getByText('Alt 6')).toBeInTheDocument()
    expect(screen.queryByText('F1')).not.toBeInTheDocument()
  })

  it('filters rows down to the query and drops empty groups', () => {
    renderPalette()

    fireEvent.change(screen.getByPlaceholderText(en.pwCmdPlaceholder), {
      target: { value: 'client' }
    })

    expect(screen.getByText(en.pwCmdNewClient)).toBeInTheDocument()
    expect(screen.queryByText(en.pwTabTasks)).not.toBeInTheDocument()
    expect(screen.queryByText(en.pwCmdOpenGuide)).not.toBeInTheDocument()
    expect(screen.queryByText(en.pwCmdGroupNavigate)).not.toBeInTheDocument()
  })

  it('matches the seeded English label even when the query is not the display label', () => {
    renderPalette([
      {
        id: 'new:wait',
        labelKey: 'pwCmdNewWait',
        fallback: 'New waiting log',
        keywords: 'new add wait',
        group: 'create',
        icon: <span>w</span>,
        run: create
      }
    ])

    fireEvent.change(screen.getByPlaceholderText(en.pwCmdPlaceholder), {
      target: { value: 'waiting log' }
    })

    expect(screen.getByText('New waiting log')).toBeInTheDocument()
  })

  it('shows the empty message with the typed query', () => {
    renderPalette()

    fireEvent.change(screen.getByPlaceholderText(en.pwCmdPlaceholder), {
      target: { value: 'zzz' }
    })

    expect(screen.getByText(/zzz/)).toBeInTheDocument()
    expect(screen.queryByText(en.pwCmdNewClient)).not.toBeInTheDocument()
  })

  it('runs the first match on Enter and closes', () => {
    renderPalette()
    const input = screen.getByPlaceholderText(en.pwCmdPlaceholder)

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(create).not.toHaveBeenCalled()
  })

  it('moves the highlight with the arrow keys and wraps around', () => {
    renderPalette()
    const input = screen.getByPlaceholderText(en.pwCmdPlaceholder)

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(create).toHaveBeenCalledTimes(1)

    // Two more downs walk 1 -> 2 -> 0, wrapping back to the first entry.
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('moves the highlight with ArrowUp from the first entry', () => {
    renderPalette()
    const input = screen.getByPlaceholderText(en.pwCmdPlaceholder)

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(action).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape without running anything', () => {
    renderPalette()

    fireEvent.keyDown(screen.getByPlaceholderText(en.pwCmdPlaceholder), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('runs a clicked row', () => {
    renderPalette()

    fireEvent.click(screen.getByText(en.pwCmdOpenGuide))

    expect(action).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does nothing on Enter when there are no matches', () => {
    renderPalette()

    const input = screen.getByPlaceholderText(en.pwCmdPlaceholder)
    fireEvent.change(input, { target: { value: 'zzz' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onClose).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(action).not.toHaveBeenCalled()
  })
})

describe('useIntent', () => {
  it('hands a request made before the tab mounts to its first render', () => {
    const handler = vi.fn()
    requestIntent('mount-claim')

    render(<IntentHost target="mount-claim" handler={handler} />)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('hands a request made while the tab is already mounted to the next render', () => {
    const handler = vi.fn()
    const { rerender } = render(<IntentHost target="live-claim" handler={handler} />)

    requestIntent('live-claim')
    rerender(<IntentHost target="live-claim" handler={handler} />)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('claims a request only once', () => {
    const handler = vi.fn()
    requestIntent('once-claim')
    const { rerender } = render(<IntentHost target="once-claim" handler={handler} />)

    rerender(<IntentHost target="once-claim" handler={handler} />)
    rerender(<IntentHost target="once-claim" handler={handler} />)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores a request aimed at a different target', () => {
    const handler = vi.fn()
    const { rerender } = render(<IntentHost target="other-target" handler={handler} />)

    requestIntent('someone-else')
    rerender(<IntentHost target="other-target" handler={handler} />)

    expect(handler).not.toHaveBeenCalled()
  })
})
