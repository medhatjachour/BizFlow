import { useMemo, useState } from 'react'
import {
  Ban,
  CheckCircle2,
  DollarSign,
  FileText,
  Lock,
  Percent,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  Wallet
} from 'lucide-react'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import { useAuth } from '@renderer/contexts/AuthContext'
import StatCard from '../components/StatCard'
import SectionCard from '../components/SectionCard'
import EmptyState from '../components/EmptyState'
import BreakdownList from '../components/BreakdownList'
import type { BreakdownRow } from '../components/BreakdownList'
import Toolbar from '../components/Toolbar'
import FilterPresets from '../components/FilterPresets'
import PageHeader from '../components/PageHeader'
import MetricStrip from '../components/MetricStrip'
import StatusPill, { statusToneOf } from '../components/StatusPill'
import ListRow from '../components/ListRow'
import { FormSection, ModalFooter } from '../components/FormSection'
import { META_TEXT } from '../components/base'
import Button from '@renderer/components/ui/Button'
import Modal from '@renderer/components/ui/Modal'
import FormInput from '@renderer/components/ui/FormInput'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import ConfirmDialog from '@renderer/components/ui/ConfirmDialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@renderer/components/ui/Table'
import { useAsync, rowsOf, usePersonalConfig } from '../hooks/useAsync'
import { useFilterPresets } from '../hooks/useFilterPresets'
import LateFeePanel from './LateFeePanel'
import InvoiceDocumentModal from './InvoiceDocumentModal'
import {
  addDays,
  asSelectOptions,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  statusBadgeVariant,
  toDayKey
} from '../utils'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'MAD', 'EGP', 'CAD', 'AUD']

type Panel = 'invoices' | 'escrow' | 'vault' | 'late'

const PANEL_LABELS: Record<Panel, string> = {
  invoices: 'pwPanelInvoices',
  escrow: 'pwPanelEscrow',
  vault: 'pwPanelVault',
  late: 'pwPanelLate'
}

const PANEL_ORDER: Panel[] = ['invoices', 'escrow', 'vault', 'late']

type DiscountMode = 'percent' | 'amount'

/** The discount draft. Only `reason` and the resolved total are ever persisted. */
interface DiscountForm {
  id: string
  mode: DiscountMode
  value: string
  earlyPercent: string
  earlyDays: string
  reason: string
}

/** The slice of invoice-list state a saved view captures. */
type InvoiceView = { kind: string; status: string; client: string }

function emptyInvoice() {
  return {
    kind: 'milestone',
    clientId: '',
    projectId: '',
    currency: 'USD',
    amount: '',
    taxRate: '0',
    issuedAt: toDayKey(new Date()),
    dueAt: '',
    notes: ''
  }
}

function emptyPayment(invoice: any) {
  return {
    invoiceId: invoice?.id ?? '',
    amount: String(invoice?.balance ?? invoice?.totalDue ?? ''),
    paidAt: toDayKey(new Date()),
    method: 'bank',
    reference: '',
    isDeposit: invoice?.kind === 'deposit',
    note: ''
  }
}

