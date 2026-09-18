// ─── Personal Work: Domain logic ─────────────────────────────────────────────
// Pure business rules: stage-gated delivery pipeline, pricing engineering,
// invoice money (discounts, late fees, rate cards), capacity thresholds and
// escrow classification. No Electron/Prisma imports so this module stays
// unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

import { dayKey, daysBetween, num, round2, startOfDay } from './utils'

// ─── Stage-gated delivery pipeline ──────────────────────────────────────────

export type StageRequirement = 'none' | 'deposit' | 'final_payment'

export interface PipelineStage {
  id: string
  label: string
  requires: StageRequirement
  /** Short hint shown in the UI when the stage is locked. */
  gateHint?: string
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'brief_approved', label: 'Brief Approved', requires: 'none' },
  {
    id: 'deposit_received',
    label: 'Deposit Received',
    requires: 'deposit',
    gateHint: 'Log the deposit payment before production starts.'
  },
  {
    id: 'draft_staging',
    label: 'Draft Staging',
    requires: 'deposit',
    gateHint: 'Production needs the deposit to be paid first.'
  },
  {
    id: 'feedback_locked',
    label: 'Feedback Locked',
    requires: 'deposit',
    gateHint: 'Lock the feedback round so the scope cannot drift.'
  },
  {
    id: 'final_payment_received',
    label: 'Final Payment Received',
    requires: 'final_payment',
    gateHint: 'Final payment must clear before the delivery stage.'
  },
  {
    id: 'assets_handed_over',
    label: 'Assets Handed Over',
    requires: 'final_payment',
    gateHint: 'Files stay locked until the balance is settled.'
  }
]

export const STAGE_IDS = PIPELINE_STAGES.map((s) => s.id)

export function stageIndex(stage: string): number {
  const idx = STAGE_IDS.indexOf(stage)
  return idx === -1 ? 0 : idx
}

export function stageMeta(stage: string): PipelineStage {
  return PIPELINE_STAGES[stageIndex(stage)]
}

export interface PaymentContext {
  totalDue: number
  paid: number
  depositPaid: number
}

export function paymentContext(invoiceAmounts: number[], payments: Array<{ amount: number; isDeposit?: boolean }>): PaymentContext {
  const depositPaid = payments.filter((p) => p.isDeposit).reduce((sum, p) => sum + num(p.amount), 0)
  return {
    totalDue: round2(invoiceAmounts.reduce((sum, a) => sum + num(a), 0)),
    paid: round2(payments.reduce((sum, p) => sum + num(p.amount), 0)),
    depositPaid: round2(depositPaid)
  }
}

export interface StageGate {
  blocked: boolean
  requires: StageRequirement
  reason?: string
  outstanding: number
}

/** Whether the project may move to `targetStage` given what has been paid. */
export function evaluateStageGate(targetStage: string, ctx: PaymentContext): StageGate {
  const stage = stageMeta(targetStage)
  const outstanding = round2(Math.max(0, ctx.totalDue - ctx.paid))

  if (stage.requires === 'deposit') {
    if (ctx.depositPaid <= 0) {
      return { blocked: true, requires: stage.requires, reason: stage.gateHint, outstanding }
    }
    return { blocked: false, requires: stage.requires, outstanding }
  }

  if (stage.requires === 'final_payment') {
    if (outstanding > 0.009) {
      return {
        blocked: true,
        requires: stage.requires,
        reason: stage.gateHint ?? 'Outstanding balance must be settled first.',
        outstanding
      }
    }
    return { blocked: false, requires: stage.requires, outstanding }
  }

  return { blocked: false, requires: 'none', outstanding }
}

/** Moving backwards is always allowed (a client can re-open feedback). */
export function canTransition(from: string, to: string): boolean {
  return STAGE_IDS.includes(to) && STAGE_IDS.includes(from)
}

// ─── Change requests (scope-creep guard) ────────────────────────────────────

export interface ChangeRequestPricingInput {
  estimatedHours: number
  hourlyRate: number
  /** Days the extra work adds to the timeline (manual or derived from hours). */
  extraDays?: number
  /** Hours that fit in a working day, used to derive extraDays when omitted. */
  hoursPerDay?: number
  currency?: string
}

export interface ChangeRequestPricing {
  extraCost: number
  extraDays: number
  effectiveHourlyRate: number
}

export function priceChangeRequest(input: ChangeRequestPricingInput): ChangeRequestPricing {
  const hours = Math.max(0, num(input.estimatedHours))
  const rate = Math.max(0, num(input.hourlyRate))
  const hoursPerDay = Math.max(1, num(input.hoursPerDay, 6))
  const derivedDays = Math.ceil(hours / hoursPerDay)
  return {
    extraCost: round2(hours * rate),
    extraDays: input.extraDays === undefined ? derivedDays : Math.max(0, Math.round(num(input.extraDays))),
    effectiveHourlyRate: round2(rate)
  }
}

export interface ChangeRequestQuoteInput {
  clientName: string
  projectTitle: string
  title: string
  description?: string | null
  estimatedHours: number
  hourlyRate: number
  extraCost: number
  extraDays: number
  currency?: string
}

/** One-click quote body sent to the client before any extra work starts. */
export function buildChangeRequestQuote(input: ChangeRequestQuoteInput): string {
  const currency = input.currency || 'USD'
  const money = (n: number) => `${currency} ${round2(n).toLocaleString('en-US')}`
  const lines = [
    `Hi ${input.clientName},`,
    '',
    `Thanks for the extra request on “${input.projectTitle}” — happy to take it on.`,
    '',
    'It sits outside the agreed baseline scope, so here is the impact before we start:',
    `• Request: ${input.title}`,
    input.description ? `• Details: ${input.description}` : null,
    `• Extra effort: ${round2(input.estimatedHours)} h @ ${money(input.hourlyRate)}/h`,
    `• Extra cost: ${money(input.extraCost)}`,
    `• Timeline impact: +${input.extraDays} working day(s)`,
    '',
    'If you approve, reply “approved” and I will schedule it right away.',
    'Work on this item only starts once the change is approved.',
    '',
    'Thanks!'
  ].filter((line): line is string => line !== null)
  return lines.join('\n')
}

// ─── Pricing engineering ────────────────────────────────────────────────────

export interface RateProfileInput {
  monthlyLivingCost?: number
  monthlyTaxes?: number
  monthlySoftware?: number
  monthlySavings?: number
  monthlyOther?: number
  targetBillableHoursPerWeek?: number
  workingWeeksPerYear?: number
  billableUtilisation?: number
  weeklyCapacityHours?: number
  maxClientHoursPerWeek?: number
  minimumProjectPrice?: number
  currency?: string
}

