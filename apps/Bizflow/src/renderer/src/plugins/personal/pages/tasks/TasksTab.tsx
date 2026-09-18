import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Clock,
  ListChecks,
  MinusSquare,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  RotateCcw,
  Square,
  Star,
  Trash2,
  X
} from 'lucide-react'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import StatCard from '../components/StatCard'
import SectionCard from '../components/SectionCard'
import EmptyState from '../components/EmptyState'
import Toolbar, { SearchField } from '../components/Toolbar'
import FilterPresets from '../components/FilterPresets'
import UndoStrip from '../components/UndoStrip'
import PageHeader from '../components/PageHeader'
import MetricStrip from '../components/MetricStrip'
import ListRow from '../components/ListRow'
import StatusPill, { statusToneOf } from '../components/StatusPill'
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
import { useFilterPresets } from '../hooks/useFilterPresets'
import { useUndoBar } from '../hooks/useUndoBar'
import {
  asSelectOptions,
  daysFromToday,
  formatDate,
  formatMinutes,
  formatNumber,
  statusBadgeVariant,
  toDayKey
} from '../utils'

const EMPTY_TASK = {
  id: '',
  projectId: '',
  clientId: '',
  title: '',
  notes: '',
  status: 'backlog',
  type: 'deliverable',
  priority: '3',
  estimateMinutes: '',
  dueDate: '',
  isBillable: true,
  isDailyThree: false
}

/** The slice of tab state a saved view captures. */
type TaskView = { search: string; status: string; openOnly: boolean }

