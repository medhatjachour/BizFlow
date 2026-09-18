import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Square,
  Timer,
  TrendingDown,
  TrendingUp,
  Trash2,
  Zap
} from 'lucide-react'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast, refreshQuietRuntime } from '../hooks/useQuietRuntime'
import StatCard from '../components/StatCard'
import SectionCard from '../components/SectionCard'
import EmptyState from '../components/EmptyState'
import ProgressBar from '../components/ProgressBar'
import PageHeader from '../components/PageHeader'
import MetricStrip from '../components/MetricStrip'
import StatusPill from '../components/StatusPill'
import ListRow from '../components/ListRow'
import { FormSection, ModalFooter } from '../components/FormSection'
import { MICRO_LABEL } from '../components/base'
import QuietModePanel from './QuietModePanel'
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
import {
  asSelectOptions,
  formatDate,
  formatHours,
  formatMinutes,
  formatMoney,
  formatNumber,
  formatPercent,
  toDayKey
} from '../utils'

const DEFAULT_PLANNED = 50

export default function FocusTab({ onCountsChanged }: { onCountsChanged?: () => void } = {}) {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()

  const [tick, setTick] = useState(0)
  const [startForm, setStartForm] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [kind, setKind] = useState('flow')
  const [plannedMinutes, setPlannedMinutes] = useState(String(DEFAULT_PLANNED))
  const [billable, setBillable] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [rangeDays, setRangeDays] = useState('30')
  const [manualForm, setManualForm] = useState<{
    id?: string
    projectId: string
    taskId: string
    minutes: string
    startedAt: string
    billable: boolean
    note: string
  } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)

  const active = useAsync<any>(() => window.api.personal.focus.getActive(), [])
  const range = useMemo(() => {
    const days = Number(rangeDays) || 30
    const to = new Date()
    const from = new Date(Date.now() - (days - 1) * 86_400_000)
    return { from: toDayKey(from), to: toDayKey(to) }
  }, [rangeDays])

  const stats = useAsync<any>(
    () => window.api.personal.focus.getStats(range),
    [range.from, range.to]
  )
  const profitability = useAsync<any[]>(
    () => window.api.personal.focus.getProjectProfitability(range),
    [range.from, range.to]
  )
  const sessions = useAsync<any>(() => window.api.personal.focus.getSessions({ pageSize: 100 }), [])
  const projects = useAsync<any>(() => window.api.personal.projects.getAll({ pageSize: 200 }), [])
  const tasks = useAsync<any>(
    () => window.api.personal.tasks.getAll({ openOnly: true, pageSize: 300 }),
    []
  )

  // The active session's elapsed time comes from the clock, not the payload.
  useEffect(() => {
    if (!active.data) return
    intervalRef.current = window.setInterval(() => setTick((value) => value + 1), 30_000)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [active.data])

  const elapsedMinutes = useMemo(() => {
    if (!active.data) return 0
    void tick
    return Math.max(
      0,
      Math.round((Date.now() - new Date(active.data.startedAt).getTime()) / 60_000)
    )
  }, [active.data, tick])

  const remainingMinutes = active.data
    ? Math.max(0, Number(active.data.plannedMinutes) - elapsedMinutes)
    : 0
  const percent = active.data?.plannedMinutes
    ? Math.min(100, (elapsedMinutes / Number(active.data.plannedMinutes)) * 100)
    : 0

  const projectOptions = useMemo(
    () =>
      rowsOf<any>(projects.data).map((project) => ({
        value: project.id,
        label: `${project.code} · ${project.title}`
      })),
    [projects.data]
  )
  const taskOptions = useMemo(
    () =>
      rowsOf<any>(tasks.data)
        .filter((task) => !projectId || task.projectId === projectId)
        .map((task) => ({ value: task.id, label: task.title })),
    [tasks.data, projectId]
  )
  const sessionRows = useMemo(() => rowsOf<any>(sessions.data), [sessions.data])
  const profitRows: any[] = Array.isArray(profitability.data) ? profitability.data : []
  const dailyStats: any[] = stats.data?.days ?? []
  const maxDayMinutes = dailyStats.reduce((max, day) => Math.max(max, Number(day.minutes ?? 0)), 0)

  const reloadAll = useCallback(() => {
    active.reload()
    stats.reload()
    profitability.reload()
    sessions.reload()
    onCountsChanged?.()
  }, [active, stats, profitability, sessions, onCountsChanged])

  const start = async () => {
    setBusy(true)
    try {
      await window.api.personal.focus.start({
        projectId: projectId || null,
        taskId: taskId || null,
        kind,
        plannedMinutes: Number(plannedMinutes) || DEFAULT_PLANNED,
        billable,
        note: note || null
      })
      toast.success(t('pwTimerStarted'))
      setStartForm(false)
      setNote('')
      reloadAll()
      void refreshQuietRuntime()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    setBusy(true)
    try {
      const result = await window.api.personal.focus.stop({
        id: active.data?.id,
        actualMinutes: elapsedMinutes > 0 ? elapsedMinutes : undefined
      })
      toast.success(
        `${t('pwTimerStopped')} · ${formatMinutes(result?.actualMinutes ?? elapsedMinutes)}`
      )
      reloadAll()
      void refreshQuietRuntime()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    setBusy(true)
    try {
      await window.api.personal.focus.cancel(active.data?.id)
      toast.warning(t('pwTimerCancelled'))
      reloadAll()
      void refreshQuietRuntime()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const openManual = () =>
    setManualForm({
      projectId: '',
      taskId: '',
      minutes: '60',
      startedAt: toDayKey(new Date()),
      billable: true,
      note: ''
    })

  const saveManual = async () => {
    if (!manualForm) return
    setBusy(true)
    try {
      const payload: any = {
        projectId: manualForm.projectId || null,
        taskId: manualForm.taskId || null,
        minutes: Number(manualForm.minutes) || 0,
        startedAt: manualForm.startedAt || undefined,
        billable: manualForm.billable,
        note: manualForm.note || null,
        kind: 'manual'
      }
      if (manualForm.id) await window.api.personal.focus.update({ id: manualForm.id, ...payload })
      else await window.api.personal.focus.addManual(payload)
      toast.success(manualForm.id ? t('pwSessionUpdated') : t('pwSessionAdded'))
      setManualForm(null)
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirmId) return
    try {
      await window.api.personal.focus.delete(confirmId)
      toast.success(t('pwSessionDeleted'))
      setConfirmId(null)
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const editSession = (session: any) =>
    setManualForm({
      id: session.id,
      projectId: session.projectId ?? '',
      taskId: session.taskId ?? '',
      minutes: String(session.actualMinutes ?? 0),
      startedAt: session.startedAt ? toDayKey(session.startedAt) : toDayKey(new Date()),
      billable: Boolean(session.billable),
      note: session.note ?? ''
    })

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        icon={<Timer className="h-4 w-4" />}
        title={t('pwTabFocus')}
        description={t('pwFocusHint')}
        actions={
          <>
            <CustomSelect
              size="sm"
              value={rangeDays}
              onChange={(value) => setRangeDays(String(value))}
              options={[
                { value: '7', label: `7 ${t('pwDays')}` },
                { value: '30', label: `30 ${t('pwDays')}` },
                { value: '90', label: `90 ${t('pwDays')}` }
              ]}
            />
            <Button
              size="sm"
              variant="secondary"
              aria-label={t('pwRefresh')}
              title={t('pwRefresh')}
              onClick={reloadAll}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="secondary" onClick={openManual}>
              <Plus className="h-3.5 w-3.5" />
              {t('pwAddManual')}
            </Button>
          </>
        }
      />

      <KpiSection sectionKey="personal:focus-KpiStrip" label={t('pwTabFocus')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiTrackedHours')}
            value={formatHours(stats.data?.totalMinutes ?? 0)}
            sub={`${formatNumber(stats.data?.sessionCount)} ${t('pwSessions')}`}
            icon={<Timer className="h-4 w-4" />}
            tone="accent"
          />
          <StatCard
            label={t('pwKpiBillableShare')}
            value={formatPercent(stats.data?.billablePercent, 1)}
            sub={formatHours(stats.data?.billableMinutes ?? 0)}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="success"
          />
          <StatCard
            label={t('pwKpiWeeklyAvg')}
            value={`${formatNumber(stats.data?.weeklyAverageHours, 1)}h`}
            sub={`${t('pwOf')} ${formatNumber(stats.data?.capacityHours, 1)}h`}
            icon={<Zap className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiAvgSession')}
            value={formatMinutes(stats.data?.averageSessionMinutes)}
            sub={`${formatNumber(stats.data?.interruptions)} ${t('pwInterruptions')}`}
            icon={<Clock className="h-4 w-4" />}
            tone={(stats.data?.interruptions ?? 0) > 5 ? 'warning' : 'default'}
          />
        </MetricStrip>
      </KpiSection>

      {/* ── Timer ─────────────────────────────────────────────────────────── */}
      <SectionCard
        title={t('pwDeepWorkTimer')}
        description={t('pwDeepWorkHint')}
        icon={<Timer className="h-3.5 w-3.5" />}
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          {active.data ? (
            <>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={MICRO_LABEL}>{t('pwRunning')}</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {active.data.project?.title ?? t('pwNoProject')}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {active.data.kind} · {t('pwStarted')} {formatDate(active.data.startedAt)}
                  </span>
                </div>
                <StatusPill tone={active.data.billable ? 'success' : 'neutral'}>
                  {active.data.billable ? t('pwBillable') : t('pwNonBillable')}
                </StatusPill>
              </div>

              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold tabular-nums tracking-tight text-[color:var(--accent-text)]">
                  {formatMinutes(elapsedMinutes)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {remainingMinutes > 0
                    ? `${formatMinutes(remainingMinutes)} ${t('pwRemaining')}`
                    : `${t('pwOverrun')} ${formatMinutes(elapsedMinutes - Number(active.data.plannedMinutes))}`}
                </span>
              </div>

              <ProgressBar
                percent={percent}
                label={`${formatMinutes(elapsedMinutes)} / ${formatMinutes(active.data.plannedMinutes)}`}
                level={percent >= 100 ? 'amber' : 'clear'}
              />

              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="success" loading={busy} onClick={stop}>
                  <Square className="h-3.5 w-3.5" />
                  {t('pwStop')}
                </Button>
                <Button size="sm" variant="danger" loading={busy} onClick={cancel}>
                  {t('pwDiscard')}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]">
                  <Pause className="h-4 w-4" />
                </span>
                <div>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                    {t('pwTimerIdle')}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {t('pwTimerIdleHint')}
                  </span>
                </div>
              </div>
              <Button size="sm" onClick={() => setStartForm(true)}>
                <Play className="h-3.5 w-3.5" />
                {t('pwStartTimer')}
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Do not disturb ────────────────────────────────────────────────── */}
      <QuietModePanel />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Daily tracked time ──────────────────────────────────────────── */}
        <SectionCard title={t('pwTrackedByDay')} icon={<Timer className="h-3.5 w-3.5" />}>
          {dailyStats.length === 0 ? (
            <EmptyState
              loading={stats.loading}
              message={t('pwNoSessions')}
              icon={<Timer className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-2.5">
              {dailyStats.slice(-14).map((day) => (
                <div key={day.day} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-500 dark:text-slate-400">{day.day}</span>
                    <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                      {formatMinutes(day.minutes)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-[color:var(--accent)]"
                      style={{
                        width: `${maxDayMinutes ? (Number(day.minutes) / maxDayMinutes) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Real rate per project ───────────────────────────────────────── */}
        <SectionCard
          title={t('pwProfitability')}
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          description={t('pwProfitabilityHint')}
        >
          {profitRows.length === 0 ? (
            <EmptyState
              loading={profitability.loading}
              message={t('pwNoProfitability')}
              icon={<TrendingDown className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-1">
              {profitRows.map((row) => (
                <ListRow
                  key={row.projectId}
                  variant="plain"
                  title={row.title}
                  subtitle={row.clientName}
                  trailing={
                    <>
                      <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatMoney(row.realHourlyRate, row.currency)}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          /h
                        </span>
                      </span>
                      <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {formatMoney(row.moneyReceived, row.currency)} ·{' '}
                        {formatNumber(row.realHours, 2)}h
                      </span>
                      <span
                        className={`text-xs font-medium tabular-nums ${
                          Number(row.vsBaselinePercent) >= 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatPercent(row.vsBaselinePercent)}
                      </span>
                      <StatusPill tone={verdictTone(row.verdict)} dot={false}>
                        {row.verdict}
                      </StatusPill>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Session log ───────────────────────────────────────────────────── */}
      <SectionCard
        title={t('pwSessionLog')}
        icon={<Clock className="h-3.5 w-3.5" />}
        description={t('pwSessionLogHint')}
      >
        {sessionRows.length === 0 ? (
          <EmptyState
            loading={sessions.loading}
            message={t('pwNoSessions')}
            icon={<Clock className="h-5 w-5" />}
          />
        ) : (
          <Table dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pwStarted')}</TableHead>
                <TableHead>{t('pwColProject')}</TableHead>
                <TableHead>{t('pwDuration')}</TableHead>
                <TableHead>{t('pwPlanned')}</TableHead>
                <TableHead>{t('pwBillable')}</TableHead>
                <TableHead>{t('pwColActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionRows.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {formatDate(session.startedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {session.project?.title ?? t('pwNoProject')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      {session.endedAt ? formatMinutes(session.actualMinutes) : t('pwRunning')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                      {formatMinutes(session.plannedMinutes)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={session.billable ? 'success' : 'neutral'}>
                      {session.billable ? t('pwBillable') : t('pwNonBillable')}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="xs"
                        variant="secondary"
                        aria-label={t('pwEdit')}
                        title={t('pwEdit')}
                        onClick={() => editSession(session)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="xs"
                        variant="danger"
                        aria-label={t('pwDelete')}
                        title={t('pwDelete')}
                        onClick={() => setConfirmId(session.id)}
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

      {/* ── Start timer ───────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={startForm}
        onClose={() => setStartForm(false)}
        title={t('pwStartTimer')}
        size="md"
      >
        <div className="space-y-4">
          <FormSection title={t('pwFormBasics')}>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('pwProject')}
              </span>
              <CustomSelect
                size="sm"
                value={projectId}
                onChange={(value) => {
                  setProjectId(String(value))
                  setTaskId('')
                }}
                options={projectOptions}
                placeholder={t('pwNoProject')}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('pwTask')}
              </span>
              <CustomSelect
                size="sm"
                value={taskId}
                onChange={(value) => setTaskId(String(value))}
                options={taskOptions}
                placeholder={t('pwNoTask')}
              />
            </label>
          </FormSection>

          <FormSection title={t('pwFormSchedule')}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwFocusKind')}
                </span>
                <CustomSelect
                  size="sm"
                  value={kind}
                  onChange={(value) => setKind(String(value))}
                  options={asSelectOptions(config.data?.focusKinds, language)}
                />
              </label>
              <FormInput
                size="sm"
                label={t('pwPlanned')}
                type="number"
                value={plannedMinutes}
                onChange={setPlannedMinutes}
                helperText={t('pwPlannedHint')}
              />
            </div>
          </FormSection>

          <FormSection title={t('pwFormFlags')}>
            <label className="inline-flex h-7 items-center gap-2 rounded-lg px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={billable}
                onChange={(event) => setBillable(event.target.checked)}
                className="h-4 w-4 accent-[color:var(--accent)]"
              />
              {t('pwBillable')}
            </label>
          </FormSection>

          <ModalFooter>
            <Button size="sm" variant="secondary" onClick={() => setStartForm(false)}>
              {t('pwCancel')}
            </Button>
            <Button size="sm" loading={busy} onClick={start}>
              <Play className="h-3.5 w-3.5" />
              {t('pwStart')}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Manual session ────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(manualForm)}
        onClose={() => setManualForm(null)}
        title={manualForm?.id ? t('pwEditSession') : t('pwAddManual')}
        size="md"
      >
        {manualForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwProject')}
                </span>
                <CustomSelect
                  size="sm"
                  value={manualForm.projectId}
                  onChange={(value) => setManualForm({ ...manualForm, projectId: String(value) })}
                  options={projectOptions}
                  placeholder={t('pwNoProject')}
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwMinutes')}
                  type="number"
                  value={manualForm.minutes}
                  onChange={(v) => setManualForm({ ...manualForm, minutes: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwStarted')}
                  type="date"
                  value={manualForm.startedAt}
                  onChange={(v) => setManualForm({ ...manualForm, startedAt: v })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <label className="inline-flex h-7 items-center gap-2 rounded-lg px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={manualForm.billable}
                  onChange={(event) =>
                    setManualForm({ ...manualForm, billable: event.target.checked })
                  }
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
                {t('pwBillable')}
              </label>
            </FormSection>

            <FormSection title={t('pwNote')}>
              <textarea
                rows={2}
                value={manualForm.note}
                onChange={(event) => setManualForm({ ...manualForm, note: event.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setManualForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" loading={busy} onClick={saveManual}>
                <Save className="h-3.5 w-3.5" />
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        dense
        isOpen={Boolean(confirmId)}
        message={t('pwDeleteSessionConfirm')}
        confirmLabel={t('pwDelete')}
        cancelLabel={t('pwCancel')}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}

function verdictTone(verdict: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (verdict === 'excellent' || verdict === 'healthy') return 'success'
  if (verdict === 'loss') return 'danger'
  if (verdict === 'thin') return 'warning'
  return 'neutral'
}