export interface RateEngine {
  annualOperatingCost: number
  annualSurvivalCost: number
  monthlyTarget: number
  billableHoursPerYear: number
  /** Rate that covers costs + savings + tax at your billable target. */
  baselineHourlyRate: number
  /** Never-accept-below rate: covers survival costs only. */
  floorHourlyRate: number
  /** Rate if you only bill `billableUtilisation` of your working capacity. */
  utilisationHourlyRate: number
  dailyHoursTarget: number
  monthlyHoursTarget: number
  minimumProjectPrice: number
  weeklyCapacityHours: number
  maxClientHoursPerWeek: number
  currency: string
}

export function computeRateEngine(profile: RateProfileInput): RateEngine {
  const monthlyOperating =
    num(profile.monthlyLivingCost) +
    num(profile.monthlyTaxes) +
    num(profile.monthlySoftware) +
    num(profile.monthlySavings) +
    num(profile.monthlyOther)
  const monthlySurvival =
    num(profile.monthlyLivingCost) + num(profile.monthlyTaxes) + num(profile.monthlySoftware) + num(profile.monthlyOther)

  const weeks = Math.min(52, Math.max(1, Math.round(num(profile.workingWeeksPerYear, 46))))
  const targetWeekly = Math.min(80, Math.max(1, num(profile.targetBillableHoursPerWeek, 25)))
  const billableHoursPerYear = targetWeekly * weeks
  const annualOperatingCost = monthlyOperating * 12
  const annualSurvivalCost = monthlySurvival * 12

  const capacityHours = Math.max(1, num(profile.weeklyCapacityHours, 40)) * weeks
  const utilisation = Math.min(1, Math.max(0.1, num(profile.billableUtilisation, 0.7)))

  const baselineHourlyRate = billableHoursPerYear > 0 ? annualOperatingCost / billableHoursPerYear : 0
  return {
    annualOperatingCost: round2(annualOperatingCost),
    annualSurvivalCost: round2(annualSurvivalCost),
    monthlyTarget: round2(monthlyOperating),
    billableHoursPerYear: round2(billableHoursPerYear),
    baselineHourlyRate: round2(baselineHourlyRate),
    floorHourlyRate: billableHoursPerYear > 0 ? round2(annualSurvivalCost / billableHoursPerYear) : 0,
    utilisationHourlyRate: round2(annualOperatingCost / (capacityHours * utilisation)),
    dailyHoursTarget: round2(targetWeekly / 5),
    monthlyHoursTarget: round2(billableHoursPerYear / 12),
    minimumProjectPrice: round2(Math.max(num(profile.minimumProjectPrice), baselineHourlyRate * 4)),
    weeklyCapacityHours: num(profile.weeklyCapacityHours, 40),
    maxClientHoursPerWeek: num(profile.maxClientHoursPerWeek, 30),
    currency: profile.currency || 'USD'
  }
}

export interface QuoteBreakdown {
  hours: number
  atFloor: number
  atBaseline: number
  marginAtBaseline: number
  recommended: number
  currency: string
}

export function priceQuote(engine: RateEngine, hours: number, quotedPrice?: number): QuoteBreakdown {
  const h = Math.max(0, num(hours))
  const atFloor = round2(engine.floorHourlyRate * h)
  const atBaseline = round2(engine.baselineHourlyRate * h)
  const recommended = round2(Math.max(atBaseline, engine.minimumProjectPrice, num(quotedPrice)))
  return {
    hours: h,
    atFloor,
    atBaseline,
    marginAtBaseline: round2(recommended - atFloor),
    recommended,
    currency: engine.currency
  }
}

export interface RealRateResult {
  moneyReceived: number
  realHours: number
  realHourlyRate: number
  effectiveHourlyRateVsBaseline: number
  verdict: 'excellent' | 'healthy' | 'thin' | 'loss'
}

/** `Total money received ÷ real hours spent` — the profitability truth serum. */
export function realHourlyRate(moneyReceived: number, realMinutes: number, baselineHourlyRate = 0): RealRateResult {
  const hours = num(realMinutes) / 60
  const rate = hours > 0 ? num(moneyReceived) / hours : 0
  const ratio = baselineHourlyRate > 0 ? rate / baselineHourlyRate : 1
  let verdict: RealRateResult['verdict'] = 'healthy'
  if (ratio >= 1.25) verdict = 'excellent'
  else if (ratio >= 1) verdict = 'healthy'
  else if (ratio >= 0.7) verdict = 'thin'
  else verdict = 'loss'
  return {
    moneyReceived: round2(num(moneyReceived)),
    realHours: round2(hours),
    realHourlyRate: round2(rate),
    effectiveHourlyRateVsBaseline: round2(ratio * 100),
    verdict
  }
}

// ─── Subscriptions & retainers ──────────────────────────────────────────────

export function subscriptionMonthlyCost(amount: number, billingCycle: string): number {
  const a = num(amount)
  switch ((billingCycle || 'monthly').toLowerCase()) {
    case 'weekly':
      return round2(a * 4.33)
    case 'quarterly':
      return round2(a / 3)
    case 'yearly':
    case 'annual':
      return round2(a / 12)
    default:
      return round2(a)
  }
}

export interface SubscriptionAuditLine {
  id: string
  name: string
  monthlyCost: number
  annualCost: number
  verdict: 'keep' | 'review' | 'cancel'
}

export function auditSubscriptions(
  subs: Array<{ id: string; name: string; amount: number; billingCycle: string; isActive: boolean; isEssential: boolean; usageLevel: string }>
): { lines: SubscriptionAuditLine[]; monthlyBurn: number; annualBurn: number; cancelCandidates: SubscriptionAuditLine[] } {
  const lines: SubscriptionAuditLine[] = subs
    .filter((s) => s.isActive)
    .map((s) => {
      const monthlyCost = subscriptionMonthlyCost(s.amount, s.billingCycle)
      const unused = s.usageLevel === 'rarely' || s.usageLevel === 'monthly'
      const verdict: SubscriptionAuditLine['verdict'] = !s.isEssential
        ? unused
          ? 'cancel'
          : 'review'
        : unused
          ? 'review'
          : 'keep'
      return { id: s.id, name: s.name, monthlyCost, annualCost: round2(monthlyCost * 12), verdict }
    })
  const monthlyBurn = round2(lines.reduce((sum, l) => sum + l.monthlyCost, 0))
  return {
    lines,
    monthlyBurn,
    annualBurn: round2(monthlyBurn * 12),
    cancelCandidates: lines.filter((l) => l.verdict !== 'keep')
  }
}

export interface RetainerState {
  hoursIncluded: number
  hoursUsed: number
  hoursAvailable: number
  rolloverHours: number
  usedPercent: number
  isOverspent: boolean
}

