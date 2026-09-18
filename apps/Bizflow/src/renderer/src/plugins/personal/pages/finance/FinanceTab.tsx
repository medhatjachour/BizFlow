import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  DollarSign,
  Gauge,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  Trash2,
  TrendingUp,
  Wallet
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
import StatusPill from '../components/StatusPill'
import ListRow from '../components/ListRow'
import { FormSection, ModalFooter } from '../components/FormSection'
import { META_TEXT } from '../components/base'
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
import PriceCardPanel from './PriceCardPanel'
import RenewalsPanel from './RenewalsPanel'
import {
  addDays,
  asSelectOptions,
  formatDate,
  formatMoney,
  formatMinutes,
  formatNumber,
  formatPercent,
  toDayKey
} from '../utils'

type Panel = 'rates' | 'card' | 'expenses' | 'subscriptions' | 'retainers' | 'renewals'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'MAD', 'EGP', 'CAD', 'AUD']

const RATE_FIELDS: Array<{ key: string; label: string; step?: string }> = [
  { key: 'monthlyLivingCost', label: 'pwRateLiving' },
  { key: 'monthlyTaxes', label: 'pwRateTaxes' },
  { key: 'monthlySoftware', label: 'pwRateSoftware' },
  { key: 'monthlySavings', label: 'pwRateSavings' },
  { key: 'monthlyOther', label: 'pwRateOther' },
  { key: 'targetBillableHoursPerWeek', label: 'pwRateTargetHours', step: '0.5' },
  { key: 'workingWeeksPerYear', label: 'pwRateWeeks' },
  { key: 'billableUtilisation', label: 'pwRateUtilisation', step: '0.05' },
  { key: 'taxReservePercent', label: 'pwRateTaxReserve' },
  { key: 'weeklyCapacityHours', label: 'pwRateWeeklyCapacity' },
  { key: 'maxClientHoursPerWeek', label: 'pwRateMaxClientHours' },
  { key: 'minimumProjectPrice', label: 'pwRateMinProject' }
]

