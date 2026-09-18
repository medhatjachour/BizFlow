import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Hourglass,
  Plus,
  Trash2,
  TrendingUp
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
import StatusPill from '../components/StatusPill'
import ListRow from '../components/ListRow'
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
import { asSelectOptions, formatDate, formatNumber, toDayKey } from '../utils'

const EMPTY_WAIT = {
  projectId: '',
  reason: 'assets',
  startedAt: '',
  shiftDeadline: true,
  note: ''
}

export default function WaitsTab() {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()
  const reasonLabel = (id: string) => {
    const found = (config.data?.waitReasons ?? []).find((reason: any) => reason.id === id)
    if (!found) return id
    return language === 'ar' && found.labelAr ? found.labelAr : found.label
  }

  const [openOnly, setOpenOnly] = useState(true)
  const [reasonFilter, setReasonFilter] = useState('')
  const [form, setForm] = useState<typeof EMPTY_WAIT | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [closeTarget, setCloseTarget] = useState<any | null>(null)
  const [closeNote, setCloseNote] = useState('')
  const [shiftDeadline, setShiftDeadline] = useState(true)

  const list = useAsync<any>(
    () =>
      window.api.personal.waits.getAll({
        open: openOnly ? true : undefined,
        reason: reasonFilter || undefined,
        pageSize: 200
      }),
    [openOnly, reasonFilter]
  )
  const summary = useAsync<any>(() => window.api.personal.waits.getSummary(), [])
  const impact = useAsync<any>(() => window.api.personal.waits.getClientImpact(), [])
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
  const impactRows: any[] = Array.isArray(impact.data) ? impact.data : []
  const byReason: Array<[string, number]> = Object.entries(summary.data?.byReason ?? {})
    .map(([key, value]) => [key, Number(value)] as [string, number])
    .sort((a, b) => b[1] - a[1])

  const openCreate = () => setForm({ ...EMPTY_WAIT, startedAt: toDayKey(new Date()) })

  // Opened from the command palette's "New waiting log".
  useIntent('wait', openCreate)

  const save = async () => {
    if (!form) return
    if (!form.projectId) {
      toast.warning(t('pwSelectProject'))
      return
    }
    setSaving(true)
    try {
      await window.api.personal.waits.start({
        projectId: form.projectId,
        reason: form.reason,
        startedAt: form.startedAt || undefined,
        shiftDeadline: form.shiftDeadline,
        note: form.note || null
      })
      toast.success(t('pwWaitStarted'))
      setForm(null)
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const closeWait = async () => {
    if (!closeTarget) return
    try {
      const result = await window.api.personal.waits.end({
        id: closeTarget.id,
        note: closeNote || undefined,
        shiftDeadline
      })
      toast.success(`${t('pwWaitClosed')} · ${formatNumber(result?.appliedDays)} ${t('pwDays')}`)
      setCloseTarget(null)
      setCloseNote('')
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const remove = async () => {
    if (!confirmId) return
    try {
      await window.api.personal.waits.delete(confirmId)
      toast.success(t('pwWaitDeleted'))
      setConfirmId(null)
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const reloadAll = () => {
    list.reload()
    summary.reload()
    impact.reload()
  }

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        icon={<Hourglass className="h-4 w-4" />}
        title={t('pwTabWaits')}
        description={t('pwWaitsHint')}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            {t('pwStartWait')}
          </Button>
        }
      />

      <KpiSection sectionKey="personal:waits-KpiStrip" label={t('pwTabWaits')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiOpenWaits')}
            value={formatNumber(summary.data?.openWaits ?? 0)}
            icon={<Hourglass className="h-4 w-4" />}
            tone={(summary.data?.openWaits ?? 0) > 0 ? 'danger' : 'success'}
          />
          <StatCard
            label={t('pwKpiOpenWaitDays')}
            value={formatNumber(summary.data?.openDays, 1)}
            icon={<Clock className="h-4 w-4" />}
            tone="warning"
          />
          <StatCard label={t('pwTotalWaiting')} value={formatNumber(summary.data?.totalDays, 1)} />
          <StatCard
            label={t('pwKpiWorstReason')}
            value={
              summary.data?.worstReason ? reasonLabel(String(summary.data.worstReason.reason)) : '—'
            }
            sub={
              summary.data?.worstReason
                ? `${formatNumber(summary.data.worstReason.days, 1)} ${t('pwDays')}`
                : undefined
            }
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </MetricStrip>
      </KpiSection>

      <SectionCard
        title={t('pwWaitsTitle')}
        actions={
          <StatusPill tone="neutral" dot={false}>
            {`${list.data?.total ?? 0} ${t('pwEntries')}`}
          </StatusPill>
        }
      >
        <Toolbar>
          <button
            type="button"
            onClick={() => setOpenOnly((value) => !value)}
            aria-pressed={openOnly}
            className={`inline-flex h-7 items-center rounded-lg border px-2.5 text-xs font-medium transition-colors ${
              openOnly
                ? 'border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t('pwOpenOnly')}
          </button>
          <CustomSelect
            size="sm"
            value={reasonFilter}
            onChange={(value) => setReasonFilter(String(value))}
            options={asSelectOptions(config.data?.waitReasons, language)}
            placeholder={t('pwAllReasons')}
          />
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState
            loading={list.loading}
            message={t('pwNoWaits')}
            icon={<Hourglass className="h-5 w-5" />}
          />
        ) : (
          <Table dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pwColProject')}</TableHead>
                <TableHead>{t('pwReason')}</TableHead>
                <TableHead>{t('pwStarted')}</TableHead>
                <TableHead>{t('pwDays')}</TableHead>
                <TableHead>{t('pwDeadlineShift')}</TableHead>
                <TableHead>{t('pwColActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((wait) => (
                <TableRow key={wait.id}>
                  <TableCell>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                      {wait.project?.title ?? t('pwNoProject')}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {wait.project?.client?.name ?? t('pwNoClient')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone="neutral" dot={false}>
                      {reasonLabel(wait.reason)}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {formatDate(wait.startedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-sm font-semibold tabular-nums ${wait.endedAt ? '' : 'text-amber-600 dark:text-amber-400'}`}
                    >
                      {formatNumber(wait.liveDays)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {wait.shiftDeadline ? (
                      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        +{formatNumber(wait.appliedDays)} {t('pwDays')}
                      </span>
                    ) : (
                      <StatusPill tone="warning">
                        <Ban className="h-2.5 w-2.5" />
                        {t('pwNoShift')}
                      </StatusPill>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {!wait.endedAt && (
                        <Button
                          size="xs"
                          variant="secondary"
                          aria-label={t('pwCloseWait')}
                          title={t('pwCloseWait')}
                          onClick={() => {
                            setCloseTarget(wait)
                            setShiftDeadline(wait.shiftDeadline)
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="danger"
                        aria-label={t('pwDelete')}
                        title={t('pwDelete')}
                        onClick={() => setConfirmId(wait.id)}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={t('pwWaitByReason')}
          icon={<Hourglass className="h-3.5 w-3.5" />}
          description={t('pwWaitByReasonHint')}
        >
          {byReason.length === 0 ? (
            <EmptyState message={t('pwNoWaits')} />
          ) : (
            <div className="space-y-3">
              {byReason.map(([reason, days]) => {
                const percent = summary.data?.totalDays
                  ? (days / Number(summary.data.totalDays)) * 100
                  : 0
                return (
                  <div key={reason} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                        {reasonLabel(reason)}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                        {formatNumber(days, 1)} {t('pwDays')} · {Math.round(percent)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-[color:var(--accent)]"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={t('pwClientImpact')}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          description={t('pwClientImpactHint')}
        >
          {impactRows.length === 0 ? (
            <EmptyState message={t('pwNoImpact')} />
          ) : (
            <div className="space-y-1">
              {impactRows.map((row) => (
                <ListRow
                  key={row.clientId}
                  variant="plain"
                  title={row.clientName}
                  trailing={
                    <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                      {formatNumber(row.days, 1)} {t('pwDays')} · {row.entries} {t('pwEntries')}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Start wait ────────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={t('pwStartWait')}
        size="md"
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwReason')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.reason}
                    onChange={(value) => setForm({ ...form, reason: String(value) })}
                    options={asSelectOptions(config.data?.waitReasons, language)}
                  />
                </label>
                <FormInput
                  size="sm"
                  label={t('pwStarted')}
                  type="date"
                  value={form.startedAt}
                  onChange={(v) => setForm({ ...form, startedAt: v })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <label className="inline-flex h-7 items-center gap-2 rounded-lg px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.shiftDeadline}
                  onChange={(event) => setForm({ ...form, shiftDeadline: event.target.checked })}
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
                {t('pwShiftDeadline')}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwNote')}
                </span>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
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

      {/* ── Close wait ────────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(closeTarget)}
        onClose={() => setCloseTarget(null)}
        title={t('pwCloseWait')}
        size="md"
      >
        {closeTarget && (
          <div className="space-y-4">
            <FormSection title={t('pwDecisionImpact')}>
              <KeyValueList
                columns={3}
                items={[
                  {
                    label: t('pwColProject'),
                    value: closeTarget.project?.title ?? t('pwNoProject')
                  },
                  { label: t('pwReason'), value: reasonLabel(closeTarget.reason) },
                  {
                    label: t('pwDays'),
                    value: `${formatNumber(closeTarget.liveDays)} ${t('pwDays')}`,
                    emphasis: true
                  }
                ]}
              />
            </FormSection>

            <FormSection>
              <label className="inline-flex h-7 items-center gap-2 rounded-lg px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={shiftDeadline}
                  onChange={(event) => setShiftDeadline(event.target.checked)}
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
                {t('pwShiftDeadline')}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwNote')}
                </span>
                <textarea
                  rows={2}
                  value={closeNote}
                  onChange={(event) => setCloseNote(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setCloseTarget(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="success" onClick={closeWait}>
                {t('pwCloseWait')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        dense
        isOpen={Boolean(confirmId)}
        message={t('pwDeleteWaitConfirm')}
        confirmLabel={t('pwDelete')}
        cancelLabel={t('pwCancel')}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
