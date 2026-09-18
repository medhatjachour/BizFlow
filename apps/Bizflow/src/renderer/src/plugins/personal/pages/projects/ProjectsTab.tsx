import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Hourglass,
  Lock,
  Pencil,
  Plus,
  ShieldAlert,
  Timer,
  Trash2,
  TrendingUp,
  X
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
import StatusPill from '../components/StatusPill'
import Stepper from '../components/Stepper'
import ListRow from '../components/ListRow'
import KeyValueList from '../components/KeyValueList'
import { FormSection, ModalFooter } from '../components/FormSection'
import ProgressBar from '../components/ProgressBar'
import Button from '@renderer/components/ui/Button'
import Modal from '@renderer/components/ui/Modal'
import FormInput from '@renderer/components/ui/FormInput'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import ConfirmDialog from '@renderer/components/ui/ConfirmDialog'
import { useAsync, rowsOf, usePersonalConfig } from '../hooks/useAsync'
import { useIntent } from '../hooks/useIntent'
import {
  asSelectOptions,
  formatDate,
  formatMoney,
  formatMinutes,
  formatNumber,
  formatPercent,
  toDayKey
} from '../utils'

type View = 'board' | 'list'

const EMPTY_PROJECT = {
  id: '',
  code: '',
  clientId: '',
  title: '',
  summary: '',
  status: 'lead',
  pricingType: 'fixed',
  currency: 'USD',
  agreedAmount: '',
  hourlyRate: '',
  depositPercent: '50',
  startDate: '',
  dueDate: '',
  estimatedHours: '',
  maxHoursPerWeek: '',
  notes: ''
}

