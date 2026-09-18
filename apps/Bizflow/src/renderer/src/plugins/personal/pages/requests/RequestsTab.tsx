import { useMemo, useState } from 'react'
import {
  Check,
  ClipboardCopy,
  GitPullRequest,
  Pencil,
  Plus,
  Receipt,
  ShieldAlert,
  Sparkles,
  Trash2
} from 'lucide-react'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import StatCard from '../components/StatCard'
import SectionCard from '../components/SectionCard'
import EmptyState from '../components/EmptyState'
import Toolbar from '../components/Toolbar'
import PageHeader from '../components/PageHeader'
import MetricStrip from '../components/MetricStrip'
import StatusPill, { statusToneOf } from '../components/StatusPill'
import KeyValueList from '../components/KeyValueList'
import { FormSection, ModalFooter } from '../components/FormSection'
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
import { useIntent } from '../hooks/useIntent'
import { asSelectOptions, copyText, formatMoney, formatNumber, statusBadgeVariant } from '../utils'

const EMPTY_REQUEST = {
  id: '',
  projectId: '',
  title: '',
  description: '',
  estimatedHours: '',
  hourlyRate: '',
  extraDays: '',
  hoursPerDay: '6'
}

export default function RequestsTab() {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()
  const statusLabel = (id: string) => {
    const found = (config.data?.changeRequestStatuses ?? []).find((status: any) => status.id === id)
    if (!found) return id
    return language === 'ar' && found.labelAr ? found.labelAr : found.label
  }

  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState<typeof EMPTY_REQUEST | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [quoteText, setQuoteText] = useState<string | null>(null)
  const [decideTarget, setDecideTarget] = useState<any | null>(null)
  const [decisionNote, setDecisionNote] = useState('')

  const list = useAsync<any>(
    () =>
      window.api.personal.requests.getAll({
        status: statusFilter || undefined,
        pageSize: 200
      }),
    [statusFilter]
  )
  const projects = useAsync<any>(() => window.api.personal.projects.getAll({ pageSize: 200 }), [])

  const rows = useMemo(() => rowsOf<any>(list.data), [list.data])

  const projectOptions = useMemo(
    () =>
      rowsOf<any>(projects.data).map((project) => ({
        value: project.id,
        label: `${project.code} · ${project.title}`
      })),
    [projects.data]
  )

  const totals = useMemo(() => {
    const pipeline = rows.filter((r) => r.status === 'draft' || r.status === 'quoted')
    const approved = rows.filter((r) => r.status === 'approved' || r.status === 'invoiced')
    return {
      pipelineValue: pipeline.reduce((sum, r) => sum + Number(r.extraCost ?? 0), 0),
      approvedValue: approved.reduce((sum, r) => sum + Number(r.extraCost ?? 0), 0),
      pendingCount: pipeline.length,
      extraDays: rows.reduce((sum, r) => sum + Number(r.extraDays ?? 0), 0)
    }
  }, [rows])

  const openCreate = () => setForm({ ...EMPTY_REQUEST })

  // Opened from the command palette's "New change request".
  useIntent('request', openCreate)

  const openEdit = (request: any) =>
    setForm({
      id: request.id,
      projectId: request.projectId ?? '',
      title: request.title ?? '',
      description: request.description ?? '',
      estimatedHours: request.estimatedHours == null ? '' : String(request.estimatedHours),
      hourlyRate: request.hourlyRate == null ? '' : String(request.hourlyRate),
      extraDays: request.extraDays == null ? '' : String(request.extraDays),
      hoursPerDay: '6'
    })

  const save = async () => {
    if (!form) return
    if (!form.projectId) {
      toast.warning(t('pwSelectProject'))
      return
    }
    if (!form.title.trim()) {
      toast.warning(t('pwTitleRequired'))
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        projectId: form.projectId,
        title: form.title.trim(),
        description: form.description || null,
        estimatedHours: form.estimatedHours === '' ? 0 : Number(form.estimatedHours),
        hourlyRate: form.hourlyRate === '' ? undefined : Number(form.hourlyRate),
        extraDays: form.extraDays === '' ? undefined : Number(form.extraDays),
        hoursPerDay: Number(form.hoursPerDay) || 6
      }
      if (form.id) {
        await window.api.personal.requests.update({ id: form.id, ...payload })
        toast.success(t('pwRequestUpdated'))
      } else {
        await window.api.personal.requests.create(payload)
        toast.success(t('pwRequestCreated'))
      }
      setForm(null)
      list.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const generateQuote = async (request: any) => {
    try {
      const updated = await window.api.personal.requests.quote(request.id)
      setQuoteText(updated?.quoteText ?? '')
      list.reload()
      toast.success(t('pwQuoteReady'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const decide = async (status: 'approved' | 'declined') => {
    if (!decideTarget) return
    try {
      await window.api.personal.requests.decide({
        id: decideTarget.id,
        status,
        note: decisionNote || undefined,
        shiftDeadline: status === 'approved'
      })
      toast.success(status === 'approved' ? t('pwRequestApproved') : t('pwRequestDeclined'))
      setDecideTarget(null)
      setDecisionNote('')
      list.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const markInvoiced = async (request: any) => {
    try {
      await window.api.personal.requests.markInvoiced({ id: request.id })
      toast.success(t('pwRequestInvoiced'))
      list.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const remove = async () => {
    if (!confirmId) return
    try {
      await window.api.personal.requests.delete(confirmId)
      toast.success(t('pwRequestDeleted'))
      setConfirmId(null)
      list.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const copyQuote = async () => {
    if (!quoteText) return
    const ok = await copyText(quoteText)
    if (ok) toast.success(t('pwCopied'))
    else toast.warning(t('pwCopyFailed'))
  }

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        icon={<GitPullRequest className="h-4 w-4" />}
        title={t('pwTabRequests')}
        description={t('pwRequestsHint')}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            {t('pwAddRequest')}
          </Button>
        }
      />

      <KpiSection sectionKey="personal:requests-KpiStrip" label={t('pwTabRequests')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiPendingRequests')}
            value={formatNumber(totals.pendingCount)}
            icon={<ShieldAlert className="h-4 w-4" />}
            tone="warning"
          />
          <StatCard
            label={t('pwPipelineValue')}
            value={formatMoney(totals.pipelineValue)}
            icon={<GitPullRequest className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwApprovedValue')}
            value={formatMoney(totals.approvedValue)}
            tone="success"
          />
          <StatCard label={t('pwKpiExtraDays')} value={formatNumber(totals.extraDays)} />
        </MetricStrip>
      </KpiSection>

      <SectionCard
        title={t('pwRequestsTitle')}
        actions={
          <StatusPill tone="neutral" dot={false}>
            {`${list.data?.total ?? 0} ${t('pwRequestsShort')}`}
          </StatusPill>
        }
      >
        <Toolbar>
          <CustomSelect
            size="sm"
            value={statusFilter}
            onChange={(value) => setStatusFilter(String(value))}
            options={asSelectOptions(config.data?.changeRequestStatuses, language)}
            placeholder={t('pwAllStatuses')}
          />
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState
            loading={list.loading}
            message={t('pwNoRequests')}
            icon={<GitPullRequest className="h-5 w-5" />}
          />
        ) : (
          <Table dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pwRequest')}</TableHead>
                <TableHead>{t('pwColProject')}</TableHead>
                <TableHead>{t('pwExtraCost')}</TableHead>
                <TableHead>{t('pwExtraDays')}</TableHead>
                <TableHead>{t('pwColStatus')}</TableHead>
                <TableHead>{t('pwColActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                      {request.title}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {formatNumber(request.estimatedHours, 1)}h × {formatMoney(request.hourlyRate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block text-xs text-slate-700 dark:text-slate-200">
                      {request.project?.title ?? t('pwNoProject')}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {request.project?.client?.name ?? t('pwNoClient')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(request.extraCost, request.project?.currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums">{formatNumber(request.extraDays)}</span>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={statusToneOf(statusBadgeVariant(request.status))}>
                      {statusLabel(request.status)}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        size="xs"
                        variant="secondary"
                        aria-label={t('pwGenerateQuote')}
                        title={t('pwGenerateQuote')}
                        onClick={() => generateQuote(request)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                      {request.status === 'quoted' && (
                        <Button
                          size="xs"
                          variant="secondary"
                          aria-label={t('pwRecordDecision')}
                          title={t('pwRecordDecision')}
                          onClick={() => setDecideTarget(request)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {request.status === 'approved' && (
                        <Button
                          size="xs"
                          variant="secondary"
                          aria-label={t('pwMarkInvoiced')}
                          title={t('pwMarkInvoiced')}
                          onClick={() => markInvoiced(request)}
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="secondary"
                        aria-label={t('pwEdit')}
                        title={t('pwEdit')}
                        onClick={() => openEdit(request)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="xs"
                        variant="danger"
                        aria-label={t('pwDelete')}
                        title={t('pwDelete')}
                        onClick={() => setConfirmId(request.id)}
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

      {/* ── Create / edit ─────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? t('pwEditRequest') : t('pwAddRequest')}
        size="lg"
      >
        {form && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwProject')}
                </span>
                <CustomSelect
                  size="sm"
                  value={form.projectId}
                  onChange={(value) => setForm({ ...form, projectId: String(value) })}
                  options={projectOptions}
                  placeholder={t('pwSelectProject')}
                />
              </label>

              <FormInput
                size="sm"
                label={t('pwTitle')}
                required
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
              />

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwDescription')}
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </FormSection>

            <FormSection title={t('pwFormSchedule')} description={t('pwExtraDaysAuto')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwEstimatedHours')}
                  type="number"
                  value={form.estimatedHours}
                  onChange={(v) => setForm({ ...form, estimatedHours: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwHoursPerDay')}
                  type="number"
                  value={form.hoursPerDay}
                  onChange={(v) => setForm({ ...form, hoursPerDay: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwExtraDays')}
                  type="number"
                  value={form.extraDays}
                  onChange={(v) => setForm({ ...form, extraDays: v })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormAmounts')}>
              <FormInput
                size="sm"
                label={t('pwHourlyRate')}
                type="number"
                value={form.hourlyRate}
                onChange={(v) => setForm({ ...form, hourlyRate: v })}
                helperText={t('pwRateFallbackHint')}
              />
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

      {/* ── Quote preview ─────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={quoteText !== null}
        onClose={() => setQuoteText(null)}
        title={t('pwQuoteReady')}
        size="lg"
      >
        <FormSection title={t('pwQuoteLog')}>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
            {quoteText}
          </pre>
        </FormSection>
        <ModalFooter>
          <Button size="sm" variant="secondary" onClick={() => setQuoteText(null)}>
            {t('pwClose')}
          </Button>
          <Button size="sm" onClick={copyQuote}>
            <ClipboardCopy className="h-3.5 w-3.5" />
            {t('pwCopyQuote')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Client decision ───────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(decideTarget)}
        onClose={() => setDecideTarget(null)}
        title={t('pwClientDecision')}
        size="md"
      >
        {decideTarget && (
          <div className="space-y-4">
            <FormSection title={t('pwDecisionImpact')}>
              <KeyValueList
                columns={3}
                items={[
                  { label: t('pwRequest'), value: decideTarget.title },
                  {
                    label: t('pwExtraCost'),
                    value: formatMoney(decideTarget.extraCost, decideTarget.project?.currency),
                    emphasis: true
                  },
                  {
                    label: t('pwExtraDays'),
                    value: `${formatNumber(decideTarget.extraDays)} ${t('pwDays')}`
                  }
                ]}
              />
            </FormSection>

            <FormSection>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwDecisionNote')}
                </span>
                <textarea
                  rows={2}
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('pwShiftDeadlineHint')}
              </p>
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setDecideTarget(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="danger" onClick={() => decide('declined')}>
                {t('pwDecline')}
              </Button>
              <Button size="sm" variant="success" onClick={() => decide('approved')}>
                {t('pwApprove')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        dense
        isOpen={Boolean(confirmId)}
        message={t('pwDeleteRequestConfirm')}
        confirmLabel={t('pwDelete')}
        cancelLabel={t('pwCancel')}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
