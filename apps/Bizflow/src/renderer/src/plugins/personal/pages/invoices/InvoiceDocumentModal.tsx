// ─── Personal Work: invoice & statement document studio ───────────────────────
// Turns an invoice into something a client can actually receive. The document is
// rendered in the main process (so the file is byte-identical to the preview),
// and this dialog is only responsible for the labels, the issuer identity and
// the four ways out: copy, download HTML, download Markdown, or print to PDF.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Copy, FileDown, FileText, Printer, Receipt, RefreshCw, Users } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import Button from '@renderer/components/ui/Button'
import FormInput from '@renderer/components/ui/FormInput'
import Modal from '@renderer/components/ui/Modal'
import EmptyState from '../components/EmptyState'
import { FormSection, ModalFooter } from '../components/FormSection'
import { useAsync } from '../hooks/useAsync'
import { useIssuerProfile } from '../hooks/useIssuerProfile'
import type { IssuerProfile } from '../hooks/useIssuerProfile'
import { copyText, downloadTextFile, printHtml } from '../utils'

const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void']
const INVOICE_KINDS = ['deposit', 'milestone', 'final', 'retainer', 'change_request']

interface Props {
  isOpen: boolean
  invoiceId: string | null
  onClose: () => void
}

/** A `blob:` URL is used instead of `srcdoc` because the renderer CSP allows it. */
function DocumentPreview({ html, title }: { html: string; title: string }): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!html || typeof URL?.createObjectURL !== 'function') {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [html])

  if (!url) return <EmptyState message={title} icon={<FileText className="h-5 w-5" />} />

  return (
    <iframe
      title={title}
      src={url}
      sandbox=""
      className="h-[420px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700"
    />
  )
}