export default function ProjectsTab() {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()

  const [view, setView] = useState<View>('board')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<typeof EMPTY_PROJECT | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [newDeliverable, setNewDeliverable] = useState('')
  const [newChecklist, setNewChecklist] = useState('')

  const board = useAsync<any>(() => window.api.personal.projects.getBoard(), [])
  const list = useAsync<any>(
    () => window.api.personal.projects.getAll({ search: search || undefined, pageSize: 200 }),
    [search]
  )
  const clients = useAsync<any>(() => window.api.personal.clients.getAll({ pageSize: 200 }), [])
  const templates = useAsync<any>(() => window.api.personal.projects.templates.getAll(), [])
  const detail = useAsync<any>(
    () => (detailId ? window.api.personal.projects.getById(detailId) : Promise.resolve(null)),
    [detailId]
  )

  const stages: any[] = config.data?.stages ?? []
  const projectRows = useMemo(() => rowsOf<any>(list.data), [list.data])

  // The shipped per-profession checklists are seeded on first open so the
  // "apply template" picker is never empty on a fresh install. `seedChecklists`
  // is idempotent, and an empty table stays empty only until this runs once.
  const {
    loading: templatesLoading,
    error: templatesError,
    data: templatesData,
    reload: reloadTemplates
  } = templates
  useEffect(() => {
    if (templatesLoading || templatesError || (templatesData ?? []).length > 0) return
    let cancelled = false
    window.api.personal.meta
      .seedChecklists({})
      .then(() => {
        if (!cancelled) reloadTemplates()
      })
      .catch(() => {
        /* seeding is best-effort — the picker stays empty */
      })
    return () => {
      cancelled = true
    }
  }, [templatesLoading, templatesError, templatesData, reloadTemplates])

  const clientOptions = useMemo(
    () => rowsOf<any>(clients.data).map((client) => ({ value: client.id, label: client.name })),
    [clients.data]
  )

  const totals = useMemo(() => {
    const agreed = projectRows.reduce((sum, project) => sum + Number(project.agreedAmount ?? 0), 0)
    const estimated = projectRows.reduce(
      (sum, project) => sum + Number(project.estimatedHours ?? 0),
      0
    )
    return { agreed, estimated, active: projectRows.filter((p) => p.status === 'active').length }
  }, [projectRows])

  const refreshAll = () => {
    board.reload()
    list.reload()
    if (detailId) detail.reload()
  }

  const openCreate = () =>
    setForm({ ...EMPTY_PROJECT, dueDate: toDayKey(new Date(Date.now() + 14 * 86_400_000)) })

  // Opened from the command palette's "New project".
  useIntent('project', openCreate)

  const openEdit = (project: any) =>
    setForm({
      id: project.id,
      code: project.code ?? '',
      clientId: project.clientId ?? '',
      title: project.title ?? '',
      summary: project.summary ?? '',
      status: project.status ?? 'lead',
      pricingType: project.pricingType ?? 'fixed',
      currency: project.currency ?? 'USD',
      agreedAmount: project.agreedAmount == null ? '' : String(project.agreedAmount),
      hourlyRate: project.hourlyRate == null ? '' : String(project.hourlyRate),
      depositPercent: String(project.depositPercent ?? 50),
      startDate: project.startDate ? toDayKey(project.startDate) : '',
      dueDate: project.dueDate ? toDayKey(project.dueDate) : '',
      estimatedHours: project.estimatedHours == null ? '' : String(project.estimatedHours),
      maxHoursPerWeek: project.maxHoursPerWeek == null ? '' : String(project.maxHoursPerWeek),
      notes: project.notes ?? ''
    })

  const save = async () => {
    if (!form) return
    if (!form.title.trim()) {
      toast.warning(t('pwTitleRequired'))
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        code: form.code || undefined,
        clientId: form.clientId || null,
        title: form.title.trim(),
        summary: form.summary || null,
        status: form.status,
        pricingType: form.pricingType,
        currency: form.currency || 'USD',
        agreedAmount: form.agreedAmount === '' ? 0 : Number(form.agreedAmount),
        hourlyRate: form.hourlyRate === '' ? null : Number(form.hourlyRate),
        depositPercent: Number(form.depositPercent),
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        estimatedHours: form.estimatedHours === '' ? 0 : Number(form.estimatedHours),
        maxHoursPerWeek: form.maxHoursPerWeek === '' ? null : Number(form.maxHoursPerWeek),
        notes: form.notes || null
      }
      if (form.id) {
        await window.api.personal.projects.update({ id: form.id, ...payload })
        toast.success(t('pwProjectUpdated'))
      } else {
        await window.api.personal.projects.create(payload)
        toast.success(t('pwProjectCreated'))
      }
      setForm(null)
      refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const advance = async (project: any, targetStage: string) => {
    try {
      const result = await window.api.personal.projects.advanceStage({
        id: project.id,
        stage: targetStage
      })
      if (result && result.blocked) {
        toast.warning(result.reason ?? t('pwStageBlocked'))
      } else {
        toast.success(t('pwStageAdvanced'))
      }
      refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const remove = async () => {
    if (!confirmId) return
    try {
      await window.api.personal.projects.delete(confirmId)
      toast.success(t('pwProjectDeleted'))
      setConfirmId(null)
      refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const addDeliverable = async () => {
    if (!detailId || !newDeliverable.trim()) return
    try {
      await window.api.personal.projects.deliverables.create({
        projectId: detailId,
        title: newDeliverable.trim()
      })
      setNewDeliverable('')
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const removeDeliverable = async (id: string) => {
    try {
      await window.api.personal.projects.deliverables.delete(id)
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const addChecklistItem = async () => {
    if (!detailId || !newChecklist.trim()) return
    try {
      await window.api.personal.projects.checklist.create({
        projectId: detailId,
        label: newChecklist.trim()
      })
      setNewChecklist('')
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const toggleChecklistItem = async (item: any) => {
    try {
      await window.api.personal.projects.checklist.update({ id: item.id, isDone: !item.isDone })
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const applyTemplate = async (templateId: string) => {
    if (!detailId) return
    try {
      const result = await window.api.personal.projects.checklist.applyTemplate({
        projectId: detailId,
        templateId
      })
      toast.success(`${t('pwTemplateApplied')} ${result?.created?.length ?? 0}`)
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const detailData = detail.data
  const metrics = detailData?.metrics
  const gate = detailData?.gate
  const nextStage = detailData?.nextStage

  const stageLabel = (id: string) => stages.find((stage) => stage.id === id)?.label ?? id
  const stageIndex = (id: string) =>
    Math.max(
      0,
      stages.findIndex((stage) => stage.id === id)
    )
  const stagePercent = (id: string) =>
    stages.length ? ((stageIndex(id) + 1) / stages.length) * 100 : 0

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        icon={<FolderKanban className="h-4 w-4" />}
        title={t('pwTabProjects')}
        description={t('pwProjectsHint')}
        actions={
          <>
            <CustomSelect
              size="sm"
              value={view}
              onChange={(value) => setView(String(value) as View)}
              options={[
                { value: 'board', label: t('pwViewBoard') },
                { value: 'list', label: t('pwViewList') }
              ]}
            />
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              {t('pwAddProject')}
            </Button>
          </>
        }
      />

      <KpiSection sectionKey="personal:projects-KpiStrip" label={t('pwTabProjects')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiActiveProjects')}
            value={formatNumber(totals.active)}
            icon={<FolderKanban className="h-4 w-4" />}
            tone="accent"
          />
          <StatCard
            label={t('pwKpiAgreedValue')}
            value={formatMoney(totals.agreed)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiEstimatedHours')}
            value={formatNumber(totals.estimated, 1)}
            icon={<Timer className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiScopeCreep')}
            value={formatMoney(
              projectRows.reduce((sum, p) => sum + Number(p.scopeCreepValue ?? 0), 0)
            )}
            icon={<ShieldAlert className="h-4 w-4" />}
            tone="warning"
          />
        </MetricStrip>
      </KpiSection>

      <SectionCard
        title={t('pwProjectsTitle')}
        description={t('pwProjectsHint')}
        actions={
          <StatusPill tone="neutral" dot={false}>
            {`${board.data?.total ?? 0} ${t('pwInPipeline')}`}
          </StatusPill>
        }
      >
        <Toolbar>
          <SearchField value={search} onChange={setSearch} placeholder={t('pwSearchProjects')} />
        </Toolbar>

        {view === 'board' ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((stage) => {
              const column = (board.data?.columns ?? []).find((c: any) => c.stage === stage.id)
              const cards = column?.projects ?? []
              return (
                <div
                  key={stage.id}
                  className="flex min-w-[15rem] flex-1 flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-800/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {stage.label}
                    </span>
                    <StatusPill tone="neutral" dot={false}>
                      {cards.length}
                    </StatusPill>
                  </div>
                  {stage.requires !== 'none' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3 shrink-0" />
                      {t('pwRequiresPayment')}{' '}
                      {stage.requires === 'deposit' ? t('pwDeposit') : t('pwFinalPayment')}
                    </span>
                  )}

                  {cards.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      {t('pwNoProjects')}
                    </p>
                  )}

                  {cards.map((project: any) => (
                    <div
                      key={project.id}
                      className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs transition-colors hover:border-[color:var(--accent-line)] dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <button
                        type="button"
                        onClick={() => setDetailId(project.id)}
                        className="block w-full rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                      >
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                          {project.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                          {project.code} · {project.client?.name ?? t('pwNoClient')}
                        </span>
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-700/70">
                        <span className="truncate text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                          {formatMoney(project.agreedAmount, project.currency)}
                        </span>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            const index = stages.findIndex((s) => s.id === project.stage)
                            const target = stages[Math.min(stages.length - 1, index + 1)]
                            if (target) advance(project, target.id)
                          }}
                        >
                          <ArrowRight className="h-3 w-3" />
                          {t('pwAdvance')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ) : projectRows.length === 0 ? (
          <EmptyState
            loading={list.loading}
            message={t('pwNoProjects')}
            icon={<FolderKanban className="h-5 w-5" />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {projectRows.map((project) => (
              <div
                key={project.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-colors hover:border-[color:var(--accent-line)] dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailId(project.id)}
                    className="min-w-0 flex-1 rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                  >
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {project.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {project.code} · {project.client?.name ?? t('pwNoClient')}
                    </span>
                  </button>
                  {(project._count?.waits ?? 0) > 0 && (
                    <StatusPill tone="warning">
                      <Hourglass className="h-3 w-3" />
                      {project._count.waits}
                    </StatusPill>
                  )}
                </div>

                <div className="mt-3">
                  <ProgressBar
                    percent={stagePercent(project.stage)}
                    level={project.stage === 'assets_handed_over' ? 'clear' : 'off'}
                    label={`${stageLabel(project.stage)} · ${t('pwStageGate')} ${stageIndex(project.stage) + 1}/${stages.length}`}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-medium tabular-nums">
                    {formatMoney(project.agreedAmount, project.currency)}
                  </span>
                  {project.adjustedDueDate && (
                    <span className="text-slate-500 dark:text-slate-400">
                      · {formatDate(project.adjustedDueDate)}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-1.5 pt-3">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(project)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmId(project.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Create / edit ─────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? t('pwEditProject') : t('pwAddProject')}
        size="xl"
      >
        {form && (
          <div className="space-y-5">
            <FormSection title={t('pwFormBasics')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwTitle')}
                  required
                  value={form.title}
                  onChange={(v) => setForm({ ...form, title: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwCode')}
                  value={form.code}
                  onChange={(v) => setForm({ ...form, code: v })}
                  helperText={t('pwCodeAuto')}
                />
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwClient')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.clientId}
                    onChange={(v) => setForm({ ...form, clientId: String(v) })}
                    options={clientOptions}
                    placeholder={t('pwNoClient')}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwStatus')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.status}
                    onChange={(v) => setForm({ ...form, status: String(v) })}
                    options={asSelectOptions(config.data?.statuses, language)}
                  />
                </label>
              </div>
            </FormSection>

            <FormSection title={t('pwFormAmounts')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwPricingType')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.pricingType}
                    onChange={(v) => setForm({ ...form, pricingType: String(v) })}
                    options={asSelectOptions(config.data?.pricingTypes, language)}
                  />
                </label>
                <FormInput
                  size="sm"
                  label={t('pwAgreedAmount')}
                  type="number"
                  value={form.agreedAmount}
                  onChange={(v) => setForm({ ...form, agreedAmount: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwHourlyRate')}
                  type="number"
                  value={form.hourlyRate}
                  onChange={(v) => setForm({ ...form, hourlyRate: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwDepositPercent')}
                  type="number"
                  value={form.depositPercent}
                  onChange={(v) => setForm({ ...form, depositPercent: v })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormSchedule')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwStartDate')}
                  type="date"
                  value={form.startDate}
                  onChange={(v) => setForm({ ...form, startDate: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwDueDate')}
                  type="date"
                  value={form.dueDate}
                  onChange={(v) => setForm({ ...form, dueDate: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwEstimatedHours')}
                  type="number"
                  value={form.estimatedHours}
                  onChange={(v) => setForm({ ...form, estimatedHours: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwMaxHoursPerWeek')}
                  type="number"
                  value={form.maxHoursPerWeek}
                  onChange={(v) => setForm({ ...form, maxHoursPerWeek: v })}
                />
              </div>
            </FormSection>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('pwSummary')}
              </span>
              <textarea
                rows={2}
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>

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

      {/* ── Project detail ────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={detailData?.title ?? t('pwProject')}
        size="xl"
      >
        <EmptyState loading={detail.loading} loadingShape="detail" />
        {detailData && (
          <div className="space-y-4">
            <MetricStrip size="four">
              <StatCard
                label={t('pwTracked')}
                value={formatMinutes(metrics?.focusMinutes)}
                icon={<Timer className="h-4 w-4" />}
              />
              <StatCard
                label={t('pwHoursBurn')}
                value={formatPercent(metrics?.hoursBurnPercent)}
                sub={`${formatNumber(metrics?.estimatedHours, 1)} ${t('pwEstimatedShort')}`}
                tone={Number(metrics?.hoursBurnPercent) > 100 ? 'danger' : 'default'}
              />
              <StatCard
                label={t('pwRealRate')}
                value={formatMoney(metrics?.realHourlyRate, detailData.currency)}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label={t('pwScopeCreepValue')}
                value={formatMoney(metrics?.scopeCreepValue, detailData.currency)}
                icon={<ShieldAlert className="h-4 w-4" />}
                tone="warning"
              />
            </MetricStrip>

            {/* Stage gate */}
            <SectionCard
              title={t('pwStageGate')}
              icon={<Lock className="h-3.5 w-3.5" />}
              actions={
                <>
                  <StatusPill tone={gate?.blocked ? 'danger' : 'success'}>
                    {gate?.blocked ? t('pwGateBlocked') : t('pwGateOpen')}
                  </StatusPill>
                  {nextStage && nextStage.id !== detailData.stage && (
                    <Button size="sm" onClick={() => advance(detailData, nextStage.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('pwAdvanceTo')} {nextStage.label}
                    </Button>
                  )}
                </>
              }
              footer={
                <KeyValueList
                  columns={4}
                  items={[
                    {
                      label: t('pwTotalDue'),
                      value: formatMoney(detailData.payments?.totalDue, detailData.currency)
                    },
                    {
                      label: t('pwDepositPaid'),
                      value: formatMoney(detailData.payments?.depositPaid, detailData.currency)
                    },
                    {
                      label: t('pwPaid'),
                      value: formatMoney(detailData.payments?.paid, detailData.currency)
                    },
                    {
                      label: t('pwOutstanding'),
                      value: formatMoney(gate?.outstanding, detailData.currency),
                      emphasis: true
                    }
                  ]}
                />
              }
            >
              <Stepper
                steps={stages.map((stage, index) => ({
                  id: stage.id,
                  label: stage.label,
                  done: index < stageIndex(detailData.stage),
                  current: stage.id === detailData.stage,
                  locked:
                    index > stageIndex(detailData.stage) &&
                    stage.requires !== 'none' &&
                    Boolean(gate?.blocked)
                }))}
              />

              {gate?.blocked && gate?.reason && (
                <p className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {gate.reason}
                </p>
              )}

              {!metrics?.canHandOver && (
                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-300">
                  <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                  {t('pwBlockingChecklistWarning')}
                </p>
              )}
            </SectionCard>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Deliverables */}
              <SectionCard title={t('pwDeliverables')}>
                <div className="mb-2 flex gap-2">
                  <input
                    value={newDeliverable}
                    onChange={(event) => setNewDeliverable(event.target.value)}
                    placeholder={t('pwNewDeliverable')}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <Button size="sm" onClick={addDeliverable}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {(detailData.deliverables ?? []).map((item: any) => (
                    <ListRow
                      key={item.id}
                      variant="plain"
                      title={item.title}
                      subtitle={`× ${item.quantity} ${item.unit}`}
                      trailing={
                        <>
                          <StatusPill tone={item.isIncluded ? 'success' : 'neutral'}>
                            {item.isIncluded ? t('pwIncluded') : t('pwExtra')}
                          </StatusPill>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => removeDeliverable(item.id)}
                            aria-label={t('pwDelete')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      }
                    />
                  ))}
                  {(detailData.deliverables ?? []).length === 0 && (
                    <EmptyState message={t('pwNoDeliverables')} />
                  )}
                </div>
              </SectionCard>

              {/* Checklist */}
              <SectionCard
                title={t('pwPreflightChecklist')}
                description={`${metrics?.checklistDone ?? 0} / ${metrics?.checklistTotal ?? 0}`}
                actions={
                  <CustomSelect
                    size="sm"
                    value=""
                    onChange={(value) => value && applyTemplate(String(value))}
                    options={(templates.data ?? []).map((template: any) => ({
                      value: template.id,
                      label: template.name
                    }))}
                    placeholder={t('pwApplyTemplate')}
                  />
                }
              >
                <div className="mb-2 flex gap-2">
                  <input
                    value={newChecklist}
                    onChange={(event) => setNewChecklist(event.target.value)}
                    placeholder={t('pwNewChecklistItem')}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <Button size="sm" onClick={addChecklistItem}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {(detailData.checklistItems ?? []).map((item: any) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(item.isDone)}
                        onChange={() => toggleChecklistItem(item)}
                        className="h-4 w-4 shrink-0 accent-[color:var(--accent)]"
                      />
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          item.isDone
                            ? 'text-slate-400 line-through'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.isBlocking && <StatusPill tone="warning">{t('pwBlocking')}</StatusPill>}
                    </label>
                  ))}
                  {(detailData.checklistItems ?? []).length === 0 && (
                    <EmptyState message={t('pwNoChecklist')} />
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Stage history */}
            <SectionCard
              title={t('pwStageHistory')}
              icon={<CalendarClock className="h-3.5 w-3.5" />}
            >
              <div className="space-y-1">
                {(detailData.stageEvents ?? []).map((event: any) => (
                  <ListRow
                    key={event.id}
                    variant="plain"
                    title={stageLabel(event.stage)}
                    subtitle={event.note || undefined}
                    trailing={
                      <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {formatDate(event.enteredAt)}
                      </span>
                    }
                  />
                ))}
                {(detailData.stageEvents ?? []).length === 0 && (
                  <EmptyState message={t('pwNoHistory')} />
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        dense
        isOpen={Boolean(confirmId)}
        message={t('pwDeleteProjectConfirm')}
        confirmLabel={t('pwDelete')}
        cancelLabel={t('pwCancel')}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
