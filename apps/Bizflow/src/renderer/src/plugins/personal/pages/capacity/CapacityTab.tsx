import { useMemo, useState } from 'react'
import {
  Ban,
  CalendarClock,
  CalendarRange,
  Gauge,
  Plus,
  RefreshCw,
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
import ProgressBar from '../components/ProgressBar'
import Toolbar from '../components/Toolbar'
import PageHeader from '../components/PageHeader'
import MetricStrip from '../components/MetricStrip'
import StatusPill, { statusToneOf } from '../components/StatusPill'
import ListRow from '../components/ListRow'
import { FormSection, ModalFooter } from '../components/FormSection'
import { MICRO_LABEL } from '../components/base'
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
  USAGE_LEVEL_STYLES,
  USAGE_LEVEL_TEXT_STYLES,
  addDays,
  asSelectOptions,
  formatDate,
  formatHours,
  formatMinutes,
  formatNumber,
  formatPercent,
  levelBadgeVariant,
  toDayKey
} from '../utils'

type Panel = 'heatmap' | 'workloads' | 'blackouts'

const PANELS: Array<{ id: Panel; label: string }> = [
  { id: 'heatmap', label: 'pwCapacityPanel_heatmap' },
  { id: 'workloads', label: 'pwCapacityPanel_workloads' },
  { id: 'blackouts', label: 'pwCapacityPanel_blackouts' }
]

const EMPTY_WORKLOAD = {
  id: '',
  projectId: '',
  day: '',
  plannedMinutes: 120,
  isCommitted: true,
  note: ''
}

const EMPTY_BLACKOUT = {
  id: '',
  title: '',
  kind: 'vacation',
  startDate: '',
  endDate: '',
  blocksDelivery: true,
  note: ''
}

