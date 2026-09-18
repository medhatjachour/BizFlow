/**
 * Personal work OS: the business rules behind the money and the deadlines.
 *
 * These rules are the plugin's promises to a solo operator, and every one of
 * them is stated in the UI as a fact, so a silent drift misleads the person who
 * has nobody else to catch it: the stage gate says files are safe to hand over,
 * the rate engine says what a project must cost, and the capacity reading says a
 * day is still free. The two regressions this file exists to prevent are the
 * ones that cost real money — a deposit counted as earned income that then gets
 * spent, and a `realHourlyRate` that flatters an unprofitable client — plus the
 * scope-creep quote that has to be produced *before* the extra work is done.
 *
 * `domain.ts` is deliberately free of Electron/Prisma imports, which is what
 * makes it directly testable here.
 */

import { describe, expect, it } from 'vitest'

import {
  PIPELINE_STAGES,
  auditSubscriptions,
  buildChangeRequestQuote,
  buildStandupSummary,
  canTransition,
  capacityReading,
  computeRateEngine,
  evaluateStageGate,
  isBlackoutDay,
  paymentContext,
  priceChangeRequest,
  priceQuote,
  realHourlyRate,
  retainerResetDate,
  retainerState,
  shiftDeadline,
  splitEscrow,
  stageIndex,
  stageMeta,
  subscriptionMonthlyCost,
  suggestStartDate
} from '../../plugins/personal/handlers/domain'

const RATE_PROFILE = {
  monthlyLivingCost: 2000,
  monthlyTaxes: 500,
  monthlySoftware: 200,
  monthlySavings: 300,
  monthlyOther: 100,
  targetBillableHoursPerWeek: 25,
  workingWeeksPerYear: 46,
  weeklyCapacityHours: 40,
  billableUtilisation: 0.7
}

describe('personal work OS stage gate', () => {
  it('keeps the pipeline in the order the client was promised', () => {
    expect(PIPELINE_STAGES.map((stage) => stage.id)).toEqual([
      'brief_approved',
      'deposit_received',
      'draft_staging',
      'feedback_locked',
      'final_payment_received',
      'assets_handed_over'
    ])
  })

  it('treats an unknown stage as the start of the pipeline', () => {
    expect(stageIndex('does_not_exist')).toBe(0)
    expect(stageIndex('draft_staging')).toBe(2)
    expect(stageMeta('does_not_exist').id).toBe('brief_approved')
    expect(stageMeta('assets_handed_over').label).toBe('Assets Handed Over')
  })

  it('only accepts transitions between known stages', () => {
    expect(canTransition('brief_approved', 'assets_handed_over')).toBe(true)
    expect(canTransition('assets_handed_over', 'feedback_locked')).toBe(true)
    expect(canTransition('brief_approved', 'ghost_stage')).toBe(false)
    expect(canTransition('ghost_stage', 'draft_staging')).toBe(false)
  })

  it('splits invoices and deposits out of the raw payment list', () => {
    const ctx = paymentContext(
      [1000, 500],
      [
        { amount: 500, isDeposit: true },
        { amount: 200 }
      ]
    )
    expect(ctx).toEqual({ totalDue: 1500, paid: 700, depositPaid: 500 })
  })

  it('never blocks the brief stage, even with nothing paid', () => {
    const gate = evaluateStageGate('brief_approved', { totalDue: 1000, paid: 0, depositPaid: 0 })
    expect(gate.blocked).toBe(false)
    expect(gate.requires).toBe('none')
    expect(gate.outstanding).toBe(1000)
  })

  it('blocks production until a deposit has actually landed', () => {
    const blocked = evaluateStageGate('draft_staging', { totalDue: 1000, paid: 0, depositPaid: 0 })
    expect(blocked.blocked).toBe(true)
    expect(blocked.requires).toBe('deposit')
    expect(blocked.reason).toBe('Production needs the deposit to be paid first.')

    const cleared = evaluateStageGate('draft_staging', { totalDue: 1000, paid: 500, depositPaid: 500 })
    expect(cleared.blocked).toBe(false)
    expect(cleared.outstanding).toBe(500)
  })

  it('locks the delivery files until the balance is settled', () => {
    const settled = evaluateStageGate('assets_handed_over', { totalDue: 2000, paid: 2000, depositPaid: 1000 })
    expect(settled.blocked).toBe(false)
    expect(settled.outstanding).toBe(0)

    const outstanding = evaluateStageGate('assets_handed_over', { totalDue: 2000, paid: 1900, depositPaid: 1000 })
    expect(outstanding.blocked).toBe(true)
    expect(outstanding.reason).toBe('Files stay locked until the balance is settled.')
    expect(outstanding.outstanding).toBe(100)
  })

  it('blocks on a one-cent residual but clears an exact zero', () => {
    // Rounding must not hand the assets over with a residue still owed.
    expect(evaluateStageGate('assets_handed_over', { totalDue: 1000, paid: 1000, depositPaid: 500 }).blocked).toBe(false)
    expect(evaluateStageGate('assets_handed_over', { totalDue: 1000, paid: 999.99, depositPaid: 500 }).blocked).toBe(true)
  })
})

