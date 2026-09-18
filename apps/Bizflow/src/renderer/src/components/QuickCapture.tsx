/**
 * QuickCapture — the Personal Work OS capture panel (spec section 6).
 *
 * The panel is bound to a *global* accelerator, so it cannot live behind the
 * `/personal` route: the main process fires `quick-capture:open` and this opens
 * wherever the user happens to be. Three captures, one panel:
 *
 *   Change request → the scope-creep guard, quoted before the work starts
 *   Expense        → a cost logged while the receipt is still in hand
 *   Timer          → a focus session started without leaving the screen
 *
 * Mounted only while the personal module is compiled in *and* switched on, so
 * `window.api.personal` is guaranteed to exist by the time it listens.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, Repeat2, Receipt } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import FormInput from './ui/FormInput'
import CustomSelect, { type SelectOption } from './ui/CustomSelect'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'

type CaptureKind = 'request' | 'expense' | 'timer'

interface Option {
  id?: string
  value?: string
  label: string
  labelAr?: string
}

/** The plugin's taxonomy ships both languages; the renderer picks one. */
function toOptions(options: Option[] | undefined, isArabic: boolean): SelectOption[] {
  if (!options) return []
  return options.map((option) => ({
    value: String(option.id ?? option.value ?? ''),
    label: isArabic && option.labelAr ? option.labelAr : option.label
  }))
}

const EMPTY_FORM = {
  projectId: '',
  title: '',
  description: '',
  estimatedHours: '2',
  extraDays: '',
  hourlyRate: '',
  amount: '',
  category: 'software',
  vendor: '',
  plannedMinutes: '50',
  sessionKind: 'flow',
  billable: true
}

