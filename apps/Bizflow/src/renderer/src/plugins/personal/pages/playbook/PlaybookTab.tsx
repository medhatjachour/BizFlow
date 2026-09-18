import { useMemo, useState } from 'react'
import {
  ClipboardCopy,
  Files,
  Filter,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp
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
import { FormSection, ModalFooter } from '../components/FormSection'
import { MICRO_LABEL } from '../components/base'
import Button from '@renderer/components/ui/Button'
import Modal from '@renderer/components/ui/Modal'
import FormInput from '@renderer/components/ui/FormInput'
import FormTextarea from '@renderer/components/ui/FormTextarea'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import ConfirmDialog from '@renderer/components/ui/ConfirmDialog'
import { useAsync, rowsOf, usePersonalConfig } from '../hooks/useAsync'
import { useIntent } from '../hooks/useIntent'
import { asSelectOptions, copyText, formatNumber } from '../utils'

const EMPTY_SCRIPT = {
  id: '',
  title: '',
  category: 'general',
  tone: 'polite',
  level: 1,
  body: '',
  language: 'en'
}

const TONES = ['polite', 'friendly', 'firm', 'formal']
const LANGUAGES = ['en', 'ar']

export default function PlaybookTab() {
  const { t, language: uiLanguage } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()

  const [category, setCategory] = useState('')
  const [language, setLanguage] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<typeof EMPTY_SCRIPT | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [renderTarget, setRenderTarget] = useState<any | null>(null)
  const [renderValues, setRenderValues] = useState<Record<string, string>>({})
  const [rendered, setRendered] = useState<string>('')
  const [missing, setMissing] = useState<string[]>([])
  const [renderBusy, setRenderBusy] = useState(false)

  const scripts = useAsync<any>(
    () =>
      window.api.personal.playbook.getScripts({
        category: category || undefined,
        language: language || undefined,
        search: search || undefined
      }),
    [category, language, search]
  )
  const categories = useAsync<any>(() => window.api.personal.playbook.getCategories(), [])

  const scriptRows = useMemo(() => rowsOf<any>(scripts.data), [scripts.data])
  const categoryRows = useMemo(() => rowsOf<any>(categories.data), [categories.data])
  const categoryOptions = useMemo(
    () => asSelectOptions(config.data?.scriptCategories, uiLanguage),
    [config.data, uiLanguage]
  )
  const usedCategories = categoryRows.filter((row) => Number(row.count) > 0).length
  const totalUsage = categoryRows.reduce((sum, row) => sum + Number(row.usageCount ?? 0), 0)
  const builtInCount = scriptRows.filter((row) => row.isBuiltIn).length

  const openCreate = () =>
    setForm({ ...EMPTY_SCRIPT, category: category || 'general', language: language || 'en' })

  // Opened from the command palette's "New script".
  useIntent('script', openCreate)

  const openEdit = (row: any) =>
    setForm({
      id: row.id,
      title: row.title ?? '',
      category: row.category ?? 'general',
      tone: row.tone ?? 'polite',
      level: Number(row.level ?? 1),
      body: row.body ?? '',
      language: row.language ?? 'en'
    })

  const save = async () => {
    if (!form) return
    if (!form.title.trim()) {
      toast.warning(t('pwTitleRequired'))
      return
    }
    if (!form.body.trim()) {
      toast.warning(t('pwBodyRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        tone: form.tone,
        level: Number(form.level) || 1,
        body: form.body,
        language: form.language
      }
      if (form.id) {
        await window.api.personal.playbook.update({ id: form.id, ...payload })
        toast.success(t('pwScriptUpdated'))
      } else {
        await window.api.personal.playbook.create(payload)
        toast.success(t('pwScriptCreated'))
      }
      setForm(null)
      scripts.reload()
      categories.reload()
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const duplicate = async (row: any) => {
    try {
      await window.api.personal.playbook.create({
        title: `${row.title} (${t('pwCopy')})`,
        category: row.category,
        tone: row.tone,
        level: row.level,
        body: row.body,
        language: row.language
      })
      toast.success(t('pwScriptCreated'))
      scripts.reload()
      categories.reload()
    } catch {
      toast.error(t('pwSaveFailed'))
    }
  }

  const remove = async () => {
    if (!confirmId) return
    setSaving(true)
    try {
      await window.api.personal.playbook.delete(confirmId)
      toast.success(t('pwScriptDeleted'))
      setConfirmId(null)
      scripts.reload()
      categories.reload()
    } catch (err: any) {
      toast.error(String(err?.message ?? t('pwSaveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const seed = async () => {
    setSaving(true)
    try {
      const result = await window.api.personal.playbook.seedDefaults({})
      toast.success(
        t('pwScriptsSeeded', { created: result?.created ?? 0, total: result?.total ?? 0 })
      )
      scripts.reload()
      categories.reload()
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const copyRaw = async (row: any) => {
    const ok = await copyText(String(row.body ?? ''))
    if (ok) toast.success(t('pwCopied'))
    else toast.error(t('pwCopyFailed'))
  }

  const openRender = (row: any) => {
    setRenderTarget(row)
    setRendered('')
    setMissing([])
    setRenderValues({})
  }

  const runRender = async () => {
    if (!renderTarget) return
    setRenderBusy(true)
    try {
      const result = await window.api.personal.playbook.render({
        id: renderTarget.id,
        values: renderValues
      })
      setRendered(String(result?.text ?? ''))
      setMissing(Array.isArray(result?.missing) ? result.missing : [])
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setRenderBusy(false)
    }
  }

  const copyRendered = async () => {
    const text = rendered || String(renderTarget?.body ?? '')
    const ok = await copyText(text)
    if (ok) toast.success(t('pwCopied'))
    else toast.error(t('pwCopyFailed'))
  }

  const placeholderKeys: string[] = useMemo(
    () => (Array.isArray(renderTarget?.placeholderKeys) ? renderTarget.placeholderKeys : []),
    [renderTarget]
  )

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        title={t('pwTabPlaybook')}
        description={t('pwPlaybookHint')}
        icon={<MessageSquare className="h-4 w-4" />}
        actions={
          <>
            <Button
              size="xs"
              variant="secondary"
              aria-label={t('pwRefresh')}
              title={t('pwRefresh')}
              onClick={() => {
                scripts.reload()
                categories.reload()
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="secondary" loading={saving} onClick={seed}>
              <Sparkles className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwSeedScripts')}</span>
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwAddScript')}</span>
            </Button>
          </>
        }
      />

      <KpiSection sectionKey="personal:playbook-KpiStrip" label={t('pwTabPlaybook')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiScripts')}
            value={formatNumber(scriptRows.length)}
            sub={t('pwBuiltInCount', { count: builtInCount })}
            icon={<MessageSquare className="h-4 w-4" />}
            tone="accent"
          />
          <StatCard
            label={t('pwKpiScriptCategories')}
            value={formatNumber(usedCategories)}
            sub={t('pwOfCategories', { total: categoryOptions.length })}
            icon={<Filter className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiScriptUsage')}
            value={formatNumber(totalUsage)}
            sub={t('pwTimesUsed', { count: formatNumber(totalUsage) })}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="success"
          />
          <StatCard
            label={t('pwKpiCustomScripts')}
            value={formatNumber(scriptRows.length - builtInCount)}
            sub={t('pwCustomScriptsHint')}
            icon={<Sparkles className="h-4 w-4" />}
          />
        </MetricStrip>
      </KpiSection>

      <Toolbar>
        <div className="min-w-40 flex-1">
          <SearchField value={search} onChange={setSearch} placeholder={t('pwSearchScripts')} />
        </div>
        <div className="w-44">
          <CustomSelect
            size="sm"
            value={category}
            onChange={(value) => setCategory(String(value))}
            options={[{ value: '', label: t('pwAllCategories') }, ...categoryOptions]}
            placeholder={t('pwCategory')}
          />
        </div>
        <div className="w-32">
          <CustomSelect
            size="sm"
            value={language}
            onChange={(value) => setLanguage(String(value))}
            options={[
              { value: '', label: t('pwAllLanguages') },
              ...LANGUAGES.map((item) => ({ value: item, label: t(`pwLanguage_${item}`) }))
            ]}
            placeholder={t('pwLanguage')}
          />
        </div>
      </Toolbar>

      {categoryRows.length > 0 && (
        <SectionCard
          title={t('pwScriptCategoriesTitle')}
          description={t('pwScriptCategoriesHint')}
          icon={<Filter className="h-3.5 w-3.5" />}
        >
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {categoryRows.map((row) => {
              const active = category === row.id
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(active ? '' : row.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-start transition-colors ${
                      active
                        ? 'border-[color:var(--accent-line)] bg-[color:var(--accent-tint)]'
                        : 'border-slate-200 bg-white hover:border-[color:var(--accent-line)] dark:border-slate-700 dark:bg-slate-800/40'
                    }`}
                  >
                    <span
                      className={`truncate text-xs font-medium ${
                        active
                          ? 'text-[color:var(--accent-text)]'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {t(`pwScriptCategory_${row.id}`)}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {t('pwCountAndUsage', { count: row.count ?? 0, usage: row.usageCount ?? 0 })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title={t('pwPlaybookTitle')}
        description={t('pwPlaybookHint')}
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        actions={
          scriptRows.length > 0 ? (
            <StatusPill tone="neutral" dot={false}>
              {formatNumber(scriptRows.length)}
            </StatusPill>
          ) : undefined
        }
      >
        {scripts.loading && <EmptyState loading loadingLabel={t('pwLoading')} />}
        {!scripts.loading && scriptRows.length === 0 && (
          <EmptyState
            message={t('pwNoScripts')}
            icon={<MessageSquare className="h-5 w-5" />}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  <span className="ms-1.5">{t('pwAddScript')}</span>
                </Button>
                <Button size="sm" variant="secondary" loading={saving} onClick={seed}>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="ms-1.5">{t('pwSeedScripts')}</span>
                </Button>
              </div>
            }
          />
        )}
        {scriptRows.length > 0 && (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {scriptRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {row.title}
                  </h4>
                  <StatusPill tone={row.isBuiltIn ? 'neutral' : 'accent'} dot={false}>
                    {row.isBuiltIn ? t('pwBuiltIn') : t('pwCustom')}
                  </StatusPill>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusPill tone="info" dot={false}>
                    {t(`pwScriptCategory_${row.category}`)}
                  </StatusPill>
                  <StatusPill tone="info" dot={false}>
                    {t(`pwTone_${row.tone}`)}
                  </StatusPill>
                  <StatusPill tone="info" dot={false}>
                    {t(`pwLanguage_${row.language}`)}
                  </StatusPill>
                  {Array.isArray(row.placeholderKeys) && row.placeholderKeys.length > 0 && (
                    <StatusPill tone="accent" dot={false}>
                      {t('pwVariablesCount', { count: row.placeholderKeys.length })}
                    </StatusPill>
                  )}
                </div>
                <p className="mt-2.5 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {row.body}
                </p>
                <p className={`mt-2 ${MICRO_LABEL}`}>
                  {t('pwUsedTimes', { count: row.usageCount ?? 0 })}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-700">
                  <Button size="sm" variant="primary" onClick={() => openRender(row)}>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="ms-1.5">{t('pwUseScript')}</span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => copyRaw(row)}>
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    <span className="ms-1.5">{t('pwCopy')}</span>
                  </Button>
                  <div className="ms-auto flex items-center gap-1">
                    <Button
                      size="xs"
                      variant="secondary"
                      aria-label={t('pwEdit')}
                      title={t('pwEdit')}
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      aria-label={t('pwDuplicate')}
                      title={t('pwDuplicate')}
                      onClick={() => duplicate(row)}
                    >
                      <Files className="h-3.5 w-3.5" />
                    </Button>
                    {!row.isBuiltIn && (
                      <Button
                        size="xs"
                        variant="danger"
                        aria-label={t('pwDelete')}
                        title={t('pwDelete')}
                        onClick={() => setConfirmId(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Modal
        dense
        isOpen={Boolean(renderTarget)}
        onClose={() => setRenderTarget(null)}
        title={renderTarget?.title ?? t('pwUseScript')}
        size="lg"
      >
        {renderTarget && (
          <div className="space-y-4">
            <FormSection title={t('pwVariables')}>
              {placeholderKeys.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {placeholderKeys.map((key) => (
                    <FormInput
                      size="sm"
                      key={key}
                      label={`{${key}}`}
                      value={renderValues[key] ?? ''}
                      onChange={(value) => setRenderValues((prev) => ({ ...prev, [key]: value }))}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('pwNoVariables')}</p>
              )}
            </FormSection>

            {missing.length > 0 && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t('pwMissingVariables', { keys: missing.join(', ') })}
              </p>
            )}

            <FormSection title={t('pwRenderedMessage')}>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                {rendered || renderTarget.body}
              </pre>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('pwRenderedMessageHint')}
              </p>
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={copyRendered}>
                <ClipboardCopy className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwCopyMessage')}</span>
              </Button>
              <Button size="sm" variant="primary" loading={renderBusy} onClick={runRender}>
                <Sparkles className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwRenderScript')}</span>
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? t('pwEditScript') : t('pwAddScript')}
        size="lg"
      >
        {form && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <FormInput
                size="sm"
                label={t('pwTitle')}
                required
                value={form.title}
                onChange={(value) => setForm({ ...form, title: value })}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwCategory')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.category}
                    onChange={(value) => setForm({ ...form, category: String(value) })}
                    options={categoryOptions}
                    placeholder={t('pwCategory')}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwTone')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.tone}
                    onChange={(value) => setForm({ ...form, tone: String(value) })}
                    options={TONES.map((tone) => ({ value: tone, label: t(`pwTone_${tone}`) }))}
                    placeholder={t('pwTone')}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwLanguage')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.language}
                    onChange={(value) => setForm({ ...form, language: String(value) })}
                    options={LANGUAGES.map((item) => ({
                      value: item,
                      label: t(`pwLanguage_${item}`)
                    }))}
                    placeholder={t('pwLanguage')}
                  />
                </label>
                <FormInput
                  size="sm"
                  label={t('pwEscalationLevel')}
                  type="number"
                  value={form.level}
                  onChange={(value) => setForm({ ...form, level: Number(value) || 1 })}
                  helperText={t('pwEscalationLevelHint')}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwBody')}>
              <FormTextarea
                label={t('pwBody')}
                required
                rows={10}
                value={form.body}
                onChange={(value) => setForm({ ...form, body: value })}
                helperText={t('pwBodyHint')}
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" loading={saving} onClick={save}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        dense
        isOpen={Boolean(confirmId)}
        title={t('pwDeleteScriptConfirm')}
        message={t('pwThisCannotBeUndone')}
        confirmLabel={t('pwDelete')}
        busy={saving}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
