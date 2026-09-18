import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  DollarSign,
  Hourglass,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import StatCard from '../components/StatCard'
import SectionCard from '../components/SectionCard'
import EmptyState from '../components/EmptyState'
import Toolbar, { SearchField } from '../components/Toolbar'
import PageHeader from '../components/PageHeader'
import MetricStrip from '../components/MetricStrip'
import StatusPill, { statusToneOf } from '../components/StatusPill'
import { FormSection, ModalFooter } from '../components/FormSection'
import Button from '@renderer/components/ui/Button'
import Modal from '@renderer/components/ui/Modal'
import FormInput from '@renderer/components/ui/FormInput'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import ConfirmDialog from '@renderer/components/ui/ConfirmDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/Table'
import { useAsync, rowsOf, usePersonalConfig } from '../hooks/useAsync'
import { useIntent } from '../hooks/useIntent'
import { CURRENCY_SYMBOL, formatMoney, formatNumber, statusBadgeVariant } from '../utils'

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'AED', label: 'AED' },
  { value: 'SAR', label: 'SAR' },
  { value: 'EGP', label: 'EGP' },
  { value: 'MAD', label: 'MAD' },
  { value: 'DZD', label: 'DZD' },
  { value: 'TND', label: 'TND' },
  { value: 'CAD', label: 'CAD' },
  { value: 'AUD', label: 'AUD' }
]

const EMPTY_FORM = {
  id: '',
  name: '',
  company: '',
  email: '',
  phone: '',
  timezone: '',
  currency: 'USD',
  defaultHourlyRate: '',
  defaultDepositPercent: '50',
  paymentTermsDays: '14',
  workingStyleNotes: '',
  redFlags: ''
}

