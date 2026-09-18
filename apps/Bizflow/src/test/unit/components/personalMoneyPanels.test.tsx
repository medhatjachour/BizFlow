/**
 * The money screens: the shared amount breakdown, the late-fee / collection
 * panel and the price card.
 *
 * These are preview surfaces, so the behaviour worth pinning is what the user is
 * *told* before they act: which rows are chargeable, what the fee comes to, what
 * the notice says, and where the tier totals land once the floor is applied.
 *
 * Money is asserted through the plugin's own `formatMoney` so the expectations
 * follow the app's rendering convention instead of guessing at it.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import { ToastProvider } from '../../../renderer/src/contexts/ToastContext'
import BreakdownList from '../../../renderer/src/plugins/personal/pages/components/BreakdownList'
import LateFeePanel from '../../../renderer/src/plugins/personal/pages/invoices/LateFeePanel'
import PriceCardPanel from '../../../renderer/src/plugins/personal/pages/finance/PriceCardPanel'
import { formatMoney } from '../../../renderer/src/plugins/personal/pages/utils'
import { translations } from '../../../renderer/src/i18n/translations'

const en = translations.en
const ar = translations.ar
const money = (value: number, currency = 'USD') => formatMoney(value, currency)

const wrap = (ui: React.ReactElement) =>
  render(
    <LanguageProvider>
      <ToastProvider>{ui}</ToastProvider>
    </LanguageProvider>
  )

/**
 * `FormInput` renders a bare `<label>` with no `htmlFor`, so `getByLabelText`
 * cannot reach the control. Walk from the label into its own field wrapper.
 */
function fieldInput(label: string, index = 0): HTMLInputElement {
  const labelNode = screen.getAllByText(label)[index]
  const input = labelNode.parentElement?.querySelector('input')
  if (!input) throw new Error(`No input found for the field labelled "${label}"`)
  return input
}

const setField = (label: string, value: string) =>
  fireEvent.change(fieldInput(label), { target: { value } })

/** A scan row shaped exactly like `personal:billing:lateFeeScan` returns. */
function lateRow(overrides: Record<string, unknown> = {}) {
  return {
    invoiceId: 'inv-1',
    number: 'INV-0042',
    clientId: 'cli-1',
    clientName: 'Northwind Studio',
    projectCode: 'NW-LANDING',
    currency: 'USD',
    dueAt: new Date(2025, 0, 10).getTime(),
    balance: 1200,
    paymentTermsDays: 14,
    breakdown: {
      isLate: true,
      withinGrace: false,
      daysLate: 22,
      graceDays: 3,
      chargeableDays: 19,
      periods: 0.63,
      ratePercent: 2,
      periodDays: 30,
      compounding: 'simple',
      rawPercentFee: 15.2,
      percentFee: 15.2,
      flatFee: 0,
      fee: 15.2,
      cap: 180,
      capped: false,
      balance: 1200,
      newBalance: 1215.2
    },
    ...overrides
  }
}

const scanResult = (overrides: Record<string, unknown> = {}) => ({
  asOf: new Date(2025, 1, 1).getTime(),
  policy: {
    graceDays: 3,
    ratePercent: 2,
    periodDays: 30,
    flatFee: 0,
    maxPercent: 15,
    compounding: 'simple'
  },
  rows: [lateRow()],
  totalBalance: 1200,
  totalFee: 15.2,
  chargeableCount: 1,
  ...overrides
})

function priceCardResult(overrides: Record<string, unknown> = {}) {
  return {
    profile: null,
    engine: {
      baselineHourlyRate: 50.09,
      floorHourlyRate: 37.57,
      minimumProjectPrice: 500,
      currency: 'USD'
    },
    card: {
      baselineHourlyRate: 50.09,
      floorHourlyRate: 37.57,
      minimumProjectPrice: 500,
      currency: 'USD',
      tiers: [
        {
          id: 'standard',
          multiplier: 1,
          lines: [{ name: 'Landing page', hours: 20, base: 1001.8, price: 1001.8 }],
          subtotal: 1001.8,
          total: 1001.8,
          floorApplied: false
        },
        {
          id: 'retainer',
          multiplier: 0.9,
          lines: [{ name: 'Landing page', hours: 20, base: 1001.8, price: 901.62 }],
          subtotal: 901.62,
          total: 901.62,
          floorApplied: false
        },
        {
          id: 'rush',
          multiplier: 1.25,
          lines: [{ name: 'Landing page', hours: 20, base: 1001.8, price: 1252.25 }],
          subtotal: 1252.25,
          total: 1252.25,
          floorApplied: false
        }
      ],
      ...overrides
    }
  }
}