export default function CapacityTab() {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()

  const [panel, setPanel] = useState<Panel>('heatmap')
  const [from, setFrom] = useState(() => toDayKey(addDays(new Date(), -7)))
  const [to, setTo] = useState(() => toDayKey(addDays(new Date(), 21)))
  const [workloadForm, setWorkloadForm] = useState<typeof EMPTY_WORKLOAD | null>(null)
  const [blackoutForm, setBlackoutForm] = useState<typeof EMPTY_BLACKOUT | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<{ kind: 'workload' | 'blackout'; id: string } | null>(null)
  const [conflictForm, setConflictForm] = useState({
    from: toDayKey(new Date()),
    minutesPerDay: 240,
    totalMinutes: 1200
  })
  const [conflict, setConflict] = useState<any | null>(null)
  const [conflictBusy, setConflictBusy] = useState(false)
  const [suggestion, setSuggestion] = useState<any | null>(null)
  const [suggestBusy, setSuggestBusy] = useState(false)

  const heatmap = useAsync<any>(
    () => window.api.personal.capacity.getHeatmap({ from, to }),
    [from, to]
  )
  const status = useAsync<any>(() => window.api.personal.capacity.getStatus(), [])
  const workloads = useAsync<any>(
    () => window.api.personal.capacity.getWorkloads({ from, to }),
    [from, to]
  )
  const blackouts = useAsync<any>(() => window.api.personal.capacity.getBlackouts(), [])
  const projects = useAsync<any>(() => window.api.personal.projects.getAll({ pageSize: 200 }), [])

  const days: any[] = useMemo(
    () => (Array.isArray(heatmap.data?.days) ? heatmap.data.days : []),
    [heatmap.data]
  )
  const totals = heatmap.data?.totals ?? {}
  const projectOptions = useMemo(
    () =>
      rowsOf<any>(projects.data).map((project) => ({
        value: project.id,
        label: `${project.code} · ${project.title}`
      })),
    [projects.data]
  )
  const workloadRows = useMemo(() => rowsOf<any>(workloads.data), [workloads.data])
  const blackoutRows = useMemo(() => rowsOf<any>(blackouts.data), [blackouts.data])
  const kindOptions = useMemo(
    () => asSelectOptions(config.data?.blackoutKinds, language),
    [config.data, language]
  )

  const refreshAll = () => {
    heatmap.reload()
    status.reload()
    workloads.reload()
    blackouts.reload()
  }

  const dayMinutes = (dayKeyValue: string) =>
    workloadRows
      .filter((row) => toDayKey(row.day) === dayKeyValue)
      .reduce((sum, row) => sum + Number(row.plannedMinutes ?? 0), 0)

  const openWorkloadForDay = (dayKeyValue: string) =>
    setWorkloadForm({ ...EMPTY_WORKLOAD, day: dayKeyValue })

  const openWorkload = (row: any) =>
    setWorkloadForm({
      id: row.id,
      projectId: row.projectId ?? '',
      day: toDayKey(row.day),
      plannedMinutes: Number(row.plannedMinutes ?? 0),
      isCommitted: row.isCommitted !== false,
      note: row.note ?? ''
    })

  const openBlackout = (row?: any) =>
    setBlackoutForm(
      row
        ? {
            id: row.id,
            title: row.title ?? '',
            kind: row.kind ?? 'vacation',
            startDate: toDayKey(row.startDate),
            endDate: toDayKey(row.endDate),
            blocksDelivery: row.blocksDelivery !== false,
            note: row.note ?? ''
          }
        : {
            ...EMPTY_BLACKOUT,
            startDate: toDayKey(new Date()),
            endDate: toDayKey(new Date())
          }
    )

  const saveWorkload = async () => {
    if (!workloadForm) return
    if (!workloadForm.day) {
      toast.warning(t('pwDayRequired'))
      return
    }
    setSaving(true)
    try {
      const result = await window.api.personal.capacity.setWorkload({
        projectId: workloadForm.projectId || null,
        day: workloadForm.day,
        plannedMinutes: Number(workloadForm.plannedMinutes) || 0,
        isCommitted: workloadForm.isCommitted,
        note: workloadForm.note || null
      })
      if (result?.level === 'red') {
        toast.warning(
          t('pwOverCapacityWarning', { hours: formatHours(Number(workloadForm.plannedMinutes)) })
        )
      } else {
        toast.success(t('pwWorkloadSaved'))
      }
      setWorkloadForm(null)
      refreshAll()
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const saveBlackout = async () => {
    if (!blackoutForm) return
    if (!blackoutForm.title.trim()) {
      toast.warning(t('pwTitleRequired'))
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        title: blackoutForm.title.trim(),
        kind: blackoutForm.kind,
        startDate: blackoutForm.startDate,
        endDate: blackoutForm.endDate || blackoutForm.startDate,
        blocksDelivery: blackoutForm.blocksDelivery,
        note: blackoutForm.note || null
      }
      if (blackoutForm.id) {
        await window.api.personal.capacity.updateBlackout({ id: blackoutForm.id, ...payload })
        toast.success(t('pwBlackoutUpdated'))
      } else {
        await window.api.personal.capacity.createBlackout(payload)
        toast.success(t('pwBlackoutCreated'))
      }
      setBlackoutForm(null)
      refreshAll()
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const removeConfirmed = async () => {
    if (!confirm) return
    setSaving(true)
    try {
      if (confirm.kind === 'workload') {
        await window.api.personal.capacity.deleteWorkload(confirm.id)
        toast.success(t('pwWorkloadDeleted'))
      } else {
        await window.api.personal.capacity.deleteBlackout(confirm.id)
        toast.success(t('pwBlackoutDeleted'))
      }
      setConfirm(null)
      refreshAll()
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const runConflictCheck = async () => {
    setConflictBusy(true)
    try {
      const result = await window.api.personal.capacity.checkConflict({
        from: conflictForm.from,
        minutesPerDay: Number(conflictForm.minutesPerDay) || 0,
        totalMinutes: Number(conflictForm.totalMinutes) || 0
      })
      setConflict(result)
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setConflictBusy(false)
    }
  }

  const runSuggest = async () => {
    setSuggestBusy(true)
    try {
      const result = await window.api.personal.capacity.suggestStart({
        from: conflictForm.from,
        neededMinutes: Number(conflictForm.minutesPerDay) || 0
      })
      setSuggestion(result)
      if (result?.nextBlackout?.title) {
        toast.info(
          t('pwNextBlackout', {
            title: result.nextBlackout.title,
            days: result.nextBlackout.daysUntil
          })
        )
      }
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setSuggestBusy(false)
    }
  }

  const weekPercent = Number(status.data?.usedPercent ?? 0)
  const weekLevel = String(status.data?.level ?? 'clear')

  const levelTone = (level: string) => statusToneOf(levelBadgeVariant(level))

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        title={t('pwTabCapacity')}
        description={t('pwCapacityHint')}
        icon={<Gauge className="h-4 w-4" />}
        actions={
          <>
            <label className="inline-flex h-7 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {t('pwFrom')}
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="bg-transparent text-xs text-slate-900 outline-none dark:text-white"
              />
            </label>
            <label className="inline-flex h-7 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {t('pwTo')}
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="bg-transparent text-xs text-slate-900 outline-none dark:text-white"
              />
            </label>
            <Button
              size="xs"
              variant="secondary"
              aria-label={t('pwRefresh')}
              title={t('pwRefresh')}
              onClick={refreshAll}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </>
        }
      />

      <KpiSection sectionKey="personal:capacity-KpiStrip" label={t('pwTabCapacity')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiWeekBooked')}
            value={`${formatNumber(status.data?.bookedHours ?? 0, 1)}h`}
            sub={t('pwOfMaxClientHours', {
              hours: formatNumber(status.data?.maxClientHoursPerWeek ?? 0, 0)
            })}
            icon={<CalendarClock className="h-4 w-4" />}
            tone={weekLevel === 'red' ? 'danger' : weekLevel === 'amber' ? 'warning' : 'accent'}
          />
          <StatCard
            label={t('pwKpiWeekUsed')}
            value={formatPercent(weekPercent)}
            sub={t('pwTrackedVsBooked', {
              tracked: formatNumber(status.data?.trackedHours ?? 0, 1)
            })}
            icon={<Gauge className="h-4 w-4" />}
            tone={weekPercent >= 100 ? 'danger' : weekPercent >= 85 ? 'warning' : 'success'}
          />
          <StatCard
            label={t('pwKpiRedDays')}
            value={formatNumber(totals.redDays ?? 0)}
            sub={t('pwAmberDays', { days: formatNumber(totals.amberDays ?? 0) })}
            icon={<ShieldAlert className="h-4 w-4" />}
            tone={Number(totals.redDays ?? 0) > 0 ? 'danger' : 'success'}
          />
          <StatCard
            label={t('pwKpiBlackoutDays')}
            value={formatNumber(totals.blackoutDays ?? 0)}
            sub={t('pwBlackoutDaysThisWeek', {
              days: formatNumber(status.data?.blackoutDaysThisWeek ?? 0)
            })}
            icon={<Ban className="h-4 w-4" />}
            tone="warning"
          />
        </MetricStrip>
      </KpiSection>

      <Toolbar
        end={
          <>
            {panel === 'workloads' && (
              <Button
                size="sm"
                onClick={() => setWorkloadForm({ ...EMPTY_WORKLOAD, day: toDayKey(new Date()) })}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwPlanWorkload')}</span>
              </Button>
            )}
            {panel === 'blackouts' && (
              <Button size="sm" onClick={() => openBlackout()}>
                <Plus className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwAddBlackout')}</span>
              </Button>
            )}
          </>
        }
      >
        <div
          role="tablist"
          aria-label={t('pwTabCapacity')}
          className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/50"
        >
          {PANELS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={panel === entry.id}
              onClick={() => setPanel(entry.id)}
              className={`inline-flex h-6 items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
                panel === entry.id
                  ? 'bg-[color:var(--accent)] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {t(entry.label)}
            </button>
          ))}
        </div>
      </Toolbar>

      {panel === 'heatmap' && (
        <>
          <SectionCard
            title={t('pwHeatmapTitle')}
            description={t('pwHeatmapHint')}
            icon={<CalendarRange className="h-3.5 w-3.5" />}
            actions={
              <div className="flex flex-wrap items-center gap-2.5">
                {['clear', 'amber', 'red', 'blocked', 'off'].map((level) => (
                  <span
                    key={level}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
                  >
                    <span className={`h-2 w-2 rounded-full ${USAGE_LEVEL_STYLES[level] ?? ''}`} />
                    {t(`pwLevel_${level}`)}
                  </span>
                ))}
              </div>
            }
          >
            {heatmap.loading && (
              <EmptyState loading loadingShape="tiles" loadingLabel={t('pwLoading')} />
            )}
            {!heatmap.loading && days.length === 0 && (
              <EmptyState message={t('pwNoCapacityData')} />
            )}
            {days.length > 0 && (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {days.map((day) => {
                  const level = String(day.level ?? 'clear')
                  const isOff = level === 'off' || level === 'blocked'
                  const usedPercent = Number(day.usedPercent ?? 0)
                  const overbooked = Number(day.overbookedMinutes) > 0
                  return (
                    <li key={day.day}>
                      <button
                        type="button"
                        onClick={() => openWorkloadForDay(day.day)}
                        className={`w-full rounded-lg border px-2.5 py-2 text-start transition-colors hover:border-[color:var(--accent-line)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] ${
                          overbooked
                            ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40'
                            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`${MICRO_LABEL} truncate`}>{formatDate(day.day)}</span>
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${USAGE_LEVEL_STYLES[level] ?? ''}`}
                          />
                        </div>
                        <p
                          className={`mt-1 text-sm font-semibold leading-tight tabular-nums ${USAGE_LEVEL_TEXT_STYLES[level] ?? 'text-slate-900 dark:text-white'}`}
                        >
                          {isOff ? t(`pwLevel_${level}`) : formatHours(day.plannedMinutes)}
                        </p>
                        <p className="mt-0.5 truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
                          {isOff
                            ? (day.blackout?.title ?? t('pwWeekend'))
                            : `${formatPercent(usedPercent)} · ${formatHours(day.availableMinutes)}`}
                        </p>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className={`h-full rounded-full ${USAGE_LEVEL_STYLES[level] ?? 'bg-slate-300'}`}
                            style={{ width: `${Math.min(100, usedPercent)}%` }}
                          />
                        </div>
                        {overbooked && (
                          <p className="mt-1 text-xs font-medium leading-tight text-rose-600 dark:text-rose-400">
                            {t('pwOverbookedBy', { hours: formatHours(day.overbookedMinutes) })}
                          </p>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={t('pwConflictChecker')}
            description={t('pwConflictCheckerHint')}
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormInput
                size="sm"
                label={t('pwStartFrom')}
                type="date"
                value={conflictForm.from}
                onChange={(value) => setConflictForm((prev) => ({ ...prev, from: value }))}
              />
              <FormInput
                size="sm"
                label={t('pwMinutesPerDay')}
                type="number"
                value={conflictForm.minutesPerDay}
                onChange={(value) =>
                  setConflictForm((prev) => ({ ...prev, minutesPerDay: Number(value) || 0 }))
                }
                helperText={t('pwMinutesPerDayHint')}
              />
              <FormInput
                size="sm"
                label={t('pwTotalMinutes')}
                type="number"
                value={conflictForm.totalMinutes}
                onChange={(value) =>
                  setConflictForm((prev) => ({ ...prev, totalMinutes: Number(value) || 0 }))
                }
              />
              <div className="flex items-end gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  loading={conflictBusy}
                  onClick={runConflictCheck}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {t('pwCheckConflict')}
                </Button>
                <Button size="sm" variant="secondary" loading={suggestBusy} onClick={runSuggest}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('pwSuggestStart')}
                </Button>
              </div>
            </div>

            {conflict && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={conflict.fits ? 'success' : 'danger'}>
                    {conflict.fits
                      ? t('pwFits')
                      : t('pwConflicts', { count: conflict.conflictingDays })}
                  </StatusPill>
                  <StatusPill tone="neutral">
                    {t('pwDaysNeeded', { days: formatNumber(conflict.daysNeeded) })}
                  </StatusPill>
                  {Number(conflict.redDays) > 0 && (
                    <StatusPill tone="danger">
                      {t('pwRedDaysCount', { count: conflict.redDays })}
                    </StatusPill>
                  )}
                  {Number(conflict.blockedDays) > 0 && (
                    <StatusPill tone="warning">
                      {t('pwBlockedDaysCount', { count: conflict.blockedDays })}
                    </StatusPill>
                  )}
                  {conflict.suggestedStartDate && (
                    <StatusPill tone="accent">
                      {t('pwSuggestedStart', { date: formatDate(conflict.suggestedStartDate) })}
                    </StatusPill>
                  )}
                </div>
                {conflict.conflicts?.length > 0 && (
                  <Table dense>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('pwDay')}</TableHead>
                        <TableHead>{t('pwLevel')}</TableHead>
                        <TableHead>{t('pwPlanned')}</TableHead>
                        <TableHead>{t('pwAvailable')}</TableHead>
                        <TableHead>{t('pwReason')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conflict.conflicts.slice(0, 20).map((row: any) => (
                        <TableRow key={row.day}>
                          <TableCell className="whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200">
                            {formatDate(row.day)}
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={levelTone(String(row.level))}>
                              {t(`pwLevel_${row.level}`)}
                            </StatusPill>
                          </TableCell>
                          <TableCell className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                            {formatHours(row.plannedMinutes)}
                          </TableCell>
                          <TableCell className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                            {formatHours(row.availableMinutes)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                            {row.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {suggestion && (
              <div className="mt-4 rounded-lg border border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] p-3">
                <p className="text-sm font-semibold text-[color:var(--accent-text)]">
                  {suggestion.suggestedStartDate
                    ? t('pwSuggestedStartLong', { date: formatDate(suggestion.suggestedStartDate) })
                    : t('pwNoStartFound')}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('pwDailyCapacity', { hours: formatHours(suggestion.dailyCapacityMinutes) })}
                  {suggestion.nextBlackout
                    ? ` · ${t('pwNextBlackout', {
                        title: suggestion.nextBlackout.title,
                        days: suggestion.nextBlackout.daysUntil
                      })}`
                    : ''}
                </p>
                {suggestion.isBlackoutToday && (
                  <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {t('pwBlackoutToday')}
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {panel === 'workloads' && (
        <SectionCard
          title={t('pwWorkloadsTitle')}
          description={t('pwWorkloadsHint')}
          icon={<CalendarRange className="h-3.5 w-3.5" />}
          actions={
            workloadRows.length > 0 ? (
              <StatusPill tone="neutral" dot={false}>
                {formatNumber(workloadRows.length)}
              </StatusPill>
            ) : undefined
          }
        >
          <MetricStrip size="four">
            <StatCard
              label={t('pwKpiPlannedMinutes')}
              value={formatMinutes(totals.plannedMinutes ?? 0)}
              icon={<CalendarRange className="h-4 w-4" />}
            />
            <StatCard
              label={t('pwKpiActualMinutes')}
              value={formatMinutes(totals.actualMinutes ?? 0)}
              icon={<Gauge className="h-4 w-4" />}
            />
            <StatCard
              label={t('pwKpiAverageUsed')}
              value={formatPercent(totals.averageUsedPercent ?? 0)}
              icon={<ShieldAlert className="h-4 w-4" />}
              tone={Number(totals.averageUsedPercent ?? 0) >= 100 ? 'danger' : 'default'}
            />
            <StatCard
              label={t('pwKpiWorkingDays')}
              value={formatNumber(totals.workingDays ?? 0)}
              sub={t('pwOfMaxClientHours', {
                hours: formatNumber(status.data?.maxClientHoursPerWeek ?? 0, 0)
              })}
              icon={<CalendarClock className="h-4 w-4" />}
            />
          </MetricStrip>

          <div className="mt-4">
            <ProgressBar
              percent={weekPercent}
              level={weekLevel}
              label={`${t('pwThisWeek')} · ${formatNumber(status.data?.bookedHours ?? 0, 1)}h / ${formatNumber(
                status.data?.maxClientHoursPerWeek ?? 0,
                0
              )}h`}
            />
          </div>

          {status.data?.projectsOverOwnLimit?.length > 0 && (
            <div className="mt-4 space-y-1">
              {status.data.projectsOverOwnLimit.map((row: any) => (
                <ListRow
                  key={row.id}
                  variant="plain"
                  title={`${row.code ? `${row.code} · ` : ''}${row.title}`}
                  subtitle={t('pwProjectOverLimit', {
                    booked: formatNumber(row.bookedHours, 1),
                    max: formatNumber(row.maxHoursPerWeek, 1)
                  })}
                  trailing={
                    <span className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatNumber(row.bookedHours, 1)}h
                    </span>
                  }
                />
              ))}
            </div>
          )}

          {workloads.loading && (
            <EmptyState loading loadingShape="lines" loadingLabel={t('pwLoading')} />
          )}
          {!workloads.loading && workloadRows.length === 0 && (
            <EmptyState
              message={t('pwNoWorkloads')}
              action={
                <Button
                  size="sm"
                  onClick={() => setWorkloadForm({ ...EMPTY_WORKLOAD, day: toDayKey(new Date()) })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="ms-1.5">{t('pwPlanWorkload')}</span>
                </Button>
              }
            />
          )}
          {workloadRows.length > 0 && (
            <Table dense>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pwDay')}</TableHead>
                  <TableHead>{t('pwProject')}</TableHead>
                  <TableHead>{t('pwPlanned')}</TableHead>
                  <TableHead>{t('pwActual')}</TableHead>
                  <TableHead>{t('pwDayTotal')}</TableHead>
                  <TableHead>{t('pwCommitted')}</TableHead>
                  <TableHead>{t('pwNote')}</TableHead>
                  <TableHead className="text-end">{t('pwActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workloadRows.map((row) => {
                  const key = toDayKey(row.day)
                  const total = dayMinutes(key)
                  const percent =
                    Number(heatmap.data?.dailyCapacityMinutes) > 0
                      ? (total / Number(heatmap.data.dailyCapacityMinutes)) * 100
                      : 0
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200">
                        {formatDate(row.day)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-200">
                        {row.project
                          ? `${row.project.code ? `${row.project.code} · ` : ''}${row.project.title}`
                          : t('pwUnassigned')}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {formatHours(row.plannedMinutes)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {formatHours(row.actualMinutes)}
                      </TableCell>
                      <TableCell
                        className={`text-xs tabular-nums ${percent >= 100 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}
                      >
                        {formatHours(total)} · {formatPercent(percent)}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={row.isCommitted === false ? 'neutral' : 'success'}>
                          {row.isCommitted === false ? t('pwTentative') : t('pwCommitted')}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                        {row.note ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="xs" variant="secondary" onClick={() => openWorkload(row)}>
                            {t('pwEdit')}
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            aria-label={t('pwDelete')}
                            title={t('pwDelete')}
                            onClick={() => setConfirm({ kind: 'workload', id: row.id })}
                          >
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
      )}

      {panel === 'blackouts' && (
        <SectionCard
          title={t('pwBlackoutsTitle')}
          description={t('pwBlackoutsHint')}
          icon={<Ban className="h-3.5 w-3.5" />}
          actions={
            blackoutRows.length > 0 ? (
              <StatusPill tone="neutral" dot={false}>
                {formatNumber(blackoutRows.length)}
              </StatusPill>
            ) : undefined
          }
        >
          {blackouts.loading && <EmptyState loading loadingLabel={t('pwLoading')} />}
          {!blackouts.loading && blackoutRows.length === 0 && (
            <EmptyState
              message={t('pwNoBlackouts')}
              icon={<Ban className="h-5 w-5" />}
              action={
                <Button size="sm" onClick={() => openBlackout()}>
                  <Plus className="h-3.5 w-3.5" />
                  <span className="ms-1.5">{t('pwAddBlackout')}</span>
                </Button>
              }
            />
          )}
          {blackoutRows.length > 0 && (
            <Table dense>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pwTitle')}</TableHead>
                  <TableHead>{t('pwKind')}</TableHead>
                  <TableHead>{t('pwStartDate')}</TableHead>
                  <TableHead>{t('pwEndDate')}</TableHead>
                  <TableHead>{t('pwDays')}</TableHead>
                  <TableHead>{t('pwBlocksDelivery')}</TableHead>
                  <TableHead>{t('pwNote')}</TableHead>
                  <TableHead className="text-end">{t('pwActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blackoutRows.map((row) => {
                  const span = Math.max(
                    1,
                    Math.round(
                      (new Date(new Date(row.endDate).setHours(0, 0, 0, 0)).getTime() -
                        new Date(new Date(row.startDate).setHours(0, 0, 0, 0)).getTime()) /
                        86_400_000
                    ) + 1
                  )
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm font-semibold text-slate-900 dark:text-white">
                        {row.title}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone="neutral" dot={false}>
                          {t(`pwBlackoutKind_${row.kind}`)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {formatDate(row.startDate)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {formatDate(row.endDate)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {formatNumber(span)}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={row.blocksDelivery === false ? 'neutral' : 'danger'}>
                          {row.blocksDelivery === false ? t('pwNo') : t('pwYes')}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                        {row.note ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="xs" variant="secondary" onClick={() => openBlackout(row)}>
                            {t('pwEdit')}
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            aria-label={t('pwDelete')}
                            title={t('pwDelete')}
                            onClick={() => setConfirm({ kind: 'blackout', id: row.id })}
                          >
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
      )}

      <Modal
        dense
        isOpen={Boolean(workloadForm)}
        onClose={() => setWorkloadForm(null)}
        title={workloadForm?.id ? t('pwEditWorkload') : t('pwPlanWorkload')}
        size="md"
      >
        {workloadForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwProject')}
                </span>
                <CustomSelect
                  size="sm"
                  value={workloadForm.projectId}
                  onChange={(value) =>
                    setWorkloadForm({ ...workloadForm, projectId: String(value) })
                  }
                  options={[{ value: '', label: t('pwUnassigned') }, ...projectOptions]}
                  placeholder={t('pwSelectProject')}
                />
              </label>
              <FormInput
                size="sm"
                label={t('pwNote')}
                value={workloadForm.note}
                onChange={(value) => setWorkloadForm({ ...workloadForm, note: value })}
              />
            </FormSection>

            <FormSection title={t('pwFormSchedule')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwDay')}
                  type="date"
                  required
                  value={workloadForm.day}
                  onChange={(value) => setWorkloadForm({ ...workloadForm, day: value })}
                />
                <FormInput
                  size="sm"
                  label={t('pwPlannedMinutes')}
                  type="number"
                  value={workloadForm.plannedMinutes}
                  onChange={(value) =>
                    setWorkloadForm({ ...workloadForm, plannedMinutes: Number(value) || 0 })
                  }
                  helperText={t('pwPlannedMinutesHint')}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <label className="inline-flex h-7 items-center gap-2 rounded-lg px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={workloadForm.isCommitted}
                  onChange={(event) =>
                    setWorkloadForm({ ...workloadForm, isCommitted: event.target.checked })
                  }
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
                {t('pwCommitted')}
              </label>
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setWorkloadForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" loading={saving} onClick={saveWorkload}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(blackoutForm)}
        onClose={() => setBlackoutForm(null)}
        title={blackoutForm?.id ? t('pwEditBlackout') : t('pwAddBlackout')}
        size="md"
      >
        {blackoutForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <FormInput
                size="sm"
                label={t('pwTitle')}
                required
                value={blackoutForm.title}
                onChange={(value) => setBlackoutForm({ ...blackoutForm, title: value })}
              />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwKind')}
                </span>
                <CustomSelect
                  size="sm"
                  value={blackoutForm.kind}
                  onChange={(value) => setBlackoutForm({ ...blackoutForm, kind: String(value) })}
                  options={
                    kindOptions.length > 0
                      ? kindOptions
                      : [{ value: 'vacation', label: t('pwBlackoutKind_vacation') }]
                  }
                  placeholder={t('pwKind')}
                />
              </label>
            </FormSection>

            <FormSection title={t('pwFormSchedule')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwStartDate')}
                  type="date"
                  value={blackoutForm.startDate}
                  onChange={(value) => setBlackoutForm({ ...blackoutForm, startDate: value })}
                />
                <FormInput
                  size="sm"
                  label={t('pwEndDate')}
                  type="date"
                  value={blackoutForm.endDate}
                  onChange={(value) => setBlackoutForm({ ...blackoutForm, endDate: value })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <label className="inline-flex h-7 items-center gap-2 rounded-lg px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={blackoutForm.blocksDelivery}
                  onChange={(event) =>
                    setBlackoutForm({ ...blackoutForm, blocksDelivery: event.target.checked })
                  }
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
                {t('pwBlocksDeliveryHint')}
              </label>
              <FormInput
                size="sm"
                label={t('pwNote')}
                value={blackoutForm.note}
                onChange={(value) => setBlackoutForm({ ...blackoutForm, note: value })}
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setBlackoutForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" loading={saving} onClick={saveBlackout}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        dense
        isOpen={Boolean(confirm)}
        title={
          confirm?.kind === 'blackout' ? t('pwDeleteBlackoutConfirm') : t('pwDeleteWorkloadConfirm')
        }
        message={t('pwThisCannotBeUndone')}
        confirmLabel={t('pwDelete')}
        busy={saving}
        onConfirm={removeConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
