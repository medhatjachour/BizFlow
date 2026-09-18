/**
 * The document studio and the renewal panel.
 *
 * Both screens sit between the operator and something irreversible — a document
 * that leaves the machine and an invoice that lands in a client's ledger — so
 * what is pinned here is the contract each one has with the main process:
 *
 *  1. the document dialog renders nothing until it has been pointed at an
 *     invoice, and every action that would send or print stays disabled until a
 *     document exists (a half-configured export must not be one click away);
 *  2. the label set the renderer sends is the app's own localized wording, so a
 *     document never falls back to the English defaults in `domain.ts`;
 *  3. the renewal panel previews with `dryRun` and applies the *same* options —
 *     the number shown on the button is the number that gets rolled — and it
 *     re-scans afterwards instead of trusting the optimistic result.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import { ToastProvider } from '../../../renderer/src/contexts/ToastContext'
import InvoiceDocumentModal from '../../../renderer/src/plugins/personal/pages/invoices/InvoiceDocumentModal'
import RenewalsPanel from '../../../renderer/src/plugins/personal/pages/finance/RenewalsPanel'
import { formatMoney, formatNumber } from '../../../renderer/src/plugins/personal/pages/utils'
import { translations } from '../../../renderer/src/i18n/translations'

const en = translations.en

const wrap = (ui: React.ReactElement) =>
  render(
    <LanguageProvider>
      <ToastProvider>{ui}</ToastProvider>
    </LanguageProvider>
  )

/** `FormInput` renders a bare `<label>`, so the control is reached from it. */
function fieldInput(label: string, index = 0): HTMLInputElement {
  const labelNode = screen.getAllByText(label)[index]
  const input = labelNode.parentElement?.querySelector('input')
  if (!input) throw new Error(`No input found for the field labelled "${label}"`)
  return input
}

const DOCUMENT = {
  fileName: 'INV-1.html',
  title: 'Invoice INV-1',
  html: '<!doctype html><html><body>Invoice</body></html>',
  markdown: '# Invoice INV-1',
  text: 'INVOICE INV-1'
}

/** `window.api` is installed by the shared setup as a writable property. */
function mountDocumentApi(document?: unknown) {
  const exportInvoice = vi.fn().mockResolvedValue(document ?? DOCUMENT)
  const exportStatement = vi.fn().mockResolvedValue({ ...DOCUMENT, fileName: 'Statement-ST-1.html' })
  ;(window as unknown as { api: unknown }).api = {
    personal: {
      billing: {
        getInvoiceById: vi.fn().mockResolvedValue({ id: 'inv-1', client: { id: 'cli-1' } }),
        exportInvoice,
        exportStatement
      }
    }
  }
  return { exportInvoice, exportStatement }
}

const lastCall = (fn: unknown) => vi.mocked(fn as never).mock.calls.at(-1)?.[0] as any

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('language', 'en')
  vi.clearAllMocks()
  // jsdom has no object URLs; the preview and the export both build on them.
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:preview'), writable: true, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true, configurable: true })
})