/** `window.api` is installed by the shared setup as a writable property. */
function mountPersonalApi(scan: unknown, card?: unknown) {
  ;(window as unknown as { api: unknown }).api = {
    personal: {
      billing: { lateFeeScan: vi.fn().mockResolvedValue(scan) },
      finance: { priceCard: vi.fn().mockResolvedValue(card ?? priceCardResult()) }
    }
  }
}

const lastScanPayload = () => vi.mocked(window.api.personal.billing.lateFeeScan).mock.calls.at(-1)?.[0]
const lastCardPayload = () => vi.mocked(window.api.personal.finance.priceCard).mock.calls.at(-1)?.[0]
const copiedText = () => vi.mocked(navigator.clipboard.writeText).mock.calls.at(-1)?.[0] as string

beforeEach(() => {
  window.localStorage.setItem('language', 'en')
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true
  })
})

describe('BreakdownList', () => {
  it('renders one row per amount and reads them as a description list', () => {
    const { container } = render(
      <BreakdownList
        rows={[
          { label: en.pwDiscountBase, value: '$1,000.00' },
          { label: en.pwDiscountNet, value: '$950.00', tone: 'total' }
        ]}
      />
    )
    expect(screen.getByText(en.pwDiscountBase)).toBeInTheDocument()
    expect(screen.getByText('$950.00')).toBeInTheDocument()
    expect(container.querySelectorAll('dl > div')).toHaveLength(2)
  })

  it('separates the total row with a rule so it cannot be misread as a line item', () => {
    const { container } = render(
      <BreakdownList
        rows={[
          { label: en.pwDiscountBase, value: '$1,000.00' },
          { label: en.pwDiscountNet, value: '$950.00', tone: 'total' }
        ]}
      />
    )
    const rows = Array.from(container.querySelectorAll('dl > div'))
    expect(rows[0].className).not.toMatch(/border-t/)
    expect(rows[1].className).toMatch(/border-t/)
  })

  it('shows a hint next to the label when the number needs context', () => {
    render(<BreakdownList rows={[{ label: 'Landing page', value: '$1,001.80', hint: '20h' }]} />)
    expect(screen.getByText('20h')).toBeInTheDocument()
  })

  it('renders a footer when supplied', () => {
    render(
      <BreakdownList
        rows={[{ label: en.pwDiscountBase, value: '$1,000.00' }]}
        footer={<span>Foot</span>}
      />
    )
    expect(screen.getByText('Foot')).toBeInTheDocument()
  })

  it('carries the Arabic label when Arabic is active', () => {
    window.localStorage.setItem('language', 'ar')
    render(<BreakdownList rows={[{ label: ar.pwDiscountNet, value: '$950.00', tone: 'total' }]} />)
    expect(screen.getByText(ar.pwDiscountNet)).toBeInTheDocument()
  })
})