export default function QuickCapture(): JSX.Element {
  const { t, language } = useLanguage()
  const toast = useToast()
  const isArabic = language === 'ar'

  const [isOpen, setIsOpen] = useState(false)
  const [kind, setKind] = useState<CaptureKind>('request')
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<SelectOption[]>([])
  const [categories, setCategories] = useState<SelectOption[]>([])
  const [sessionKinds, setSessionKinds] = useState<SelectOption[]>([])
  const [timerRunning, setTimerRunning] = useState(false)

  // The accelerator can fire before the renderer is ready, and again while the
  // panel is already up — opening twice must not reset a half-typed capture.
  useEffect(() => {
    const unsubscribe = window.api?.quickCapture?.onOpen(() => setIsOpen(true))
    return () => unsubscribe?.()
  }, [])

  // Everything the panel offers comes from the plugin, so it is reloaded on
  // each open: a project created a minute ago has to be selectable.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false

    Promise.all([
      window.api.personal.projects.getAll({ pageSize: 200 }),
      window.api.personal.meta.getConfig(),
      window.api.personal.focus.getActive()
    ])
      .then(([projectPage, config, active]) => {
        if (cancelled) return
        const rows: any[] = Array.isArray(projectPage) ? projectPage : (projectPage?.data ?? [])
        setProjects(rows.map((project) => ({ value: project.id, label: `${project.code} · ${project.title}` })))
        setCategories(toOptions(config?.expenseCategories, isArabic))
        setSessionKinds(toOptions(config?.focusKinds, isArabic))
        setTimerRunning(Boolean(active?.id))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, isArabic])

  const close = useCallback(() => {
    setIsOpen(false)
    setError(null)
    setForm(EMPTY_FORM)
    setKind('request')
  }, [])

  const update = useCallback((patch: Partial<typeof EMPTY_FORM>) => {
    setForm((current) => ({ ...current, ...patch }))
  }, [])

  const projectOptions = useMemo<SelectOption[]>(() => projects, [projects])

  const saveRequest = async (): Promise<void> => {
    await window.api.personal.requests.create({
      projectId: form.projectId,
      title: form.title.trim(),
      description: form.description || null,
      estimatedHours: Number(form.estimatedHours) || 0,
      extraDays: form.extraDays === '' ? undefined : Number(form.extraDays),
      hourlyRate: form.hourlyRate === '' ? null : Number(form.hourlyRate)
    })
    toast.success(t('pwQuickRequestLogged'))
  }

  const saveExpense = async (): Promise<void> => {
    await window.api.personal.finance.expenses.create({
      projectId: form.projectId || null,
      description: form.description.trim(),
      category: form.category,
      vendor: form.vendor || null,
      amount: Number(form.amount) || 0,
      isBillable: form.billable
    })
    toast.success(t('pwQuickExpenseRecorded'))
  }

  const startTimer = async (): Promise<void> => {
    await window.api.personal.focus.start({
      projectId: form.projectId || null,
      kind: form.sessionKind,
      plannedMinutes: Number(form.plannedMinutes) || 50,
      billable: form.billable,
      note: form.title || null
    })
    toast.success(t('pwQuickTimerStarted'))
  }

  /** The first unmet requirement, so the panel can say what is missing. */
  const validationError = (): string | null => {
    if (kind === 'request') {
      if (!form.projectId) return t('pwQuickNeedsProject')
      if (!form.title.trim()) return t('pwQuickNeedsTitle')
      return null
    }
    if (kind === 'expense') {
      if (!form.description.trim()) return t('pwQuickNeedsDescription')
      if (!(Number(form.amount) > 0)) return t('pwQuickNeedsAmount')
      return null
    }
    if (timerRunning) return t('pwQuickTimerRunning')
    return null
  }

  const submit = async (): Promise<void> => {
    const blocked = validationError()
    if (blocked) {
      setError(blocked)
      return
    }

    setBusy(true)
    setError(null)
    try {
      if (kind === 'request') await saveRequest()
      else if (kind === 'expense') await saveExpense()
      else await startTimer()
      close()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const tabs: { id: CaptureKind; label: string; hint: string }[] = useMemo(
    () => [
      { id: 'request', label: t('pwQuickKindRequest'), hint: t('pwQuickRequestHint') },
      { id: 'expense', label: t('pwQuickKindExpense'), hint: t('pwQuickExpenseHint') },
      { id: 'timer', label: t('pwQuickKindTimer'), hint: t('pwQuickTimerHint') }
    ],
    [t]
  )

  const active = tabs.find((tab) => tab.id === kind) ?? tabs[0]
  const noProjects = projects.length === 0

  return (
    <Modal isOpen={isOpen} onClose={close} title={t('pwQuickCapture')} size="sm">
      <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">{t('pwQuickCaptureHint')}</p>
      <p className="mb-5 text-xs font-semibold text-slate-400 dark:text-slate-500">
        {t('pwQuickCaptureShortcut')}
      </p>

      <div className="mb-5 grid grid-cols-3 gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === kind}
            onClick={() => {
              setKind(tab.id)
              setError(null)
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab.id === kind
                ? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {tab.id === 'request' && <Repeat2 className="h-4 w-4" />}
            {tab.id === 'expense' && <Receipt className="h-4 w-4" />}
            {tab.id === 'timer' && <Clock className="h-4 w-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{active.hint}</p>

      <div className="space-y-4">
        {kind === 'request' && (
          <>
            {noProjects ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                {t('pwQuickNoProjects')}
              </p>
            ) : (
              <CustomSelect
                value={form.projectId}
                onChange={(value) => update({ projectId: String(value) })}
                options={projectOptions}
                placeholder={t('pwQuickFieldProject')}
              />
            )}
            <FormInput
              label={t('pwQuickFieldTitle')}
              value={form.title}
              onChange={(value) => update({ title: value })}
              required
              showValidIcon={false}
            />
            <FormInput
              label={t('pwQuickFieldHours')}
              type="number"
              min="0"
              step="0.25"
              value={form.estimatedHours}
              onChange={(value) => update({ estimatedHours: value })}
              showValidIcon={false}
            />
            <FormInput
              label={t('pwQuickFieldExtraDays')}
              type="number"
              min="0"
              value={form.extraDays}
              onChange={(value) => update({ extraDays: value })}
              showValidIcon={false}
            />
            <FormInput
              label={t('pwQuickFieldRate')}
              type="number"
              min="0"
              step="0.01"
              value={form.hourlyRate}
              onChange={(value) => update({ hourlyRate: value })}
              showValidIcon={false}
            />
            <FormInput
              label={t('pwQuickFieldDetails')}
              value={form.description}
              onChange={(value) => update({ description: value })}
              showValidIcon={false}
            />
          </>
        )}

        {kind === 'expense' && (
          <>
            <FormInput
              label={t('pwQuickFieldDetails')}
              value={form.description}
              onChange={(value) => update({ description: value })}
              required
              showValidIcon={false}
            />
            <FormInput
              label={t('pwQuickFieldAmount')}
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(value) => update({ amount: value })}
              required
              showValidIcon={false}
            />
            {categories.length > 0 && (
              <CustomSelect
                value={form.category}
                onChange={(value) => update({ category: String(value) })}
                options={categories}
                placeholder={t('pwQuickFieldCategory')}
              />
            )}
            <FormInput
              label={t('pwQuickFieldVendor')}
              value={form.vendor}
              onChange={(value) => update({ vendor: value })}
              showValidIcon={false}
            />
            {!noProjects && (
              <CustomSelect
                value={form.projectId}
                onChange={(value) => update({ projectId: String(value) })}
                options={projectOptions}
                placeholder={t('pwQuickFieldProject')}
              />
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.billable}
                onChange={(event) => update({ billable: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
              />
              {t('pwQuickFieldBillable')}
            </label>
          </>
        )}

        {kind === 'timer' && (
          <>
            {timerRunning ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                {t('pwQuickTimerRunning')}
              </p>
            ) : (
              <>
                {!noProjects && (
                  <CustomSelect
                    value={form.projectId}
                    onChange={(value) => update({ projectId: String(value) })}
                    options={projectOptions}
                    placeholder={t('pwQuickFieldProject')}
                  />
                )}
                {sessionKinds.length > 0 && (
                  <CustomSelect
                    value={form.sessionKind}
                    onChange={(value) => update({ sessionKind: String(value) })}
                    options={sessionKinds}
                    placeholder={t('pwQuickFieldSessionKind')}
                  />
                )}
                <FormInput
                  label={t('pwQuickFieldPlannedMinutes')}
                  type="number"
                  min="1"
                  value={form.plannedMinutes}
                  onChange={(value) => update({ plannedMinutes: value })}
                  showValidIcon={false}
                />
                <FormInput
                  label={t('pwQuickFieldTitle')}
                  value={form.title}
                  onChange={(value) => update({ title: value })}
                  showValidIcon={false}
                />
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.billable}
                    onChange={(event) => update({ billable: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                  />
                  {t('pwQuickFieldBillable')}
                </label>
              </>
            )}
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={close} disabled={busy}>
          {t('cancel')}
        </Button>
        <Button onClick={submit} loading={busy} disabled={timerRunning && kind === 'timer'}>
          {kind === 'request' && t('pwQuickLogRequest')}
          {kind === 'expense' && t('pwQuickRecordExpense')}
          {kind === 'timer' && t('pwQuickStartTimer')}
        </Button>
      </div>
    </Modal>
  )
}