describe('personal work OS change requests', () => {
  it('derives the timeline impact from the hours when no override is given', () => {
    expect(priceChangeRequest({ estimatedHours: 7, hourlyRate: 60 })).toEqual({
      extraCost: 420,
      extraDays: 2, // 7 h over the 6 h default working day
      effectiveHourlyRate: 60
    })
    expect(priceChangeRequest({ estimatedHours: 7, hourlyRate: 60, hoursPerDay: 8 }).extraDays).toBe(1)
    expect(priceChangeRequest({ estimatedHours: 6, hourlyRate: 60, hoursPerDay: 6 }).extraDays).toBe(1)
  })

  it('honours an explicit day count over the derived one', () => {
    const priced = priceChangeRequest({ estimatedHours: 10, hourlyRate: 50, extraDays: 3 })
    expect(priced.extraCost).toBe(500)
    expect(priced.extraDays).toBe(3)
  })

  it('never prices negative work', () => {
    const priced = priceChangeRequest({ estimatedHours: -4, hourlyRate: -50 })
    expect(priced.extraCost).toBe(0)
    expect(priced.extraDays).toBe(0)
    expect(priced.effectiveHourlyRate).toBe(0)
  })

  it('writes a quote that names the cost and the delay before work starts', () => {
    const quote = buildChangeRequestQuote({
      clientName: 'Acme',
      projectTitle: 'Spring campaign',
      title: 'Add a third logo direction',
      description: 'Two extra concepts plus one revision round.',
      estimatedHours: 7,
      hourlyRate: 60,
      extraCost: 420,
      extraDays: 2,
      currency: 'USD'
    })

    expect(quote).toContain('Hi Acme,')
    expect(quote).toContain('Spring campaign')
    expect(quote).toContain('Add a third logo direction')
    expect(quote).toContain('Two extra concepts plus one revision round.')
    expect(quote).toContain('Extra effort: 7 h @ USD 60/h')
    expect(quote).toContain('Extra cost: USD 420')
    expect(quote).toContain('Timeline impact: +2 working day(s)')
    expect(quote).toContain('Work on this item only starts once the change is approved.')
  })

  it('groups large amounts and drops the details line when none is given', () => {
    const quote = buildChangeRequestQuote({
      clientName: 'Acme',
      projectTitle: 'Retainer top-up',
      title: 'Extra sprint',
      description: null,
      estimatedHours: 250,
      hourlyRate: 50,
      extraCost: 12500,
      extraDays: 42
    })

    expect(quote).toContain('USD 12,500')
    expect(quote).not.toContain('Details:')
    // Default currency, not an empty label.
    expect(quote).toContain('USD 50/h')
  })
})

