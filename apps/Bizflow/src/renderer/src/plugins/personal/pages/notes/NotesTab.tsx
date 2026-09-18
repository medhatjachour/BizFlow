import { useMemo, useState } from 'react'
import {
  ClipboardCopy,
  Info,
  KeyRound,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  StickyNote,
  Trash2
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
import { META_TEXT } from '../components/base'
import Button from '@renderer/components/ui/Button'
import Modal from '@renderer/components/ui/Modal'
import FormInput from '@renderer/components/ui/FormInput'
import FormTextarea from '@renderer/components/ui/FormTextarea'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import ConfirmDialog from '@renderer/components/ui/ConfirmDialog'
import { useAsync, rowsOf, usePersonalConfig } from '../hooks/useAsync'
import { useIntent } from '../hooks/useIntent'
import { asSelectOptions, copyText, formatDateTime, formatNumber } from '../utils'

const EMPTY_NOTE = {
  id: '',
  title: '',
  kind: 'note',
  projectId: '',
  clientId: '',
  tags: '',
  content: '',
  isPinned: false
}

export default function NotesTab() {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()

  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')
  const [projectId, setProjectId] = useState('')
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [form, setForm] = useState<typeof EMPTY_NOTE | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const notes = useAsync<any>(
    () =>
      window.api.personal.notes.getAll({
        search: search || undefined,
        kind: kind || undefined,
        projectId: projectId || undefined,
        pinnedOnly: pinnedOnly || undefined
      }),
    [search, kind, projectId, pinnedOnly]
  )
  const projects = useAsync<any>(() => window.api.personal.projects.getAll({ pageSize: 200 }), [])
  const clients = useAsync<any>(() => window.api.personal.clients.getAll({ pageSize: 200 }), [])

  const noteRows = useMemo(() => rowsOf<any>(notes.data), [notes.data])
  const projectRows = useMemo(() => rowsOf<any>(projects.data), [projects.data])
  const clientRows = useMemo(() => rowsOf<any>(clients.data), [clients.data])
  const kindOptions = useMemo(
    () => asSelectOptions(config.data?.noteKinds, language),
    [config.data, language]
  )

  const projectOptions = useMemo(
    () =>
      projectRows.map((project) => ({
        value: project.id,
        label: `${project.code ? `${project.code} · ` : ''}${project.title}`
      })),
    [projectRows]
  )
  const clientOptions = useMemo(
    () => clientRows.map((client) => ({ value: client.id, label: client.name })),
    [clientRows]
  )

  const pinnedCount = noteRows.filter((row) => row.isPinned).length
  const credentialCount = noteRows.filter((row) => row.kind === 'credential').length
  const linkedProjects = new Set(noteRows.map((row) => row.projectId).filter(Boolean)).size

  const openCreate = () =>
    setForm({ ...EMPTY_NOTE, kind: kind || 'note', projectId: projectId || '' })

  // Opened from the command palette's "New note".
  useIntent('note', openCreate)

  const openEdit = (row: any) =>
    setForm({
      id: row.id,
      title: row.title ?? '',
      kind: row.kind ?? 'note',
      projectId: row.projectId ?? '',
      clientId: row.clientId ?? '',
      tags: row.tags ?? '',
      content: row.content ?? '',
      isPinned: Boolean(row.isPinned)
    })

  const save = async () => {
    if (!form) return
    if (!form.title.trim()) {
      toast.warning(t('pwTitleRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        kind: form.kind,
        projectId: form.projectId || null,
        clientId: form.clientId || null,
        tags: form.tags || null,
        content: form.content,
        isPinned: form.isPinned
      }
      if (form.id) {
        await window.api.personal.notes.update({ id: form.id, ...payload })
        toast.success(t('pwNoteUpdated'))
      } else {
        await window.api.personal.notes.create(payload)
        toast.success(t('pwNoteCreated'))
      }
      setForm(null)
      notes.reload()
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (row: any) => {
    try {
      await window.api.personal.notes.togglePin(row.id)
      notes.reload()
    } catch {
      toast.error(t('pwSaveFailed'))
    }
  }

  const remove = async () => {
    if (!confirmId) return
    setSaving(true)
    try {
      await window.api.personal.notes.delete(confirmId)
      toast.success(t('pwNoteDeleted'))
      setConfirmId(null)
      notes.reload()
    } catch {
      toast.error(t('pwSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const copyNote = async (row: any) => {
    const ok = await copyText(`${row.title}\n\n${row.content ?? ''}`)
    if (ok) toast.success(t('pwCopied'))
    else toast.error(t('pwCopyFailed'))
  }

  return (
    <div className="space-y-5 p-4 md:p-5">
      <PageHeader
        title={t('pwTabNotes')}
        description={t('pwScratchpadHint')}
        icon={<StickyNote className="h-4 w-4" />}
        actions={
          <>
            <Button
              size="xs"
              variant="secondary"
              aria-label={t('pwRefresh')}
              title={t('pwRefresh')}
              onClick={() => notes.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwAddNote')}</span>
            </Button>
          </>
        }
      />

      <KpiSection sectionKey="personal:notes-KpiStrip" label={t('pwTabNotes')}>
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiNotes')}
            value={formatNumber(noteRows.length)}
            sub={t('pwNotesScope')}
            icon={<StickyNote className="h-4 w-4" />}
            tone="accent"
          />
          <StatCard
            label={t('pwKpiPinnedNotes')}
            value={formatNumber(pinnedCount)}
            sub={t('pwPinnedHint')}
            icon={<Pin className="h-4 w-4" />}
            tone="warning"
          />
          <StatCard
            label={t('pwKpiCredentials')}
            value={formatNumber(credentialCount)}
            sub={t('pwCredentialsHint')}
            icon={<KeyRound className="h-4 w-4" />}
          />
          <StatCard
            label={t('pwKpiLinkedProjects')}
            value={formatNumber(linkedProjects)}
            sub={t('pwLinkedProjectsHint')}
            icon={<StickyNote className="h-4 w-4" />}
          />
        </MetricStrip>
      </KpiSection>

      <Toolbar>
        <div className="min-w-40 flex-1">
          <SearchField value={search} onChange={setSearch} placeholder={t('pwSearchNotes')} />
        </div>
        <div className="w-44">
          <CustomSelect
            size="sm"
            value={kind}
            onChange={(value) => setKind(String(value))}
            options={[{ value: '', label: t('pwAllKinds') }, ...kindOptions]}
            placeholder={t('pwKind')}
          />
        </div>
        <div className="w-52">
          <CustomSelect
            size="sm"
            value={projectId}
            onChange={(value) => setProjectId(String(value))}
            options={[{ value: '', label: t('pwAllProjects') }, ...projectOptions]}
            placeholder={t('pwProject')}
          />
        </div>
        <button
          type="button"
          aria-pressed={pinnedOnly}
          onClick={() => setPinnedOnly((prev) => !prev)}
          className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
            pinnedOnly
              ? 'border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
              : 'border-slate-200 bg-white text-slate-600 hover:border-[color:var(--accent-line)] dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300'
          }`}
        >
          <Pin className="h-3.5 w-3.5" />
          {t('pwPinnedOnly')}
        </button>
      </Toolbar>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('pwLocalNotesWarning')}</span>
      </div>

      <SectionCard
        title={t('pwScratchpadTitle')}
        description={t('pwScratchpadHint')}
        icon={<StickyNote className="h-3.5 w-3.5" />}
        actions={
          noteRows.length > 0 ? (
            <StatusPill tone="neutral" dot={false}>
              {formatNumber(noteRows.length)}
            </StatusPill>
          ) : undefined
        }
      >
        {notes.loading && <EmptyState loading loadingLabel={t('pwLoading')} />}
        {!notes.loading && noteRows.length === 0 && (
          <EmptyState
            message={t('pwNoNotes')}
            icon={<StickyNote className="h-5 w-5" />}
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwAddNote')}</span>
              </Button>
            }
          />
        )}
        {noteRows.length > 0 && (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {noteRows.map((row) => (
              <li
                key={row.id}
                className={`flex flex-col rounded-lg border bg-white p-3 transition-colors dark:bg-slate-800/40 ${
                  row.isPinned
                    ? 'border-amber-300 dark:border-amber-800'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {row.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() => togglePin(row)}
                    title={row.isPinned ? t('pwUnpin') : t('pwPin')}
                    aria-label={row.isPinned ? t('pwUnpin') : t('pwPin')}
                    aria-pressed={Boolean(row.isPinned)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)] dark:hover:bg-slate-800"
                  >
                    {row.isPinned ? (
                      <Pin className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <PinOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusPill tone="info" dot={false}>
                    {t(`pwNoteKind_${row.kind}`)}
                  </StatusPill>
                  {row.project && (
                    <StatusPill tone="neutral" dot={false}>
                      {row.project.code ? `${row.project.code} · ` : ''}
                      {row.project.title}
                    </StatusPill>
                  )}
                  {row.client && (
                    <StatusPill tone="accent" dot={false}>
                      {row.client.name}
                    </StatusPill>
                  )}
                </div>

                <p className="mt-2.5 line-clamp-6 whitespace-pre-line break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {row.content || t('pwEmptyNote')}
                </p>

                {row.tags && (
                  <p className="mt-2 truncate text-xs font-medium text-[color:var(--accent-text)]">
                    #{row.tags}
                  </p>
                )}

                <p className={`mt-2 ${META_TEXT}`}>{formatDateTime(row.updatedAt)}</p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-700">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="ms-1.5">{t('pwEdit')}</span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => copyNote(row)}>
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    <span className="ms-1.5">{t('pwCopy')}</span>
                  </Button>
                  <Button
                    size="xs"
                    variant="danger"
                    className="ms-auto"
                    aria-label={t('pwDelete')}
                    title={t('pwDelete')}
                    onClick={() => setConfirmId(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Modal
        dense
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? t('pwEditNote') : t('pwAddNote')}
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
                    {t('pwKind')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.kind}
                    onChange={(value) => setForm({ ...form, kind: String(value) })}
                    options={kindOptions}
                    placeholder={t('pwKind')}
                  />
                </label>
                <FormInput
                  size="sm"
                  label={t('pwTags')}
                  value={form.tags}
                  onChange={(value) => setForm({ ...form, tags: value })}
                  helperText={t('pwTagsHint')}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormLinks')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwProject')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={form.projectId}
                    onChange={(value) => setForm({ ...form, projectId: String(value) })}
                    options={[{ value: '', label: t('pwNoProject') }, ...projectOptions]}
                    placeholder={t('pwProject')}
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
                    options={[{ value: '', label: t('pwNoClient') }, ...clientOptions]}
                    placeholder={t('pwClient')}
                  />
                </label>
              </div>
            </FormSection>

            <FormSection title={t('pwContent')}>
              <FormTextarea
                label={t('pwContent')}
                required
                rows={10}
                value={form.content}
                onChange={(value) => setForm({ ...form, content: value })}
                helperText={t('pwContentHint')}
              />
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <label className="inline-flex h-7 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[color:var(--accent)]"
                  checked={form.isPinned}
                  onChange={(event) => setForm({ ...form, isPinned: event.target.checked })}
                />
                {t('pwPin')}
              </label>
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
        title={t('pwDeleteNoteConfirm')}
        message={t('pwThisCannotBeUndone')}
        confirmLabel={t('pwDelete')}
        busy={saving}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