export function retainerState(
  retainer: { hoursIncluded: number; hoursUsed: number; rolloverEnabled: boolean; rolloverHours: number }
): RetainerState {
  const rollover = retainer.rolloverEnabled ? num(retainer.rolloverHours) : 0
  const hoursIncluded = num(retainer.hoursIncluded)
  const hoursUsed = num(retainer.hoursUsed)
  const available = round2(hoursIncluded + rollover - hoursUsed)
  return {
    hoursIncluded,
    hoursUsed,
    hoursAvailable: available,
    rolloverHours: rollover,
    usedPercent: hoursIncluded + rollover > 0 ? round2((hoursUsed / (hoursIncluded + rollover)) * 100) : 0,
    isOverspent: available < 0
  }
}

/** Next first-of-month reset boundary for a retainer period. */
export function retainerResetDate(from: Date | string = new Date()): Date {
  const d = new Date(from)
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0)
}

// ─── Escrow / earned vs unearned cash ───────────────────────────────────────

export interface EscrowLine {
  invoiceId: string
  number: string
  kind: string
  amount: number
  paid: number
  isDeposit: boolean
  earned: number
  unearned: number
}

/**
 * Deposit money is cash in hand but not yet earned — it is refundable until the
 * work it funds has been delivered. Everything billed for delivered stages is
 * realized income.
 */
export function splitEscrow(
  invoices: Array<{ id: string; number: string; kind: string; amount: number; status: string; projectStage?: string }>,
  payments: Array<{ invoiceId: string; amount: number; isDeposit?: boolean }>
): { lines: EscrowLine[]; realizedIncome: number; unearnedRetainedCash: number; cashReceived: number } {
  const lines: EscrowLine[] = invoices.map((inv) => {
    const paid = round2(
      payments.filter((p) => p.invoiceId === inv.id).reduce((sum, p) => sum + num(p.amount), 0)
    )
    const delivered = inv.projectStage ? stageIndex(inv.projectStage) >= stageIndex('assets_handed_over') : false
    const isDeposit = inv.kind === 'deposit'
    const unearned = isDeposit && !delivered ? paid : 0
    return {
      invoiceId: inv.id,
      number: inv.number,
      kind: inv.kind,
      amount: round2(inv.amount),
      paid,
      isDeposit,
      earned: round2(paid - unearned),
      unearned
    }
  })
  const cashReceived = round2(lines.reduce((sum, l) => sum + l.paid, 0))
  const unearnedRetainedCash = round2(lines.reduce((sum, l) => sum + l.unearned, 0))
  return { lines, realizedIncome: round2(cashReceived - unearnedRetainedCash), unearnedRetainedCash, cashReceived }
}

// ─── Capacity & burnout defense ─────────────────────────────────────────────

export type CapacityLevel = 'clear' | 'amber' | 'red'

export interface CapacityReading {
  plannedMinutes: number
  availableMinutes: number
  usedPercent: number
  level: CapacityLevel
  overbookedMinutes: number
}

/** Amber at 85 % of capacity, red once the day is over 100 %. */
export function capacityReading(plannedMinutes: number, availableMinutes: number): CapacityReading {
  const planned = Math.max(0, num(plannedMinutes))
  const available = Math.max(0, num(availableMinutes))
  const usedPercent = available > 0 ? round2((planned / available) * 100) : planned > 0 ? 999 : 0
  let level: CapacityLevel = 'clear'
  if (usedPercent > 100) level = 'red'
  else if (usedPercent >= 85) level = 'amber'
  return {
    plannedMinutes: planned,
    availableMinutes: available,
    usedPercent,
    level,
    overbookedMinutes: Math.max(0, round2(planned - available))
  }
}

export function isBlackoutDay(day: Date | string, blackouts: Array<{ startDate: Date | string; endDate: Date | string }>): boolean {
  const d = new Date(day).setHours(12, 0, 0, 0)
  return blackouts.some((b) => {
    const start = new Date(b.startDate).setHours(0, 0, 0, 0)
    const end = new Date(b.endDate).setHours(23, 59, 59, 999)
    return d >= start && d <= end
  })
}

/** First working day at/after `from` that is not a blackout and not overbooked. */
export function suggestStartDate(
  from: Date | string,
  blackouts: Array<{ startDate: Date | string; endDate: Date | string }>,
  bookedByDay: Record<string, number>,
  dailyCapacityMinutes: number,
  neededMinutes: number
): string {
  const cursor = new Date(from)
  for (let i = 0; i < 180; i += 1) {
    const day = new Date(cursor)
    day.setDate(cursor.getDate() + i)
    const dow = day.getDay()
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    if (dow === 0 || dow === 6) continue
    if (isBlackoutDay(day, blackouts)) continue
    const booked = num(bookedByDay[key])
    if (booked + neededMinutes <= dailyCapacityMinutes) return key
  }
  return ''
}

// ─── Deadline shift (client bottleneck) ─────────────────────────────────────

export function shiftDeadline(dueDate: Date | string | null, baseDate: Date | string, days: number): Date | null {
  if (!dueDate) return null
  const base = new Date(baseDate)
  const shifted = new Date(dueDate)
  shifted.setDate(shifted.getDate() + Math.max(0, Math.round(num(days))))
  return shifted > base ? shifted : new Date(base.getTime() + Math.max(0, days) * 86_400_000)
}

// ─── Daily standup ──────────────────────────────────────────────────────────

export function buildStandupSummary(input: {
  day: string
  completed: string[]
  next: string[]
  focusMinutes: number
  billableMinutes: number
}): string {
  const hours = (minutes: number) => `${round2(minutes / 60)}h`
  const completed = input.completed.length ? input.completed.join('; ') : 'no closed tasks logged'
  const next = input.next.length ? input.next.join('; ') : 'planning the next milestone'
  return [
    `${input.day} — completed: ${completed}.`,
    `Tracked ${hours(input.focusMinutes)} of focus time (${hours(input.billableMinutes)} billable).`,
    `Next up: ${next}.`
  ].join(' ')
}

// ─── Invoice money engine ───────────────────────────────────────────────────

export interface InvoiceTotals {
  net: number
  tax: number
  total: number
  balance: number
}

/** Single source of truth for invoice arithmetic: discount → net → tax → total. */
export function invoiceTotals(input: {
  amount?: number
  discount?: number
  taxRate?: number
  paid?: number
}): InvoiceTotals {
  const amount = Math.max(0, num(input.amount))
  const discount = Math.min(Math.max(0, num(input.discount)), amount)
  const net = round2(amount - discount)
  const tax = round2(net * (num(input.taxRate) / 100))
  const total = round2(net + tax)
  return { net, tax, total, balance: round2(Math.max(0, total - num(input.paid))) }
}

export interface DiscountInput {
  amount: number
  /** Straight percentage off the quoted amount. */
  percentOff?: number
  /** Loyalty/early-payment percentage charged on the subtotal left by `percentOff`. */
  earlyPaymentPercent?: number
  /** Flat amount removed last, floored so the net can never go below zero. */
  amountOff?: number
  /** Days the invoice actually took to be paid — qualifies the early-payment promo. */
  daysToPay?: number
  /** The early-payment promo only applies when paid within this many days. */
  earlyPaymentDays?: number
}

