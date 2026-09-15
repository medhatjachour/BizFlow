import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  KpiSection,
  KpiToggleButton,
  KpiVisibilityProvider
} from '../../renderer/src/components/ui/KpiVisibility'
import {
  KPI_STORAGE_KEY,
  useKpiVisibility
} from '../../renderer/src/components/ui/kpiVisibilityStore'
import { LanguageProvider } from '../../renderer/src/contexts/LanguageContext'
import type { ReactNode } from 'react'

/**
 * The KPI switch is the only thing standing between a dense dashboard and a
 * usable phone screen, so its resolution order is pinned down here:
 * per-section override, then the global switch, then the viewport rule.
 */

function mockViewport(matches: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    matches,
    media: '(min-width: 1024px)',
    onchange: null,
    addEventListener: (_event: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: () => void) => {
      listeners.delete(listener)
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => query
  })

  return {
    resizeTo(next: boolean) {
      query.matches = next
      listeners.forEach((listener) => listener())
    }
  }
}

beforeEach(() => {
  // English labels so the accessible names used below are stable.
  localStorage.setItem('language', 'en')
})

function wrap(node: ReactNode) {
  return render(
    <LanguageProvider>
      <KpiVisibilityProvider>{node}</KpiVisibilityProvider>
    </LanguageProvider>
  )
}

function Section({ label }: { label: string }) {
  return (
    <KpiSection sectionKey="vet:sales">
      <div>{label}</div>
    </KpiSection>
  )
}

function SectionToggle({ sectionKey }: { sectionKey: string }) {
  const { isVisible, toggle } = useKpiVisibility()
  return (
    <button type="button" onClick={() => toggle(sectionKey)}>
      {isVisible(sectionKey) ? 'on' : 'off'}
    </button>
  )
}

describe('KpiSection without a provider', () => {
  it('renders its cards so bare plugin screens keep working', () => {
    render(
      <LanguageProvider>
        <KpiSection sectionKey="bakery:dashboard">
          <div>Revenue</div>
        </KpiSection>
      </LanguageProvider>
    )

    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })
})

describe('KpiSection viewport rule', () => {
  it('shows the cards on a wide viewport when nothing is stored', () => {
    mockViewport(true)
    wrap(<Section label="Big numbers" />)

    expect(screen.getByText('Big numbers')).toBeInTheDocument()
  })

  it('hides the cards on a narrow viewport but keeps the show affordance', () => {
    mockViewport(false)
    wrap(<Section label="Big numbers" />)

    expect(screen.queryByText('Big numbers')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument()
  })

  it('reacts to the viewport crossing the breakpoint', () => {
    const viewport = mockViewport(false)
    wrap(<Section label="Big numbers" />)
    expect(screen.queryByText('Big numbers')).not.toBeInTheDocument()

    act(() => viewport.resizeTo(true))

    expect(screen.getByText('Big numbers')).toBeInTheDocument()
  })
})

describe('KpiSection per-section preference', () => {
  it('hides one section and hands it back to the viewport when shown again', () => {
    mockViewport(true)
    wrap(
      <>
        <Section label="Vet numbers" />
        <SectionToggle sectionKey="vet:sales" />
      </>
    )
    expect(screen.getByText('Vet numbers')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Hide' }).click())
    expect(screen.queryByText('Vet numbers')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'off' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(KPI_STORAGE_KEY) ?? '{}')).toEqual({
      sections: { 'vet:sales': false }
    })

    act(() => screen.getByRole('button', { name: 'Show' }).click())
    expect(screen.getByText('Vet numbers')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'on' })).toBeInTheDocument()
    // The viewport would show it anyway, so nothing is stored: back to auto.
    expect(JSON.parse(localStorage.getItem(KPI_STORAGE_KEY) ?? '{}')).toEqual({ sections: {} })
  })

  it('keeps a section the user forced open on a narrow viewport', () => {
    mockViewport(false)
    wrap(<Section label="Vet numbers" />)
    expect(screen.queryByText('Vet numbers')).not.toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Show' }).click())

    expect(screen.getByText('Vet numbers')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(KPI_STORAGE_KEY) ?? '{}')).toEqual({
      sections: { 'vet:sales': true }
    })
  })

  it('restores stored per-section choices across mounts', () => {
    mockViewport(true)
    localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify({ sections: { 'vet:sales': false } }))

    wrap(<Section label="Vet numbers" />)

    expect(screen.queryByText('Vet numbers')).not.toBeInTheDocument()
  })

  it('ignores a corrupt payload instead of crashing', () => {
    mockViewport(true)
    localStorage.setItem(KPI_STORAGE_KEY, '{not json')

    wrap(<Section label="Vet numbers" />)

    expect(screen.getByText('Vet numbers')).toBeInTheDocument()
  })
})

describe('KpiToggleButton', () => {
  it('hides every section at once and brings them back', () => {
    mockViewport(true)
    wrap(
      <>
        <KpiToggleButton />
        <Section label="Vet numbers" />
      </>
    )
    const toggle = screen.getByRole('button', { name: 'Hide KPI cards' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    act(() => toggle.click())

    expect(screen.queryByText('Vet numbers')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show KPI cards' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    act(() => screen.getByRole('button', { name: 'Show KPI cards' }).click())
    expect(screen.getByText('Vet numbers')).toBeInTheDocument()
  })

  it('clears per-section choices so the global switch always wins', () => {
    mockViewport(true)
    localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify({ sections: { 'vet:sales': false } }))
    wrap(
      <>
        <KpiToggleButton />
        <Section label="Vet numbers" />
      </>
    )
    // The per-section hide is in charge while the global switch has no opinion.
    expect(screen.queryByText('Vet numbers')).not.toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Hide KPI cards' }).click())
    expect(JSON.parse(localStorage.getItem(KPI_STORAGE_KEY) ?? '{}')).toEqual({
      all: false,
      sections: {}
    })

    act(() => screen.getByRole('button', { name: 'Show KPI cards' }).click())

    expect(screen.getByText('Vet numbers')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(KPI_STORAGE_KEY) ?? '{}')).toEqual({
      all: true,
      sections: {}
    })
  })
})
