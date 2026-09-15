/**
 * Integration coverage for the KPI visibility primitive against real plugin blocks.
 *
 * `kpiVisibility.test.tsx` covers the state machine in isolation and
 * `pluginKpiToggle.test.ts` covers the static wiring of all 96 blocks. This file
 * closes the remaining gap: it renders two genuine wrapped components (warehouse
 * `TodayActivityRibbon`, coffee `OperatorSnapshot`) inside the real provider and
 * asserts the blocks actually hide/show, proving the wrapper is not inert.
 */
import { render, screen, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'

import { KpiVisibilityProvider } from '../../renderer/src/components/ui/KpiVisibility'
import { useKpiVisibility } from '../../renderer/src/components/ui/kpiVisibilityStore'
import { LanguageProvider } from '../../renderer/src/contexts/LanguageContext'
import { TodayActivityRibbon } from '../../renderer/src/plugins/warehouse/reports/components/TodayActivityRibbon'
import { OperatorSnapshot } from '../../renderer/src/plugins/coffee/pages/reports/components/OperatorSnapshot'

function mockViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({
      matches,
      media: '(min-width: 1024px)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    })
  })
}

function Probe() {
  const { toggleAll } = useKpiVisibility()
  return (
    <button type="button" onClick={toggleAll}>
      probe-toggle
    </button>
  )
}

function wrap(node: ReactNode) {
  return render(
    <LanguageProvider>
      <KpiVisibilityProvider>{node}</KpiVisibilityProvider>
    </LanguageProvider>
  )
}

function Ribbon() {
  return (
    <TodayActivityRibbon
      totalLocations={3}
      transfersCount={7}
      criticalCount={2}
      totalValue={1234.5}
      totalUnits={99}
    />
  )
}

const overview = {
  peakHour: { hour: 9, value: 12 },
  deliveryRevenue: 100,
  totalRevenue: 400,
  repeatCustomerRatePct: 20,
  repeatCustomers: 5,
  lowStockCount: 2,
  outOfStockCount: 1,
  bestDay: { date: '2026-01-02', revenue: 300, orders: 7 },
  worstDay: { date: '2026-01-03', revenue: 50, orders: 1 }
} as never

function Snapshot() {
  return <OperatorSnapshot overview={overview} loading={false} t={(key: string) => key} />
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('language', 'en')
})

describe('real wrapped plugin blocks', () => {
  it('hides every block on a narrow viewport and shows them again from the header switch', async () => {
    mockViewport(false)
    wrap(
      <>
        <Ribbon />
        <Snapshot />
        <Probe />
      </>
    )

    expect(screen.queryByText('Active Facilities')).toBeNull()
    expect(screen.queryByText('Operator Snapshot')).toBeNull()
    expect(document.querySelectorAll('[data-kpi-hidden="true"]')).toHaveLength(2)

    await act(async () => {
      screen.getByText('probe-toggle').click()
    })

    expect(screen.getByText('Active Facilities')).toBeTruthy()
    expect(screen.getByText('Operator Snapshot')).toBeTruthy()
    expect(document.querySelectorAll('[data-kpi-hidden="false"]')).toHaveLength(2)
  })

  it('shows every block by default on a wide viewport', () => {
    mockViewport(true)
    wrap(
      <>
        <Ribbon />
        <Snapshot />
      </>
    )

    expect(screen.getByText('Active Facilities')).toBeTruthy()
    expect(screen.getByText('Operator Snapshot')).toBeTruthy()
    expect(document.querySelectorAll('[data-kpi-hidden="false"]')).toHaveLength(2)
  })

  it('hides one block from its own chip without touching the other', async () => {
    mockViewport(true)
    wrap(
      <>
        <Ribbon />
        <Snapshot />
      </>
    )

    await act(async () => {
      screen.getAllByLabelText('Hide')[0].click()
    })

    const ribbon = document.querySelector('[data-kpi-section="warehouse:reports-TodayActivityRibbon"]')
    const snapshot = document.querySelector('[data-kpi-section="coffee:reports-OperatorSnapshot"]')
    expect(ribbon?.getAttribute('data-kpi-hidden')).toBe('true')
    expect(snapshot?.getAttribute('data-kpi-hidden')).toBe('false')
    expect(screen.getByText('Operator Snapshot')).toBeTruthy()

    await act(async () => {
      screen.getByLabelText('Show').click()
    })

    expect(ribbon?.getAttribute('data-kpi-hidden')).toBe('false')
    expect(screen.getByText('Active Facilities')).toBeTruthy()
  })
})