export default function ClientsTab() {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()
  const stages: any[] = config.data?.stages ?? []
  const stageLabel = (id: string) => stages.find((stage) => stage.id === id)?.label ?? id
  const statusLabel = (id: string) => {
    const found = (config.data?.statuses ?? []).find((status: any) => status.id === id)
    if (!found) return id
    return language === 'ar' && found.labelAr ? found.labelAr : found.label
  }

  const [search, setSearch] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const clients = useAsync<any>(
    () =>
      window.api.personal.clients.getAll({
        search: search || undefined,
        includeArchived,
        pageSize: 200
      }),
    [search, includeArchived]
  )
  const detail = useAsync<any>(
    () => (detailId ? window.api.personal.clients.getById(detailId) : Promise.resolve(null)),
    [detailId]
  )

  const rows = useMemo(() => rowsOf<any>(clients.data), [clients.data])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, client) => {
        acc.projects += client._count?.projects ?? 0
        acc.invoices += client._count?.invoices ?? 0
        return acc
      },
      { projects: 0, invoices: 0 }
    )
  }, [rows])

  const openCreate = () => setForm({ ...EMPTY_FORM })

  // Opened from the command palette's "New client".
  useIntent('client', openCreate)
  const openEdit = (client: any) =>
    setForm({
      id: client.id,
      name: client.name ?? '',
      company: client.company ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      timezone: client.timezone ?? '',
      currency: client.currency ?? 'USD',
      defaultHourlyRate: client.defaultHourlyRate == null ? '' : String(client.defaultHourlyRate),
      defaultDepositPercent: String(client.defaultDepositPercent ?? 50),
      paymentTermsDays: String(client.paymentTermsDays ?? 14),
      workingStyleNotes: client.workingStyleNotes ?? '',
      redFlags: client.redFlags ?? ''
    })

  const save = async () => {
    if (!form) return
    if (!form.name.trim()) {
      toast.warning(t('pwNameRequired'))
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        timezone: form.timezone || null,
        currency: form.currency || 'USD',
        defaultHourlyRate: form.defaultHourlyRate === '' ? null : Number(form.defaultHourlyRate),
        defaultDepositPercent: Number(form.defaultDepositPercent),
        paymentTermsDays: Number(form.paymentTermsDays),
        workingStyleNotes: form.workingStyleNotes || null,
        redFlags: form.redFlags || null
      }
      if (form.id) {
        await window.api.personal.clients.update({ id: form.id, ...payload })
        toast.success(t('pwClientUpdated'))
      } else {
        await window.api.personal.clients.create(payload)
        toast.success(t('pwClientCreated'))
      }
      setForm(null)
      clients.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!confirmId) return
    try {
      await window.api.personal.clients.delete(confirmId)
      toast.success(t('pwClientArchived'))
      setConfirmId(null)
      clients.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const restore = async (id: string) => {
    try {
      await window.api.personal.clients.restore(id)
      toast.success(t('pwClientRestored'))
      clients.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const health = detail.data?.health

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        icon={<Users className="h-4 w-4" />}
        title={t('pwTabClients')}
        description={t('pwClientsHint')}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            {t('pwAddClient')}
          </Button>
        }
      />

      <KpiSection sectionKey="personal:clients-KpiStrip" label={t('pwTabClients')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiClients')}
            value={formatNumber(rows.length)}
            icon={<Users className="h-4 w-4" />}
            tone="accent"
          />
          <StatCard
            label={t('pwKpiProjects')}
            value={formatNumber(totals.projects)}
            icon={<UserCheck className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiInvoices')}
            value={formatNumber(totals.invoices)}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiArchived')}
            value={formatNumber(rows.filter((r) => r.isArchived).length)}
            icon={<Trash2 className="h-4 w-4" />}
          />
        </MetricStrip>
      </KpiSection>

      <SectionCard
        title={t('pwClientsTitle')}
        actions={
          <StatusPill tone="neutral" dot={false}>
            {`${formatNumber(rows.length)} ${t('pwTabClients')}`}
          </StatusPill>
        }
      >
        <Toolbar>
          <SearchField value={search} onChange={setSearch} placeholder={t('pwSearchClients')} />
          <label className="inline-flex h-7 items-center gap-2 rounded-lg px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            {t('pwIncludeArchived')}
          </label>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState
            loading={clients.loading}
            message={t('pwNoClients')}
            icon={<Users className="h-5 w-5" />}
          />
        ) : (
          <Table dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pwColClient')}</TableHead>
                <TableHead>{t('pwColContact')}</TableHead>
                <TableHead>{t('pwColRate')}</TableHead>
                <TableHead>{t('pwColTerms')}</TableHead>
                <TableHead>{t('pwColCounts')}</TableHead>
                <TableHead>{t('pwColActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setDetailId(client.id)}
                      className="text-start text-sm font-semibold text-slate-900 hover:text-[color:var(--accent-text)] dark:text-white"
                    >
                      {client.name}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {client.company ?? '—'}
                    </p>
                    {client.isArchived && (
                      <div className="mt-1">
                        <StatusPill tone="neutral">{t('pwArchived')}</StatusPill>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {client.email ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {client.phone ?? '—'}
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {client.defaultHourlyRate == null
                      ? '—'
                      : formatMoney(client.defaultHourlyRate, client.currency)}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs">
                      {client.defaultDepositPercent}% {t('pwDeposit')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {client.paymentTermsDays} {t('pwDays')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs">
                      {client._count?.projects ?? 0} {t('pwProjectsShort')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {client._count?.invoices ?? 0} {t('pwInvoicesShort')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(client)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {client.isArchived ? (
                        <Button size="sm" variant="secondary" onClick={() => restore(client.id)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="danger" onClick={() => setConfirmId(client.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* ── Create / edit ─────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? t('pwEditClient') : t('pwAddClient')}
        size="lg"
      >
        {form && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwName')}
                  required
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwCompany')}
                  value={form.company}
                  onChange={(v) => setForm({ ...form, company: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwEmail')}
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwPhone')}
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwTimezone')}
                  value={form.timezone}
                  onChange={(v) => setForm({ ...form, timezone: v })}
                />
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwCurrency')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.currency}
                    onChange={(v) => setForm({ ...form, currency: String(v) })}
                    options={CURRENCIES}
                  />
                </label>
              </div>
            </FormSection>

            <FormSection title={t('pwFormAmounts')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormInput
                  size="sm"
                  label={t('pwHourlyRate')}
                  type="number"
                  value={form.defaultHourlyRate}
                  onChange={(v) => setForm({ ...form, defaultHourlyRate: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwDepositPercent')}
                  type="number"
                  value={form.defaultDepositPercent}
                  onChange={(v) => setForm({ ...form, defaultDepositPercent: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwPaymentTerms')}
                  type="number"
                  value={form.paymentTermsDays}
                  onChange={(v) => setForm({ ...form, paymentTermsDays: v })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')} description={t('pwClientNotesHint')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwWorkingStyle')}
                  </span>
                  <textarea
                    rows={3}
                    value={form.workingStyleNotes}
                    onChange={(event) =>
                      setForm({ ...form, workingStyleNotes: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwRedFlags')}
                  </span>
                  <textarea
                    rows={3}
                    value={form.redFlags}
                    onChange={(event) => setForm({ ...form, redFlags: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" loading={saving} onClick={save}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* ── Client health ─────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={detail.data?.name ?? t('pwClient')}
        size="xl"
      >
        <EmptyState loading={detail.loading} loadingShape="detail" />
        {detail.data && (
          <div className="space-y-4">
            <MetricStrip size="four" hint={t('pwMoneyHealth')}>
              <StatCard
                label={t('pwBilled')}
                value={formatMoney(health?.billed, detail.data.currency)}
              />
              <StatCard
                label={t('pwCollected')}
                value={formatMoney(health?.collected, detail.data.currency)}
                tone="success"
              />
              <StatCard
                label={t('pwOutstanding')}
                value={formatMoney(health?.outstanding, detail.data.currency)}
                tone={health?.outstanding > 0 ? 'warning' : 'default'}
              />
              <StatCard
                label={t('pwOverdue')}
                value={formatMoney(health?.overdue, detail.data.currency)}
                tone={health?.overdue > 0 ? 'danger' : 'default'}
              />
            </MetricStrip>

            <MetricStrip size="four" hint={t('pwEngagement')}>
              <StatCard
                label={t('pwAvgPaymentDays')}
                value={formatNumber(health?.avgPaymentDays, 1)}
                icon={<TrendingUp className="h-4 w-4" />}
                tone={health?.isSlowPayer ? 'danger' : 'default'}
              />
              <StatCard
                label={t('pwWaitingDays')}
                value={formatNumber(health?.waitingDays)}
                icon={<Hourglass className="h-4 w-4" />}
              />
              <StatCard
                label={t('pwActiveProjects')}
                value={formatNumber(health?.activeProjects)}
              />
              <StatCard
                label={t('pwDeliveredProjects')}
                value={formatNumber(health?.deliveredProjects)}
              />
            </MetricStrip>

            {health?.isSlowPayer && (
              <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t('pwSlowPayerWarning')}
              </p>
            )}

            {detail.data.workingStyleNotes && (
              <SectionCard title={t('pwWorkingStyle')} icon={<UserCheck className="h-3.5 w-3.5" />}>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {detail.data.workingStyleNotes}
                </p>
              </SectionCard>
            )}
            {detail.data.redFlags && (
              <SectionCard title={t('pwRedFlags')} icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-rose-600 dark:text-rose-300">
                  {detail.data.redFlags}
                </p>
              </SectionCard>
            )}

            <SectionCard
              title={t('pwClientProjects')}
              actions={
                <StatusPill tone="neutral" dot={false}>
                  {(detail.data.projects ?? []).length}
                </StatusPill>
              }
            >
              {(detail.data.projects ?? []).length === 0 ? (
                <EmptyState message={t('pwNoProjects')} />
              ) : (
                <Table dense>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pwColProject')}</TableHead>
                      <TableHead>{t('pwColStage')}</TableHead>
                      <TableHead>{t('pwColStatus')}</TableHead>
                      <TableHead>{t('pwColAmount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.data.projects.map((project: any) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <span className="font-mono text-xs text-slate-500">{project.code}</span>
                          <p className="text-xs font-semibold">{project.title}</p>
                        </TableCell>
                        <TableCell className="text-xs">{stageLabel(project.stage)}</TableCell>
                        <TableCell>
                          <StatusPill tone={statusToneOf(statusBadgeVariant(project.status))}>
                            {statusLabel(project.status)}
                          </StatusPill>
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {formatMoney(project.agreedAmount, project.currency ?? CURRENCY_SYMBOL)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        dense
        isOpen={Boolean(confirmId)}
        message={t('pwArchiveClientConfirm')}
        confirmLabel={t('pwArchive')}
        cancelLabel={t('pwCancel')}
        onConfirm={archive}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