export interface DiscountBreakdown {
  gross: number
  percentOffAmount: number
  percentApplied: boolean
  earlyPaymentAmount: number
  earlyPaymentApplied: boolean
  amountOffAmount: number
  totalDiscount: number
  net: number
}

/**
 * Discounts are applied in a fixed order so identical inputs always produce an
 * identical total: percentage off the gross, the early-payment percentage off
 * what survives, then the flat amount — floored so the net never goes negative.
 */
export function computeDiscount(input: DiscountInput): DiscountBreakdown {
  const gross = round2(Math.max(0, num(input.amount)))
  const percent = Math.min(100, Math.max(0, num(input.percentOff)))
  const percentOffAmount = round2(gross * (percent / 100))
  const afterPercent = round2(gross - percentOffAmount)

  const earlyPercent = Math.max(0, num(input.earlyPaymentPercent))
  const window = num(input.earlyPaymentDays)
  const daysToPay = num(input.daysToPay)
  const earlyPaymentApplied = earlyPercent > 0 && window > 0 && daysToPay > 0 && daysToPay <= window
  const earlyPaymentAmount = earlyPaymentApplied ? round2(afterPercent * (earlyPercent / 100)) : 0
  const afterEarly = round2(afterPercent - earlyPaymentAmount)

  const amountOffAmount = round2(Math.min(Math.max(0, num(input.amountOff)), afterEarly))

  return {
    gross,
    percentOffAmount,
    percentApplied: percent > 0,
    earlyPaymentAmount,
    earlyPaymentApplied,
    amountOffAmount,
    totalDiscount: round2(percentOffAmount + earlyPaymentAmount + amountOffAmount),
    net: round2(afterEarly - amountOffAmount)
  }
}

export interface LateFeePolicy {
  /** Days after the due date before a fee can be charged. */
  graceDays?: number
  /** Percentage charged for every period the balance stays unpaid. */
  ratePercent?: number
  /** Length of a billing period, in days. */
  periodDays?: number
  /** One-off administration charge, added after the percentage ceiling. */
  flatFee?: number
  /** Hard ceiling on the percentage fee, as a percent of the balance (0 = uncapped). */
  maxPercent?: number
  compounding?: 'simple' | 'compound'
}

export const DEFAULT_LATE_FEE_POLICY: Required<LateFeePolicy> = {
  graceDays: 3,
  ratePercent: 2,
  periodDays: 30,
  flatFee: 0,
  maxPercent: 15,
  compounding: 'simple'
}

export interface LateFeeBreakdown {
  isLate: boolean
  /** Past the due date but still inside the grace window. */
  withinGrace: boolean
  daysLate: number
  graceDays: number
  chargeableDays: number
  /** Periods of lateness, prorated to the day. */
  periods: number
  ratePercent: number
  periodDays: number
  compounding: 'simple' | 'compound'
  /** Percentage fee before the ceiling is applied. */
  rawPercentFee: number
  percentFee: number
  flatFee: number
  fee: number
  /** Ceiling that applied, in currency. `0` when uncapped. */
  cap: number
  capped: boolean
  balance: number
  newBalance: number
}

/**
 * Late fee = `ratePercent` per started period past the due date, prorated by day,
 * clamped by `maxPercent` of the balance, plus the flat administration fee.
 * Pure preview — nothing is written to the invoice.
 */
export function computeLateFee(input: {
  balance?: number
  dueAt?: Date | string | null
  asOf?: Date | string
  policy?: LateFeePolicy
}): LateFeeBreakdown {
  const policy = { ...DEFAULT_LATE_FEE_POLICY, ...(input.policy ?? {}) }
  const balance = round2(Math.max(0, num(input.balance)))
  const graceDays = Math.max(0, num(policy.graceDays))
  const periodDays = Math.max(1, num(policy.periodDays))
  const ratePercent = Math.max(0, num(policy.ratePercent))
  const maxPercent = Math.max(0, num(policy.maxPercent))
  const flatFee = round2(Math.max(0, num(policy.flatFee)))
  const compounding = policy.compounding === 'compound' ? 'compound' : 'simple'

  const due = input.dueAt ? new Date(input.dueAt) : null
  const asOf = input.asOf ? new Date(input.asOf) : new Date()
  const dated = due !== null && !Number.isNaN(due.getTime()) && !Number.isNaN(asOf.getTime())
  const daysLate = dated ? daysBetween(due as Date, asOf) : 0

  const idle: LateFeeBreakdown = {
    isLate: false,
    withinGrace: dated && daysLate > 0 && daysLate <= graceDays,
    daysLate,
    graceDays,
    chargeableDays: 0,
    periods: 0,
    ratePercent,
    periodDays,
    compounding,
    rawPercentFee: 0,
    percentFee: 0,
    flatFee: 0,
    fee: 0,
    cap: 0,
    capped: false,
    balance,
    newBalance: balance
  }

  if (!dated || balance <= 0 || daysLate <= graceDays || (ratePercent <= 0 && flatFee <= 0)) return idle

  const chargeableDays = daysLate - graceDays
  // Prorate on the exact ratio; `periods` is only rounded for display.
  const rawPeriods = chargeableDays / periodDays
  const rawPercentFee =
    compounding === 'compound'
      ? round2(balance * (Math.pow(1 + ratePercent / 100, rawPeriods) - 1))
      : round2(balance * (ratePercent / 100) * rawPeriods)
  const cap = maxPercent > 0 ? round2(balance * (maxPercent / 100)) : 0
  const percentFee = cap > 0 ? round2(Math.min(rawPercentFee, cap)) : rawPercentFee
  const fee = round2(percentFee + flatFee)

  return {
    ...idle,
    isLate: fee > 0,
    withinGrace: false,
    chargeableDays,
    periods: round2(rawPeriods),
    rawPercentFee,
    percentFee,
    flatFee,
    fee,
    cap,
    capped: cap > 0 && rawPercentFee > cap,
    newBalance: round2(balance + fee)
  }
}

export interface RateCardService {
  name: string
  hours?: number
  /** Fixed price for this service; when omitted the rate engine prices the hours. */
  price?: number
}

export type RateCardTierId = 'standard' | 'retainer' | 'rush'

export interface RateCardLine {
  name: string
  hours: number
  /** Baseline price before the tier multiplier. */
  base: number
  price: number
}

export interface RateCardTier {
  id: RateCardTierId
  multiplier: number
  lines: RateCardLine[]
  subtotal: number
  /** Subtotal with the minimum-project-price floor applied. */
  total: number
  floorApplied: boolean
}