export default function TasksTab({ onCountsChanged }: { onCountsChanged?: () => void } = {}) {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openOnly, setOpenOnly] = useState(true)
  const [form, setForm] = useState<typeof EMPTY_TASK | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const views = useFilterPresets<TaskView>('tasks')
  const undo = useUndoBar()

  const daily = useAsync<any>(() => window.api.personal.tasks.getDailyThree(), [])
  const counts = useAsync<any>(() => window.api.personal.tasks.getCounts(), [])
  const list = useAsync<any>(
    () =>
      window.api.personal.tasks.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        openOnly: openOnly && !statusFilter ? true : undefined,
        pageSize: 300
      }),
    [search, statusFilter, openOnly]
  )
  const projects = useAsync<any>(() => window.api.personal.projects.getAll({ pageSize: 200 }), [])
  const clients = useAsync<any>(() => window.api.personal.clients.getAll({ pageSize: 200 }), [])

  const rows = useMemo(() => rowsOf<any>(list.data), [list.data])
  const dailyItems: any[] = daily.data?.items ?? []
  const suggestions = useMemo(
    () =>
      rows
        .filter(
          (task) => !task.isDailyThree && task.status !== 'done' && task.status !== 'cancelled'
        )
        .slice(0, 5),
    [rows]
  )

  const projectOptions = useMemo(
    () =>
      rowsOf<any>(projects.data).map((project) => ({
        value: project.id,
        label: `${project.code} · ${project.title}`
      })),
    [projects.data]
  )
  const clientOptions = useMemo(
    () => rowsOf<any>(clients.data).map((client) => ({ value: client.id, label: client.name })),
    [clients.data]
  )

  const reloadAll = () => {
    daily.reload()
    counts.reload()
    list.reload()
    onCountsChanged?.()
  }

  const openCreate = () => setForm({ ...EMPTY_TASK, dueDate: toDayKey(new Date()) })

  // Opened from the command palette's "New task".
  useIntent('task', openCreate)

  const currentView = useMemo<TaskView>(
    () => ({ search, status: statusFilter, openOnly }),
    [search, statusFilter, openOnly]
  )

  const applyView = (filters: TaskView) => {
    setSearch(filters.search)
    setStatusFilter(filters.status)
    setOpenOnly(filters.openOnly)
  }

  // A selection must never outlive the rows it points at (filter change, reload, delete).
  useEffect(() => {
    const visible = new Set(rows.map((task) => task.id))
    setSelected((prev) =>
      prev.some((id) => !visible.has(id)) ? prev.filter((id) => visible.has(id)) : prev
    )
  }, [rows])

  const allSelected = rows.length > 0 && selected.length === rows.length
  const someSelected = selected.length > 0 && !allSelected

  const toggleRow = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )

  const toggleAll = () => setSelected(allSelected ? [] : rows.map((task) => task.id))

  const runBulk = async (
    action: 'complete' | 'reopen' | 'pin' | 'unpin' | 'delete',
    ids: string[] = selected
  ) => {
    if (!ids.length || bulkBusy) return
    setBulkBusy(true)
    try {
      const result = await window.api.personal.tasks.bulk({ ids, action })
      const affected = result?.affected ?? 0
      const skipped = result?.skipped ?? 0
      if (affected) toast.success(t('pwBulkDone', { count: affected }))
      if (skipped) toast.warning(t('pwBulkSkipped', { count: skipped }))
      setSelected([])
      reloadAll()
      // Completing a batch is the one bulk action people immediately regret.
      if (action === 'complete' && affected) {
        undo.show(t('pwUndoBulkComplete', { count: affected }), () => runBulk('reopen', ids))
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Bulk action failed')
    } finally {
      setBulkBusy(false)
      setBulkConfirm(false)
    }
  }

  const openEdit = (task: any) =>
    setForm({
      id: task.id,
      projectId: task.projectId ?? '',
      clientId: task.clientId ?? '',
      title: task.title ?? '',
      notes: task.notes ?? '',
      status: task.status ?? 'backlog',
      type: task.type ?? 'deliverable',
      priority: String(task.priority ?? 3),
      estimateMinutes: task.estimateMinutes == null ? '' : String(task.estimateMinutes),
      dueDate: task.dueDate ? toDayKey(task.dueDate) : '',
      isBillable: task.isBillable ?? true,
      isDailyThree: Boolean(task.isDailyThree)
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
        projectId: form.projectId || null,
        clientId: form.clientId || null,
        title: form.title.trim(),
        notes: form.notes || null,
        status: form.status,
        type: form.type,
        priority: Number(form.priority) || 3,
        estimateMinutes: form.estimateMinutes === '' ? 0 : Number(form.estimateMinutes),
        dueDate: form.dueDate || null,
        isBillable: form.isBillable
      }
      if (form.id) {
        await window.api.personal.tasks.update({
          id: form.id,
          ...payload,
          isDailyThree: form.isDailyThree
        })
        toast.success(t('pwTaskUpdated'))
      } else {
        await window.api.personal.tasks.create({ ...payload, isDailyThree: form.isDailyThree })
        toast.success(t('pwTaskCreated'))
      }
      setForm(null)
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (task: any, value: boolean) => {
    try {
      await window.api.personal.tasks.setDailyThree({ id: task.id, value })
      toast.success(value ? t('pwTaskPinned') : t('pwTaskUnpinned'))
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const complete = async (task: any) => {
    try {
      await window.api.personal.tasks.complete({ id: task.id })
      toast.success(t('pwTaskCompleted'))
      reloadAll()
      undo.show(t('pwUndoTaskComplete'), () => reopen(task))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const reopen = async (task: any) => {
    try {
      await window.api.personal.tasks.reopen(task.id)
      toast.success(t('pwTaskReopened'))
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const rollDay = async () => {
    try {
      const result = await window.api.personal.tasks.rollDay()
      toast.success(`${t('pwDayRolled')} · ${formatNumber(result?.rolled)}`)
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const remove = async () => {
    if (!confirmId) return
    try {
      await window.api.personal.tasks.delete(confirmId)
      toast.success(t('pwTaskDeleted'))
      setConfirmId(null)
      reloadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const priorityTone = (priority: number) => {
    if (priority <= 1) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
    if (priority === 2)
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        icon={<ListChecks className="h-4 w-4" />}
        title={t('pwTabTasks')}
        description={t('pwTasksHint')}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={rollDay}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t('pwRollDay')}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              {t('pwAddTask')}
            </Button>
          </>
        }
      />

      <KpiSection sectionKey="personal:tasks-KpiStrip" label={t('pwTabTasks')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwDailyThree')}
            value={`${daily.data?.filled ?? 0} / ${daily.data?.limit ?? 3}`}
            sub={`${formatNumber(daily.data?.slotsLeft)} ${t('pwSlotsFree')}`}
            icon={<Star className="h-4 w-4" />}
            tone="accent"
          />
          <StatCard
            label={t('pwKpiDueToday')}
            value={formatNumber(counts.data?.dueToday)}
            icon={<CalendarClock className="h-4 w-4" />}
            tone={(counts.data?.dueToday ?? 0) > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label={t('pwKpiOverdueTasks')}
            value={formatNumber(counts.data?.overdue)}
            icon={<Clock className="h-4 w-4" />}
            tone={(counts.data?.overdue ?? 0) > 0 ? 'danger' : 'success'}
          />
          <StatCard
            label={t('pwKpiOpenTasks')}
            value={formatNumber(
              Object.entries(counts.data?.byStatus ?? {})
                .filter(([status]) => status !== 'done' && status !== 'cancelled')
                .reduce((sum, [, value]) => sum + Number(value), 0)
            )}
            icon={<ListChecks className="h-4 w-4" />}
          />
        </MetricStrip>
      </KpiSection>

      {/* ── Daily 3 ───────────────────────────────────────────────────────── */}
      <SectionCard
        title={t('pwDailyThreeBoard')}
        icon={<Star className="h-3.5 w-3.5" />}
        description={t('pwDailyThreeHint')}
        actions={
          <StatusPill tone={(daily.data?.slotsLeft ?? 0) > 0 ? 'accent' : 'success'} dot={false}>
            {`${t('pwSlotsFree')} ${formatNumber(daily.data?.slotsLeft)} / ${daily.data?.limit ?? 3}`}
          </StatusPill>
        }
      >
        {dailyItems.length === 0 && daily.loading ? (
          <EmptyState loading loadingLabel={t('pwLoading')} />
        ) : (
          <ol className="space-y-2">
            {dailyItems.map((task, index) => (
              <li key={task.id}>
                <ListRow
                  variant="plain"
                  className="border border-[color:var(--accent-line)] bg-[color:var(--accent-tint)]"
                  icon={
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent)] text-[10px] font-semibold tabular-nums text-white">
                      {index + 1}
                    </span>
                  }
                  title={
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{task.title}</span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${priorityTone(task.priority)}`}
                      >
                        P{task.priority}
                      </span>
                    </span>
                  }
                  subtitle={`${task.project?.title ?? t('pwNoProject')} · ${formatMinutes(task.trackedMinutes)} / ${formatMinutes(task.estimateMinutes)}${task.dueDate ? ` · ${formatDate(task.dueDate)}` : ''}`}
                  trailing={
                    <>
                      <StatusPill tone={statusToneOf(statusBadgeVariant(task.status))}>
                        {task.status}
                      </StatusPill>
                      <Button size="sm" variant="success" onClick={() => complete(task)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('pwComplete')}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => togglePin(task, false)}>
                        <PinOff className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  }
                />
              </li>
            ))}

            {/* The board never grows past three slots, so the gaps are shown. */}
            {Array.from({ length: Math.max(0, (daily.data?.limit ?? 3) - dailyItems.length) }).map(
              (_, index) => (
                <li
                  key={`slot-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 px-2 py-2 dark:border-slate-700"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] font-semibold tabular-nums text-slate-400 dark:border-slate-600 dark:text-slate-500">
                    {dailyItems.length + index + 1}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {t('pwDailyThreeEmpty')}
                  </span>
                </li>
              )
            )}
          </ol>
        )}

        {suggestions.length > 0 && (daily.data?.slotsLeft ?? 0) > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700/70">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('pwSuggestions')}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => togglePin(task, true)}
                  disabled={(daily.data?.slotsLeft ?? 0) <= 0}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-[color:var(--accent-line)] hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Pin className="h-3 w-3" />
                  <span className="max-w-[16rem] truncate">{task.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── All tasks ─────────────────────────────────────────────────────── */}
      <SectionCard title={t('pwTasksTitle')} description={t('pwTasksHint')}>
        <Toolbar
          end={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => list.reload()}
              aria-label={t('pwRefresh')}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <SearchField value={search} onChange={setSearch} placeholder={t('pwSearchTasks')} />
          <CustomSelect
            size="sm"
            value={statusFilter}
            onChange={(value) => setStatusFilter(String(value))}
            options={asSelectOptions(config.data?.taskStatuses, language)}
            placeholder={t('pwAllStatuses')}
          />
          <button
            type="button"
            onClick={() => setOpenOnly((value) => !value)}
            className={`h-7 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] ${
              openOnly
                ? 'border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t('pwOpenOnly')}
          </button>
          <FilterPresets
            presets={views.presets}
            current={currentView}
            onApply={applyView}
            onSave={(name) => views.save(name, currentView)}
            onRemove={views.remove}
          />
        </Toolbar>

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] px-3 py-2">
            <span className="text-xs font-semibold text-[color:var(--accent-text)]">
              {t('pwBulkSelected', { count: selected.length })}
            </span>
            <div className="ms-auto flex flex-wrap items-center gap-1.5">
              <Button
                size="xs"
                variant="success"
                disabled={bulkBusy}
                onClick={() => runBulk('complete')}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('pwBulkComplete')}
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={bulkBusy}
                onClick={() => runBulk('reopen')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('pwBulkReopen')}
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={bulkBusy}
                onClick={() => runBulk('pin')}
              >
                <Pin className="h-3.5 w-3.5" />
                {t('pwBulkPin')}
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={bulkBusy}
                onClick={() => runBulk('unpin')}
              >
                <PinOff className="h-3.5 w-3.5" />
                {t('pwBulkUnpin')}
              </Button>
              <Button
                size="xs"
                variant="danger"
                disabled={bulkBusy}
                onClick={() => setBulkConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('pwBulkDelete')}
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={bulkBusy}
                onClick={() => setSelected([])}
              >
                <X className="h-3.5 w-3.5" />
                {t('pwBulkClear')}
              </Button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            loading={list.loading}
            message={t('pwNoTasks')}
            icon={<ListChecks className="h-5 w-5" />}
          />
        ) : (
          <Table dense>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4 pr-0">
                  <button
                    type="button"
                    onClick={toggleAll}
                    aria-label={t('pwSelectAll')}
                    aria-pressed={allSelected}
                    className="-m-1 rounded-md p-1 align-middle text-slate-400 transition-colors hover:text-[color:var(--accent-text)]"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : someSelected ? (
                      <MinusSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>{t('pwTask')}</TableHead>
                <TableHead>{t('pwColProject')}</TableHead>
                <TableHead>{t('pwDueDate')}</TableHead>
                <TableHead>{t('pwPriority')}</TableHead>
                <TableHead>{t('pwColStatus')}</TableHead>
                <TableHead>{t('pwColActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((task) => {
                const overdue =
                  task.dueDate &&
                  task.status !== 'done' &&
                  task.status !== 'cancelled' &&
                  (daysFromToday(task.dueDate) ?? 0) < 0
                const isSelected = selected.includes(task.id)
                return (
                  <TableRow
                    key={task.id}
                    className={isSelected ? 'bg-[color:var(--accent-tint)]' : undefined}
                  >
                    <TableCell className="pl-4 pr-0">
                      <button
                        type="button"
                        onClick={() => toggleRow(task.id)}
                        aria-label={`${t('pwSelectRow')}: ${task.title}`}
                        aria-pressed={isSelected}
                        className={`-m-1 rounded-md p-1 align-middle transition-colors ${
                          isSelected
                            ? 'text-[color:var(--accent-text)]'
                            : 'text-slate-400 hover:text-[color:var(--accent-text)]'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {task.isDailyThree && (
                          <Star className="h-3 w-3 shrink-0 text-[color:var(--accent-text)]" />
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {task.title}
                        </span>
                      </div>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {task.type}
                        {task.isBillable ? ` · ${t('pwBillable')}` : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {task.project?.title ?? task.client?.name ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs ${overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}
                      >
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityTone(task.priority)}`}
                      >
                        P{task.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={statusToneOf(statusBadgeVariant(task.status))}>
                        {task.status}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {task.status === 'done' ? (
                          <Button size="sm" variant="secondary" onClick={() => reopen(task)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="success" onClick={() => complete(task)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => togglePin(task, !task.isDailyThree)}
                            >
                              {task.isDailyThree ? (
                                <PinOff className="h-3.5 w-3.5" />
                              ) : (
                                <Pin className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => openEdit(task)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmId(task.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* ── Create / edit ─────────────────────────────────────────────────── */}
      <Modal
        dense
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? t('pwEditTask') : t('pwAddTask')}
        size="lg"
      >
        {form && (
          <div className="space-y-5">
            <FormSection title={t('pwFormBasics')}>
              <FormInput
                size="sm"
                label={t('pwTitle')}
                required
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwProject')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.projectId}
                    onChange={(value) => setForm({ ...form, projectId: String(value) })}
                    options={projectOptions}
                    placeholder={t('pwNoProject')}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwClient')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.clientId}
                    onChange={(value) => setForm({ ...form, clientId: String(value) })}
                    options={clientOptions}
                    placeholder={t('pwNoClient')}
                  />
                </label>
              </div>
            </FormSection>

            <FormSection title={t('pwFormSchedule')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwStatus')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.status}
                    onChange={(value) => setForm({ ...form, status: String(value) })}
                    options={asSelectOptions(config.data?.taskStatuses, language)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwTaskType')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.type}
                    onChange={(value) => setForm({ ...form, type: String(value) })}
                    options={asSelectOptions(config.data?.taskTypes, language)}
                  />
                </label>
                <FormInput
                  size="sm"
                  label={t('pwPriority')}
                  type="number"
                  value={form.priority}
                  onChange={(v) => setForm({ ...form, priority: v })}
                  helperText={t('pwPriorityHint')}
                />
                <FormInput
                  size="sm"
                  label={t('pwEstimateMinutes')}
                  type="number"
                  value={form.estimateMinutes}
                  onChange={(v) => setForm({ ...form, estimateMinutes: v })}
                />
                <FormInput
                  size="sm"
                  label={t('pwDueDate')}
                  type="date"
                  value={form.dueDate}
                  onChange={(v) => setForm({ ...form, dueDate: v })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isBillable}
                    onChange={(event) => setForm({ ...form, isBillable: event.target.checked })}
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  {t('pwBillable')}
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isDailyThree}
                    onChange={(event) => setForm({ ...form, isDailyThree: event.target.checked })}
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  {t('pwPinDailyThree')}
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwNote')}
                </span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
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

      <ConfirmDialog
        dense
        isOpen={Boolean(confirmId)}
        message={t('pwDeleteTaskConfirm')}
        confirmLabel={t('pwDelete')}
        cancelLabel={t('pwCancel')}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />

      <ConfirmDialog
        dense
        isOpen={bulkConfirm}
        message={t('pwBulkDeleteConfirm', { count: selected.length })}
        confirmLabel={t('pwDelete')}
        cancelLabel={t('pwCancel')}
        onConfirm={() => runBulk('delete')}
        onCancel={() => setBulkConfirm(false)}
      />

      <UndoStrip offer={undo.offer} onUndo={undo.undo} onDismiss={undo.dismiss} />
    </div>
  )
}
