import { describe, it, expect } from 'vitest'

import {
  PAYROLL_RUN_TRANSITIONS,
  canEditPeriod,
  isPeriodFrozen,
  isRunActionAvailable,
  nextRunStatus,
  normalizeRunStatus,
  runStatusKey,
  type PayrollRunAction,
  type PayrollRunStatus,
} from '../../shared/hrPayrollRun'
import { translations } from '../../renderer/src/i18n/translations'

/**
 * This rule is shared by the main process (which enforces it) and the payroll
 * screen (which decides which buttons to offer). If the two ever disagree the
 * symptom is either a button that always fails, or — far worse — a period that
 * was closed still accepting changes to somebody's pay.
 */

const STATUSES: PayrollRunStatus[] = ['draft', 'approved', 'paid', 'locked']
const ACTIONS: PayrollRunAction[] = ['approve', 'markPaid', 'lock', 'reopen']

describe('period editability', () => {
  it('treats only a draft, or no run at all, as editable', () => {
    expect(canEditPeriod('draft')).toBe(true)
    // No run has ever been opened: every period that predates this feature.
    expect(canEditPeriod(null)).toBe(true)
    expect(canEditPeriod(undefined)).toBe(true)

    expect(canEditPeriod('approved')).toBe(false)
    expect(canEditPeriod('paid')).toBe(false)
    expect(canEditPeriod('locked')).toBe(false)
  })

  it('keeps "editable" and "frozen" as exact opposites for every status', () => {
    for (const status of STATUSES) {
      expect(isPeriodFrozen(status)).toBe(!canEditPeriod(status))
    }
  })

  it('fails safe on a status it does not recognise', () => {
    // Anything unexpected is read as a draft, which is the pre-feature default.
    expect(normalizeRunStatus('something-else')).toBe('draft')
    expect(normalizeRunStatus(42)).toBe('draft')
    expect(canEditPeriod('APPROVED')).toBe(true)
  })
})

describe('transitions', () => {
  it('approves only from a draft', () => {
    expect(nextRunStatus('draft', 'approve')).toBe('approved')
    expect(nextRunStatus('approved', 'approve')).toBeNull()
    expect(nextRunStatus('paid', 'approve')).toBeNull()
    expect(nextRunStatus('locked', 'approve')).toBeNull()
  })

  it('refuses to pay a period nobody approved', () => {
    expect(nextRunStatus('draft', 'markPaid')).toBeNull()
  })

  it('pays an approved period, and treats a second press as a no-op rather than an error', () => {
    expect(nextRunStatus('approved', 'markPaid')).toBe('paid')
    expect(nextRunStatus('paid', 'markPaid')).toBeNull()
  })

  it('locks only a paid period', () => {
    expect(nextRunStatus('paid', 'lock')).toBe('locked')
    expect(nextRunStatus('approved', 'lock')).toBeNull()
    expect(nextRunStatus('draft', 'lock')).toBeNull()
  })

  it('reopens anything that was closed, and not a draft', () => {
    expect(nextRunStatus('approved', 'reopen')).toBe('draft')
    expect(nextRunStatus('paid', 'reopen')).toBe('draft')
    expect(nextRunStatus('locked', 'reopen')).toBe('draft')
    expect(nextRunStatus('draft', 'reopen')).toBeNull()
  })

  it('never returns a status that is not editable after a reopen', () => {
    for (const status of ['approved', 'paid', 'locked'] as PayrollRunStatus[]) {
      expect(canEditPeriod(nextRunStatus(status, 'reopen'))).toBe(true)
    }
  })

  it('keeps every transition target editable-free except reopen', () => {
    // Guards against a future action that lands on a frozen state by accident.
    for (const action of ACTIONS) {
      const target = PAYROLL_RUN_TRANSITIONS[action].to
      if (action === 'reopen') expect(canEditPeriod(target)).toBe(true)
      else expect(canEditPeriod(target)).toBe(false)
    }
  })
})

describe('isRunActionAvailable', () => {
  it('offers exactly the actions the status allows', () => {
    expect(isRunActionAvailable('draft', 'approve')).toBe(true)
    expect(isRunActionAvailable('draft', 'markPaid')).toBe(false)
    expect(isRunActionAvailable('draft', 'lock')).toBe(false)
    expect(isRunActionAvailable('draft', 'reopen')).toBe(false)

    expect(isRunActionAvailable('approved', 'approve')).toBe(false)
    expect(isRunActionAvailable('approved', 'markPaid')).toBe(true)
    expect(isRunActionAvailable('approved', 'reopen')).toBe(true)

    expect(isRunActionAvailable('paid', 'lock')).toBe(true)
    expect(isRunActionAvailable('paid', 'reopen')).toBe(true)

    expect(isRunActionAvailable('locked', 'lock')).toBe(false)
    expect(isRunActionAvailable('locked', 'reopen')).toBe(true)
  })

  it('agrees with nextRunStatus wherever the target actually differs', () => {
    for (const status of STATUSES) {
      for (const action of ACTIONS) {
        const available = isRunActionAvailable(status, action)
        const next = nextRunStatus(status, action)
        if (next !== null) expect(available).toBe(true)
        if (!available) expect(next).toBeNull()
      }
    }
  })

  it('treats a period with no run as a draft', () => {
    expect(isRunActionAvailable(null, 'approve')).toBe(true)
    expect(isRunActionAvailable(undefined, 'approve')).toBe(true)
    expect(isRunActionAvailable(null, 'reopen')).toBe(false)
  })
})

describe('runStatusKey', () => {
  it('gives every status its own key', () => {
    const keys = STATUSES.map(runStatusKey)
    expect(new Set(keys).size).toBe(STATUSES.length)
  })

  it('treats an unknown status as a draft', () => {
    expect(runStatusKey(null)).toBe(runStatusKey('draft'))
    expect(runStatusKey('nonsense')).toBe(runStatusKey('draft'))
  })
})

/**
 * The shared module has no language context, so it hands out translation *keys*.
 * `t()` falls back to rendering the raw key when it is missing, which turns a typo
 * into the literal text "empRunStatusDraft" on screen. These tests are the only
 * thing standing between a rename and that.
 */
describe('translation keys resolve in both languages', () => {
  const referenced = [
    ...ACTIONS.flatMap((a) => [
      PAYROLL_RUN_TRANSITIONS[a].labelKey,
      PAYROLL_RUN_TRANSITIONS[a].hintKey,
    ]),
    ...STATUSES.map(runStatusKey),
    'empRunWorking',
  ]

  it.each(referenced)('%s is defined in English and Arabic', (key) => {
    expect(translations.en[key as keyof typeof translations.en]).toBeTruthy()
    expect(translations.ar[key as keyof typeof translations.ar]).toBeTruthy()
  })

  it('does not duplicate a key between the two transition tables', () => {
    const keys = ACTIONS.map((a) => PAYROLL_RUN_TRANSITIONS[a].labelKey)
    expect(new Set(keys).size).toBe(ACTIONS.length)
  })
})
