// ─── Personal Work: retainer renewal automation ──────────────────────────────
// A retainer bills on a calendar boundary, which is exactly the kind of chore a
// solo operator forgets. This panel shows what has closed, previews the roll and
// then applies it — optionally raising the renewal invoice. The preview calls the
// same handler with `dryRun`, so the number on the button is the number applied.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { CalendarClock, Coins, RefreshCw, Repeat, RotateCcw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import Button from '@renderer/components/ui/Button'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import Modal from '@renderer/components/ui/Modal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/Table'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import BreakdownList from '../components/BreakdownList'
import MetricStrip from '../components/MetricStrip'
import StatusPill from '../components/StatusPill'
import ListRow from '../components/ListRow'
import { FormSection, ModalFooter } from '../components/FormSection'
import type { BreakdownRow } from '../components/BreakdownList'
import { META_TEXT } from '../components/base'
import { useAsync } from '../hooks/useAsync'
import { formatDate, formatMoney, formatNumber } from '../utils'

const REASON_KEYS: Record<string, string> = {
  not_due: 'pwRenewalReason_not_due',
  already_invoiced: 'pwRenewalReason_already_invoiced',
  invoiced: 'pwRenewalReason_invoiced',
  rolled: 'pwRenewalReason_rolled'
}

export default function RenewalsPanel() {
  const { t } = useLanguage()
  const toast = useQuietToast()

  const [rollOpen, setRollOpen] = useState(false)
  const [invoiceOn, setInvoiceOn] = useState(true)
  const [applying, setApplying] = useState(false)

  const scan = useAsync<any>(() => window.api.personal.finance.retainers.renewalScan(), [])
  const rows: any[] = scan.data?.rows ?? []
  const due: any[] = rows.filter((row) => row.plan?.window?.isDue)
  const dueCount = scan.data?.dueCount ?? due.length
  const carried = due.reduce((sum, row) => sum + Number(row.plan?.carriedHours ?? 0), 0)
  const forfeited = due.reduce((sum, row) => sum + Number(row.plan?.forfeitedHours ?? 0), 0)
  const currency = rows[0]?.currency ?? 'USD'

  // The nearest boundary still ahead of us — what the operator has to plan for.
  const nextBoundary = useMemo(() => {
    const upcoming = rows
      .filter((row) => row.plan?.window && !row.plan.window.isDue)
      .map((row) => row.plan.window as { periodEnd: string; daysUntilReset: number })
      .sort((a, b) => a.daysUntilReset - b.daysUntilReset)
    return upcoming[0] ?? null
  }, [rows])

  // Preview and apply share one handler, so the dialog cannot promise one thing
  // and do another.
  const preview = useAsync<any>(
    () =>
      rollOpen
        ? window.api.personal.finance.retainers.rollRenewals({ dryRun: true, invoice: invoiceOn })
        : Promise.resolve(null),
    [rollOpen, invoiceOn]
  )
  const previewRows: any[] = (preview.data?.rows ?? []).filter(
    (row: any) => row.action === 'rolled'
  )
  const previewAmount = preview.data?.totalInvoiceAmount ?? 0

  const apply = async () => {
    setApplying(true)
    try {
      const result = await window.api.personal.finance.retainers.rollRenewals({
        invoice: invoiceOn
      })
      toast.success(
        `${t('pwRenewalDone')} — ${t('pwRenewalDoneSummary', {
          rolled: formatNumber(result?.rolled ?? 0),
          invoices: formatNumber(result?.invoicesCreated ?? 0)
        })}`
      )
      setRollOpen(false)
      scan.reload()
    } catch {
      toast.error(t('pwRenewalFailed'))
    } finally {
      setApplying(false)
    }
  }

  const stateBadge = (plan: any) =>
    plan?.window?.isDue ? (
      <StatusPill tone="danger">{t('pwRenewalStateDue')}</StatusPill>
    ) : (
      <StatusPill tone="neutral">{t('pwRenewalStateScheduled')}</StatusPill>
    )

  const previewBreakdown: BreakdownRow[] = [
    { label: t('pwRenewalCarriedLabel'), value: `${formatNumber(carried, 1)}h` },
    {
      label: t('pwRenewalForfeitedLabel'),
      value: `${formatNumber(forfeited, 1)}h`,
      tone: forfeited > 0 ? 'negative' : 'muted'
    },
    {
      label: t('pwRenewalColAmount'),
      value: formatMoney(previewAmount, currency),
      tone: 'total'
    }
  ]

  return (
    <div className="space-y-4">
      <MetricStrip size="four">
        <StatCard
          label={t('pwRenewalKpiDue')}
          value={formatNumber(dueCount)}
          sub={t('pwRenewalKpiDueSub', {
            due: formatNumber(dueCount),
            total: formatNumber(rows.length)
          })}
          icon={<RotateCcw className="h-4 w-4" />}
          tone={dueCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={t('pwRenewalKpiCarry')}
          value={`${formatNumber(carried, 1)}h`}
          sub={t('pwRenewalKpiCarrySub', { hours: formatNumber(forfeited, 1) })}
          icon={<Repeat className="h-4 w-4" />}
        />
        <StatCard
          label={t('pwRenewalKpiInvoice')}
          value={formatMoney(scan.data?.totalInvoiceAmount ?? 0, currency)}
          sub={t('pwRenewalKpiInvoiceSub', { count: formatNumber(dueCount) })}
          icon={<Coins className="h-4 w-4" />}
          tone={dueCount > 0 ? 'accent' : 'default'}
        />
        <StatCard
          label={t('pwRenewalKpiNext')}
          value={nextBoundary ? formatDate(nextBoundary.periodEnd) : '—'}
          sub={
            nextBoundary
              ? t('pwRenewalKpiNextSub', { days: formatNumber(nextBoundary.daysUntilReset) })
              : t('pwRenewalKpiNextSubNone')
          }
          icon={<CalendarClock className="h-4 w-4" />}
        />
      </MetricStrip>

      <SectionCard
        title={t('pwRenewalTableTitle')}
        description={t('pwRenewalTableHint')}
        icon={<RotateCcw className="h-3.5 w-3.5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button size="xs" variant="secondary" onClick={() => scan.reload()}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwRenewalScan')}</span>
            </Button>
            <Button
              size="xs"
              variant="primary"
              disabled={dueCount === 0}
              onClick={() => setRollOpen(true)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwRenewalRoll')}</span>
            </Button>
          </div>
        }
        padded={false}
      >
        {scan.loading && rows.length === 0 ? (
          <EmptyState loading />
        ) : rows.length === 0 ? (
          <EmptyState message={t('pwRenewalEmpty')} icon={<RotateCcw className="h-5 w-5" />} />
        ) : (
          <Table dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pwRenewalColRetainer')}</TableHead>
                <TableHead>{t('pwRenewalColClient')}</TableHead>
                <TableHead>{t('pwRenewalColPeriod')}</TableHead>
                <TableHead>{t('pwRenewalColPeriods')}</TableHead>
                <TableHead>{t('pwRenewalColUsed')}</TableHead>
                <TableHead>{t('pwRenewalColCarried')}</TableHead>
                <TableHead>{t('pwRenewalColForfeited')}</TableHead>
                <TableHead>{t('pwRenewalColAmount')}</TableHead>
                <TableHead>{t('pwRenewalColState')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.retainerId}>
                  <TableCell className="whitespace-nowrap">
                    <span className="block font-medium text-slate-900 dark:text-white">
                      {row.name}
                    </span>
                    {!row.plan?.rolloverHours && (
                      <span className={`block ${META_TEXT}`}>{t('pwRenewalNoRollover')}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.clientName || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {row.plan?.window?.periodStart ? formatDate(row.plan.window.periodStart) : '—'}{' '}
                    → {row.plan?.window?.periodEnd ? formatDate(row.plan.window.periodEnd) : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatNumber(row.plan?.window?.periodsDue ?? 0)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatNumber(row.plan?.hoursUsed ?? 0, 1)}h
                  </TableCell>
                  <TableCell className="tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatNumber(row.plan?.carriedHours ?? 0, 1)}h
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <span
                      className={
                        row.plan?.forfeitedHours > 0 ? 'text-rose-600 dark:text-rose-400' : ''
                      }
                    >
                      {formatNumber(row.plan?.forfeitedHours ?? 0, 1)}h
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatMoney(row.plan?.invoiceAmount ?? 0, row.currency)}
                  </TableCell>
                  <TableCell>{stateBadge(row.plan)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <Modal
        dense
        isOpen={rollOpen}
        onClose={() => setRollOpen(false)}
        title={t('pwRenewalConfirmTitle')}
      >
        <div className="space-y-4">
          <p className={META_TEXT}>{t('pwRenewalConfirmHint')}</p>

          <FormSection title={t('pwRenewalInvoiceToggle')}>
            <CustomSelect
              size="sm"
              value={invoiceOn ? 'yes' : 'no'}
              onChange={(value) => setInvoiceOn(value === 'yes')}
              options={[
                { value: 'yes', label: t('pwRenewalInvoiceYes') },
                { value: 'no', label: t('pwRenewalInvoiceNo') }
              ]}
            />
          </FormSection>

          <FormSection>
            <BreakdownList rows={previewBreakdown} />
          </FormSection>

          {preview.loading ? (
            <EmptyState loading />
          ) : previewRows.length === 0 ? (
            <EmptyState
              message={t('pwRenewalConfirmNone')}
              icon={<RotateCcw className="h-5 w-5" />}
            />
          ) : (
            <FormSection>
              {preview.data?.dryRun && (
                <p className={META_TEXT}>
                  {t('pwRenewalPreviewSummary', {
                    count: formatNumber(preview.data.rolled ?? 0),
                    amount: formatMoney(previewAmount, currency)
                  })}
                </p>
              )}
              <ul className="space-y-1.5">
                {previewRows.map((row) => (
                  <ListRow
                    key={row.retainerId}
                    variant="plain"
                    title={row.name}
                    trailing={
                      <>
                        <StatusPill tone="accent">
                          {t(REASON_KEYS[row.reason] ?? 'pwRenewalReason_rolled')}
                        </StatusPill>
                        <span className={`${META_TEXT} tabular-nums`}>
                          +{formatNumber(row.plan?.carriedHours ?? 0, 1)}h / −
                          {formatNumber(row.plan?.forfeitedHours ?? 0, 1)}h
                        </span>
                        <span className={`${META_TEXT} tabular-nums`}>
                          {formatMoney(row.plan?.invoiceAmount ?? 0, row.currency)}
                        </span>
                      </>
                    }
                  />
                ))}
              </ul>
            </FormSection>
          )}

          <ModalFooter>
            <Button size="sm" variant="secondary" onClick={() => setRollOpen(false)}>
              {t('pwCancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={apply}
              loading={applying}
              disabled={dueCount === 0}
            >
              {t('pwRenewalApply')}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  )
}