export default function InvoiceDocumentModal({ isOpen, invoiceId, onClose }: Props): JSX.Element {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const { issuer, setIssuer } = useIssuerProfile()

  const [mode, setMode] = useState<'invoice' | 'statement'>('invoice')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [draft, setDraft] = useState<IssuerProfile>(issuer)

  // The identity is persisted on a short delay so a typed-in business name does
  // not fire one document render per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setIssuer(draft), 400)
    return () => window.clearTimeout(timer)
  }, [draft, setIssuer])

  const invoice = useAsync<any>(
    () =>
      invoiceId ? window.api.personal.billing.getInvoiceById(invoiceId) : Promise.resolve(null),
    [invoiceId]
  )

  const direction: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr'

  const labels = useMemo(
    () => ({
      invoice: t('pwDocLabelInvoice'),
      statement: t('pwDocLabelStatement'),
      from: t('pwDocLabelFrom'),
      billTo: t('pwDocLabelBillTo'),
      issued: t('pwDocLabelIssued'),
      due: t('pwDocLabelDue'),
      project: t('pwDocLabelProject'),
      period: t('pwDocLabelPeriod'),
      reference: t('pwDocLabelReference'),
      status: t('pwDocLabelStatus'),
      description: t('pwDocLabelDescription'),
      quantity: t('pwDocLabelQuantity'),
      unitPrice: t('pwDocLabelUnitPrice'),
      amount: t('pwDocLabelAmount'),
      subtotal: t('pwDocLabelSubtotal'),
      discount: t('pwDocLabelDiscount'),
      tax: t('pwDocLabelTax'),
      total: t('pwDocLabelTotal'),
      paid: t('pwDocLabelPaid'),
      balance: t('pwDocLabelBalance'),
      notes: t('pwDocLabelNotes'),
      emptyLines: t('pwDocLabelEmptyLines'),
      emptyStatement: t('pwDocLabelEmptyStatement'),
      footer: t('pwDocLabelFooter')
    }),
    [t]
  )

  const statusLabels = useMemo(
    () => Object.fromEntries(INVOICE_STATUSES.map((value) => [value, t(`pwStatus_${value}`)])),
    [t]
  )
  const kindLabels = useMemo(
    () => Object.fromEntries(INVOICE_KINDS.map((value) => [value, t(`pwKind_${value}`)])),
    [t]
  )

  const clientId = invoice.data?.client?.id as string | undefined
  const isStatement = mode === 'statement'

  const doc = useAsync<any>(() => {
    if (!invoiceId) return Promise.resolve(null)
    if (isStatement) {
      if (!clientId) return Promise.resolve(null)
      return window.api.personal.billing.exportStatement({
        clientId,
        from: from || undefined,
        to: to || undefined,
        issuer,
        labels,
        direction,
        statusLabels
      })
    }
    return window.api.personal.billing.exportInvoice({
      id: invoiceId,
      issuer,
      labels,
      direction,
      statusLabels,
      kindLabels
    })
  }, [
    invoiceId,
    clientId,
    isStatement,
    from,
    to,
    direction,
    language,
    issuer.name,
    issuer.detail,
    issuer.email
  ])

  const document = doc.data
  const fileStem =
    typeof document?.fileName === 'string' ? document.fileName.replace(/\.html$/, '') : 'document'

  const copy = async (text: string | undefined) => {
    if (!text) return
    if (await copyText(text)) toast.success(t('pwCopied'))
    else toast.error(t('pwCopyFailed'))
  }

  const download = (text: string | undefined, fileName: string, mime: string) => {
    if (!text) return
    downloadTextFile(fileName, text, mime)
    toast.success(t('pwDocDownloaded'))
  }

  return (
    <Modal dense isOpen={isOpen} onClose={onClose} title={t('pwDocTitle')} size="xl">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label={t('pwDocTitle')}
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60"
          >
            {(['invoice', 'statement'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                  mode === value
                    ? 'bg-[color:var(--accent)] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {value === 'invoice' ? (
                  <Receipt className="h-3.5 w-3.5" />
                ) : (
                  <Users className="h-3.5 w-3.5" />
                )}
                {value === 'invoice' ? t('pwDocModeInvoice') : t('pwDocModeStatement')}
              </button>
            ))}
          </div>
          <Button
            size="xs"
            variant="secondary"
            onClick={() => doc.reload()}
            aria-label={t('pwRecalculate')}
            title={t('pwRecalculate')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="ms-1.5">{t('pwRecalculate')}</span>
          </Button>
        </div>

        <FormSection title={t('pwDocIssuerTitle')} description={t('pwDocIssuerHint')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput
              size="sm"
              label={t('pwDocIssuerName')}
              value={draft.name}
              onChange={(value) => setDraft({ ...draft, name: value })}
              placeholder={t('pwDocIssuerNamePlaceholder')}
            />
            <FormInput
              size="sm"
              label={t('pwDocIssuerDetail')}
              value={draft.detail}
              onChange={(value) => setDraft({ ...draft, detail: value })}
              helperText={t('pwDocIssuerDetailHint')}
            />
            <FormInput
              size="sm"
              label={t('pwDocIssuerEmail')}
              type="email"
              value={draft.email}
              onChange={(value) => setDraft({ ...draft, email: value })}
            />
          </div>
        </FormSection>

        {isStatement && (
          <FormSection title={t('pwDocRangeTitle')} description={t('pwDocRangeHint')}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormInput
                size="sm"
                label={t('pwDocRangeFrom')}
                type="date"
                value={from}
                onChange={setFrom}
                helperText={t('pwDocRangeFromHint')}
              />
              <FormInput
                size="sm"
                label={t('pwDocRangeTo')}
                type="date"
                value={to}
                onChange={setTo}
                helperText={t('pwDocRangeToHint')}
              />
            </div>
          </FormSection>
        )}

        <FormSection
          title={t('pwDocPreviewTitle')}
          description={
            document?.fileName
              ? t('pwDocFileHint', { file: document.fileName })
              : t('pwDocPreviewHint')
          }
        >
          {doc.loading && !document ? (
            <EmptyState loading loadingShape="text" />
          ) : doc.error ? (
            <EmptyState message={doc.error} icon={<FileText className="h-5 w-5" />} />
          ) : !document ? (
            <EmptyState message={t('pwDocNothing')} icon={<FileText className="h-5 w-5" />} />
          ) : (
            <DocumentPreview
              html={document.html}
              title={document.title ?? t('pwDocPreviewTitle')}
            />
          )}
        </FormSection>

        <ModalFooter>
          <Button
            size="sm"
            variant="secondary"
            disabled={!document}
            onClick={() => copy(document?.markdown)}
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="ms-1.5">{t('pwDocCopyMarkdown')}</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!document}
            onClick={() => copy(document?.text)}
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="ms-1.5">{t('pwDocCopyText')}</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!document}
            onClick={() => download(document?.markdown, `${fileStem}.md`, 'text/markdown')}
          >
            <FileDown className="h-3.5 w-3.5" />
            <span className="ms-1.5">{t('pwDocDownloadMarkdown')}</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!document}
            onClick={() =>
              download(document?.html, document?.fileName ?? `${fileStem}.html`, 'text/html')
            }
          >
            <FileDown className="h-3.5 w-3.5" />
            <span className="ms-1.5">{t('pwDocDownloadHtml')}</span>
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!document}
            onClick={() => document && printHtml(document.html)}
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="ms-1.5">{t('pwDocPrint')}</span>
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}
