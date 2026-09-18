import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Gauge,
  Hourglass,
  Info,
  ListChecks,
  Lock,
  Play,
  RefreshCw,
  Square,
  Target,
  Timer,
  TrendingUp,
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
import { useAsync, rowsOf } from '../hooks/useAsync'
import { formatMoney, formatMinutes, formatNumber, formatPercent } from '../utils'
import Button from '@renderer/components/ui/Button'
import type { PersonalTab } from '../index'

interface OverviewTabProps {
  onNavigate: (tab: PersonalTab) => void
  onCountsChanged?: () => void
}

const ALERT_TONES: Record<string, string> = {
  danger:
    'border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
  warn: 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  info: 'border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300'
}

const ALERT_PILL: Record<string, 'danger' | 'warning' | 'neutral'> = {
  danger: 'danger',
  warn: 'warning',
  info: 'neutral'
}

/** Day-progress ring for the focus card: today's tracked minutes against the target. */
function FocusRing({ percent, value, label }: { percent: number; value: string; label: string }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-slate-100 dark:stroke-slate-700/70"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="stroke-[color:var(--accent)] transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
          {value}
        </span>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </span>
    </div>
  )
}

export default function OverviewTab({ onNavigate, onCountsChanged }: OverviewTabProps) {
  const { t } = useLanguage()
  const toast = useQuietToast()
  const { data, loading, error, reload } = useAsync<any>(
    () => window.api.personal.overview.getDashboard(),
    []
  )
  const projects = useAsync<any>(
    () => window.api.personal.projects.getAll({ status: 'active', pageSize: 100 }),
    []
  )
  const [busy, setBusy] = useState<string | null>(null)

  const currency: string = data?.money?.currency ?? 'USD'

  const projectOptions = useMemo(
    () => rowsOf<any>(projects.data).map((p) => ({ value: p.id, label: `${p.code} · ${p.title}` })),
    [projects.data]
  )

  const money = data?.money
  const focus = data?.focus
  const capacity = data?.capacity
  const dailyLimit: number = data?.limits?.dailyThree ?? 3
  const dailyItems: any[] = data?.dailyThree?.items ?? []
  const freeSlots: number =
    data?.dailyThree?.slotsFree ?? Math.max(0, dailyLimit - dailyItems.length)
  const dailyPercent = focus?.dailyTargetMinutes
    ? Math.round(((focus?.todayMinutes ?? 0) / focus.dailyTargetMinutes) * 100)
    : 0
  const activeProjectLabel = projectOptions.find(
    (option) => option.value === focus?.timer?.projectId
  )?.label

  const refreshAll = () => {
    reload()
    projects.reload()
    onCountsChanged?.()
  }

  const pinTask = async (id: string) => {
    setBusy(id)
    try {
      await window.api.personal.tasks.setDailyThree({ id, value: true })
      toast.success(t('pwTaskPinned'))
      refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const completeTask = async (id: string) => {
    setBusy(id)
    try {
      await window.api.personal.tasks.complete({ id })
      toast.success(t('pwTaskCompleted'))
      refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const startTimer = async () => {
    setBusy('timer')
    try {
      const firstProject = projectOptions[0]?.value ?? null
      await window.api.personal.focus.start({
        projectId: firstProject,
        kind: 'flow',
        plannedMinutes: 50
      })
      toast.success(t('pwTimerStarted'))
      refreshAll()
      void refreshQuietRuntime()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const stopTimer = async () => {
    setBusy('timer')
    try {
      await window.api.personal.focus.stop({})
      toast.success(t('pwTimerStopped'))
      refreshAll()
      void refreshQuietRuntime()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  if (error) {
    return (
      <div className="p-4">
        <SectionCard>
          <EmptyState
            message={error}
            action={
              <Button size="sm" onClick={reload}>
                {t('pwRetry')}
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        title={t('pwTabOverview')}
        description={t('pwOverviewHint')}
        icon={<Target className="h-4 w-4" />}
        actions={
          <Button size="sm" variant="secondary" loading={loading} onClick={refreshAll}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('pwRefresh')}
          </Button>
        }
      />

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <KpiSection sectionKey="personal:overview-KpiStrip" label={t('pwTabOverview')}>
        <MetricStrip size="six">
          <StatCard
            label={t('pwKpiFocusToday')}
            value={formatMinutes(focus?.todayMinutes)}
            sub={`${t('pwKpiTarget')} ${formatMinutes(focus?.dailyTargetMinutes)}`}
            icon={<Timer className="h-4 w-4" />}
            tone="accent"
            onClick={() => onNavigate('focus')}
          />
          <StatCard
            label={t('pwKpiBillableToday')}
            value={formatMinutes(focus?.todayBillableMinutes)}
            sub={`${t('pwWeek')} ${formatMinutes(focus?.weekMinutes)}`}
            icon={<Clock className="h-4 w-4" />}
            onClick={() => onNavigate('worklog')}
          />
          <StatCard
            label={t('pwKpiWeekLoad')}
            value={formatPercent(capacity?.week?.usedPercent)}
            sub={`${formatMinutes(capacity?.week?.plannedMinutes)} / ${formatMinutes(capacity?.week?.availableMinutes)}`}
            icon={<Gauge className="h-4 w-4" />}
            tone={
              capacity?.week?.level === 'red'
                ? 'danger'
                : capacity?.week?.level === 'amber'
                  ? 'warning'
                  : 'success'
            }
            onClick={() => onNavigate('capacity')}
          />
          <StatCard
            label={t('pwKpiOutstanding')}
            value={formatMoney(money?.outstanding, currency)}
            sub={`${t('pwOverdue')} ${formatMoney(money?.overdue, currency)}`}
            icon={<DollarSign className="h-4 w-4" />}
            tone={money?.overdue > 0 ? 'danger' : 'default'}
            onClick={() => onNavigate('invoices')}
          />
          <StatCard
            label={t('pwKpiUnearned')}
            value={formatMoney(money?.unearnedRetainedCash, currency)}
            sub={`${t('pwRealized')} ${formatMoney(money?.realizedIncome, currency)}`}
            icon={<Lock className="h-4 w-4" />}
            tone="warning"
            onClick={() => onNavigate('finance')}
          />
          <StatCard
            label={t('pwKpiRealRate')}
            value={formatMoney(money?.realHourlyRate, currency)}
            sub={`${t('pwMonthCollected')} ${formatMoney(money?.monthCollected, currency)}`}
            icon={<TrendingUp className="h-4 w-4" />}
            onClick={() => onNavigate('finance')}
          />
        </MetricStrip>
      </KpiSection>

      {/* ── Alerts ────────────────────────────────────────────────────────── */}
      {!loading && (data?.alerts?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert: any) => (
            <div
              key={`${alert.area}-${alert.message}`}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs ${ALERT_TONES[alert.level] ?? ALERT_TONES.info}`}
            >
              {alert.level === 'danger' ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : alert.level === 'warn' ? (
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span className="min-w-0 flex-1 font-medium leading-relaxed">{alert.message}</span>
              <StatusPill
                tone={ALERT_PILL[alert.level] ?? 'neutral'}
                dot={false}
                className="border-current/30"
              >
                {alert.area}
              </StatusPill>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Daily 3 ─────────────────────────────────────────────────────── */}
        <SectionCard
          title={t('pwDailyThree')}
          icon={<Target className="h-3.5 w-3.5" />}
          description={t('pwDailyThreeHint')}
          actions={
            <StatusPill tone={freeSlots > 0 ? 'accent' : 'success'} dot={false}>
              {`${t('pwSlotsFree')} ${freeSlots} / ${dailyLimit}`}
            </StatusPill>
          }
          className="lg:col-span-2"
        >
          <ol className="space-y-2">
            {dailyItems.map((task: any, index: number) => (
              <li key={task.id}>
                <ListRow
                  variant="plain"
                  className="border border-[color:var(--accent-line)] bg-[color:var(--accent-tint)]"
                  icon={
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent)] text-[10px] font-semibold tabular-nums text-white">
                      {index + 1}
                    </span>
                  }
                  title={task.title}
                  subtitle={`${task.estimateMinutes ? formatMinutes(task.estimateMinutes) : t('pwNoEstimate')} · ${task.type}`}
                  trailing={
                    <Button
                      size="sm"
                      variant="success"
                      loading={busy === task.id}
                      onClick={() => completeTask(task.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('pwComplete')}
                    </Button>
                  }
                />
              </li>
            ))}

            {/* Reserved slots: the board never grows past three, so the gaps are shown. */}
            {!loading &&
              Array.from({ length: Math.max(0, dailyLimit - dailyItems.length) }).map(
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

            {loading && (
              <li>
                <EmptyState loading loadingLabel={t('pwLoading')} />
              </li>
            )}
          </ol>

          {(data?.dailyThree?.suggestions?.length ?? 0) > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700/70">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('pwSuggestions')}
              </p>
              <div className="flex flex-wrap gap-2">
                {data.dailyThree.suggestions.map((suggestion: any) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    disabled={busy === suggestion.id}
                    onClick={() => pinTask(suggestion.id)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-[color:var(--accent-line)] hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Play className="h-3 w-3" />
                    <span className="max-w-[16rem] truncate">{suggestion.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Focus timer ─────────────────────────────────────────────────── */}
        <SectionCard
          title={t('pwFocusTimer')}
          icon={<Timer className="h-3.5 w-3.5" />}
          description={focus?.timer ? t('pwTimerRunning') : t('pwTimerIdle')}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <FocusRing
                percent={dailyPercent}
                value={formatMinutes(focus?.timer?.elapsedMinutes ?? focus?.todayMinutes)}
                label={t('pwDailyTarget')}
              />
              <div className="min-w-0 space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {focus?.timer
                    ? `${t('pwRemaining')} ${formatMinutes(focus.timer.remainingMinutes)}`
                    : `${t('pwRemaining')} ${formatMinutes(focus?.dailyTargetRemaining)}`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {`${t('pwKpiTarget')} ${formatMinutes(focus?.dailyTargetMinutes)}`}
                </p>
                {activeProjectLabel && (
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {activeProjectLabel}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {focus?.timer ? (
                <Button size="sm" variant="danger" loading={busy === 'timer'} onClick={stopTimer}>
                  <Square className="h-3.5 w-3.5" />
                  {t('pwStop')}
                </Button>
              ) : (
                <Button size="sm" loading={busy === 'timer'} onClick={startTimer}>
                  <Play className="h-3.5 w-3.5" />
                  {t('pwStart')}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => onNavigate('focus')}>
                {t('pwOpenTab')}
              </Button>
            </div>

            {focus?.workLog?.summary && (
              <p className="rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                {focus.workLog.summary}
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Deadlines ───────────────────────────────────────────────────── */}
        <SectionCard
          title={t('pwDeadlines')}
          icon={<Clock className="h-3.5 w-3.5" />}
          actions={<StatusPill dot={false}>{formatNumber(data?.deadlines?.length)}</StatusPill>}
        >
          <div className="space-y-1.5">
            {(data?.deadlines ?? []).slice(0, 6).map((deadline: any) => (
              <ListRow
                key={deadline.id}
                variant="plain"
                title={deadline.title}
                subtitle={`${deadline.clientName ?? t('pwNoClient')} · ${deadline.stage}`}
                trailing={
                  <StatusPill
                    tone={
                      deadline.isOverdue ? 'danger' : deadline.daysLeft <= 3 ? 'warning' : 'neutral'
                    }
                    dot={false}
                  >
                    {deadline.isOverdue
                      ? `${Math.abs(deadline.daysLeft)}${t('pwDaysLate')}`
                      : `${deadline.daysLeft}${t('pwDaysLeft')}`}
                  </StatusPill>
                }
              />
            ))}
            {(data?.deadlines?.length ?? 0) === 0 && (
              <EmptyState loading={loading} message={t('pwNoDeadlines')} />
            )}
          </div>
        </SectionCard>

        {/* ── Open waits ──────────────────────────────────────────────────── */}
        <SectionCard
          title={t('pwOpenWaits')}
          icon={<Hourglass className="h-3.5 w-3.5" />}
          description={`${t('pwTotalWaiting')} ${formatNumber(data?.waiting?.totalWaitingDays)} ${t('pwDays')}`}
          actions={
            <StatusPill tone={data?.waiting?.open?.length ? 'danger' : 'neutral'} dot={false}>
              {formatNumber(data?.waiting?.open?.length)}
            </StatusPill>
          }
        >
          <div className="space-y-1.5">
            {(data?.waiting?.open ?? []).slice(0, 6).map((wait: any) => (
              <ListRow
                key={wait.id}
                variant="plain"
                title={wait.projectTitle ?? wait.projectCode}
                subtitle={wait.reason}
                icon={<Hourglass className="h-3.5 w-3.5 text-amber-500" />}
                trailing={
                  <StatusPill tone={wait.days >= 7 ? 'danger' : 'neutral'} dot={false}>
                    {`${wait.days}${t('pwDays')}`}
                  </StatusPill>
                }
              />
            ))}
            {(data?.waiting?.open?.length ?? 0) === 0 && (
              <EmptyState loading={loading} message={t('pwNoWaits')} />
            )}
          </div>
        </SectionCard>

        {/* ── Pending change requests ─────────────────────────────────────── */}
        <SectionCard
          title={t('pwPendingChanges')}
          icon={<ListChecks className="h-3.5 w-3.5" />}
          description={`${t('pwPipelineValue')} ${formatMoney(data?.changeRequests?.pipelineValue, currency)}`}
          actions={
            <StatusPill dot={false}>
              {formatNumber(data?.changeRequests?.pending?.length)}
            </StatusPill>
          }
        >
          <div className="space-y-1.5">
            {(data?.changeRequests?.pending ?? []).slice(0, 6).map((request: any) => (
              <ListRow
                key={request.id}
                variant="plain"
                title={request.title}
                subtitle={`${request.projectCode ?? t('pwNoProject')} · ${request.status}`}
                trailing={
                  <StatusPill tone="accent" dot={false}>
                    {formatMoney(request.extraCost, currency)}
                  </StatusPill>
                }
              />
            ))}
            {(data?.changeRequests?.pending?.length ?? 0) === 0 && (
              <EmptyState loading={loading} message={t('pwNoChanges')} />
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Capacity week ─────────────────────────────────────────────────── */}
      <SectionCard
        title={t('pwWeekCapacity')}
        icon={<Gauge className="h-3.5 w-3.5" />}
        description={`${capacity?.week?.start ?? ''} → ${capacity?.week?.end ?? ''}`}
        footer={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {(['clear', 'amber', 'red', 'blocked'] as const).map((level) => (
              <span
                key={level}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    level === 'clear'
                      ? 'bg-emerald-500'
                      : level === 'amber'
                        ? 'bg-amber-500'
                        : level === 'red'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                  }`}
                />
                {t(`pwLevel_${level}`)}
              </span>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {(capacity?.days ?? []).map((day: any) => (
            <div
              key={day.day}
              className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800/40"
            >
              <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {day.day}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatMinutes(day.plannedMinutes)}
              </p>
              <div className="mt-1.5">
                <ProgressBar percent={day.usedPercent} level={day.level} />
              </div>
              {day.isBlackout && (
                <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {t('pwBlackout')}
                </span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