export default function FinanceTab() {
  const { t, language } = useLanguage()
  const toast = useQuietToast()
  const config = usePersonalConfig()

  const [panel, setPanel] = useState<Panel>('rates')
  const [range, setRange] = useState(90)
  const [rateForm, setRateForm] = useState<any | null>(null)
  const [quoteHours, setQuoteHours] = useState('')
  const [quotePrice, setQuotePrice] = useState('')
  const [quote, setQuote] = useState<any | null>(null)
  const [expenseForm, setExpenseForm] = useState<any | null>(null)
  const [expenseCategory, setExpenseCategory] = useState('')
  const [subscriptionForm, setSubscriptionForm] = useState<any | null>(null)
  const [retainerForm, setRetainerForm] = useState<any | null>(null)
  const [usageTarget, setUsageTarget] = useState<any | null>(null)
  const [usageForm, setUsageForm] = useState({ minutes: '', note: '' })
  const [resetTarget, setResetTarget] = useState<any | null>(null)
  const [confirm, setConfirm] = useState<{ kind: string; id: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const from = useMemo(() => toDayKey(addDays(new Date(), -range)), [range])

  const overview = useAsync<any>(() => window.api.personal.finance.getOverview({ from }), [from])
  const rate = useAsync<any>(() => window.api.personal.finance.getRateEngine(), [])
  const expenses = useAsync<any>(
    () =>
      window.api.personal.finance.expenses.getAll({
        category: expenseCategory || undefined,
        pageSize: 200
      }),
    [expenseCategory]
  )
  const expenseSummary = useAsync<any>(
    () => window.api.personal.finance.expenses.getSummary({ from }),
    [from]
  )
  const subs = useAsync<any[]>(() => window.api.personal.finance.subscriptions.getAll({}), [])
  const audit = useAsync<any>(() => window.api.personal.finance.subscriptions.getAudit(), [])
  const renewals = useAsync<any[]>(
    () => window.api.personal.finance.subscriptions.getRenewals({ days: 45 }),
    []
  )
  const retainers = useAsync<any[]>(() => window.api.personal.finance.retainers.getAll({}), [])
  const clients = useAsync<any>(() => window.api.personal.clients.getAll({ pageSize: 200 }), [])
  const projects = useAsync<any>(() => window.api.personal.projects.getAll({ pageSize: 200 }), [])

  const currency = overview.data?.engine?.currency ?? 'USD'
  const money = (value: number, code = currency) => formatMoney(value, code)

  const expenseRows = useMemo(() => rowsOf<any>(expenses.data), [expenses.data])
  const subRows = useMemo(() => rowsOf<any>(subs.data), [subs.data])
  const renewalRows = useMemo(() => rowsOf<any>(renewals.data), [renewals.data])
  const retainerRows = useMemo(() => rowsOf<any>(retainers.data), [retainers.data])
  const clientOptions = useMemo(
    () => rowsOf<any>(clients.data).map((client) => ({ value: client.id, label: client.name })),
    [clients.data]
  )
  const projectOptions = useMemo(
    () =>
      rowsOf<any>(projects.data).map((project) => ({
        value: project.id,
        label: `${project.code} · ${project.title}`
      })),
    [projects.data]
  )
  const verdictById = useMemo(() => {
    const map = new Map<string, string>()
    for (const line of audit.data?.lines ?? []) map.set(line.id, line.verdict)
    return map
  }, [audit.data])

  const refreshAll = () => {
    expenses.reload()
    expenseSummary.reload()
    subs.reload()
    audit.reload()
    renewals.reload()
    retainers.reload()
    overview.reload()
  }

  const openRateForm = () => {
    const profile = rate.data?.profile ?? {}
    setRateForm({
      currency: profile.currency ?? 'USD',
      monthlyLivingCost: String(profile.monthlyLivingCost ?? 0),
      monthlyTaxes: String(profile.monthlyTaxes ?? 0),
      monthlySoftware: String(profile.monthlySoftware ?? 0),
      monthlySavings: String(profile.monthlySavings ?? 0),
      monthlyOther: String(profile.monthlyOther ?? 0),
      targetBillableHoursPerWeek: String(profile.targetBillableHoursPerWeek ?? 25),
      workingWeeksPerYear: String(profile.workingWeeksPerYear ?? 46),
      billableUtilisation: String(profile.billableUtilisation ?? 0.7),
      taxReservePercent: String(profile.taxReservePercent ?? 25),
      weeklyCapacityHours: String(profile.weeklyCapacityHours ?? 40),
      maxClientHoursPerWeek: String(profile.maxClientHoursPerWeek ?? 30),
      minimumProjectPrice: String(profile.minimumProjectPrice ?? 0)
    })
  }

  const saveRateProfile = async () => {
    if (!rateForm) return
    setBusy(true)
    try {
      const payload: any = { currency: rateForm.currency }
      for (const field of RATE_FIELDS) payload[field.key] = Number(rateForm[field.key] || 0)
      await window.api.personal.finance.saveRateProfile(payload)
      toast.success(t('pwRateSaved'))
      setRateForm(null)
      rate.reload()
      overview.reload()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const runQuote = async () => {
    try {
      const result = await window.api.personal.finance.priceQuote({
        hours: Number(quoteHours || 0),
        price: quotePrice ? Number(quotePrice) : undefined
      })
      setQuote(result)
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    }
  }

  const saveExpense = async () => {
    if (!expenseForm) return
    if (!String(expenseForm.description ?? '').trim()) {
      toast.warning(t('pwDescriptionRequired'))
      return
    }
    setBusy(true)
    try {
      const payload = {
        projectId: expenseForm.projectId || null,
        description: expenseForm.description,
        category: expenseForm.category,
        vendor: expenseForm.vendor || null,
        amount: Number(expenseForm.amount || 0),
        currency: expenseForm.currency,
        spentAt: expenseForm.spentAt || undefined,
        isBillable: expenseForm.isBillable,
        paymentMethod: expenseForm.paymentMethod || 'card',
        note: expenseForm.note || null
      }
      if (expenseForm.id) {
        await window.api.personal.finance.expenses.update({ id: expenseForm.id, ...payload })
        toast.success(t('pwExpenseUpdated'))
      } else {
        await window.api.personal.finance.expenses.create(payload)
        toast.success(t('pwExpenseCreated'))
      }
      setExpenseForm(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const saveSubscription = async () => {
    if (!subscriptionForm) return
    if (!String(subscriptionForm.name ?? '').trim()) {
      toast.warning(t('pwNameRequired'))
      return
    }
    setBusy(true)
    try {
      const payload = {
        name: subscriptionForm.name,
        vendor: subscriptionForm.vendor || null,
        amount: Number(subscriptionForm.amount || 0),
        currency: subscriptionForm.currency,
        billingCycle: subscriptionForm.billingCycle,
        category: subscriptionForm.category,
        nextRenewalAt: subscriptionForm.nextRenewalAt || undefined,
        autoRenew: subscriptionForm.autoRenew,
        isActive: subscriptionForm.isActive,
        isEssential: subscriptionForm.isEssential,
        lastUsedAt: subscriptionForm.lastUsedAt || undefined,
        usageLevel: subscriptionForm.usageLevel,
        notes: subscriptionForm.notes || null
      }
      if (subscriptionForm.id) {
        await window.api.personal.finance.subscriptions.update({
          id: subscriptionForm.id,
          ...payload
        })
        toast.success(t('pwSubscriptionUpdated'))
      } else {
        await window.api.personal.finance.subscriptions.create(payload)
        toast.success(t('pwSubscriptionCreated'))
      }
      setSubscriptionForm(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const saveRetainer = async () => {
    if (!retainerForm) return
    if (!retainerForm.clientId) {
      toast.warning(t('pwSelectClient'))
      return
    }
    setBusy(true)
    try {
      const payload = {
        clientId: retainerForm.clientId,
        name: retainerForm.name,
        monthlyAmount: Number(retainerForm.monthlyAmount || 0),
        currency: retainerForm.currency,
        hoursIncluded: Number(retainerForm.hoursIncluded || 0),
        rolloverEnabled: retainerForm.rolloverEnabled,
        isActive: retainerForm.isActive,
        notes: retainerForm.notes || null
      }
      if (retainerForm.id) {
        await window.api.personal.finance.retainers.update({ id: retainerForm.id, ...payload })
        toast.success(t('pwRetainerUpdated'))
      } else {
        await window.api.personal.finance.retainers.create(payload)
        toast.success(t('pwRetainerCreated'))
      }
      setRetainerForm(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const logUsage = async () => {
    if (!usageTarget) return
    setBusy(true)
    try {
      await window.api.personal.finance.retainers.logUsage({
        retainerId: usageTarget.id,
        minutes: Number(usageForm.minutes || 0),
        note: usageForm.note || undefined
      })
      toast.success(t('pwUsageLogged'))
      setUsageTarget(null)
      setUsageForm({ minutes: '', note: '' })
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const resetUsage = async () => {
    if (!resetTarget) return
    setBusy(true)
    try {
      const result = await window.api.personal.finance.retainers.resetUsage({ id: resetTarget.id })
      toast.success(
        `${t('pwUsageReset')}${result?.carriedOver ? ` · ${t('pwCarriedOver')}: ${result.carriedOver}h` : ''}`
      )
      setResetTarget(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const runConfirmed = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === 'expense') {
        await window.api.personal.finance.expenses.delete(confirm.id)
        toast.success(t('pwExpenseDeleted'))
      } else if (confirm.kind === 'subscription') {
        await window.api.personal.finance.subscriptions.delete(confirm.id)
        toast.success(t('pwSubscriptionDeleted'))
      } else {
        await window.api.personal.finance.retainers.delete(confirm.id)
        toast.success(t('pwRetainerDeleted'))
      }
      setConfirm(null)
      refreshAll()
    } catch (error: any) {
      toast.error(error?.message ?? t('pwSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const engine = overview.data?.engine ?? rate.data?.engine
  const realRate = overview.data?.realRate

  return (
    <div data-plugin="personal" className="space-y-4 p-4 md:p-5">
      <PageHeader
        title={t('pwTabFinance')}
        description={t('pwFinanceHint')}
        icon={<Wallet className="h-4 w-4" />}
        actions={
          <>
            <CustomSelect
              size="sm"
              className="w-40"
              value={String(range)}
              onChange={(value) => setRange(Number(value))}
              options={[
                { value: '30', label: t('pwLast30') },
                { value: '90', label: t('pwLast90') },
                { value: '365', label: t('pwLast365') }
              ]}
            />
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

      <KpiSection sectionKey="personal:finance-KpiStrip">
        <MetricStrip size="four">
          <StatCard
            label={t('pwKpiNet')}
            value={money(overview.data?.net ?? 0)}
            sub={`${t('pwBilled')}: ${money(overview.data?.billed ?? 0)}`}
            icon={<DollarSign className="h-4 w-4" />}
            tone={(overview.data?.net ?? 0) >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            label={t('pwKpiMrr')}
            value={money(overview.data?.mrr ?? 0)}
            sub={`${formatNumber(overview.data?.retainerClients ?? 0)} ${t('pwRetainerClients')}`}
            icon={<RefreshCw className="h-4 w-4" />}
            tone="accent"
          />
          <StatCard
            label={t('pwKpiSubscriptionBurn')}
            value={money(overview.data?.subscriptionBurn ?? 0)}
            sub={`${t('pwPotentialSaving')}: ${money(overview.data?.potentialSaving ?? 0)}`}
            icon={<Wallet className="h-4 w-4" />}
            tone={(overview.data?.cancelCandidates ?? 0) > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label={t('pwKpiRealRate')}
            value={realRate ? money(realRate.realHourlyRate) : '—'}
            sub={`${t('pwBaseline')}: ${money(engine?.baselineHourlyRate ?? 0)}`}
            icon={<Gauge className="h-4 w-4" />}
            tone={
              realRate?.verdict === 'loss'
                ? 'danger'
                : realRate?.verdict === 'excellent'
                  ? 'success'
                  : 'default'
            }
          />
        </MetricStrip>
      </KpiSection>

      <Toolbar>
        <div
          role="tablist"
          aria-label={t('pwTabFinance')}
          className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60"
        >
          {(['rates', 'card', 'expenses', 'subscriptions', 'retainers', 'renewals'] as Panel[]).map(
            (value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={panel === value}
                onClick={() => setPanel(value)}
                className={`inline-flex h-6 items-center rounded-md px-2.5 text-xs font-semibold transition-colors ${
                  panel === value
                    ? 'bg-[color:var(--accent)] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t(`pwFinancePanel_${value}`)}
              </button>
            )
          )}
        </div>
      </Toolbar>

      {panel === 'rates' && (
        <div className="space-y-4">
          <SectionCard
            title={t('pwRateEngine')}
            description={t('pwRateEngineHint')}
            icon={<Gauge className="h-3.5 w-3.5" />}
            actions={
              <Button size="xs" variant="primary" onClick={openRateForm}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwEditCostBase')}</span>
              </Button>
            }
          >
            <MetricStrip size="four">
              <StatCard
                label={t('pwBaseline')}
                value={money(engine?.baselineHourlyRate ?? 0)}
                tone="accent"
              />
              <StatCard
                label={t('pwFloorRate')}
                value={money(engine?.floorHourlyRate ?? 0)}
                tone="danger"
                sub={t('pwFloorRateHint')}
              />
              <StatCard
                label={t('pwUtilisationRate')}
                value={money(engine?.utilisationHourlyRate ?? 0)}
              />
              <StatCard
                label={t('pwMonthlyTarget')}
                value={money(engine?.monthlyTarget ?? 0)}
                sub={`${formatNumber(engine?.monthlyHoursTarget ?? 0, 1)}h / ${t('pwMonthShort')}`}
              />
              <StatCard
                label={t('pwMinProjectPrice')}
                value={money(engine?.minimumProjectPrice ?? 0)}
                tone="warning"
              />
              <StatCard
                label={t('pwAnnualOperatingCost')}
                value={money(engine?.annualOperatingCost ?? 0)}
                sub={`${t('pwSurvival')}: ${money(engine?.annualSurvivalCost ?? 0)}`}
              />
              <StatCard
                label={t('pwBillableHoursPerYear')}
                value={formatNumber(engine?.billableHoursPerYear ?? 0)}
                sub={`${t('pwDailyHoursTarget')}: ${formatNumber(engine?.dailyHoursTarget ?? 0, 1)}h`}
              />
              <StatCard
                label={t('pwTrackedHours')}
                value={`${formatNumber(overview.data?.trackedHours ?? 0, 1)}h`}
                sub={`${t('pwCollected')}: ${money(overview.data?.collected ?? 0)}`}
              />
            </MetricStrip>
          </SectionCard>

          <SectionCard
            title={t('pwQuoteCalculator')}
            description={t('pwQuoteCalculatorHint')}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormInput
                size="sm"
                label={t('pwQuoteHours')}
                type="number"
                value={quoteHours}
                onChange={(value) => setQuoteHours(value)}
              />
              <FormInput
                size="sm"
                label={t('pwQuotePrice')}
                type="number"
                value={quotePrice}
                onChange={(value) => setQuotePrice(value)}
                helperText={t('pwQuotePriceHint')}
              />
              <div className="flex items-end">
                <Button size="sm" variant="primary" onClick={runQuote} disabled={!quoteHours}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="ms-1.5">{t('pwCalculate')}</span>
                </Button>
              </div>
            </div>
            {quote && (
              <div className="mt-4 space-y-3">
                {quote.belowFloor && (
                  <p className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {t('pwBelowFloorWarning')}
                  </p>
                )}
                <MetricStrip size="four">
                  <StatCard
                    label={t('pwAtFloor')}
                    value={money(quote.atFloor, quote.currency)}
                    tone="danger"
                  />
                  <StatCard
                    label={t('pwAtBaseline')}
                    value={money(quote.atBaseline, quote.currency)}
                  />
                  <StatCard
                    label={t('pwRecommended')}
                    value={money(quote.recommended, quote.currency)}
                    tone="success"
                  />
                  <StatCard
                    label={t('pwMarginAtBaseline')}
                    value={money(quote.marginAtBaseline, quote.currency)}
                    tone="accent"
                  />
                </MetricStrip>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {panel === 'card' && <PriceCardPanel />}

      {panel === 'expenses' && (
        <div className="space-y-4">
          <SectionCard
            title={t('pwExpensesByCategory')}
            description={t('pwExpensesByCategoryHint')}
            icon={<Wallet className="h-3.5 w-3.5" />}
          >
            {(expenseSummary.data?.byCategory ?? []).length === 0 ? (
              <EmptyState message={t('pwNoExpenses')} icon={<Wallet className="h-5 w-5" />} />
            ) : (
              <ul className="space-y-2">
                {expenseSummary.data.byCategory.map((row: any) => (
                  <li key={row.category}>
                    <ProgressBar
                      percent={
                        Number(expenseSummary.data.total) > 0
                          ? (Number(row.amount) / Number(expenseSummary.data.total)) * 100
                          : 0
                      }
                      label={`${t(`pwExpenseCategory_${row.category}`)} · ${money(row.amount)}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={t('pwExpenses')}
            description={t('pwExpensesHint')}
            padded={false}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <CustomSelect
                  size="sm"
                  className="w-44"
                  value={expenseCategory}
                  onChange={(value) => setExpenseCategory(String(value))}
                  placeholder={t('pwAllCategories')}
                  options={asSelectOptions(config.data?.expenseCategories, language)}
                />
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() =>
                    setExpenseForm({
                      id: null,
                      projectId: '',
                      description: '',
                      category: 'software',
                      vendor: '',
                      amount: '',
                      currency,
                      spentAt: toDayKey(new Date()),
                      isBillable: false,
                      paymentMethod: 'card',
                      note: ''
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="ms-1.5">{t('pwAddExpense')}</span>
                </Button>
              </div>
            }
          >
            {expenses.loading ? (
              <EmptyState loading />
            ) : expenseRows.length === 0 ? (
              <EmptyState message={t('pwNoExpenses')} icon={<Wallet className="h-5 w-5" />} />
            ) : (
              <Table dense>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pwDate')}</TableHead>
                    <TableHead>{t('pwDescription')}</TableHead>
                    <TableHead>{t('pwCategory')}</TableHead>
                    <TableHead>{t('pwVendor')}</TableHead>
                    <TableHead>{t('pwProject')}</TableHead>
                    <TableHead>{t('pwAmount')}</TableHead>
                    <TableHead>{t('pwBillable')}</TableHead>
                    <TableHead>{t('pwColActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRows.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDate(expense.spentAt)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell>
                        <StatusPill tone="neutral" dot={false}>
                          {t(`pwExpenseCategory_${expense.category}`)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {expense.vendor ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate text-slate-600 dark:text-slate-300">
                        {expense.project
                          ? `${expense.project.code} · ${expense.project.title}`
                          : '—'}
                      </TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {formatMoney(expense.amount, expense.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={expense.isBillable ? 'success' : 'neutral'}>
                          {expense.isBillable ? t('pwBillable') : t('pwNonBillable')}
                        </StatusPill>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            aria-label={t('pwEdit')}
                            title={t('pwEdit')}
                            onClick={() =>
                              setExpenseForm({
                                id: expense.id,
                                projectId: expense.projectId ?? '',
                                description: expense.description ?? '',
                                category: expense.category,
                                vendor: expense.vendor ?? '',
                                amount: String(expense.amount ?? ''),
                                currency: expense.currency,
                                spentAt: toDayKey(expense.spentAt),
                                isBillable: Boolean(expense.isBillable),
                                paymentMethod: expense.paymentMethod ?? 'card',
                                note: expense.note ?? ''
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            aria-label={t('pwDelete')}
                            title={t('pwDelete')}
                            onClick={() => setConfirm({ kind: 'expense', id: expense.id })}
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
        </div>
      )}

      {panel === 'subscriptions' && (
        <div className="space-y-4">
          <MetricStrip size="four">
            <StatCard
              label={t('pwMonthlyBurn')}
              value={money(audit.data?.monthlyBurn ?? 0)}
              tone="warning"
            />
            <StatCard label={t('pwAnnualBurn')} value={money(audit.data?.annualBurn ?? 0)} />
            <StatCard
              label={t('pwToolCostPerHour')}
              value={money(audit.data?.toolCostPerHour ?? 0)}
              sub={t('pwToolCostPerHourHint')}
              tone="accent"
            />
            <StatCard
              label={t('pwCancelCandidates')}
              value={formatNumber(audit.data?.cancelCandidates?.length ?? 0)}
              sub={`${t('pwPotentialSaving')}: ${money(audit.data?.potentialMonthlySaving ?? 0)}`}
              tone={(audit.data?.cancelCandidates?.length ?? 0) > 0 ? 'danger' : 'success'}
            />
          </MetricStrip>

          <SectionCard
            title={t('pwUpcomingRenewals')}
            description={t('pwUpcomingRenewalsHint')}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            {renewalRows.length === 0 ? (
              <EmptyState message={t('pwNoRenewals')} icon={<RefreshCw className="h-5 w-5" />} />
            ) : (
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {renewalRows.map((renewal) => (
                  <ListRow
                    key={renewal.id}
                    variant="plain"
                    title={renewal.name}
                    subtitle={formatDate(renewal.nextRenewalAt)}
                    trailing={
                      <StatusPill tone={renewal.daysUntil <= 7 ? 'danger' : 'neutral'}>
                        {formatNumber(renewal.daysUntil)} {t('pwDays')}
                      </StatusPill>
                    }
                  />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={t('pwSubscriptions')}
            description={t('pwSubscriptionsHint')}
            padded={false}
            actions={
              <Button
                size="xs"
                variant="primary"
                onClick={() =>
                  setSubscriptionForm({
                    id: null,
                    name: '',
                    vendor: '',
                    amount: '',
                    currency,
                    billingCycle: 'monthly',
                    category: 'software',
                    nextRenewalAt: toDayKey(addDays(new Date(), 30)),
                    autoRenew: true,
                    isActive: true,
                    isEssential: true,
                    lastUsedAt: '',
                    usageLevel: 'weekly',
                    notes: ''
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwAddSubscription')}</span>
              </Button>
            }
          >
            {subs.loading ? (
              <EmptyState loading />
            ) : subRows.length === 0 ? (
              <EmptyState message={t('pwNoSubscriptions')} icon={<Wallet className="h-5 w-5" />} />
            ) : (
              <Table dense>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pwName')}</TableHead>
                    <TableHead>{t('pwVendor')}</TableHead>
                    <TableHead>{t('pwAmount')}</TableHead>
                    <TableHead>{t('pwBillingCycle')}</TableHead>
                    <TableHead>{t('pwMonthlyCost')}</TableHead>
                    <TableHead>{t('pwNextRenewal')}</TableHead>
                    <TableHead>{t('pwUsageLevel')}</TableHead>
                    <TableHead>{t('pwVerdict')}</TableHead>
                    <TableHead>{t('pwColActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subRows.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        <span className="flex items-center gap-2">
                          {subscription.name}
                          {!subscription.isActive && (
                            <StatusPill tone="neutral">{t('pwInactive')}</StatusPill>
                          )}
                          {subscription.isEssential && (
                            <StatusPill tone="accent">{t('pwEssential')}</StatusPill>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {subscription.vendor ?? '—'}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoney(subscription.amount, subscription.currency)}
                      </TableCell>
                      <TableCell>{t(`pwCycle_${subscription.billingCycle}`)}</TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {formatMoney(subscription.monthlyCost, subscription.currency)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {subscription.nextRenewalAt ? formatDate(subscription.nextRenewalAt) : '—'}
                      </TableCell>
                      <TableCell>{t(`pwUsage_${subscription.usageLevel}`)}</TableCell>
                      <TableCell>
                        <StatusPill
                          tone={
                            verdictById.get(subscription.id) === 'cancel'
                              ? 'danger'
                              : verdictById.get(subscription.id) === 'review'
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {t(`pwVerdict_${verdictById.get(subscription.id) ?? 'keep'}`)}
                        </StatusPill>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            aria-label={t('pwEdit')}
                            title={t('pwEdit')}
                            onClick={() =>
                              setSubscriptionForm({
                                id: subscription.id,
                                name: subscription.name,
                                vendor: subscription.vendor ?? '',
                                amount: String(subscription.amount ?? ''),
                                currency: subscription.currency,
                                billingCycle: subscription.billingCycle,
                                category: subscription.category,
                                nextRenewalAt: subscription.nextRenewalAt
                                  ? toDayKey(subscription.nextRenewalAt)
                                  : '',
                                autoRenew: Boolean(subscription.autoRenew),
                                isActive: Boolean(subscription.isActive),
                                isEssential: Boolean(subscription.isEssential),
                                lastUsedAt: subscription.lastUsedAt
                                  ? toDayKey(subscription.lastUsedAt)
                                  : '',
                                usageLevel: subscription.usageLevel,
                                notes: subscription.notes ?? ''
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            aria-label={t('pwDelete')}
                            title={t('pwDelete')}
                            onClick={() =>
                              setConfirm({ kind: 'subscription', id: subscription.id })
                            }
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
        </div>
      )}

      {panel === 'retainers' && (
        <div className="space-y-4">
          <MetricStrip size="four">
            <StatCard label={t('pwKpiMrr')} value={money(overview.data?.mrr ?? 0)} tone="success" />
            <StatCard
              label={t('pwRetainerHoursCommitted')}
              value={`${formatNumber(overview.data?.retainerHoursCommitted ?? 0, 1)}h`}
            />
            <StatCard
              label={t('pwRetainerHoursRemaining')}
              value={`${formatNumber(overview.data?.retainerHoursRemaining ?? 0, 1)}h`}
              tone="accent"
            />
            <StatCard
              label={t('pwRetainerClients')}
              value={formatNumber(overview.data?.retainerClients ?? 0)}
            />
          </MetricStrip>

          <SectionCard
            title={t('pwRetainers')}
            description={t('pwRetainersHint')}
            icon={<Repeat className="h-3.5 w-3.5" />}
            actions={
              <Button
                size="xs"
                variant="primary"
                onClick={() =>
                  setRetainerForm({
                    id: null,
                    clientId: '',
                    name: '',
                    monthlyAmount: '',
                    currency,
                    hoursIncluded: '',
                    rolloverEnabled: false,
                    isActive: true,
                    notes: ''
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="ms-1.5">{t('pwAddRetainer')}</span>
              </Button>
            }
          >
            {retainers.loading ? (
              <EmptyState loading loadingShape="cards" />
            ) : retainerRows.length === 0 ? (
              <EmptyState message={t('pwNoRetainers')} icon={<RefreshCw className="h-5 w-5" />} />
            ) : (
              <ul className="space-y-3">
                {retainerRows.map((retainer) => (
                  <li
                    key={retainer.id}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {retainer.name} · {retainer.client?.name ?? '—'}
                        </p>
                        <p className={META_TEXT}>
                          {formatMoney(retainer.monthlyAmount, retainer.currency)} /{' '}
                          {t('pwMonthShort')} ·{' '}
                          <span className="tabular-nums">
                            {formatNumber(retainer.effectiveHourlyRate, 2)} /h
                          </span>{' '}
                          · {t('pwNextReset')}:{' '}
                          <span className="tabular-nums">
                            {retainer.nextResetAt ? formatDate(retainer.nextResetAt) : '—'}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {retainer.rolloverEnabled && (
                          <StatusPill tone="accent">{t('pwRollover')}</StatusPill>
                        )}
                        {!retainer.isActive && (
                          <StatusPill tone="neutral">{t('pwInactive')}</StatusPill>
                        )}
                        {retainer.state?.isOverspent && (
                          <StatusPill tone="danger">{t('pwOverspent')}</StatusPill>
                        )}
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            setUsageTarget(retainer)
                            setUsageForm({ minutes: '', note: '' })
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="ms-1.5">{t('pwLogUsage')}</span>
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          aria-label={t('pwResetUsage')}
                          title={t('pwResetUsage')}
                          onClick={() => setResetTarget(retainer)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          aria-label={t('pwEdit')}
                          title={t('pwEdit')}
                          onClick={() =>
                            setRetainerForm({
                              id: retainer.id,
                              clientId: retainer.clientId,
                              name: retainer.name,
                              monthlyAmount: String(retainer.monthlyAmount ?? ''),
                              currency: retainer.currency,
                              hoursIncluded: String(retainer.hoursIncluded ?? ''),
                              rolloverEnabled: Boolean(retainer.rolloverEnabled),
                              isActive: Boolean(retainer.isActive),
                              notes: retainer.notes ?? ''
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          aria-label={t('pwDelete')}
                          title={t('pwDelete')}
                          onClick={() => setConfirm({ kind: 'retainer', id: retainer.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <ProgressBar
                        percent={retainer.state?.usedPercent ?? 0}
                        label={`${formatNumber(retainer.state?.hoursUsed ?? 0, 1)}h / ${formatNumber(
                          (retainer.state?.hoursIncluded ?? 0) +
                            (retainer.state?.rolloverHours ?? 0),
                          1
                        )}h`}
                        level={
                          retainer.state?.isOverspent
                            ? 'red'
                            : (retainer.state?.usedPercent ?? 0) >= 80
                              ? 'amber'
                              : 'clear'
                        }
                      />
                      <span
                        className={`block text-xs font-medium ${
                          retainer.state?.isOverspent
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {t('pwHoursAvailable')}:{' '}
                        <span className="tabular-nums">
                          {formatNumber(retainer.state?.hoursAvailable ?? 0, 1)}h
                        </span>
                        {retainer.state?.rolloverHours
                          ? ` · ${t('pwRollover')}: ${formatNumber(retainer.state.rolloverHours, 1)}h`
                          : ''}
                      </span>
                    </div>
                    {(retainer.usages ?? []).length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {retainer.usages.slice(0, 6).map((usage: any) => (
                          <li
                            key={usage.id}
                            className={`rounded-full border border-slate-200 px-2 py-0.5 dark:border-slate-700 ${META_TEXT}`}
                          >
                            {formatMinutes(usage.minutes)} · {formatDate(usage.usedAt)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {panel === 'renewals' && <RenewalsPanel />}

      <Modal
        dense
        isOpen={Boolean(rateForm)}
        onClose={() => setRateForm(null)}
        title={t('pwEditCostBase')}
        size="lg"
      >
        {rateForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('pwCurrency')}
                </span>
                <CustomSelect
                  size="sm"
                  value={rateForm.currency}
                  onChange={(value) => setRateForm({ ...rateForm, currency: String(value) })}
                  options={CURRENCIES.map((code) => ({ value: code, label: code }))}
                />
              </label>
            </FormSection>

            <FormSection title={t('pwFormAmounts')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {RATE_FIELDS.map((field) => (
                  <FormInput
                    size="sm"
                    key={field.key}
                    label={t(field.label)}
                    type="number"
                    value={rateForm[field.key]}
                    onChange={(value) => setRateForm({ ...rateForm, [field.key]: value })}
                  />
                ))}
              </div>
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setRateForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={saveRateProfile} loading={busy}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(expenseForm)}
        onClose={() => setExpenseForm(null)}
        title={t('pwAddExpense')}
        size="lg"
      >
        {expenseForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <FormInput
                size="sm"
                label={t('pwDescription')}
                value={expenseForm.description}
                onChange={(value) => setExpenseForm({ ...expenseForm, description: value })}
                required
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwCategory')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={expenseForm.category}
                    onChange={(value) =>
                      setExpenseForm({ ...expenseForm, category: String(value) })
                    }
                    options={asSelectOptions(config.data?.expenseCategories, language)}
                  />
                </label>
                <FormInput
                  size="sm"
                  label={t('pwVendor')}
                  value={expenseForm.vendor}
                  onChange={(value) => setExpenseForm({ ...expenseForm, vendor: value })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormAmounts')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwAmount')}
                  type="number"
                  value={expenseForm.amount}
                  onChange={(value) => setExpenseForm({ ...expenseForm, amount: value })}
                  required
                />
                <FormInput
                  size="sm"
                  label={t('pwDate')}
                  type="date"
                  value={expenseForm.spentAt}
                  onChange={(value) => setExpenseForm({ ...expenseForm, spentAt: value })}
                />
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwProject')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={expenseForm.projectId}
                    onChange={(value) =>
                      setExpenseForm({ ...expenseForm, projectId: String(value) })
                    }
                    options={[{ value: '', label: t('pwNoProject') }, ...projectOptions]}
                  />
                </label>
                <FormInput
                  size="sm"
                  label={t('pwNote')}
                  value={expenseForm.note}
                  onChange={(value) => setExpenseForm({ ...expenseForm, note: value })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <label className="inline-flex h-7 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={expenseForm.isBillable}
                  onChange={(event) =>
                    setExpenseForm({ ...expenseForm, isBillable: event.target.checked })
                  }
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
                {t('pwBillable')}
              </label>
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setExpenseForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={saveExpense} loading={busy}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(subscriptionForm)}
        onClose={() => setSubscriptionForm(null)}
        title={t('pwAddSubscription')}
        size="lg"
      >
        {subscriptionForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwName')}
                  value={subscriptionForm.name}
                  onChange={(value) => setSubscriptionForm({ ...subscriptionForm, name: value })}
                  required
                />
                <FormInput
                  size="sm"
                  label={t('pwVendor')}
                  value={subscriptionForm.vendor}
                  onChange={(value) => setSubscriptionForm({ ...subscriptionForm, vendor: value })}
                />
                <FormInput
                  size="sm"
                  label={t('pwAmount')}
                  type="number"
                  value={subscriptionForm.amount}
                  onChange={(value) => setSubscriptionForm({ ...subscriptionForm, amount: value })}
                  required
                />
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwBillingCycle')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={subscriptionForm.billingCycle}
                    onChange={(value) =>
                      setSubscriptionForm({ ...subscriptionForm, billingCycle: String(value) })
                    }
                    options={asSelectOptions(config.data?.billingCycles, language)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwCategory')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={subscriptionForm.category}
                    onChange={(value) =>
                      setSubscriptionForm({ ...subscriptionForm, category: String(value) })
                    }
                    options={asSelectOptions(config.data?.subscriptionCategories, language)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwUsageLevel')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={subscriptionForm.usageLevel}
                    onChange={(value) =>
                      setSubscriptionForm({ ...subscriptionForm, usageLevel: String(value) })
                    }
                    options={asSelectOptions(config.data?.usageLevels, language)}
                  />
                </label>
              </div>
            </FormSection>

            <FormSection title={t('pwFormSchedule')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  size="sm"
                  label={t('pwNextRenewal')}
                  type="date"
                  value={subscriptionForm.nextRenewalAt}
                  onChange={(value) =>
                    setSubscriptionForm({ ...subscriptionForm, nextRenewalAt: value })
                  }
                />
                <FormInput
                  size="sm"
                  label={t('pwLastUsedAt')}
                  type="date"
                  value={subscriptionForm.lastUsedAt}
                  onChange={(value) =>
                    setSubscriptionForm({ ...subscriptionForm, lastUsedAt: value })
                  }
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex h-7 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={subscriptionForm.isActive}
                    onChange={(event) =>
                      setSubscriptionForm({ ...subscriptionForm, isActive: event.target.checked })
                    }
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  {t('pwActive')}
                </label>
                <label className="inline-flex h-7 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={subscriptionForm.isEssential}
                    onChange={(event) =>
                      setSubscriptionForm({
                        ...subscriptionForm,
                        isEssential: event.target.checked
                      })
                    }
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  {t('pwEssential')}
                </label>
                <label className="inline-flex h-7 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={subscriptionForm.autoRenew}
                    onChange={(event) =>
                      setSubscriptionForm({ ...subscriptionForm, autoRenew: event.target.checked })
                    }
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  {t('pwAutoRenew')}
                </label>
              </div>
              <FormInput
                size="sm"
                label={t('pwNote')}
                value={subscriptionForm.notes}
                onChange={(value) => setSubscriptionForm({ ...subscriptionForm, notes: value })}
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setSubscriptionForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={saveSubscription} loading={busy}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(retainerForm)}
        onClose={() => setRetainerForm(null)}
        title={t('pwAddRetainer')}
        size="lg"
      >
        {retainerForm && (
          <div className="space-y-4">
            <FormSection title={t('pwFormBasics')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('pwClient')}
                  </span>
                  <CustomSelect
                    size="sm"
                    value={retainerForm.clientId}
                    onChange={(value) =>
                      setRetainerForm({ ...retainerForm, clientId: String(value) })
                    }
                    options={clientOptions}
                    placeholder={t('pwSelectClient')}
                  />
                </label>
                <FormInput
                  size="sm"
                  label={t('pwName')}
                  value={retainerForm.name}
                  onChange={(value) => setRetainerForm({ ...retainerForm, name: value })}
                  required
                />
                <FormInput
                  size="sm"
                  label={t('pwMonthlyAmount')}
                  type="number"
                  value={retainerForm.monthlyAmount}
                  onChange={(value) => setRetainerForm({ ...retainerForm, monthlyAmount: value })}
                />
                <FormInput
                  size="sm"
                  label={t('pwHoursIncluded')}
                  type="number"
                  value={retainerForm.hoursIncluded}
                  onChange={(value) => setRetainerForm({ ...retainerForm, hoursIncluded: value })}
                />
              </div>
            </FormSection>

            <FormSection title={t('pwFormFlags')}>
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex h-7 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={retainerForm.isActive}
                    onChange={(event) =>
                      setRetainerForm({ ...retainerForm, isActive: event.target.checked })
                    }
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  {t('pwActive')}
                </label>
                <label className="inline-flex h-7 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={retainerForm.rolloverEnabled}
                    onChange={(event) =>
                      setRetainerForm({ ...retainerForm, rolloverEnabled: event.target.checked })
                    }
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  {t('pwRolloverEnabled')}
                </label>
              </div>
              <FormInput
                size="sm"
                label={t('pwNote')}
                value={retainerForm.notes}
                onChange={(value) => setRetainerForm({ ...retainerForm, notes: value })}
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setRetainerForm(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={saveRetainer} loading={busy}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        dense
        isOpen={Boolean(usageTarget)}
        onClose={() => setUsageTarget(null)}
        title={t('pwLogUsage')}
      >
        {usageTarget && (
          <div className="space-y-4">
            <FormSection title={t('pwFormAmounts')}>
              <p className={META_TEXT}>
                {usageTarget.name} · {t('pwHoursAvailable')}:{' '}
                <span className="font-semibold tabular-nums">
                  {formatNumber(usageTarget.state?.hoursAvailable ?? 0, 1)}h
                </span>
              </p>
              <FormInput
                size="sm"
                label={t('pwMinutes')}
                type="number"
                value={usageForm.minutes}
                onChange={(value) => setUsageForm({ ...usageForm, minutes: value })}
                required
              />
              <FormInput
                size="sm"
                label={t('pwNote')}
                value={usageForm.note}
                onChange={(value) => setUsageForm({ ...usageForm, note: value })}
              />
            </FormSection>

            <ModalFooter>
              <Button size="sm" variant="secondary" onClick={() => setUsageTarget(null)}>
                {t('pwCancel')}
              </Button>
              <Button size="sm" variant="success" onClick={logUsage} loading={busy}>
                {t('pwSave')}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        dense
        isOpen={Boolean(resetTarget)}
        message={`${t('pwResetUsageConfirm')} ${resetTarget?.state?.hoursAvailable ?? 0}h`}
        confirmLabel={t('pwResetUsage')}
        cancelLabel={t('pwCancel')}
        busy={busy}
        onConfirm={resetUsage}
        onCancel={() => setResetTarget(null)}
      />

      <ConfirmDialog
        dense
        isOpen={Boolean(confirm)}
        message={
          confirm?.kind === 'expense'
            ? t('pwDeleteExpenseConfirm')
            : confirm?.kind === 'subscription'
              ? t('pwDeleteSubscriptionConfirm')
              : t('pwDeleteRetainerConfirm')
        }
        confirmLabel={t('pwDelete')}
        cancelLabel={t('pwCancel')}
        busy={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />

      {panel === 'subscriptions' && (audit.data?.cancelCandidates ?? []).length > 0 && (
        <SectionCard title={t('pwAuditCandidates')} description={t('pwAuditCandidatesHint')}>
          <ul className="space-y-2">
            {audit.data.cancelCandidates.map((line: any) => (
              <li
                key={line.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                  {line.name}
                </span>
                <span className={`${META_TEXT} tabular-nums`}>
                  {money(line.monthlyCost)} / {t('pwMonthShort')} · {money(line.annualCost)} /{' '}
                  {t('pwYearShort')}
                </span>
                <StatusPill tone={line.verdict === 'cancel' ? 'danger' : 'warning'}>
                  {t(`pwVerdict_${line.verdict}`)}
                </StatusPill>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {panel === 'rates' && realRate && (
        <SectionCard title={t('pwRealRateAnalyzer')} description={t('pwRealRateAnalyzerHint')}>
          <MetricStrip size="four">
            <StatCard
              label={t('pwEffectiveHourlyRate')}
              value={money(realRate.realHourlyRate)}
              icon={<Gauge className="h-4 w-4" />}
              tone={
                realRate.verdict === 'loss'
                  ? 'danger'
                  : realRate.verdict === 'excellent'
                    ? 'success'
                    : 'default'
              }
            />
            <StatCard label={t('pwRealHours')} value={`${formatNumber(realRate.realHours, 2)}h`} />
            <StatCard label={t('pwMoneyReceived')} value={money(realRate.moneyReceived)} />
            <StatCard
              label={t('pwVsBaseline')}
              value={formatPercent(realRate.effectiveHourlyRateVsBaseline, 0)}
              icon={
                realRate.effectiveHourlyRateVsBaseline >= 100 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Ban className="h-4 w-4" />
                )
              }
              tone={realRate.effectiveHourlyRateVsBaseline >= 100 ? 'success' : 'danger'}
            />
          </MetricStrip>
          <p className={`mt-3 flex items-center gap-2 ${META_TEXT}`}>
            <Percent className="h-3.5 w-3.5" />
            {t('pwVerdict')}:{' '}
            {t(`pwVerdict_${realRate.verdict === 'thin' ? 'review' : realRate.verdict}`)}
          </p>
        </SectionCard>
      )}
    </div>
  )
}