export default function InvoicesTab() {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const { can } = useAuth()
  const config = usePersonalConfig()

  const canDiscount = can('personal_discount')
  const canRefund = can('personal_refund')
  const canVoid = can('personal_void_sale')
  const canWriteOff = can('personal_write_off')

  const [panel, setPanel] = useState<Panel>('invoices')
  const [range, setRange] = useState(90)
  const [statusFilter, setStatusFilter] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const views = useFilterPresets<InvoiceView>('invoices')

  const [invoiceForm, setInvoiceForm] = useState<any | null>(null)
  const [paymentForm, setPaymentForm] = useState<any | null>(null)
  const [discountForm, setDiscountForm] = useState<DiscountForm | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; action: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [vaultForm, setVaultForm] = useState<any | null>(null)

  const from = useMemo(() => toDayKey(addDays(new Date(), -range)), [range])

  const currentView = useMemo<InvoiceView>(
    () => ({ kind: kindFilter, status: statusFilter, client: clientFilter }),
    [kindFilter, statusFilter, clientFilter]
  )

  const applyView = (filters: InvoiceView) => {
    setKindFilter(filters.kind)
    setStatusFilter(filters.status)
    setClientFilter(filters.client)
  }

  const invoices = useAsync<any>(
    () =>
      window.api.personal.billing.getInvoices({
        status: statusFilter || undefined,
        kind: kindFilter || undefined,
        clientId: clientFilter || undefined,
        pageSize: 200
      }),
    [statusFilter, kindFilter, clientFilter]
  )
  const summary = useAsync<any>(() => window.api.personal.billing.getSummary({ from }), [from])
  const escrow = useAsync<any>(() => window.api.personal.billing.getEscrow(), [])
  const detail = useAsync<any>(
    () => (detailId ? window.api.personal.billing.getInvoiceById(detailId) : Promise.resolve(null)),
    [detailId]
  )
  const vault = useAsync<any[]>(() => window.api.personal.billing.taxVault.getAll(), [])
  const vaultSummary = useAsync<any>(() => window.api.personal.billing.taxVault.getSummary(), [])
  const clients = useAsync<any>(() => window.api.personal.clients.getAll({ pageSize: 200 }), [])
  const projects = useAsync<any>(() => window.api.personal.projects.getAll({ pageSize: 200 }), [])

  // The discount modal previews against the stored invoice, so the maths never
  // lives in two places. `daysToPay` is pinned to the window: typing an
  // early-payment percentage means "apply it", not "hope the client qualifies".
  const discountPreview = useAsync<any>(
    () =>
      discountForm
        ? window.api.personal.billing.discountPreview({
            id: discountForm.id,
            input: {
              percentOff: discountForm.mode === 'percent' ? Number(discountForm.value || 0) : 0,
              amountOff: discountForm.mode === 'amount' ? Number(discountForm.value || 0) : 0,
              earlyPaymentPercent: Number(discountForm.earlyPercent || 0),
              earlyPaymentDays: Number(discountForm.earlyDays || 0),
              daysToPay: Number(discountForm.earlyDays || 0)
            }
          })
        : Promise.resolve(null),
    [
      discountForm?.id,
      discountForm?.mode,
      discountForm?.value,
      discountForm?.earlyPercent,
      discountForm?.earlyDays
    ]
  )

  const rows = useMemo(() => rowsOf<any>(invoices.data), [invoices.data])
  const vaultRows = useMemo(() => rowsOf<any>(vault.data), [vault.data])
  const clientOptions = useMemo(
    () => [
      { value: '', label: t('pwAllClients') },
      ...rowsOf<any>(clients.data).map((client) => ({ value: client.id, label: client.name }))
    ],
    [clients.data, t]
  )
  const projectOptions = useMemo(
    () => [
      { value: '', label: t('pwNoProject') },
      ...rowsOf<any>(projects.data).map((project) => ({
        value: project.id,
        label: `${project.code} · ${project.title}`
      }))
    ],
    [projects.data, t]
  )

  const money = (value: number) => formatMoney(value, summary.data?.currency ?? 'USD')

  const refreshAll = () => {
    invoices.reload()
    summary.reload()
    escrow.reload()
    detail.reload()
  }

  const saveInvoice = async () => {
    if (!invoiceForm) return
    setBusy(true)
    try {
      const payload = {
        kind: invoiceForm.kind,
        clientId: invoiceForm.clientId || null,
        projectId: invoiceForm.projectId || null,
        currency: invoiceForm.currency,
        amount: Number(invoiceForm.amount || 0),
        taxRate: Number(invoiceForm.taxRate || 0),
        issuedAt: invoiceForm.issuedAt || undefined,
        dueAt: invoiceForm.dueAt || undefined,
        notes: invoiceForm.notes || null
      }
      if (invoiceForm.id) {
        await window.api.personal.billing.updateInvoice({ id: invoiceForm.id, ...payload })
        toast.success(t('pwInvoiceUpdated'))
      } else {
        await window.api.personal.billing.createInvoice(payload)
        toast.success(t('pwInvoiceCreated'))
      }
      setInvoiceForm(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const savePayment = async () => {
    if (!paymentForm) return
    if (!Number(paymentForm.amount)) {
      toast.warning(t('pwAmountRequired'))
      return
    }
    setBusy(true)
    try {
      await window.api.personal.billing.recordPayment({
        invoiceId: paymentForm.invoiceId,
        amount: Number(paymentForm.amount),
        paidAt: paymentForm.paidAt || undefined,
        method: paymentForm.method,
        reference: paymentForm.reference || null,
        isDeposit: paymentForm.isDeposit,
        note: paymentForm.note || null
      })
      toast.success(t('pwPaymentRecorded'))
      setPaymentForm(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const saveDiscount = async () => {
    if (!discountForm) return
    const total = discountPreview.data?.breakdown?.totalDiscount
    if (typeof total !== 'number') return
    setBusy(true)
    try {
      await window.api.personal.billing.applyDiscount({
        id: discountForm.id,
        discount: total,
        reason: discountForm.reason || undefined
      })
      toast.success(t('pwDiscountApplied'))
      setDiscountForm(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  /** Line-by-line account of what the draft discount would do to the invoice. */
  const discountRows = useMemo<BreakdownRow[]>(() => {
    const preview = discountPreview.data
    if (!preview) return []
    const currency = preview.currency ?? 'USD'
    const row: BreakdownRow[] = [
      { label: t('pwDiscountBase'), value: formatMoney(preview.amount, currency) }
    ]
    const breakdown = preview.breakdown ?? {}
    if (breakdown.percentOffAmount > 0) {
      row.push({
        label: t('pwDiscountPercent'),
        hint: formatPercent(Number(discountForm?.value || 0)),
        value: `−${formatMoney(breakdown.percentOffAmount, currency)}`,
        tone: 'negative'
      })
    }
    if (breakdown.earlyPaymentAmount > 0) {
      row.push({
        label: t('pwDiscountEarlyPercent'),
        hint: formatPercent(Number(discountForm?.earlyPercent || 0)),
        value: `−${formatMoney(breakdown.earlyPaymentAmount, currency)}`,
        tone: 'negative'
      })
    }
    if (breakdown.amountOffAmount > 0) {
      row.push({
        label: t('pwDiscountKindAmount'),
        value: `−${formatMoney(breakdown.amountOffAmount, currency)}`,
        tone: 'negative'
      })
    }
    if (breakdown.totalDiscount > 0) {
      row.push({
        label: t('pwDiscount'),
        value: `−${formatMoney(breakdown.totalDiscount, currency)}`,
        tone: 'negative'
      })
    }
    row.push({
      label: t('pwDiscountNet'),
      value: formatMoney(preview.totalsAfter?.net ?? 0, currency)
    })
    if (Number(preview.taxRate ?? 0) > 0) {
      row.push({
        label: t('pwDiscountTax'),
        hint: formatPercent(Number(preview.taxRate)),
        value: formatMoney(preview.totalsAfter?.tax ?? 0, currency)
      })
    }
    row.push({
      label: t('pwDiscountTotal'),
      value: formatMoney(preview.totalsAfter?.total ?? 0, currency),
      tone: 'total'
    })
    if (Number(preview.paid ?? 0) > 0) {
      row.push({
        label: t('pwDiscountPaid'),
        value: formatMoney(preview.paid, currency),
        tone: 'muted'
      })
    }
    row.push({
      label: t('pwDiscountBalance'),
      value: formatMoney(preview.totalsAfter?.balance ?? 0, currency),
      tone: preview.overpaid ? 'negative' : 'accent'
    })
    return row
  }, [discountPreview.data, discountForm?.value, discountForm?.earlyPercent, t])

  const saveVault = async () => {
    if (!vaultForm) return
    setBusy(true)
    try {
      await window.api.personal.billing.taxVault.reserve({
        sourceType: 'manual',
        amount: Number(vaultForm.amount || 0),
        rate: Number(vaultForm.rate || 0),
        reservedAt: vaultForm.reservedAt || undefined,
        note: vaultForm.note || null
      })
      toast.success(t('pwVaultSaved'))
      setVaultForm(null)
      vault.reload()
      vaultSummary.reload()
      summary.reload()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const markSent = async (id: string) => {
    try {
      await window.api.personal.billing.markStatus({ id, status: 'sent' })
      toast.success(t('pwInvoiceSent'))
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    }
  }

  const runConfirmed = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.action === 'delete') {
        await window.api.personal.billing.deleteInvoice(confirm.id)
        toast.success(t('pwInvoiceDeleted'))
      } else if (confirm.action === 'void') {
        await window.api.personal.billing.voidInvoice({ id: confirm.id })
        toast.success(t('pwInvoiceVoided'))
      } else if (confirm.action === 'writeOff') {
        await window.api.personal.billing.writeOff({ id: confirm.id })
        toast.success(t('pwInvoiceWrittenOff'))
      }
      setConfirm(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const removePayment = async (id: string) => {
    try {
      await window.api.personal.billing.deletePayment(id)
      toast.success(t('pwPaymentDeleted'))
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    }
  }

  const refundPayment = async (payment: any) => {
    try {
      await window.api.personal.billing.refundPayment({ id: payment.id })
      toast.success(t('pwPaymentRefunded'))
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    }
  }

  const releaseVault = async (id: string) => {
    try {
      await window.api.personal.billing.taxVault.release({ id })
      toast.success(t('pwVaultReleased'))
      vault.reload()
      vaultSummary.reload()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    }
  }

  const deleteVault = async (id: string) => {
    try {
      await window.api.personal.billing.taxVault.delete(id)
      toast.success(t('pwVaultDeleted'))
      vault.reload()
      vaultSummary.reload()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    }
  }

  const detailInvoice = detail.data
  const escrowLines: any[] = escrow.data?.depositLines ?? []
  const escrowByProject: any[] = escrow.data?.byProject ?? []

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        title={t('pwTabInvoices')}
        description={t('pwInvoicesHint')}
        icon={<Receipt className="h-4 w-4" />}
        actions={
          <>
            <Button
              size="xs"
              variant="secondary"
              aria-label={t('pwRefresh')}
              title={t('pwRefresh')}
              onClick={() => invoices.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const result = await window.api.personal.billing.recomputeOverdue()
                toast.success(`${t('pwOverdueRecalculated')}: ${result?.updated ?? 0}`)
                refreshAll()
              }}
            >
              {t('pwRecomputeOverdue')}
            </Button>
            <Button size="sm" variant="primary" onClick={() => setInvoiceForm(emptyInvoice())}>
              <Plus className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwAddInvoice')}</span>
            </Button>
          </>
        }
      />

      <KpiSection sectionKey="personal:invoices-KpiStrip" label={t('pwTabInvoices')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiCollected')}
            value={money(summary.data?.collected ?? 0)}
            sub={`${t('pwBilled')}: ${money(summary.data?.billed ?? 0)}`}
            icon={<DollarSign className="h-4 w-4" />}
            tone="success"
          />
          <StatCard
            label={t('pwKpiOutstanding')}
            value={money(summary.data?.outstanding ?? 0)}
            sub={`${formatNumber(summary.data?.invoiceCount ?? 0)} ${t('pwInvoicesShort')}`}
            icon={<Receipt className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiOverdue')}
            value={money(summary.data?.overdue ?? 0)}
            sub={`${formatNumber(summary.data?.overdueCount ?? 0)} ${t('pwOverdue')}`}
            icon={<Ban className="h-4 w-4" />}
            tone={(summary.data?.overdue ?? 0) > 0 ? 'danger' : 'default'}
          />
          <StatCard
            label={t('pwKpiUnearned')}
            value={money(escrow.data?.unearnedRetainedCash ?? 0)}
            sub={`${t('pwRealized')}: ${money(escrow.data?.realizedIncome ?? 0)}`}
            icon={<Lock className="h-4 w-4" />}
            tone="warning"
          />
        </MetricStrip>
      </KpiSection>

      <Toolbar>
        <div
          role="tablist"
          aria-label={t('pwTabInvoices')}
          className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60"
        >
          {PANEL_ORDER.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={panel === value}
              onClick={() => setPanel(value)}
              className={`inline-flex h-6 items-center rounded-md px-2.5 text-xs font-semibold transition-colors ${
                panel === value
                  ? 'bg-[color:var(--accent)] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t(PANEL_LABELS[value])}
            </button>
          ))}
        </div>
        <div className="w-40">
          <CustomSelect
            size="sm"
            value={String(range)}
            onChange={(value) => setRange(Number(value))}
            options={[
              { value: '30', label: t('pwLast30') },
              { value: '90', label: t('pwLast90') },
              { value: '365', label: t('pwLast365') }
            ]}
          />
        </div>
      </Toolbar>

      {panel === 'invoices' && (
        <SectionCard
          title={t('pwInvoicesTitle')}
          description={t('pwInvoicesHint')}
          padded={false}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <CustomSelect
                size="sm"
                className="min-w-[9rem]"
                value={kindFilter}
                onChange={(value) => setKindFilter(String(value))}
                placeholder={t('pwAllKinds')}
                options={asSelectOptions(config.data?.invoiceKinds, language)}
              />
              <CustomSelect
                size="sm"
                className="min-w-[9rem]"
                value={statusFilter}
                onChange={(value) => setStatusFilter(String(value))}
                placeholder={t('pwAllStatuses')}
                options={asSelectOptions(config.data?.invoiceStatuses, language)}
              />
              <CustomSelect
                size="sm"
                className="min-w-[9rem]"
                value={clientFilter}
                onChange={(value) => setClientFilter(String(value))}
                options={clientOptions}
              />
              <FilterPresets
                presets={views.presets}
                current={currentView}
                onApply={applyView}
                onSave={(name) => views.save(name, currentView)}
                onRemove={views.remove}
              />
            </div>
          }
        >
          {invoices.loading ? (
            <EmptyState loading />
          ) : rows.length === 0 ? (
            <EmptyState message={t('pwNoInvoices')} icon={<Receipt className="h-5 w-5" />} />
          ) : (
            <Table dense>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pwNumber')}</TableHead>
                  <TableHead>{t('pwClient')}</TableHead>
                  <TableHead>{t('pwProject')}</TableHead>
                  <TableHead>{t('pwKind')}</TableHead>
                  <TableHead>{t('pwDueDate')}</TableHead>
                  <TableHead>{t('pwTotalDue')}</TableHead>
                  <TableHead>{t('pwPaid')}</TableHead>
                  <TableHead>{t('pwBalance')}</TableHead>
                  <TableHead>{t('pwStatus')}</TableHead>
                  <TableHead>{t('pwColActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="whitespace-nowrap font-semibold">
                      {invoice.number}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {invoice.client?.name ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-slate-600 dark:text-slate-300">
                      {invoice.project ? `${invoice.project.code} · ${invoice.project.title}` : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone="neutral" dot={false}>
                        {t(`pwKind_${invoice.kind}`)}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {invoice.dueAt ? (
                        <span
                          className={
                            invoice.isOverdue
                              ? 'font-semibold text-rose-600 dark:text-rose-400'
                              : ''
                          }
                        >
                          {formatDate(invoice.dueAt)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(invoice.totalDue, invoice.currency)}
                    </TableCell>
                    <TableCell className="tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMoney(invoice.paid, invoice.currency)}
                    </TableCell>
                    <TableCell className="tabular-nums font-semibold">
                      {formatMoney(invoice.balance, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        tone={
                          invoice.isOverdue
                            ? 'danger'
                            : statusToneOf(statusBadgeVariant(invoice.status))
                        }
                      >
                        {t(`pwStatus_${invoice.status}`)}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="xs"
                          variant="secondary"
                          aria-label={t('pwDocOpen')}
                          title={t('pwDocOpen')}
                          onClick={() => setDocumentId(invoice.id)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => setDetailId(invoice.id)}
                        >
                          {t('pwView')}
                        </Button>
                        <Button
                          size="xs"
                          variant="success"
                          onClick={() => setPaymentForm(emptyPayment(invoice))}
                          disabled={invoice.status === 'void'}
                        >
                          {t('pwRecordPayment')}
                        </Button>
                        {invoice.status === 'draft' && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => markSent(invoice.id)}
                          >
                            {t('pwMarkSent')}
                          </Button>
                        )}
                        <Button
                          size="xs"
                          variant="danger"
                          aria-label={t('pwDelete')}
                          title={t('pwDelete')}
                          onClick={() => setConfirm({ id: invoice.id, action: 'delete' })}
                          disabled={invoice.paid > 0}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      )}

      {panel === 'escrow' && (
        <div className="space-y-4">
          <MetricStrip size="four">
            <StatCard
              label={t('pwCashReceived')}
              value={money(escrow.data?.cashReceived ?? 0)}
              icon={<Wallet className="h-4 w-4" />}
            />
            <StatCard
              label={t('pwRealized')}
              value={money(escrow.data?.realizedIncome ?? 0)}
              tone="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <StatCard
              label={t('pwUnearned')}
              value={money(escrow.data?.unearnedRetainedCash ?? 0)}
              tone="warning"
              icon={<Lock className="h-4 w-4" />}
            />
            <StatCard
              label={t('pwTaxVaultBalance')}
              value={money(vaultSummary.data?.balance ?? 0)}
              sub={formatPercent(summary.data?.taxReservePercent ?? 0)}
              icon={<Percent className="h-4 w-4" />}
            />
          </MetricStrip>

          <SectionCard
            title={t('pwDepositExposure')}
            description={t('pwDepositExposureHint')}
            icon={<Lock className="h-3.5 w-3.5" />}
            padded={false}
          >
            {escrowLines.length === 0 ? (
              <EmptyState message={t('pwNoEscrow')} icon={<Lock className="h-5 w-5" />} />
            ) : (
              <Table dense>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pwNumber')}</TableHead>
                    <TableHead>{t('pwKind')}</TableHead>
                    <TableHead>{t('pwAmount')}</TableHead>
                    <TableHead>{t('pwPaid')}</TableHead>
                    <TableHead>{t('pwEarned')}</TableHead>
                    <TableHead>{t('pwUnearned')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escrowLines.map((line) => (
                    <TableRow key={line.invoiceId}>
                      <TableCell className="font-semibold">{line.number}</TableCell>
                      <TableCell>
                        <StatusPill tone="neutral" dot={false}>
                          {t(`pwKind_${line.kind}`)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="tabular-nums">{money(line.amount)}</TableCell>
                      <TableCell className="tabular-nums">{money(line.paid)}</TableCell>
                      <TableCell className="tabular-nums text-emerald-600 dark:text-emerald-400">
                        {money(line.earned)}
                      </TableCell>
                      <TableCell className="tabular-nums text-amber-600 dark:text-amber-400">
                        {money(line.unearned)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          <SectionCard
            title={t('pwUnearnedByProject')}
            description={t('pwUnearnedByProjectHint')}
            icon={<Wallet className="h-3.5 w-3.5" />}
          >
            {escrowByProject.length === 0 ? (
              <EmptyState message={t('pwNoEscrow')} icon={<Lock className="h-5 w-5" />} />
            ) : (
              <ul className="space-y-1.5">
                {escrowByProject.map((row) => (
                  <ListRow
                    key={row.projectId}
                    variant="plain"
                    title={row.code ? `${row.code} · ${row.title}` : row.title}
                    subtitle={
                      <>
                        {t('pwCashReceived')}:{' '}
                        <span className="tabular-nums">{money(row.cash)}</span>
                      </>
                    }
                    trailing={
                      <StatusPill tone={row.unearned > 0 ? 'warning' : 'success'}>
                        {t('pwUnearned')}: {money(row.unearned)}
                      </StatusPill>
                    }
                  />
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {panel === 'vault' && (
        <div className="space-y-4">
          <MetricStrip size="four">
            <StatCard
              label={t('pwTaxVaultBalance')}
              value={money(vaultSummary.data?.balance ?? 0)}
              icon={<Lock className="h-4 w-4" />}
              tone="warning"
            />
            <StatCard
              label={t('pwVaultReserved')}
              value={money(vaultSummary.data?.reservedTotal ?? 0)}
            />
            <StatCard
              label={t('pwVaultReleased')}
              value={money(vaultSummary.data?.releasedTotal ?? 0)}
            />
            <StatCard
              label={t('pwVaultEntries')}
              value={formatNumber(vaultSummary.data?.entries ?? 0)}
            />
          </MetricStrip>

          <SectionCard
            title={t('pwTaxVault')}
            description={t('pwTaxVaultHint')}
            icon={<Percent className="h-3.5 w-3.5" />}
            padded={false}
            actions={
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  setVaultForm({
                    amount: '',
                    rate: summary.data?.taxReservePercent ?? 25,
                    reservedAt: toDayKey(new Date()),
                    note: ''
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwReserveTax')}</span>
              </Button>
            }
          >
            {vaultRows.length === 0 ? (
              <EmptyState message={t('pwNoVaultEntries')} icon={<Lock className="h-5 w-5" />} />
            ) : (
              <Table dense>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pwReservedAt')}</TableHead>
                    <TableHead>{t('pwSource')}</TableHead>
                    <TableHead>{t('pwAmount')}</TableHead>
                    <TableHead>{t('pwRate')}</TableHead>
                    <TableHead>{t('pwNote')}</TableHead>
                    <TableHead>{t('pwColActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaultRows.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDate(entry.reservedAt)}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={entry.releasedAt ? 'neutral' : 'accent'} dot={false}>
                          {entry.releasedAt
                            ? t('pwVaultReleased')
                            : t(`pwSource_${entry.sourceType}`)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {money(entry.amount)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatPercent(entry.rate ?? 0)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-slate-600 dark:text-slate-300">
                        {entry.note ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {!entry.releasedAt && (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => releaseVault(entry.id)}
                            >
                              {t('pwRelease')}
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="danger"
                            aria-label={t('pwDelete')}
                            title={t('pwDelete')}
                            onClick={() => deleteVault(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </div>
      )}

      {panel === 'late' && <LateFeePanel />}

      <Modal
        dense
        isOpen={Boolean(invoiceForm)}
        onClose={() => setInvoiceForm(null)}
        title={invoiceForm?.id ? t('pwEditInvoice') : t('pwAddInvoice')}
        size="lg"
      >
        {invoiceForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwKind')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={invoiceForm.kind}
                    onChange={(value) => setInvoiceForm({ ...invoiceForm, kind: String(value) })}
                    options={asSelectOptions(config.data?.invoiceKinds, language)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwCurrency')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={invoiceForm.currency}
                    onChange={(value) =>
                      setInvoiceForm({ ...invoiceForm, currency: String(value) })
                    }
                    options={CURRENCIES.map((code) => ({ value: code, label: code }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwClient')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={invoiceForm.clientId}
                    onChange={(value) =>
                      setInvoiceForm({ ...invoiceForm, clientId: String(value) })
                    }
                    options={clientOptions.filter((option) => option.value !== '')}
                    placeholder={t('pwNoClient')}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwProject')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={invoiceForm.projectId}
                    onChange={(value) =>
                      setInvoiceForm({ ...invoiceForm, projectId: String(value) })
                    }
                    options={projectOptions.filter((option) => option.value !== '')}
                    placeholder={t('pwNoProject')}
                  />
                </label>
              </div>
            </FormSection>

            <FormSection title={t('pwFormAmounts')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwAmount')}
                  type="number"
                  value={invoiceForm.amount}
                  onChange={(value) => setInvoiceForm({ ...invoiceForm, amount: value })}
                  helperText={t('pwAmountAutoHint')}
                />
                <FormInput
                  size="sm"
                  label={t('pwTaxRate')}
                  type="number"
                  value={invoiceForm.taxRate}
                  onChange={(value) => setInvoiceForm({ ...invoiceForm, taxRate: value })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormSchedule')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwIssuedAt')}
                  type="date"
                  value={invoiceForm.issuedAt}
                  onChange={(value) => setInvoiceForm({ ...invoiceForm, issuedAt: value })}
                />
                <FormInput
                  size="sm"
                  label={t('pwDueDate')}
                  type="date"
                  value={invoiceForm.dueAt}
                  onChange={(value) => setInvoiceForm({ ...invoiceForm, dueAt: value })}
                  helperText={t('pwDueDateHint')}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwNotes')}>
              <FormInput
                size="sm"
                label={t('pwNotes')}
                value={invoiceForm.notes}
                onChange={(value) => setInvoiceForm({ ...invoiceForm, notes: value })}
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setInvoiceForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={saveInvoice} loading={busy}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(paymentForm)}
        onClose={() => setPaymentForm(null)}
        title={t('pwRecordPayment')}
      >
        {paymentForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormAmounts')}>
              <FormInput
                size="sm"
                label={t('pwAmount')}
                type="number"
                value={paymentForm.amount}
                onChange={(value) => setPaymentForm({ ...paymentForm, amount: value })}
                required
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwPaidAt')}
                  type="date"
                  value={paymentForm.paidAt}
                  onChange={(value) => setPaymentForm({ ...paymentForm, paidAt: value })}
                />
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwMethod')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={paymentForm.method}
                    onChange={(value) => setPaymentForm({ ...paymentForm, method: String(value) })}
                    options={['bank', 'card', 'cash', 'paypal', 'wise', 'other'].map((code) => ({
                      value: code,
                      label: t(`pwMethod_${code}`)
                    }))}
                  />
                </label>
              </div>
              <FormInput
                size="sm"
                label={t('pwReference')}
                value={paymentForm.reference}
                onChange={(value) => setPaymentForm({ ...paymentForm, reference: value })}
              />
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <label className="inline-flex h-7 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={paymentForm.isDeposit}
                  onChange={(event) =>
                    setPaymentForm({ ...paymentForm, isDeposit: event.target.checked })
                  }
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
                {t('pwIsDeposit')}
              </label>
              <FormInput
                size="sm"
                label={t('pwNote')}
                value={paymentForm.note}
                onChange={(value) => setPaymentForm({ ...paymentForm, note: value })}
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setPaymentForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="success" onClick={savePayment} loading={busy}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(discountForm)}
        onClose={() => setDiscountForm(null)}
        title={t('pwApplyDiscount')}
        size="lg"
      >
        {discountForm && (
          <div className="space-y-4">
            <FormSection title={t('pwDiscountKind')}>
              <div
                role="group"
                aria-label={t('pwDiscountKind')}
                className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60"
              >
                {(['percent', 'amount'] as DiscountMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={discountForm.mode === mode}
                    onClick={() => setDiscountForm({ ...discountForm, mode, value: '' })}
                    className={`inline-flex h-6 items-center rounded-md px-2.5 text-xs font-semibold transition-colors ${
                      discountForm.mode === mode
                        ? 'bg-[color:var(--accent)] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {mode === 'percent' ? t('pwDiscountKindPercent') : t('pwDiscountKindAmount')}
                  </button>
                ))}
              </div>
            </FormSection>

            <FormSection title={t('pwFormAmounts')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={discountForm.mode === 'percent' ? t('pwDiscountPercent') : t('pwAmount')}
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountForm.value}
                  onChange={(value) => setDiscountForm({ ...discountForm, value })}
                />
                <FormInput
                  size="sm"
                  label={t('pwReason')}
                  value={discountForm.reason}
                  onChange={(value) => setDiscountForm({ ...discountForm, reason: value })}
                  helperText={t('pwDiscountReasonHint')}
                />
                <FormInput
                  size="sm"
                  label={t('pwDiscountEarlyPercent')}
                  type="number"
                  min={0}
                  step="0.5"
                  value={discountForm.earlyPercent}
                  onChange={(value) => setDiscountForm({ ...discountForm, earlyPercent: value })}
                  helperText={t('pwDiscountEarlyHint')}
                />
                <FormInput
                  size="sm"
                  label={t('pwDiscountEarlyDays')}
                  type="number"
                  min={1}
                  value={discountForm.earlyDays}
                  onChange={(value) => setDiscountForm({ ...discountForm, earlyDays: value })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwDiscountPreview')}>
              {discountPreview.error ? (
                <p className="text-xs text-red-600 dark:text-red-400">{discountPreview.error}</p>
              ) : discountRows.length === 0 ? (
                discountPreview.loading ? (
                  <EmptyState loading loadingShape="lines" />
                ) : (
                  <BreakdownList
                    rows={[{ label: t('pwDiscountPreviewEmpty'), value: '—', tone: 'muted' }]}
                  />
                )
              ) : (
                <BreakdownList rows={discountRows} />
              )}
              {discountPreview.data?.overpaid && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                  {t('pwDiscountOverpaid')}
                </p>
              )}
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setDiscountForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={saveDiscount}
                loading={busy}
                disabled={discountRows.length === 0 || Boolean(discountPreview.data?.overpaid)}
              >
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(vaultForm)}
        onClose={() => setVaultForm(null)}
        title={t('pwReserveTax')}
      >
        {vaultForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormAmounts')}>
              <FormInput
                size="sm"
                label={t('pwAmount')}
                type="number"
                value={vaultForm.amount}
                onChange={(value) => setVaultForm({ ...vaultForm, amount: value })}
                required
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwRate')}
                  type="number"
                  value={vaultForm.rate}
                  onChange={(value) => setVaultForm({ ...vaultForm, rate: value })}
                />
                <FormInput
                  size="sm"
                  label={t('pwReservedAt')}
                  type="date"
                  value={vaultForm.reservedAt}
                  onChange={(value) => setVaultForm({ ...vaultForm, reservedAt: value })}
                />
              </div>
              <FormInput
                size="sm"
                label={t('pwNote')}
                value={vaultForm.note}
                onChange={(value) => setVaultForm({ ...vaultForm, note: value })}
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setVaultForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={saveVault} loading={busy}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={
          detailInvoice
            ? `${detailInvoice.number} · ${detailInvoice.client?.name ?? '—'}`
            : t('pwInvoicesTitle')
        }
        size="xl"
      >
        {!detailInvoice ? (
          <EmptyState loading={detail.loading} message={t('pwNoInvoices')} />
        ) : (
          <div className="space-y-4">
            <MetricStrip size="four">
              <StatCard
                label={t('pwTotalDue')}
                value={formatMoney(detailInvoice.totalDue, detailInvoice.currency)}
              />
              <StatCard
                label={t('pwPaid')}
                value={formatMoney(detailInvoice.paid, detailInvoice.currency)}
                tone="success"
              />
              <StatCard
                label={t('pwBalance')}
                value={formatMoney(detailInvoice.balance, detailInvoice.currency)}
                tone={detailInvoice.balance > 0 ? 'warning' : 'default'}
              />
              <StatCard
                label={t('pwStatus')}
                value={t(`pwStatus_${detailInvoice.status}`)}
                sub={`${t('pwTaxRate')}: ${formatPercent(detailInvoice.taxRate ?? 0)}`}
              />
            </MetricStrip>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPaymentForm(emptyPayment(detailInvoice))}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwRecordPayment')}</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setInvoiceForm({
                    id: detailInvoice.id,
                    kind: detailInvoice.kind,
                    clientId: detailInvoice.clientId ?? '',
                    projectId: detailInvoice.projectId ?? '',
                    currency: detailInvoice.currency,
                    amount: String(detailInvoice.amount ?? ''),
                    taxRate: String(detailInvoice.taxRate ?? 0),
                    issuedAt: toDayKey(detailInvoice.issuedAt),
                    dueAt: detailInvoice.dueAt ? toDayKey(detailInvoice.dueAt) : '',
                    notes: detailInvoice.notes ?? ''
                  })
                  setDetailId(null)
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwEditInvoice')}</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDocumentId(detailInvoice.id)
                  setDetailId(null)
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwDocOpen')}</span>
              </Button>
              {detailInvoice.status === 'draft' && (
                <Button size="sm" variant="secondary" onClick={() => markSent(detailInvoice.id)}>
                  {t('pwMarkSent')}
                </Button>
              )}
              {canDiscount && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setDiscountForm({
                      id: detailInvoice.id,
                      mode: 'percent',
                      value: '',
                      earlyPercent: '',
                      earlyDays: '7',
                      reason: ''
                    })
                  }
                >
                  <Percent className="h-3.5 w-3.5" />
                  <span className="ms-1.5">{t('pwApplyDiscount')}</span>
                </Button>
              )}
              {canVoid && detailInvoice.status !== 'void' && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setConfirm({ id: detailInvoice.id, action: 'void' })
                    setDetailId(null)
                  }}
                >
                  {t('pwVoid')}
                </Button>
              )}
              {canWriteOff && detailInvoice.status !== 'void' && detailInvoice.paid === 0 && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setConfirm({ id: detailInvoice.id, action: 'writeOff' })
                    setDetailId(null)
                  }}
                >
                  {t('pwWriteOff')}
                </Button>
              )}
            </div>

            <SectionCard
              title={t('pwPayments')}
              description={t('pwPaymentsHint')}
              icon={<Wallet className="h-3.5 w-3.5" />}
              padded={false}
            >
              {(detailInvoice.payments ?? []).length === 0 ? (
                <EmptyState message={t('pwNoPayments')} icon={<Wallet className="h-5 w-5" />} />
              ) : (
                <Table dense>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pwPaidAt')}</TableHead>
                      <TableHead>{t('pwAmount')}</TableHead>
                      <TableHead>{t('pwMethod')}</TableHead>
                      <TableHead>{t('pwReference')}</TableHead>
                      <TableHead>{t('pwStatus')}</TableHead>
                      <TableHead>{t('pwColActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailInvoice.payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDate(payment.paidAt)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(payment.amount, detailInvoice.currency)}
                        </TableCell>
                        <TableCell>{t(`pwMethod_${payment.method}`)}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {payment.reference ?? '—'}
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={payment.refundedAt ? 'danger' : 'success'}>
                            {payment.refundedAt ? t('pwRefunded') : t('pwPaid')}
                          </StatusPill>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {canRefund && !payment.refundedAt && (
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => refundPayment(payment)}
                              >
                                {t('pwRefund')}
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="danger"
                              aria-label={t('pwDelete')}
                              title={t('pwDelete')}
                              onClick={() => removePayment(payment.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>

            {(detailInvoice.taxVault ?? []).length > 0 && (
              <p className={META_TEXT}>
                {t('pwTaxVault')}:{' '}
                {money(
                  detailInvoice.taxVault.reduce(
                    (sum: number, entry: any) => sum + Number(entry.amount ?? 0),
                    0
                  )
                )}
              </p>
            )}
          </div>
        )}
      </Modal>

      <InvoiceDocumentModal
        isOpen={Boolean(documentId)}
        invoiceId={documentId}
        onClose={() => setDocumentId(null)}
      />

      <ConfirmDialog
        dense
        isOpen={Boolean(confirm)}
        message={
          confirm?.action === 'void'
            ? t('pwVoidInvoiceConfirm')
            : confirm?.action === 'writeOff'
              ? t('pwWriteOffConfirm')
              : t('pwDeleteInvoiceConfirm')
        }
        confirmLabel={t('pwConfirm')}
        cancelLabel={t('pwCancel')}
        busy={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