describe('personal work OS rate engineering', () => {
  it('prices the baseline off real operating costs and a real billable year', () => {
    const engine = computeRateEngine(RATE_PROFILE)
    expect(engine.monthlyTarget).toBe(3100)
    expect(engine.annualOperatingCost).toBe(37200)
    expect(engine.billableHoursPerYear).toBe(1150) // 25 h x 46 weeks
    expect(engine.baselineHourlyRate).toBe(32.35)
    expect(engine.dailyHoursTarget).toBe(5)
    expect(engine.monthlyHoursTarget).toBe(95.83)
  })

  it('puts the floor below the baseline by exactly the savings target', () => {
    const engine = computeRateEngine(RATE_PROFILE)
    // 2800/mo survival x 12 / 1150 h — the savings line is what separates them.
    expect(engine.annualSurvivalCost).toBe(33600)
    expect(engine.floorHourlyRate).toBe(29.22)
    expect(engine.floorHourlyRate).toBeLessThan(engine.baselineHourlyRate)
  })

  it('shows what only billing a realistic utilisation really costs', () => {
    const engine = computeRateEngine(RATE_PROFILE)
    // 37200 / (40 h x 46 weeks x 0.7) is the rate that still covers costs.
    expect(engine.utilisationHourlyRate).toBe(28.88)
    expect(engine.utilisationHourlyRate).toBeLessThan(engine.floorHourlyRate)
  })

  it('never lets the floor price sit below four hours of the baseline', () => {
    const engine = computeRateEngine(RATE_PROFILE)
    expect(engine.minimumProjectPrice).toBe(129.39)
    expect(computeRateEngine({ ...RATE_PROFILE, minimumProjectPrice: 900 }).minimumProjectPrice).toBe(900)
  })

  it('falls back to sane defaults for an empty profile', () => {
    const engine = computeRateEngine({})
    expect(engine.weeklyCapacityHours).toBe(40)
    expect(engine.maxClientHoursPerWeek).toBe(30)
    expect(engine.currency).toBe('USD')
    expect(engine.dailyHoursTarget).toBe(5)
    expect(engine.baselineHourlyRate).toBe(0)
  })

  it('recommends at least the baseline and the project minimum', () => {
    const engine = computeRateEngine(RATE_PROFILE)
    const quote = priceQuote(engine, 10)
    expect(quote.hours).toBe(10)
    expect(quote.atFloor).toBe(292.2)
    expect(quote.atBaseline).toBe(323.5)
    expect(quote.recommended).toBe(323.5)
    expect(quote.marginAtBaseline).toBe(31.3)

    // A client-supplied price wins when it is above the baseline.
    const high = priceQuote(engine, 10, 500)
    expect(high.recommended).toBe(500)
    expect(high.marginAtBaseline).toBe(207.8)

    // An insulting price is lifted to the floor project price.
    const low = priceQuote(engine, 1, 20)
    expect(low.recommended).toBe(129.39)
  })

  it('grades the real hourly rate against the baseline', () => {
    // 3000 received over 100 real hours == 30/h.
    expect(realHourlyRate(3000, 6000, 24)).toMatchObject({
      realHours: 100,
      realHourlyRate: 30,
      verdict: 'excellent'
    })
    expect(realHourlyRate(3000, 6000, 30).verdict).toBe('healthy')
    expect(realHourlyRate(3000, 6000, 35).verdict).toBe('thin')
    expect(realHourlyRate(3000, 6000, 50).verdict).toBe('loss')
  })

  it('does not invent a rate for zero tracked time', () => {
    const result = realHourlyRate(3000, 0, 30)
    expect(result.realHours).toBe(0)
    expect(result.realHourlyRate).toBe(0)
    expect(result.verdict).toBe('loss')
  })
})

