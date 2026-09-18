import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  ListChecks,
  RefreshCw,
  Sparkles,
  Trash2,
  Plus
} from 'lucide-react'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import StatCard from '../components/StatCard'
import SectionCard from '../components/SectionCard'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import MetricStrip from '../components/MetricStrip'
import StatusPill from '../components/StatusPill'
import { MICRO_LABEL } from '../components/base'
import Button from '@renderer/components/ui/Button'
import FormInput from '@renderer/components/ui/FormInput'
import ConfirmDialog from '@renderer/components/ui/ConfirmDialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@renderer/components/ui/Table'
import { useAsync, rowsOf } from '../hooks/useAsync'
import { addDays, copyText, formatMinutes, formatNumber, toDayKey } from '../utils'

interface DayDraft {
  completed: string[]
  next: string[]
  summary: string
  notes: string
  mood: string
}

const EMPTY_DRAFT: DayDraft = { completed: [], next: [], summary: '', notes: '', mood: '' }

function parseList(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

export default function WorklogTab() {
  const { t } = useLanguage()
  const toast = useQuietToast()

  const [day, setDay] = useState(() => toDayKey())
  const [draft, setDraft] = useState<DayDraft>(EMPTY_DRAFT)
  const [completedInput, setCompletedInput] = useState('')
  const [nextInput, setNextInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<any | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const list = useAsync<any[]>(() => window.api.personal.worklog.getAll({ limit: 90 }), [])
  const dayLog = useAsync<any>(() => window.api.personal.worklog.getByDay(day), [day])

  const rows = useMemo(() => rowsOf<any>(list.data), [list.data])

  useEffect(() => {
    const log = dayLog.data
    setDraft({
      completed: parseList(log?.completedJson),
      next: parseList(log?.nextJson),
      summary: log?.summary ?? '',
      notes: log?.notes ?? '',
      mood: log?.mood ?? ''
    })
    setCompletedInput('')
    setNextInput('')
  }, [dayLog.data, day])

  const stats = useMemo(() => {
    const totalFocus = rows.reduce((sum, row) => sum + Number(row.focusMinutes ?? 0), 0)
    const totalBillable = rows.reduce((sum, row) => sum + Number(row.billableMinutes ?? 0), 0)
    const weekStart = toDayKey(addDays(new Date(), -6))
    const loggedThisWeek = new Set(
      rows.filter((row) => toDayKey(row.day) >= weekStart).map((row) => toDayKey(row.day))
    ).size
    return { totalFocus, totalBillable, loggedThisWeek }
  }, [rows])

  const billableShare = stats.totalFocus > 0 ? (stats.totalBillable / stats.totalFocus) * 100 : 0

  const save = async () => {
    setSaving(true)
    try {
      await window.api.personal.worklog.save({
        day,
        completed: draft.completed,
        next: draft.next,
        summary: draft.summary || null,
        notes: draft.notes || null,
        mood: draft.mood || null
      })
      toast.success(t('pwLogSaved'))
      dayLog.reload()
      list.reload()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const generate = async () => {
    setGenerating(true)
    try {
      const generated = await window.api.personal.worklog.generate(day)
      setPreview(generated)
      toast.success(t('pwLogGenerated'))
      dayLog.reload()
      list.reload()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setGenerating(false)
    }
  }

  const loadPreview = async () => {
    setPreviewing(true)
    try {
      setPreview(await window.api.personal.standup.preview(day))
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setPreviewing(false)
    }
  }

  const copySummary = async () => {
    const ok = await copyText(preview?.summary ?? draft.summary)
    if (ok) toast.success(t('pwCopied'))
    else toast.error(t('pwCopyFailed'))
  }

  const remove = async () => {
    if (!confirmId) return
    try {
      await window.api.personal.worklog.delete(confirmId)
      toast.success(t('pwLogDeleted'))
      setConfirmId(null)
      list.reload()
      dayLog.reload()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    }
  }

  const addItem = (key: 'completed' | 'next') => {
    const value = (key === 'completed' ? completedInput : nextInput).trim()
    if (!value) return
    setDraft((current) => ({ ...current, [key]: [...current[key], value] }))
    if (key === 'completed') setCompletedInput('')
    else setNextInput('')
  }

  const dropItem = (key: 'completed' | 'next', index: number) =>
    setDraft((current) => ({ ...current, [key]: current[key].filter((_, i) => i !== index) }))

  const editor = (key: 'completed' | 'next') => (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={key === 'completed' ? completedInput : nextInput}
          onChange={(event) =>
            key === 'completed'
              ? setCompletedInput(event.target.value)
              : setNextInput(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addItem(key)
            }
          }}
          placeholder={t('pwAddItem')}
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition-colors focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <Button
          size="sm"
          variant="secondary"
          aria-label={t('pwAddItem')}
          title={t('pwAddItem')}
          onClick={() => addItem(key)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {draft[key].length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{t('pwNoItems')}</p>
      ) : (
        <ul className="space-y-1.5">
          {draft[key].map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <span className="min-w-0 flex-1 truncate">{item}</span>
              <button
                type="button"
                onClick={() => dropItem(key, index)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                aria-label={t('pwRemove')}
                title={t('pwRemove')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        title={t('pwTabWorklog')}
        description={t('pwWorklogHint')}
        icon={<FileText className="h-4 w-4" />}
        actions={
          <>
            <label className="inline-flex h-7 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {t('pwDay')}
              <input
                type="date"
                value={day}
                onChange={(event) => setDay(event.target.value || toDayKey())}
                className="bg-transparent text-xs text-slate-900 outline-none dark:text-white"
              />
            </label>
            <Button size="sm" variant="secondary" onClick={loadPreview} loading={previewing}>
              <FileText className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwPreviewStandup')}</span>
            </Button>
            <Button size="sm" variant="primary" onClick={generate} loading={generating}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwGenerateLog')}</span>
            </Button>
          </>
        }
      />

      <KpiSection sectionKey="personal:worklog-KpiStrip" label={t('pwTabWorklog')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiDaysLogged')}
            value={formatNumber(rows.length)}
            sub={t('pwDays')}
            icon={<CalendarClock className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiFocusLogged')}
            value={formatMinutes(stats.totalFocus)}
            icon={<ListChecks className="h-4 w-4" />}
            tone="accent"
          />
          <StatCard
            label={t('pwKpiBillableShare')}
            value={`${billableShare.toFixed(0)}%`}
            sub={formatMinutes(stats.totalBillable)}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone={billableShare >= 60 ? 'success' : 'warning'}
          />
          <StatCard
            label={t('pwKpiWeekCoverage')}
            value={`${stats.loggedThisWeek}/7`}
            icon={<Sparkles className="h-4 w-4" />}
          />
        </MetricStrip>
      </KpiSection>

      <SectionCard
        title={t('pwStandup')}
        description={t('pwStandupHint')}
        icon={<Sparkles className="h-3.5 w-3.5" />}
        actions={
          <Button
            size="xs"
            variant="secondary"
            onClick={copySummary}
            disabled={!preview?.summary && !draft.summary}
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            <span className="ms-1.5">{t('pwCopySummary')}</span>
          </Button>
        }
      >
        {!preview ? (
          <EmptyState
            message={t('pwNoStandup')}
            icon={<FileText className="h-5 w-5" />}
            loading={previewing}
          />
        ) : (
          <div className="space-y-3">
            <p className="whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              {preview.summary}
            </p>
            <MetricStrip size="four">
              <StatCard label={t('pwTracked')} value={formatMinutes(preview.focusMinutes)} />
              <StatCard
                label={t('pwBillable')}
                value={formatMinutes(preview.billableMinutes)}
                tone="success"
              />
              <StatCard
                label={t('pwCompleted')}
                value={formatNumber(preview.completed?.length ?? 0)}
              />
              <StatCard label={t('pwNextUp')} value={formatNumber(preview.next?.length ?? 0)} />
            </MetricStrip>
            {Array.isArray(preview.projects) && preview.projects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {preview.projects.map((project: any) => (
                  <StatusPill key={project.title} tone="neutral" dot={false}>
                    {project.title} · {formatMinutes(project.minutes)}
                  </StatusPill>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={`${t('pwLogFor')} ${day}`}
        description={t('pwWorklogHint')}
        icon={<ListChecks className="h-3.5 w-3.5" />}
        actions={
          <Button size="sm" variant="primary" onClick={save} loading={saving}>
            {t('pwSave')}
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h4 className={`mb-2 ${MICRO_LABEL}`}>{t('pwCompleted')}</h4>
            {editor('completed')}
          </div>
          <div>
            <h4 className={`mb-2 ${MICRO_LABEL}`}>{t('pwNextUp')}</h4>
            {editor('next')}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FormInput
              size="sm"
              label={t('pwSummary')}
              value={draft.summary}
              onChange={(value) => setDraft((current) => ({ ...current, summary: value }))}
            />
          </div>
          <FormInput
            size="sm"
            label={t('pwMood')}
            value={draft.mood}
            onChange={(value) => setDraft((current) => ({ ...current, mood: value }))}
          />
          <div className="sm:col-span-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('pwNotes')}
              </span>
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-[color:var(--accent-line)] focus:ring-2 focus:ring-[color:var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t('pwLogHistory')}
        description={t('pwLogHistoryHint')}
        icon={<CalendarClock className="h-3.5 w-3.5" />}
        actions={
          rows.length > 0 ? (
            <StatusPill tone="neutral" dot={false}>
              {formatNumber(rows.length)}
            </StatusPill>
          ) : undefined
        }
        padded={false}
      >
        {list.loading ? (
          <EmptyState loading />
        ) : rows.length === 0 ? (
          <EmptyState message={t('pwNoLogs')} icon={<CalendarClock className="h-5 w-5" />} />
        ) : (
          <Table dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pwDay')}</TableHead>
                <TableHead>{t('pwTracked')}</TableHead>
                <TableHead>{t('pwBillable')}</TableHead>
                <TableHead>{t('pwSummary')}</TableHead>
                <TableHead className="text-end">{t('pwColActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {toDayKey(row.day)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    {formatMinutes(row.focusMinutes)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    {formatMinutes(row.billableMinutes)}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs text-slate-500 dark:text-slate-400">
                    {row.summary ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {row.mood && (
                        <StatusPill tone="info" dot={false}>
                          {row.mood}
                        </StatusPill>
                      )}
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setDay(toDayKey(row.day))}
                      >
                        {t('pwOpenLog')}
                      </Button>
                      <Button
                        size="xs"
                        variant="danger"
                        aria-label={t('pwDelete')}
                        title={t('pwDelete')}
                        onClick={() => setConfirmId(row.id)}
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

      <ConfirmDialog
        dense
        isOpen={Boolean(confirmId)}
        message={t('pwDeleteLogConfirm')}
        confirmLabel={t('pwDelete')}
        cancelLabel={t('pwCancel')}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
