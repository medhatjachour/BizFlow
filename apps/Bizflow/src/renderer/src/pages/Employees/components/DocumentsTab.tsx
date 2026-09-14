import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarClock,
  ExternalLink,
  FileBadge,
  FileText,
  Files,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import type { EmployeeDocument } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useHrFormat } from '../ui/hrFormat'
import {
  HrBadge,
  HrButton,
  HrCard,
  HrEmptyState,
  HrIconButton,
  HrSectionHeader,
  HrStat,
  HR_INPUT_CLASS,
} from '../ui/primitives'
import { expiryState, daysUntil } from '../expiry'

const DOC_TYPE_KEYS: Record<string, string> = {
  contract: 'empDocContract',
  id_copy: 'empDocIdCopy',
  id: 'empDocIdCopy',
  certificate: 'empDocCertificate',
  other: 'empDocOther',
}

const DOC_TYPE_ICONS: Record<string, typeof FileText> = {
  contract: FileBadge,
  id_copy: BadgeCheck,
  id: BadgeCheck,
  certificate: BadgeCheck,
  other: FileText,
}

function docTypeLabel(type: string, t: (key: string) => string): string {
  const key = DOC_TYPE_KEYS[type]
  return key ? t(key) : type.replace(/_/g, ' ')
}

interface Props {
  documents: EmployeeDocument[]
  onAdd: () => void
  onOpen: (id: string) => void
  onEdit: (doc: EmployeeDocument) => void
  onDelete: (id: string) => void
  disabled?: boolean
}

export default function DocumentsTab({ documents, onAdd, onOpen, onEdit, onDelete, disabled }: Props) {
  const { t } = useLanguage()
  const fmt = useHrFormat()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? documents.filter(d =>
          [d.title, d.reference, d.filename, docTypeLabel(d.type, t)]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q))
        )
      : documents
    return [...list].sort((a, b) => {
      // Documents that need attention float to the top, then most recent first.
      const rank = (d: EmployeeDocument) => {
        const s = expiryState(d.expiresAt)
        return s === 'expired' ? 0 : s === 'soon' ? 1 : 2
      }
      const diff = rank(a) - rank(b)
      if (diff !== 0) return diff
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    })
  }, [documents, query, t])

  const expired = documents.filter(d => expiryState(d.expiresAt) === 'expired').length
  const expiring = documents.filter(d => expiryState(d.expiresAt) === 'soon').length
  const withoutReference = documents.filter(d => !d.reference).length

  const uploadButton = !disabled ? (
    <HrButton variant="primary" size="md" icon={Plus} onClick={onAdd}>
      {t('empUploadDocument')}
    </HrButton>
  ) : undefined

  const expiryBadge = (doc: EmployeeDocument) => {
    const state = expiryState(doc.expiresAt)
    if (state === 'none') {
      return <HrBadge tone="neutral">{t('empDocNoExpiryBadge')}</HrBadge>
    }
    const days = daysUntil(doc.expiresAt)
    if (state === 'expired') {
      return (
        <HrBadge tone="danger" icon={ShieldAlert}>
          {t('empDocExpiredOn', { date: fmt.date(doc.expiresAt) })}
        </HrBadge>
      )
    }
    if (state === 'soon') {
      return (
        <HrBadge tone="warning" icon={CalendarClock}>
          {t('empDocExpiringInDays', { count: fmt.count(days ?? 0) })}
        </HrBadge>
      )
    }
    return (
      <HrBadge tone="success" icon={CalendarClock}>
        {t('empDocExpiresOn', { date: fmt.date(doc.expiresAt) })}
      </HrBadge>
    )
  }

  return (
    <div className="space-y-4">
      <HrSectionHeader
        icon={Files}
        title={t('tabDocuments')}
        subtitle={t('empDocStatCount', { count: fmt.count(documents.length) })}
        action={uploadButton}
      />

      {documents.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <HrStat
              icon={ShieldAlert}
              tone="danger"
              label={t('empDocExpired')}
              value={fmt.count(expired)}
              valueClassName={expired > 0 ? 'text-red-600 dark:text-red-400' : undefined}
            />
            <HrStat
              icon={CalendarClock}
              tone="warning"
              label={t('empDocExpiringSoon')}
              value={fmt.count(expiring)}
              valueClassName={expiring > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
            />
            <HrStat
              icon={FileText}
              tone="neutral"
              label={t('empDocMissingReference')}
              value={fmt.count(withoutReference)}
              valueClassName={withoutReference > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
            />
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('empDocSearchPlaceholder')}
              className={`${HR_INPUT_CLASS} ps-9`}
              aria-label={t('empDocSearchPlaceholder')}
            />
          </div>
        </>
      )}

      {documents.length === 0 ? (
        <HrCard padded={false}>
          <HrEmptyState
            icon={Files}
            title={t('empNoDocumentsYet')}
            description={t('empDocumentPickHint')}
            action={uploadButton}
          />
        </HrCard>
      ) : filtered.length === 0 ? (
        <HrCard padded={false}>
          <HrEmptyState
            icon={Search}
            title={t('empDocNoResults')}
            description={t('empDocNoResultsHint')}
            action={<HrButton size="md" onClick={() => setQuery('')}>{t('clear')}</HrButton>}
          />
        </HrCard>
      ) : (
        <ul className="space-y-3">
          {filtered.map(doc => {
            const Icon = DOC_TYPE_ICONS[doc.type] ?? FileText
            const state = expiryState(doc.expiresAt)
            return (
              <HrCard
                as="li"
                key={doc.id}
                padded={false}
                className={`overflow-hidden ${
                  state === 'expired'
                    ? 'border-red-200 dark:border-red-900/50'
                    : state === 'soon'
                      ? 'border-amber-200 dark:border-amber-900/50'
                      : ''
                }`}
              >
                <div className="flex items-start gap-3 p-4">
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      state === 'expired'
                        ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                        : state === 'soon'
                          ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <Icon size={19} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">{doc.title}</span>
                      <HrBadge tone="neutral">{docTypeLabel(doc.type, t)}</HrBadge>
                      {expiryBadge(doc)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        {doc.reference ? (
                          <>
                            {t('empDocNumber')}{' '}
                            <span dir="ltr" className="font-medium text-slate-600 dark:text-slate-300">
                              {doc.reference}
                            </span>
                          </>
                        ) : (
                          <span className="italic text-slate-400 dark:text-slate-500">{t('empDocNoNumber')}</span>
                        )}
                      </span>
                      {doc.issuedAt && (
                        <span>
                          · {t('empDocIssuedOn', { date: fmt.date(doc.issuedAt) })}
                        </span>
                      )}
                      <span>· {t('empDocUploadedOn', { date: fmt.date(doc.uploadedAt) })}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <HrIconButton
                      icon={ExternalLink}
                      title={t('empOpenDocument')}
                      onClick={() => onOpen(doc.id)}
                    />
                    {!disabled && (
                      <>
                        <HrIconButton
                          icon={Pencil}
                          title={t('empDocEdit')}
                          onClick={() => onEdit(doc)}
                        />
                        <HrIconButton
                          icon={Trash2}
                          tone="danger"
                          title={t('empDocDelete')}
                          onClick={() => onDelete(doc.id)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </HrCard>
            )
          })}
        </ul>
      )}
    </div>
  )
}