describe('personal work OS subscriptions and retainers', () => {
  it('normalises every billing cycle to a monthly cost', () => {
    expect(subscriptionMonthlyCost(10, 'weekly')).toBe(43.3)
    expect(subscriptionMonthlyCost(30, 'quarterly')).toBe(10)
    expect(subscriptionMonthlyCost(120, 'yearly')).toBe(10)
    expect(subscriptionMonthlyCost(120, 'annual')).toBe(10)
    expect(subscriptionMonthlyCost(15, 'monthly')).toBe(15)
    // Unknown and empty cycles fall back to a flat monthly charge.
    expect(subscriptionMonthlyCost(15, 'biweekly')).toBe(15)
    expect(subscriptionMonthlyCost(15, '')).toBe(15)
  })

  it('audits the burn and flags what to cancel, ignoring cancelled tools', () => {
    const audit = auditSubscriptions([
      { id: 'a', name: 'Hosting', amount: 20, billingCycle: 'monthly', isActive: true, isEssential: true, usageLevel: 'daily' },
      { id: 'b', name: 'Midjourney', amount: 120, billingCycle: 'yearly', isActive: true, isEssential: false, usageLevel: 'rarely' },
      { id: 'c', name: 'Canva', amount: 30, billingCycle: 'quarterly', isActive: true, isEssential: false, usageLevel: 'daily' },
      { id: 'd', name: 'Adobe CC', amount: 10, billingCycle: 'monthly', isActive: true, isEssential: true, usageLevel: 'monthly' },
      { id: 'e', name: 'Dead tool', amount: 99, billingCycle: 'monthly', isActive: false, isEssential: false, usageLevel: 'rarely' }
    ])

    expect(audit.lines.map((line) => line.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(audit.lines[0]).toMatchObject({ monthlyCost: 20, annualCost: 240, verdict: 'keep' })
    expect(audit.lines[1].verdict).toBe('cancel')
    expect(audit.lines[2].verdict).toBe('review')
    // Essential but rarely used is a review, not a cancellation.
    expect(audit.lines[3].verdict).toBe('review')
    expect(audit.monthlyBurn).toBe(50)
    expect(audit.annualBurn).toBe(600)
    expect(audit.cancelCandidates.map((line) => line.id)).toEqual(['b', 'c', 'd'])
  })

  it('only rolls unused retainer hours over when the contract allows it', () => {
    const rollover = retainerState({ hoursIncluded: 15, hoursUsed: 10, rolloverEnabled: true, rolloverHours: 3 })
    expect(rollover.rolloverHours).toBe(3)
    expect(rollover.hoursAvailable).toBe(8)
    expect(rollover.usedPercent).toBe(55.56)
    expect(rollover.isOverspent).toBe(false)

    const noRollover = retainerState({ hoursIncluded: 15, hoursUsed: 10, rolloverEnabled: false, rolloverHours: 3 })
    expect(noRollover.rolloverHours).toBe(0)
    expect(noRollover.hoursAvailable).toBe(5)
    expect(noRollover.usedPercent).toBe(66.67)
  })

  it('flags an overspent retainer instead of hiding the overage', () => {
    const state = retainerState({ hoursIncluded: 10, hoursUsed: 12, rolloverEnabled: false, rolloverHours: 0 })
    expect(state.hoursAvailable).toBe(-2)
    expect(state.isOverspent).toBe(true)
    expect(state.usedPercent).toBe(120)
  })

  it('resets retainers on the first of the following month', () => {
    const reset = retainerResetDate(new Date(2026, 0, 15, 9, 30))
    expect([reset.getFullYear(), reset.getMonth(), reset.getDate()]).toEqual([2026, 1, 1])
    expect([reset.getHours(), reset.getMinutes()]).toEqual([0, 0])

    const yearEnd = retainerResetDate(new Date(2026, 11, 20))
    expect([yearEnd.getFullYear(), yearEnd.getMonth(), yearEnd.getDate()]).toEqual([2027, 0, 1])
  })
})

describe('personal work OS escrow', () => {
  const invoices = [
    { id: 'inv1', number: 'INV-1', kind: 'deposit', amount: 1000, status: 'paid', projectStage: 'draft_staging' },
    { id: 'inv2', number: 'INV-2', kind: 'balance', amount: 1000, status: 'paid', projectStage: 'final_payment_received' },
    { id: 'inv3', number: 'INV-3', kind: 'deposit', amount: 500, status: 'paid', projectStage: 'assets_handed_over' }
  ]
  const payments = [
    { invoiceId: 'inv1', amount: 1000, isDeposit: true },
    { invoiceId: 'inv2', amount: 400 },
    { invoiceId: 'inv3', amount: 500, isDeposit: true }
  ]

  it('holds a deposit back as unearned until the work is delivered', () => {
    const escrow = splitEscrow(invoices, payments)

    expect(escrow.lines[0]).toMatchObject({ paid: 1000, isDeposit: true, unearned: 1000, earned: 0 })
    expect(escrow.lines[1]).toMatchObject({ paid: 400, isDeposit: false, unearned: 0, earned: 400 })
    // A deposit on a delivered project is finally earned.
    expect(escrow.lines[2]).toMatchObject({ paid: 500, isDeposit: true, unearned: 0, earned: 500 })

    expect(escrow.cashReceived).toBe(1900)
    expect(escrow.unearnedRetainedCash).toBe(1000)
    expect(escrow.realizedIncome).toBe(900)
  })

  it('keeps realized income plus unearned cash equal to the cash received', () => {
    const escrow = splitEscrow(invoices, payments)
    expect(escrow.realizedIncome + escrow.unearnedRetainedCash).toBe(escrow.cashReceived)
  })

  it('treats a deposit with no linked stage as not yet delivered', () => {
    const escrow = splitEscrow([{ id: 'x', number: 'INV-9', kind: 'deposit', amount: 300, status: 'paid' }], [
      { invoiceId: 'x', amount: 300, isDeposit: true }
    ])
    expect(escrow.lines[0].unearned).toBe(300)
    expect(escrow.realizedIncome).toBe(0)
  })

  it('ignores payments that never arrived', () => {
    const escrow = splitEscrow(invoices, [{ invoiceId: 'inv1', amount: 250, isDeposit: true }])
    expect(escrow.lines[0]).toMatchObject({ paid: 250, unearned: 250, earned: 0 })
    expect(escrow.realizedIncome).toBe(0)
    expect(escrow.cashReceived).toBe(250)
  })
})

describe('personal work OS burnout defense', () => {
  it('turns amber at 85 % and red only past full capacity', () => {
    expect(capacityReading(400, 480).level).toBe('clear')
    expect(capacityReading(408, 480).level).toBe('amber')
    expect(capacityReading(480, 480).level).toBe('amber')
    expect(capacityReading(600, 480).level).toBe('red')
  })

  it('reports how far a day is overbooked', () => {
    expect(capacityReading(600, 480).overbookedMinutes).toBe(120)
    expect(capacityReading(400, 480).overbookedMinutes).toBe(0)
    expect(capacityReading(400, 480).usedPercent).toBe(83.33)
  })

  it('treats work on a day with no capacity left as overbooked', () => {
    const reading = capacityReading(60, 0)
    expect(reading.level).toBe('red')
    expect(reading.overbookedMinutes).toBe(60)

    // A genuinely empty day is not a red flag.
    expect(capacityReading(0, 0).level).toBe('clear')
    expect(capacityReading(-30, 480).usedPercent).toBe(0)
  })

  it('matches blackout days inclusively on both ends', () => {
    const blackouts = [{ startDate: new Date(2026, 5, 10), endDate: new Date(2026, 5, 15) }]
    expect(isBlackoutDay(new Date(2026, 5, 12), blackouts)).toBe(true)
    expect(isBlackoutDay(new Date(2026, 5, 10), blackouts)).toBe(true)
    expect(isBlackoutDay(new Date(2026, 5, 15), blackouts)).toBe(true)
    expect(isBlackoutDay(new Date(2026, 5, 9), blackouts)).toBe(false)
    expect(isBlackoutDay(new Date(2026, 5, 16), blackouts)).toBe(false)
    expect(isBlackoutDay(new Date(2026, 5, 12), [])).toBe(false)
  })

  it('suggests the first weekday that is neither blacked out nor full', () => {
    // 2026-01-01 is a Thursday, so the 3rd and 4th are the weekend.
    const blackouts = [{ startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 2) }]
    const booked = { '2026-01-05': 600 }

    const suggestion = suggestStartDate(new Date(2026, 0, 1), blackouts, booked, 480, 120)
    expect(suggestion).toBe('2026-01-06')
  })

  it('gives up rather than promising a date it cannot keep', () => {
    const blackouts = [{ startDate: new Date(2026, 0, 1), endDate: new Date(2026, 11, 31) }]
    expect(suggestStartDate(new Date(2026, 0, 1), blackouts, {}, 480, 120)).toBe('')
  })
})

describe('personal work OS client bottleneck', () => {
  it('returns nothing when there is no deadline to shift', () => {
    expect(shiftDeadline(null, new Date(2026, 0, 1), 5)).toBeNull()
  })

  it('pushes the delivery date by exactly the days the client cost', () => {
    const shifted = shiftDeadline(new Date(2026, 0, 10), new Date(2026, 0, 1), 5)
    expect(shifted?.getDate()).toBe(15)
    expect(shifted?.getMonth()).toBe(0)
  })

  it('refuses to pull a deadline inwards', () => {
    expect(shiftDeadline(new Date(2026, 0, 10), new Date(2026, 0, 1), -3)?.getDate()).toBe(10)
  })

  it('never returns a deadline that is already in the past', () => {
    const base = new Date(2026, 0, 1)
    const shifted = shiftDeadline(new Date(2025, 11, 1), base, 0)
    expect(shifted?.getTime()).toBe(base.getTime())
  })
})

describe('personal work OS standup summary', () => {
  it('writes a client-ready paragraph from the day log', () => {
    const summary = buildStandupSummary({
      day: 'Mon 2026-01-05',
      completed: ['Shipped the landing page', 'Sent invoice INV-12'],
      next: ['Draft three logo directions'],
      focusMinutes: 300,
      billableMinutes: 240
    })

    expect(summary).toBe(
      'Mon 2026-01-05 — completed: Shipped the landing page; Sent invoice INV-12. ' +
        'Tracked 5h of focus time (4h billable). ' +
        'Next up: Draft three logo directions.'
    )
  })

  it('still reads as a sentence on a day with nothing logged', () => {
    const summary = buildStandupSummary({
      day: 'Tue 2026-01-06',
      completed: [],
      next: [],
      focusMinutes: 0,
      billableMinutes: 0
    })

    expect(summary).toContain('no closed tasks logged')
    expect(summary).toContain('planning the next milestone')
    expect(summary).toContain('Tracked 0h of focus time (0h billable).')
  })
})