export interface RateCard {
  baselineHourlyRate: number
  floorHourlyRate: number
  minimumProjectPrice: number
  currency: string
  tiers: RateCardTier[]
}

/** Turns the rate engine plus a service list into a copy-ready tiered rate card. */
export function buildPriceCard(
  engine: RateEngine,
  services: RateCardService[],
  options: { retainerDiscountPercent?: number; rushSurchargePercent?: number } = {}
): RateCard {
  const retainerMultiplier = round2(1 - Math.min(90, Math.max(0, num(options.retainerDiscountPercent, 10))) / 100)
  const rushMultiplier = round2(1 + Math.max(0, num(options.rushSurchargePercent, 25)) / 100)
  const usable = (services ?? []).filter((s) => s && typeof s.name === 'string' && s.name.trim() !== '')
  const tierDefs: { id: RateCardTierId; multiplier: number }[] = [
    { id: 'standard', multiplier: 1 },
    { id: 'retainer', multiplier: retainerMultiplier },
    { id: 'rush', multiplier: rushMultiplier }
  ]

  return {
    baselineHourlyRate: engine.baselineHourlyRate,
    floorHourlyRate: engine.floorHourlyRate,
    minimumProjectPrice: engine.minimumProjectPrice,
    currency: engine.currency,
    tiers: tierDefs.map((tier) => {
      const lines = usable.map((service) => {
        const hours = round2(Math.max(0, num(service.hours)))
        const fixed = num(service.price)
        const base = round2(fixed > 0 ? fixed : hours * engine.baselineHourlyRate)
        return { name: service.name.trim(), hours, base, price: round2(base * tier.multiplier) }
      })
      const subtotal = round2(lines.reduce((sum, line) => sum + line.price, 0))
      const total = round2(Math.max(subtotal, engine.minimumProjectPrice))
      return { id: tier.id, multiplier: tier.multiplier, lines, subtotal, total, floorApplied: total > subtotal }
    })
  }
}

// ─── Invoice & statement documents ──────────────────────────────────────────
// The client-facing end of the money loop: a one-click document you can hand
// over without leaving the app. The HTML is fully self-contained — inline CSS,
// no external assets — so it opens in any browser and prints or saves as a PDF
// straight from there, while the markdown and plain-text twins exist so the
// covering email can be pasted into a mail client.
//
// Every visible word arrives in `DocumentLabels` from the renderer, which is
// where the UI language lives. That keeps this module free of Electron imports
// *and* lets an Arabic invoice be genuinely right-to-left rather than an
// English document with translated headers.

export interface DocumentParty {
  name: string
  detail?: string
  email?: string
}

export interface DocumentLabels {
  invoice: string
  statement: string
  from: string
  billTo: string
  issued: string
  due: string
  project: string
  period: string
  reference: string
  status: string
  description: string
  quantity: string
  unitPrice: string
  amount: string
  subtotal: string
  discount: string
  tax: string
  total: string
  paid: string
  balance: string
  notes: string
  emptyLines: string
  emptyStatement: string
  footer: string
}

export interface DocumentOptions {
  labels: DocumentLabels
  direction?: 'ltr' | 'rtl'
}

export interface InvoiceDocumentLine {
  label: string
  detail?: string
  quantity?: number
  unitPrice?: number
  amount: number
}

export interface InvoiceDocumentInput {
  number: string
  statusLabel?: string
  kindLabel?: string
  issuedAt?: Date | string | null
  dueAt?: Date | string | null
  currency?: string
  issuedBy: DocumentParty
  billedTo: DocumentParty
  projectLabel?: string
  lines?: InvoiceDocumentLine[]
  net: number
  discount?: number
  taxRate?: number
  tax?: number
  total: number
  paid?: number
  balance?: number
  notes?: string
}

export interface StatementDocumentRow {
  number: string
  kind?: string
  statusLabel?: string
  issuedAt?: Date | string | null
  dueAt?: Date | string | null
  total: number
  paid: number
  balance: number
}

export interface StatementDocumentInput {
  reference: string
  issuedAt?: Date | string | null
  periodFrom?: Date | string | null
  periodTo?: Date | string | null
  currency?: string
  issuedBy: DocumentParty
  billedTo: DocumentParty
  rows: StatementDocumentRow[]
  totals: { total: number; paid: number; balance: number }
  notes?: string
}

