// ─── Personal Work: late-fee & collection panel ──────────────────────────────
// Chasing an overdue invoice is the least pleasant part of freelancing, so this
// panel answers three questions before the awkward email is written: how late is
// each invoice, what does the fee come to under my own policy, and what exactly
// do I say? The fee is always a preview — the policy lives in this panel's state
// and is never written to the database, so nothing here can change a client's
// balance by accident.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Copy, FileText, RefreshCw, Timer } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import Button from '@renderer/components/ui/Button'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import BreakdownList from '../components/BreakdownList'
import MetricStrip from '../components/MetricStrip'
import StatusPill from '../components/StatusPill'
import { FormSection, ModalFooter } from '../components/FormSection'
import { META_TEXT } from '../components/base'
import { useAsync } from '../hooks/useAsync'
import FormInput from '@renderer/components/ui/FormInput'
import Modal from '@renderer/components/ui/Modal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/Table'
import { copyText, formatDate, formatMoney, formatNumber, formatPercent } from '../utils'

/** The editable shape of the fee policy — strings so the inputs can be cleared. */
interface PolicyForm {
  graceDays: string
  ratePercent: string
  periodDays: string
  maxPercent: string
  flatFee: string
}

const DEFAULT_FORM: PolicyForm = {
  graceDays: '3',
  ratePercent: '2',
  periodDays: '30',
  maxPercent: '15',
  flatFee: '0'
}