describe('LateFeePanel', () => {
  it('scans with the default policy on mount', async () => {
    mountPersonalApi(scanResult())
    wrap(<LateFeePanel />)
    await waitFor(() =>
      expect(lastScanPayload()).toEqual({
        policy: { graceDays: 3, ratePercent: 2, periodDays: 30, maxPercent: 15, flatFee: 0 }
      })
    )
  })

  it('lists each past-due invoice with its balance, fee and new total', async () => {
    mountPersonalApi(scanResult())
    wrap(<LateFeePanel />)
    expect(await screen.findByText('Northwind Studio')).toBeInTheDocument()
    expect(screen.getByText('INV-0042')).toBeInTheDocument()
    expect(screen.getAllByText(money(1200)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(money(15.2)).length).toBeGreaterThan(0)
    expect(screen.getByText(money(1215.2))).toBeInTheDocument()
  })

  it('summarises the scan totals on the KPI cards', async () => {
    mountPersonalApi(scanResult({ totalFee: 42.5, chargeableCount: 2 }))
    wrap(<LateFeePanel />)
    expect(await screen.findByText(money(42.5))).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('offers an empty state when nothing is past due', async () => {
    mountPersonalApi(scanResult({ rows: [], totalBalance: 0, totalFee: 0, chargeableCount: 0 }))
    wrap(<LateFeePanel />)
    expect(await screen.findByText(en.pwLateEmpty)).toBeInTheDocument()
  })

  it('re-runs the scan with the edited policy', async () => {
    mountPersonalApi(scanResult())
    wrap(<LateFeePanel />)
    await waitFor(() => expect(window.api.personal.billing.lateFeeScan).toHaveBeenCalledTimes(1))

    setField(en.pwLateGraceDays, '7')

    await waitFor(() =>
      expect(lastScanPayload()).toEqual({
        policy: { graceDays: 7, ratePercent: 2, periodDays: 30, maxPercent: 15, flatFee: 0 }
      })
    )
  })

  it('restores the default policy on reset', async () => {
    mountPersonalApi(scanResult())
    wrap(<LateFeePanel />)
    setField(en.pwLateRate, '9')
    await waitFor(() => expect(window.api.personal.billing.lateFeeScan).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getByRole('button', { name: en.pwLatePolicyReset }))

    await waitFor(() =>
      expect(lastScanPayload()).toEqual({
        policy: { graceDays: 3, ratePercent: 2, periodDays: 30, maxPercent: 15, flatFee: 0 }
      })
    )
  })

  it('labels a chargeable row as chargeable', async () => {
    mountPersonalApi(scanResult())
    wrap(<LateFeePanel />)
    expect(await screen.findByText(en.pwLateChargeable)).toBeInTheDocument()
  })

  it('labels a row still inside the grace period as in grace', async () => {
    mountPersonalApi(
      scanResult({
        rows: [
          lateRow({
            breakdown: { ...lateRow().breakdown, withinGrace: true, fee: 0, newBalance: 1200 }
          })
        ]
      })
    )
    wrap(<LateFeePanel />)
    expect(await screen.findByText(en.pwLateInGrace)).toBeInTheDocument()
    expect(screen.queryByText(en.pwLateChargeable)).not.toBeInTheDocument()
  })

  it('flags a row whose fee hit the policy ceiling as capped', async () => {
    mountPersonalApi(
      scanResult({ rows: [lateRow({ breakdown: { ...lateRow().breakdown, capped: true, fee: 180 } })] })
    )
    wrap(<LateFeePanel />)
    expect(await screen.findByText(en.pwLateCapped)).toBeInTheDocument()
  })

  it('opens a reminder notice that names the client, the invoice and the fee', async () => {
    mountPersonalApi(scanResult())
    wrap(<LateFeePanel />)
    fireEvent.click(await screen.findByRole('button', { name: en.pwLateNotice }))

    const dialog = await screen.findByRole('dialog')
    const body = within(dialog).getByText(/Northwind Studio/)

    expect(body.textContent).toContain('INV-0042')
    expect(body.textContent).toContain(money(15.2))
    expect(body.textContent).toContain(money(1215.2))
  })

  it('copies the reminder under the invoice-number subject', async () => {
    mountPersonalApi(scanResult())
    wrap(<LateFeePanel />)
    const row = (await screen.findByText('Northwind Studio')).closest('tr')!
    fireEvent.click(within(row).getAllByRole('button').at(-1)!)

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1))
    expect(copiedText()).toContain(en.pwLateNoticeSubject.replace('{number}', 'INV-0042'))
    expect(copiedText()).toContain('Northwind Studio')
  })
})

describe('PriceCardPanel', () => {
  it('shows the rate engine baseline, floor and minimum project price', async () => {
    mountPersonalApi(scanResult(), priceCardResult())
    wrap(<PriceCardPanel />)
    expect(await screen.findByText(`${money(50.09)}/h`)).toBeInTheDocument()
    expect(screen.getByText(`${money(37.57)}/h`)).toBeInTheDocument()
    expect(screen.getByText(money(500))).toBeInTheDocument()
  })

  it('prices the same service list across the three tiers', async () => {
    mountPersonalApi(scanResult(), priceCardResult())
    wrap(<PriceCardPanel />)
    expect(await screen.findByText(en.pwPriceTierStandard)).toBeInTheDocument()
    expect(screen.getByText(en.pwPriceTierRetainer)).toBeInTheDocument()
    expect(screen.getByText(en.pwPriceTierRush)).toBeInTheDocument()
    // Each tier shows its total twice: once on the line, once on the total row.
    expect(screen.getAllByText(money(1001.8))).toHaveLength(2)
    expect(screen.getAllByText(money(901.62))).toHaveLength(2)
    expect(screen.getAllByText(money(1252.25))).toHaveLength(2)
  })

  it('asks the handler for a card built from the entered service', async () => {
    mountPersonalApi(scanResult(), priceCardResult())
    wrap(<PriceCardPanel />)
    await waitFor(() => expect(window.api.personal.finance.priceCard).toHaveBeenCalledTimes(1))

    setField(en.pwPriceServiceName, 'Landing page')
    setField(en.pwPriceServiceHours, '20')

    await waitFor(() =>
      expect(lastCardPayload()).toEqual({
        services: [{ name: 'Landing page', hours: 20, price: 0 }],
        retainerDiscountPercent: 10,
        rushSurchargePercent: 25
      })
    )
  })

  it('sends the edited tier adjustments back to the handler', async () => {
    mountPersonalApi(scanResult(), priceCardResult())
    wrap(<PriceCardPanel />)
    setField(en.pwPriceServiceName, 'Audit')

    setField(en.pwPriceDiscount, '25')
    setField(en.pwPriceSurcharge, '40')

    await waitFor(() =>
      expect(lastCardPayload()).toEqual({
        services: [{ name: 'Audit', hours: 8, price: 0 }],
        retainerDiscountPercent: 25,
        rushSurchargePercent: 40
      })
    )
  })

  it('explains when a tier was raised to the minimum project price', async () => {
    const card = priceCardResult({
      tiers: [
        {
          id: 'standard',
          multiplier: 1,
          lines: [{ name: 'Audit', hours: 2, base: 100.18, price: 100.18 }],
          subtotal: 100.18,
          total: 500,
          floorApplied: true
        }
      ]
    })
    mountPersonalApi(scanResult(), card)
    wrap(<PriceCardPanel />)
    expect(
      await screen.findByText(en.pwPriceFloorNote.replace('{amount}', money(500)))
    ).toBeInTheDocument()
  })

  it('offers an empty state and no copy action until a service is named', async () => {
    mountPersonalApi(scanResult(), priceCardResult({ tiers: [] }))
    wrap(<PriceCardPanel />)
    expect(await screen.findByText(en.pwPriceCardEmpty)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(en.pwPriceCardCopy) })).toBeDisabled()
  })

  it('copies a plain-text card covering every tier total', async () => {
    mountPersonalApi(scanResult(), priceCardResult())
    wrap(<PriceCardPanel />)
    setField(en.pwPriceServiceName, 'Landing page')
    setField(en.pwPriceServiceHours, '20')

    const copyButton = screen.getByRole('button', { name: new RegExp(en.pwPriceCardCopy) })
    await waitFor(() => expect(copyButton).toBeEnabled())
    fireEvent.click(copyButton)

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1))
    expect(copiedText()).toContain('Landing page')
    expect(copiedText()).toContain(money(1001.8))
    expect(copiedText()).toContain(en.pwPriceTotal)
  })

  it('surfaces a handler error instead of pretending the card is empty', async () => {
    ;(window as unknown as { api: unknown }).api = {
      personal: {
        billing: { lateFeeScan: vi.fn() },
        finance: { priceCard: vi.fn().mockRejectedValue(new Error('Rate profile unavailable')) }
      }
    }
    wrap(<PriceCardPanel />)
    expect(await screen.findByText('Rate profile unavailable')).toBeInTheDocument()
  })
})