export interface RenderedDocument {
  /** Suggested file name, already sanitised for the filesystem. */
  fileName: string
  /** Document title / covering-email subject. */
  title: string
  html: string
  markdown: string
  text: string
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Collapses whitespace so a one-line field can never break a table row. */
function inline(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Client-facing money — `USD 1,200.00`, with an explicit locale. */
export function documentMoney(value: number | null | undefined, currency = 'USD'): string {
  const n = num(value)
  const sign = n < 0 ? '-' : ''
  const magnitude = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${sign}${inline(currency).toUpperCase() || 'USD'} ${magnitude}`
}

/** Strips trailing zeros so `5.00%` reads as `5%` and `7.50%` as `7.5%`. */
export function documentPercent(value: number | null | undefined): string {
  return `${String(num(value).toFixed(2)).replace(/\.?0+$/, '')}%`
}

export function documentDate(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function documentFileName(label: string, extension = 'html'): string {
  const stem = inline(label)
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return `${stem || 'document'}.${extension}`
}

const DOCUMENT_CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px;
    font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a; background: #fff;
  }
  .sheet { max-width: 800px; margin: 0 auto; }
  header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; border-bottom: 2px solid #6366f1; padding-bottom: 16px; }
  h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: -0.01em; }
  .kicker { margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; }
  .meta { text-align: end; font-size: 13px; }
  .meta p { margin: 0; }
  .meta dt { display: inline; color: #64748b; }
  .meta dd { display: inline; margin: 0 0 0 6px; }
  .parties { display: flex; flex-wrap: wrap; gap: 40px; margin: 24px 0; }
  .party { min-width: 200px; }
  .party h2 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
  .party p { margin: 0; }
  .muted { color: #64748b; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: start; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 8px 6px; }
  td { padding: 10px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  th.num, td.num { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals { margin: 20px 0 0 auto; max-width: 340px; }
  .totals div { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; }
  .totals .grand { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 700; }
  .totals .balance { color: #6366f1; font-weight: 700; }
  .notes { margin-top: 28px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; white-space: pre-wrap; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  [dir="rtl"] .totals { margin: 20px auto 0 0; }
  @media print { body { padding: 0 } .sheet { max-width: none } @page { margin: 14mm } }
`

function documentShell(input: {
  title: string
  direction: 'ltr' | 'rtl'
  bodyHtml: string
}): string {
  return `<!doctype html>
<html lang="en" dir="${input.direction}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>
<div class="sheet">
${input.bodyHtml}
</div>
</body>
</html>
`
}

/** Party block shared by both document kinds. */
function partyHtml(heading: string, party: DocumentParty): string {
  const lines = [party.name, party.detail, party.email]
    .map((line) => inline(line))
    .filter((line) => line !== '')
  return `<div class="party">
<h2>${escapeHtml(heading)}</h2>
${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('\n')}
</div>`
}

function metaHtml(rows: Array<[string, string]>): string {
  const present = rows.filter(([, value]) => inline(value) !== '')
  if (present.length === 0) return ''
  return `<dl class="meta">
${present
  .map(([label, value]) => `<p><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></p>`)
  .join('\n')}
</dl>`
}

interface DocumentTotalRow {
  label: string
  value: string
  kind: 'plain' | 'grand' | 'balance'
}

function totalRows(input: {
  net: number
  discount: number
  taxRate: number
  tax: number
  total: number
  paid: number
  balance: number
  currency: string
  labels: DocumentLabels
}): DocumentTotalRow[] {
  const money = (value: number) => documentMoney(value, input.currency)
  const rows: DocumentTotalRow[] = [
    { label: input.labels.subtotal, value: money(round2(input.net + input.discount)), kind: 'plain' }
  ]
  if (input.discount > 0) {
    rows.push({ label: input.labels.discount, value: `-${money(input.discount)}`, kind: 'plain' })
  }
  if (input.tax > 0) {
    rows.push({
      label: input.taxRate > 0 ? `${input.labels.tax} (${documentPercent(input.taxRate)})` : input.labels.tax,
      value: money(input.tax),
      kind: 'plain'
    })
  }
  rows.push({ label: input.labels.total, value: money(input.total), kind: 'grand' })
  if (input.paid > 0) rows.push({ label: input.labels.paid, value: money(input.paid), kind: 'plain' })
  rows.push({ label: input.labels.balance, value: money(input.balance), kind: 'balance' })
  return rows
}

function notesBlock(labels: DocumentLabels, notes?: string): string {
  const body = String(notes ?? '').trim()
  if (body === '') return ''
  return `<div class="notes"><strong>${escapeHtml(labels.notes)}</strong><br>${escapeHtml(body)}</div>`
}

function footerBlock(labels: DocumentLabels, parts: string[]): string {
  const text = [labels.footer, ...parts].map((part) => inline(part)).filter((part) => part !== '')
  return `<footer>${escapeHtml(text.join(' · '))}</footer>`
}

export function renderInvoiceDocument(
  input: InvoiceDocumentInput,
  options: DocumentOptions
): RenderedDocument {
  const labels = options.labels
  const currency = inline(input.currency).toUpperCase() || 'USD'
  const number = inline(input.number)
  const money = (value: number) => documentMoney(value, currency)
  const lines = (input.lines ?? []).filter((line) => line && inline(line.label) !== '')
  const discount = round2(Math.max(0, num(input.discount)))
  const taxRate = num(input.taxRate)
  const tax = round2(num(input.tax))
  const net = round2(num(input.net))
  const total = round2(num(input.total))
  const paid = round2(num(input.paid))
  const balance = round2(num(input.balance, round2(total - paid)))
  const title = `${inline(labels.invoice)} ${number}`.trim()

  const rows = totalRows({ net, discount, taxRate, tax, total, paid, balance, currency, labels })

  const linesHtml = lines.length
    ? lines
        .map(
          (line) => `<tr>
<td>${escapeHtml(inline(line.label))}${
            line.detail ? `<span class="muted"> — ${escapeHtml(inline(line.detail))}</span>` : ''
          }</td>
<td class="num">${line.quantity === undefined ? '—' : escapeHtml(String(line.quantity))}</td>
<td class="num">${line.unitPrice === undefined ? '—' : escapeHtml(money(line.unitPrice))}</td>
<td class="num">${escapeHtml(money(line.amount))}</td>
</tr>`
        )
        .join('\n')
    : `<tr><td colspan="4" class="muted">${escapeHtml(labels.emptyLines)}</td></tr>`

  const bodyHtml = `<header>
<div>
<p class="kicker">${escapeHtml(labels.invoice)}</p>
<h1>${escapeHtml(number)}</h1>
${input.kindLabel ? `<p class="muted">${escapeHtml(inline(input.kindLabel))}</p>` : ''}
</div>
${metaHtml([
  [labels.issued, documentDate(input.issuedAt)],
  [labels.due, input.dueAt ? documentDate(input.dueAt) : ''],
  [labels.project, inline(input.projectLabel)],
  [labels.status, inline(input.statusLabel)]
])}
</header>
<div class="parties">
${partyHtml(labels.from, input.issuedBy)}
${partyHtml(labels.billTo, input.billedTo)}
</div>
<table>
<thead>
<tr>
<th>${escapeHtml(labels.description)}</th>
<th class="num">${escapeHtml(labels.quantity)}</th>
<th class="num">${escapeHtml(labels.unitPrice)}</th>
<th class="num">${escapeHtml(labels.amount)}</th>
</tr>
</thead>
<tbody>
${linesHtml}
</tbody>
</table>
<div class="totals">
${rows
  .map((row) => `<div class="${row.kind}"><span>${escapeHtml(row.label)}</span><span>${escapeHtml(row.value)}</span></div>`)
  .join('\n')}
</div>
${notesBlock(labels, input.notes)}
${footerBlock(labels, [documentDate(input.issuedAt), currency])}`

  const markdown = [
    `# ${title}`,
    '',
    ...partyMarkdown(labels.from, input.issuedBy),
    ...partyMarkdown(labels.billTo, input.billedTo),
    ...inlineMetaMarkdown([
      [labels.issued, documentDate(input.issuedAt)],
      [labels.due, input.dueAt ? documentDate(input.dueAt) : ''],
      [labels.project, inline(input.projectLabel)],
      [labels.status, inline(input.statusLabel)]
    ]),
    '',
    lines.length
      ? `| ${labels.description} | ${labels.quantity} | ${labels.unitPrice} | ${labels.amount} |\n| --- | ---: | ---: | ---: |\n${lines
          .map(
            (line) =>
              `| ${cell(line.label + (line.detail ? ` — ${line.detail}` : ''))} | ${
                line.quantity === undefined ? '—' : cell(String(line.quantity))
              } | ${line.unitPrice === undefined ? '—' : cell(money(line.unitPrice))} | ${cell(
                money(line.amount)
              )} |`
          )
          .join('\n')}`
      : `_${inline(labels.emptyLines)}_`,
    '',
    `| | |\n| --- | ---: |\n${rows
      .map((row) => `| ${cell(row.label)} | ${cell(row.value)} |`)
      .join('\n')}`,
    input.notes && String(input.notes).trim() !== ''
      ? `\n**${inline(labels.notes)}**\n\n${String(input.notes).trim()}`
      : '',
    '',
    `_${[labels.footer, documentDate(input.issuedAt), currency].filter((p) => inline(p) !== '').join(' · ')}_`
  ]
    .filter((line) => line !== undefined)
    .join('\n')

  const text = [
    title.toUpperCase(),
    '='.repeat(Math.max(title.length, 8)),
    '',
    ...partyText(labels.from, input.issuedBy),
    ...partyText(labels.billTo, input.billedTo),
    '',
    joinLabelValue(labels.issued, documentDate(input.issuedAt)),
    input.dueAt ? joinLabelValue(labels.due, documentDate(input.dueAt)) : '',
    input.projectLabel ? joinLabelValue(labels.project, inline(input.projectLabel)) : '',
    input.statusLabel ? joinLabelValue(labels.status, inline(input.statusLabel)) : '',
    '',
    ...(lines.length
      ? lines.flatMap((line) => [
          `- ${inline(line.label)}${line.detail ? ` (${inline(line.detail)})` : ''}${
            line.quantity !== undefined ? ` x${line.quantity}` : ''
          } … ${money(line.amount)}`
        ])
      : [labels.emptyLines]),
    '',
    ...rows.map((row) => joinLabelValue(row.label, row.value)),
    input.notes && String(input.notes).trim() !== '' ? `\n${labels.notes}\n${String(input.notes).trim()}` : '',
    '',
    [labels.footer, documentDate(input.issuedAt), currency].filter((p) => inline(p) !== '').join(' · ')
  ]
    .filter((line) => line !== '')
    .join('\n')

  return {
    fileName: documentFileName(number),
    title,
    html: documentShell({ title, direction: options.direction ?? 'ltr', bodyHtml }),
    markdown,
    text
  }
}

/** Escapes the markdown table separator, which is the one character a name may not contain. */
function cell(value: unknown): string {
  return inline(value).replace(/\|/g, '\\|')
}

function joinLabelValue(label: string, value: string): string {
  return `${label}: ${value}`
}

function partyMarkdown(heading: string, party: DocumentParty): string[] {
  const lines = [party.name, party.detail, party.email]
    .map((line) => inline(line))
    .filter((line) => line !== '')
  if (lines.length === 0) return []
  return [`**${inline(heading)}**  `, ...lines.map((line) => `${line}  `), '']
}

function partyText(heading: string, party: DocumentParty): string[] {
  const lines = [party.name, party.detail, party.email]
    .map((line) => inline(line))
    .filter((line) => line !== '')
  if (lines.length === 0) return []
  return [`${inline(heading)}: ${lines.join(', ')}`]
}

function inlineMetaMarkdown(rows: Array<[string, string]>): string[] {
  const present = rows.filter(([, value]) => inline(value) !== '')
  if (present.length === 0) return []
  return ['', present.map(([label, value]) => `**${inline(label)}:** ${cell(value)}`).join(' · ')]
}

export function renderStatementDocument(
  input: StatementDocumentInput,
  options: DocumentOptions
): RenderedDocument {
  const labels = options.labels
  const currency = inline(input.currency).toUpperCase() || 'USD'
  const money = (value: number) => documentMoney(value, currency)
  const reference = inline(input.reference)
  const rows = (input.rows ?? []).filter((row) => row && inline(row.number) !== '')
  const total = round2(num(input.totals?.total))
  const paid = round2(num(input.totals?.paid))
  const balance = round2(num(input.totals?.balance))
  const title = `${inline(labels.statement)} ${reference}`.trim()
  const period =
    input.periodFrom || input.periodTo
      ? `${documentDate(input.periodFrom)} — ${documentDate(input.periodTo)}`
      : ''

  const bodyHtml = `<header>
<div>
<p class="kicker">${escapeHtml(labels.statement)}</p>
<h1>${escapeHtml(reference)}</h1>
</div>
${metaHtml([
  [labels.issued, documentDate(input.issuedAt)],
  [labels.period, period]
])}
</header>
<div class="parties">
${partyHtml(labels.from, input.issuedBy)}
${partyHtml(labels.billTo, input.billedTo)}
</div>
<table>
<thead>
<tr>
<th>${escapeHtml(labels.reference)}</th>
<th>${escapeHtml(labels.issued)}</th>
<th>${escapeHtml(labels.due)}</th>
<th>${escapeHtml(labels.status)}</th>
<th class="num">${escapeHtml(labels.total)}</th>
<th class="num">${escapeHtml(labels.paid)}</th>
<th class="num">${escapeHtml(labels.balance)}</th>
</tr>
</thead>
<tbody>
${
  rows.length
    ? rows
        .map(
          (row) => `<tr>
<td>${escapeHtml(inline(row.number))}</td>
<td>${escapeHtml(documentDate(row.issuedAt))}</td>
<td>${escapeHtml(row.dueAt ? documentDate(row.dueAt) : '—')}</td>
<td>${escapeHtml(inline(row.statusLabel))}</td>
<td class="num">${escapeHtml(money(row.total))}</td>
<td class="num">${escapeHtml(money(row.paid))}</td>
<td class="num">${escapeHtml(money(row.balance))}</td>
</tr>`
        )
        .join('\n')
    : `<tr><td colspan="7" class="muted">${escapeHtml(labels.emptyStatement)}</td></tr>`
}
</tbody>
</table>
<div class="totals">
<div><span>${escapeHtml(labels.total)}</span><span>${escapeHtml(money(total))}</span></div>
<div><span>${escapeHtml(labels.paid)}</span><span>${escapeHtml(money(paid))}</span></div>
<div class="balance"><span>${escapeHtml(labels.balance)}</span><span>${escapeHtml(money(balance))}</span></div>
</div>
${notesBlock(labels, input.notes)}
${footerBlock(labels, [documentDate(input.issuedAt)])}`

  const markdown = [
    `# ${title}`,
    '',
    ...partyMarkdown(labels.from, input.issuedBy),
    ...partyMarkdown(labels.billTo, input.billedTo),
    ...inlineMetaMarkdown([
      [labels.issued, documentDate(input.issuedAt)],
      [labels.period, period]
    ]),
    '',
    rows.length
      ? `| ${labels.reference} | ${labels.issued} | ${labels.due} | ${labels.status} | ${labels.total} | ${labels.paid} | ${labels.balance} |\n| --- | --- | --- | --- | ---: | ---: | ---: |\n${rows
          .map(
            (row) =>
              `| ${cell(row.number)} | ${cell(documentDate(row.issuedAt))} | ${cell(
                row.dueAt ? documentDate(row.dueAt) : '—'
              )} | ${cell(row.statusLabel)} | ${cell(money(row.total))} | ${cell(money(row.paid))} | ${cell(
                money(row.balance)
              )} |`
          )
          .join('\n')}`
      : `_${inline(labels.emptyStatement)}_`,
    '',
    `| | |\n| --- | ---: |\n| ${cell(labels.total)} | ${cell(money(total))} |\n| ${cell(
      labels.paid
    )} | ${cell(money(paid))} |\n| **${cell(labels.balance)}** | **${cell(money(balance))}** |`,
    input.notes && String(input.notes).trim() !== ''
      ? `\n**${inline(labels.notes)}**\n\n${String(input.notes).trim()}`
      : '',
    '',
    `_${[labels.footer, documentDate(input.issuedAt)].filter((p) => inline(p) !== '').join(' · ')}_`
  ].join('\n')

  const text = [
    title.toUpperCase(),
    '='.repeat(Math.max(title.length, 8)),
    '',
    ...partyText(labels.from, input.issuedBy),
    ...partyText(labels.billTo, input.billedTo),
    '',
    joinLabelValue(labels.issued, documentDate(input.issuedAt)),
    period ? joinLabelValue(labels.period, period) : '',
    '',
    ...(rows.length
      ? rows.map(
          (row) =>
            `- ${inline(row.number)} · ${documentDate(row.issuedAt)} · ${inline(row.statusLabel)} · ${money(
              row.total
            )} → ${money(row.balance)}`
        )
      : [labels.emptyStatement]),
    '',
    joinLabelValue(labels.total, money(total)),
    joinLabelValue(labels.paid, money(paid)),
    joinLabelValue(labels.balance, money(balance)),
    input.notes && String(input.notes).trim() !== '' ? `\n${labels.notes}\n${String(input.notes).trim()}` : '',
    '',
    [labels.footer, documentDate(input.issuedAt)].filter((p) => inline(p) !== '').join(' · ')
  ]
    .filter((line) => line !== '')
    .join('\n')

  return {
    fileName: documentFileName(`${inline(labels.statement)}-${reference}`),
    title,
    html: documentShell({ title, direction: options.direction ?? 'ltr', bodyHtml }),
    markdown,
    text
  }
}

// ─── Retainer renewal automation ────────────────────────────────────────────
// A retainer is a standing agreement, so the app has to answer "what happens on
// the 1st of the month?" without the operator remembering to press a button.
// The rule set is deliberately conservative: only the period that just closed
// can carry hours, and carry-over is capped at one period's allowance, so a
// dormant agreement cannot bank a year of unused time.

export interface RetainerRenewalInput {
  name?: string
  periodStart: Date | string
  nextResetAt?: Date | string | null
  monthlyAmount?: number
  hoursIncluded?: number
  hoursUsed?: number
  rolloverEnabled?: boolean
  rolloverHours?: number
  isActive?: boolean
}

export interface RetainerRenewalWindow {
  periodStart: Date
  /** Boundary the open period recycles at — the date a roll is waiting on. */
  periodEnd: Date
  isDue: boolean
  /** Whole days until the boundary; negative once it has passed. */
  daysUntilReset: number
  /** Completed periods waiting to be rolled. */
  periodsDue: number
}

export interface RetainerRenewalPlan {
  window: RetainerRenewalWindow
  /** Start of the period that opens once the roll is applied. */
  nextPeriodStart: Date
  nextResetAt: Date
  /** Hours billed against the retainer during the closed period. */
  hoursUsed: number
  /** Unused hours carried into the new period. */
  carriedHours: number
  /** Unused hours lost because the contract forbids rollover, or the cap bit. */
  forfeitedHours: number
  rolloverHours: number
  periodAmount: number
  /** Renewal fee for every period that closed, raised as a single invoice. */
  invoiceAmount: number
  shouldInvoice: boolean
  /** Stamp written into the renewal invoice's notes. */
  noteMarker: string
}

/** Calendar-month arithmetic that clamps to the end of a shorter month. */
export function addMonths(input: Date | string, months: number): Date {
  const date = new Date(input)
  const day = date.getDate()
  const target = new Date(date.getFullYear(), date.getMonth() + Math.round(num(months)), 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, lastDay))
  target.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds())
  return target
}

/** Whole months from `from` up to `to`; the day-of-month has to be reached. */
function wholeMonthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (to.getDate() < from.getDate()) months -= 1
  return Math.max(0, months)
}