export default function LateFeePanel() {
  const { t } = useLanguage()
  const toast = useQuietToast()

  const [form, setForm] = useState<PolicyForm>(DEFAULT_FORM)
  const [noticeRow, setNoticeRow] = useState<any | null>(null)

  const policy = useMemo(
    () => ({
      graceDays: Number(form.graceDays || 0),
      ratePercent: Number(form.ratePercent || 0),
      periodDays: Math.max(1, Number(form.periodDays || 1)),
      maxPercent: Number(form.maxPercent || 0),
      flatFee: Number(form.flatFee || 0)
    }),
    [form.graceDays, form.ratePercent, form.periodDays, form.maxPercent, form.flatFee]
  )

  const scan = useAsync<any>(() => window.api.personal.billing.lateFeeScan({ policy }), [policy])
  const rows: any[] = scan.data?.rows ?? []
  const currency = rows[0]?.currency ?? 'USD'
  const money = (value: number) => formatMoney(value, currency)

  const noticeBody = (row: any) =>
    t('pwLateNoticeBody', {
      client: row.clientName || t('pwUnknownClient'),
      number: row.number,
      due: formatDate(row.dueAt),
      days: formatNumber(row.breakdown.daysLate),
      balance: formatMoney(row.balance, row.currency),
      fee: formatMoney(row.breakdown.fee, row.currency),
      total: formatMoney(row.breakdown.newBalance, row.currency)
    })

  const copyNotice = async (row: any) => {
    const subject = t('pwLateNoticeSubject', { number: row.number })
    const ok = await copyText(`${subject}\n\n${noticeBody(row)}`)
    if (ok) toast.success(t('pwCopied'))
    else toast.error(t('pwCopyFailed'))
  }

  return (
    <div className="space-y-6">
      <MetricStrip size="four">
        <StatCard
          label={t('pwLateKpiPastDue')}
          value={formatNumber(rows.length)}
          sub={t('pwLateKpiPastDueHint')}
          icon={<CalendarClock className="h-4 w-4" />}
          tone={rows.length > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={t('pwLateKpiChargeable')}
          value={formatNumber(scan.data?.chargeableCount ?? 0)}
          sub={t('pwLateKpiChargeableHint', { days: formatNumber(policy.graceDays) })}
          icon={<Timer className="h-4 w-4" />}
          tone={(scan.data?.chargeableCount ?? 0) > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label={t('pwLateKpiOutstanding')}
          value={money(scan.data?.totalBalance ?? 0)}
          sub={t('pwLateKpiOutstandingHint')}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label={t('pwLateKpiFees')}
          value={money(scan.data?.totalFee ?? 0)}
          sub={t('pwLateKpiFeesHint')}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={(scan.data?.totalFee ?? 0) > 0 ? 'accent' : 'default'}
        />
      </MetricStrip>

      <SectionCard
        title={t('pwLatePolicyTitle')}
        description={t('pwLatePolicyHint')}
        icon={<Timer className="h-3.5 w-3.5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button size="xs" variant="secondary" onClick={() => setForm(DEFAULT_FORM)}>
              {t('pwLatePolicyReset')}
            </Button>
            <Button size="xs" variant="secondary" onClick={() => scan.reload()}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwRecalculate')}</span>
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FormInput
            size="sm"
            label={t('pwLateGraceDays')}
            type="number"
            min={0}
            value={form.graceDays}
            onChange={(value) => setForm({ ...form, graceDays: value })}
            helperText={t('pwLateGraceDaysHint')}
          />
          <FormInput
            size="sm"
            label={t('pwLateRate')}
            type="number"
            step="0.1"
            min={0}
            value={form.ratePercent}
            onChange={(value) => setForm({ ...form, ratePercent: value })}
            helperText={t('pwLateRateHint')}
          />
          <FormInput
            size="sm"
            label={t('pwLatePeriod')}
            type="number"
            min={1}
            value={form.periodDays}
            onChange={(value) => setForm({ ...form, periodDays: value })}
            helperText={t('pwLatePeriodHint')}
          />
          <FormInput
            size="sm"
            label={t('pwLateCap')}
            type="number"
            step="0.5"
            min={0}
            value={form.maxPercent}
            onChange={(value) => setForm({ ...form, maxPercent: value })}
            helperText={t('pwLateCapHint')}
          />
          <FormInput
            size="sm"
            label={t('pwLateFlatFee')}
            type="number"
            step="0.5"
            min={0}
            value={form.flatFee}
            onChange={(value) => setForm({ ...form, flatFee: value })}
            helperText={t('pwLateFlatFeeHint')}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t('pwLateListTitle')}
        description={t('pwLateListHint')}
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        padded={false}
      >
        {scan.loading && rows.length === 0 ? (
          <EmptyState loading />
        ) : rows.length === 0 ? (
          <EmptyState message={t('pwLateEmpty')} icon={<CalendarClock className="h-5 w-5" />} />
        ) : (
          <Table dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pwClient')}</TableHead>
                <TableHead>{t('pwInvoiceNumber')}</TableHead>
                <TableHead>{t('pwDueDate')}</TableHead>
                <TableHead>{t('pwDaysLate')}</TableHead>
                <TableHead>{t('pwBalance')}</TableHead>
                <TableHead>{t('pwLateFee')}</TableHead>
                <TableHead>{t('pwLateNewTotal')}</TableHead>
                <TableHead>{t('pwColActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.invoiceId}>
                  <TableCell className="whitespace-nowrap">
                    <span className="block font-medium text-slate-900 dark:text-white">
                      {row.clientName || t('pwUnknownClient')}
                    </span>
                    {row.projectCode && (
                      <span className={`block ${META_TEXT}`}>{row.projectCode}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{row.number}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDate(row.dueAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{formatNumber(row.breakdown.daysLate)}</span>
                      {row.breakdown.withinGrace ? (
                        <StatusPill tone="neutral" dot={false}>
                          {t('pwLateInGrace')}
                        </StatusPill>
                      ) : row.breakdown.capped ? (
                        <StatusPill tone="danger" dot={false}>
                          {t('pwLateCapped')}
                        </StatusPill>
                      ) : (
                        <StatusPill tone="warning" dot={false}>
                          {t('pwLateChargeable')}
                        </StatusPill>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatMoney(row.balance, row.currency)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <span
                      className={
                        row.breakdown.fee > 0
                          ? 'font-medium text-[color:var(--accent-text)]'
                          : 'text-slate-400'
                      }
                    >
                      {formatMoney(row.breakdown.fee, row.currency)}
                    </span>
                    {row.breakdown.fee > 0 && (
                      <span className={`block ${META_TEXT}`}>
                        {formatPercent(row.breakdown.ratePercent)} ×{' '}
                        {formatNumber(row.breakdown.periods)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-semibold tabular-nums">
                    {formatMoney(row.breakdown.newBalance, row.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="secondary"
                        aria-label={t('pwLateNotice')}
                        title={t('pwLateNotice')}
                        onClick={() => setNoticeRow(row)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="ms-1.5">{t('pwLateNotice')}</span>
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        aria-label={t('pwCopy')}
                        title={t('pwCopy')}
                        onClick={() => copyNotice(row)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <Modal
        dense
        isOpen={Boolean(noticeRow)}
        onClose={() => setNoticeRow(null)}
        title={t('pwLateNoticeTitle')}
      >
        {noticeRow && (
          <div className="space-y-4">
            <FormSection title={t('pwLateNoticeTitle')}>
              <p className={META_TEXT}>{t('pwLateNoticeHint')}</p>
              <BreakdownList
                rows={[
                  { label: t('pwDueDate'), value: formatDate(noticeRow.dueAt) },
                  {
                    label: t('pwDaysLate'),
                    value: formatNumber(noticeRow.breakdown.daysLate),
                    tone: 'negative'
                  },
                  {
                    label: t('pwBalance'),
                    value: formatMoney(noticeRow.balance, noticeRow.currency)
                  },
                  {
                    label: t('pwLateFee'),
                    hint: `${formatPercent(noticeRow.breakdown.ratePercent)} / ${formatNumber(noticeRow.breakdown.periodDays)}d`,
                    value: formatMoney(noticeRow.breakdown.fee, noticeRow.currency),
                    tone: 'accent'
                  },
                  {
                    label: t('pwLateNewTotal'),
                    value: formatMoney(noticeRow.breakdown.newBalance, noticeRow.currency),
                    tone: 'total'
                  }
                ]}
              />
            </FormSection>

            <FormSection title={t('pwRenderedMessage')}>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                {noticeBody(noticeRow)}
              </div>
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setNoticeRow(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={() => copyNotice(noticeRow)}>
                <Copy className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwCopy')}</span>
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  )
}