describe('InvoiceDocumentModal', () => {
  it('renders nothing and disables every way out until it is given an invoice', async () => {
    const { exportInvoice } = mountDocumentApi()
    wrap(<InvoiceDocumentModal isOpen invoiceId={null} onClose={vi.fn()} />)

    expect(await screen.findByText(en.pwDocNothing)).toBeInTheDocument()
    expect(screen.getByText(en.pwDocPreviewHint)).toBeInTheDocument()
    expect(exportInvoice).not.toHaveBeenCalled()
    for (const action of [en.pwDocCopyMarkdown, en.pwDocCopyText, en.pwDocDownloadMarkdown, en.pwDocDownloadHtml, en.pwDocPrint]) {
      expect(screen.getByRole('button', { name: action })).toBeDisabled()
    }
  })

  it('renders the invoice through the main process and enables the exports', async () => {
    const { exportInvoice } = mountDocumentApi()
    wrap(<InvoiceDocumentModal isOpen invoiceId="inv-1" onClose={vi.fn()} />)

    expect(await screen.findByTitle('Invoice INV-1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.pwDocPrint })).toBeEnabled()
    // The hint names the real artefact once the main process has produced one.
    expect(await screen.findByText(en.pwDocFileHint.replace('{file}', 'INV-1.html'))).toBeInTheDocument()
    expect(screen.queryByText(en.pwDocPreviewHint)).not.toBeInTheDocument()
    expect(lastCall(exportInvoice)).toMatchObject({ id: 'inv-1', direction: 'ltr' })
  })

  it('sends the app wording rather than the renderer defaults', async () => {
    const { exportInvoice } = mountDocumentApi()
    wrap(<InvoiceDocumentModal isOpen invoiceId="inv-1" onClose={vi.fn()} />)
    await screen.findByTitle('Invoice INV-1')

    const payload = lastCall(exportInvoice)
    expect(payload.labels.invoice).toBe(en.pwDocLabelInvoice)
    expect(payload.labels.total).toBe(en.pwDocLabelTotal)
    // Statuses and kinds are resolved to text before the document is built.
    expect(payload.statusLabels.partial).toBe(en.pwStatus_partial)
    expect(payload.kindLabels.retainer).toBe(en.pwKind_retainer)
  })

  it('switches to a statement for the invoice client, over the chosen range', async () => {
    const { exportStatement } = mountDocumentApi()
    wrap(<InvoiceDocumentModal isOpen invoiceId="inv-1" onClose={vi.fn()} />)
    await screen.findByTitle('Invoice INV-1')

    fireEvent.click(screen.getByRole('tab', { name: en.pwDocModeStatement }))

    await waitFor(() => expect(lastCall(exportStatement)).toMatchObject({ clientId: 'cli-1' }))
    expect(await screen.findByText(en.pwDocRangeTitle)).toBeInTheDocument()

    fireEvent.change(fieldInput(en.pwDocRangeFrom), { target: { value: '2026-01-01' } })
    await waitFor(() => expect(lastCall(exportStatement).from).toBe('2026-01-01'))

    fireEvent.change(fieldInput(en.pwDocRangeTo), { target: { value: '2026-03-31' } })
    await waitFor(() => expect(lastCall(exportStatement).to).toBe('2026-03-31'))
  })

  it('remembers the operator identity so it is only typed once', async () => {
    mountDocumentApi()
    wrap(<InvoiceDocumentModal isOpen invoiceId="inv-1" onClose={vi.fn()} />)

    fireEvent.change(fieldInput(en.pwDocIssuerName), { target: { value: 'Studio Nine' } })

    await waitFor(
      () =>
        expect(window.localStorage.getItem('personal:documentIssuer') ?? '').toContain('Studio Nine'),
      { timeout: 2000 }
    )
  })
})

/** A scan row shaped exactly like `personal:finance:retainers:renewalScan` returns. */
function scanRow(overrides: { plan?: Record<string, unknown> } & Record<string, unknown> = {}) {
  const { plan: planOverride, ...rest } = overrides
  const plan = {
    window: {
      periodStart: new Date(2026, 0, 1).toISOString(),
      periodEnd: new Date(2026, 1, 1).toISOString(),
      isDue: true,
      daysUntilReset: -4,
      periodsDue: 1
    },
    nextPeriodStart: new Date(2026, 1, 1).toISOString(),
    nextResetAt: new Date(2026, 2, 1).toISOString(),
    hoursUsed: 6,
    carriedHours: 4,
    forfeitedHours: 0,
    rolloverHours: 4,
    periodAmount: 1500,
    invoiceAmount: 1500,
    shouldInvoice: true,
    noteMarker: 'RETAINER-RENEWAL Acme SEO 2026-02-01',
    ...planOverride
  }
  return {
    retainerId: 'ret-1',
    name: 'Acme SEO',
    clientName: 'Acme LLC',
    currency: 'USD',
    ...rest,
    plan
  }
}

function scanResult(rows = [scanRow()], dueCount = 1) {
  return {
    asOf: new Date(2026, 1, 5).toISOString(),
    rows,
    dueCount,
    totalInvoiceAmount: 1500
  }
}

function mountRenewalApi(scan: unknown, roll?: unknown) {
  const renewalScan = vi.fn().mockResolvedValue(scan)
  // Mirrors the real handler: a dry run reports the same plan it would apply,
  // and only a committed run reports invoices as created.
  const rollRenewals = vi.fn(async (opts: { dryRun?: boolean; invoice?: boolean } = {}) => {
    if (roll) return roll
    const dryRun = opts.dryRun ?? false
    const wantsInvoice = opts.invoice ?? false
    return {
      asOf: new Date(2026, 2, 1).toISOString(),
      dryRun,
      rows: [
        {
          retainerId: 'ret-1',
          name: 'Acme SEO',
          clientName: 'Acme LLC',
          currency: 'USD',
          action: 'rolled',
          reason: wantsInvoice ? 'invoiced' : 'rolled',
          invoiceId: null,
          invoiced: !dryRun && wantsInvoice,
          wouldInvoice: wantsInvoice,
          plan: scanRow().plan
        }
      ],
      rolled: 1,
      invoicesCreated: !dryRun && wantsInvoice ? 1 : 0,
      totalInvoiceAmount: wantsInvoice ? 1500 : 0
    }
  })
  ;(window as unknown as { api: unknown }).api = {
    personal: { finance: { retainers: { renewalScan, rollRenewals } } }
  }
  return { renewalScan, rollRenewals }
}

describe('RenewalsPanel', () => {
  it('scans on mount and reports what has closed', async () => {
    const { renewalScan } = mountRenewalApi(scanResult())
    wrap(<RenewalsPanel />)

    expect(await screen.findByText('Acme SEO')).toBeInTheDocument()
    expect(renewalScan).toHaveBeenCalledTimes(1)
    expect(screen.getByText(en.pwRenewalKpiDueSub.replace('{due}', '1').replace('{total}', '1'))).toBeInTheDocument()
    expect(screen.getAllByText(formatMoney(1500, 'USD')).length).toBeGreaterThan(0)
    expect(screen.getByText(en.pwRenewalStateDue)).toBeInTheDocument()
  })

  it('shows a scheduled retainer without offering to roll it', async () => {
    const scheduled = scanRow({
      retainerId: 'ret-2',
      name: 'Studio nine',
      plan: {
        window: {
          periodStart: new Date(2026, 1, 1).toISOString(),
          periodEnd: new Date(2026, 2, 1).toISOString(),
          isDue: false,
          daysUntilReset: 24,
          periodsDue: 0
        }
      }
    })
    mountRenewalApi(scanResult([scheduled], 0))
    wrap(<RenewalsPanel />)

    expect(await screen.findByText('Studio nine')).toBeInTheDocument()
    expect(screen.getByText(en.pwRenewalStateScheduled)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.pwRenewalRoll })).toBeDisabled()
  })

  it('explains an empty scan instead of showing an empty table', async () => {
    mountRenewalApi(scanResult([], 0))
    wrap(<RenewalsPanel />)

    expect(await screen.findByText(en.pwRenewalEmpty)).toBeInTheDocument()
    expect(screen.queryByText(en.pwRenewalColRetainer)).not.toBeInTheDocument()
  })

  it('previews the roll with a dry run and the same options it will apply', async () => {
    const { rollRenewals } = mountRenewalApi(scanResult())
    wrap(<RenewalsPanel />)
    await screen.findByText('Acme SEO')

    fireEvent.click(screen.getByRole('button', { name: en.pwRenewalRoll }))

    // The preview is a real dry run, so the summary the operator reads is computed.
    await waitFor(() => expect(lastCall(rollRenewals)).toEqual({ dryRun: true, invoice: true }))
    expect(
      await screen.findByText(en.pwRenewalPreviewSummary.replace('{count}', '1').replace('{amount}', formatMoney(1500, 'USD')))
    ).toBeInTheDocument()
    expect(screen.getByText(en.pwRenewalReason_invoiced)).toBeInTheDocument()
  })

  it('re-previews when the invoice decision changes', async () => {
    const { rollRenewals } = mountRenewalApi(scanResult())
    wrap(<RenewalsPanel />)
    await screen.findByText('Acme SEO')
    fireEvent.click(screen.getByRole('button', { name: en.pwRenewalRoll }))
    await waitFor(() => expect(lastCall(rollRenewals)).toEqual({ dryRun: true, invoice: true }))

    fireEvent.click(screen.getByText(en.pwRenewalInvoiceNo))

    await waitFor(() => expect(lastCall(rollRenewals)).toEqual({ dryRun: true, invoice: false }))
  })

  it('applies the roll and re-scans rather than trusting the result', async () => {
    const { renewalScan, rollRenewals } = mountRenewalApi(scanResult())
    wrap(<RenewalsPanel />)
    await screen.findByText('Acme SEO')
    fireEvent.click(screen.getByRole('button', { name: en.pwRenewalRoll }))
    await waitFor(() => expect(lastCall(rollRenewals)).toEqual({ dryRun: true, invoice: true }))

    fireEvent.click(screen.getByRole('button', { name: en.pwRenewalApply }))

    await waitFor(() => expect(lastCall(rollRenewals)).toEqual({ invoice: true }))
    expect(await screen.findByText(new RegExp(en.pwRenewalDone))).toBeInTheDocument()
    await waitFor(() => expect(renewalScan).toHaveBeenCalledTimes(2))
  })

  it('surfaces a failed roll instead of closing as if it worked', async () => {
    const { renewalScan, rollRenewals } = mountRenewalApi(scanResult())
    wrap(<RenewalsPanel />)
    await screen.findByText('Acme SEO')
    fireEvent.click(screen.getByRole('button', { name: en.pwRenewalRoll }))
    await waitFor(() => expect(lastCall(rollRenewals)).toEqual({ dryRun: true, invoice: true }))

    rollRenewals.mockRejectedValueOnce(new Error('boom'))
    fireEvent.click(screen.getByRole('button', { name: en.pwRenewalApply }))

    expect(await screen.findByText(en.pwRenewalFailed)).toBeInTheDocument()
    // The dialog stays open so the operator can retry, and nothing was re-scanned.
    expect(screen.getByRole('button', { name: en.pwRenewalApply })).toBeInTheDocument()
    expect(renewalScan).toHaveBeenCalledTimes(1)
  })

  it('formats hours so a partial carry-over is visible', async () => {
    const partial = scanRow({
      plan: { hoursUsed: 6, carriedHours: 3.5, forfeitedHours: 0.5, rolloverHours: 3.5 }
    })
    mountRenewalApi(scanResult([partial], 1))
    wrap(<RenewalsPanel />)

    await screen.findByText('Acme SEO')
    // The carry-over shows up in the table and again in the KPI strip.
    expect(screen.getAllByText(`${formatNumber(3.5, 1)}h`).length).toBeGreaterThan(1)
    expect(screen.getByText(`${formatNumber(0.5, 1)}h`)).toBeInTheDocument()
  })
})