/**
 * Where a retainer stands relative to its billing boundary. `nextResetAt` wins
 * when the contract carries one; otherwise the standard first-of-month
 * convention is derived from the period start.
 */
export function retainerRenewalWindow(
  input: RetainerRenewalInput,
  asOf: Date | string = new Date()
): RetainerRenewalWindow {
  const now = new Date(asOf)
  const periodStart = new Date(input.periodStart)
  const declared = input.nextResetAt ? new Date(input.nextResetAt) : null
  const periodEnd =
    declared && !Number.isNaN(declared.getTime()) ? declared : retainerResetDate(periodStart)
  const isDue = now.getTime() >= periodEnd.getTime()

  return {
    periodStart,
    periodEnd,
    isDue,
    daysUntilReset: Math.round(
      (startOfDay(periodEnd).getTime() - startOfDay(now).getTime()) / 86_400_000
    ),
    periodsDue: isDue ? wholeMonthsBetween(periodEnd, now) + 1 : 0
  }
}

/**
 * The full effect of rolling a retainer, computed without touching the database
 * so the UI can preview it and the handler can apply exactly what was previewed.
 */
export function planRetainerRenewal(
  input: RetainerRenewalInput,
  asOf: Date | string = new Date()
): RetainerRenewalPlan {
  const window = retainerRenewalWindow(input, asOf)
  const periodsDue = window.periodsDue
  const allowance = num(input.hoursIncluded)
  const hoursUsed = round2(Math.max(0, num(input.hoursUsed)))
  const opening = round2(Math.max(0, num(input.rolloverHours)))
  const unused = round2(Math.max(0, allowance + opening - hoursUsed))
  const carried = input.rolloverEnabled && allowance > 0 ? round2(Math.min(unused, allowance)) : 0
  const periodAmount = round2(Math.max(0, num(input.monthlyAmount)))

  return {
    window,
    nextPeriodStart: addMonths(window.periodEnd, periodsDue - 1),
    nextResetAt: addMonths(window.periodEnd, periodsDue),
    hoursUsed,
    carriedHours: carried,
    forfeitedHours: round2(unused - carried),
    rolloverHours: carried,
    periodAmount,
    invoiceAmount: round2(periodAmount * periodsDue),
    shouldInvoice: periodsDue > 0 && periodAmount > 0,
    noteMarker: retainerRenewalMarker(input.name ?? '', addMonths(window.periodEnd, periodsDue - 1))
  }
}

/**
 * Stable stamp written into a renewal invoice's notes. It is what makes a roll
 * safe to run twice: a second pass over the same period finds the marker and
 * skips, instead of billing the client again.
 */
export function retainerRenewalMarker(name: string, periodStart: Date | string): string {
  return `RETAINER-RENEWAL ${inline(name)} ${dayKey(periodStart)}`.trim()
}
