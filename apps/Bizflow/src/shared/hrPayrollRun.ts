/**
 * Payroll run state machine.
 *
 * One definition, used by the main process to validate a transition *and* by the
 * UI to decide which buttons to show. Two copies of this rule would drift, and
 * the failure mode is bad in both directions: a button that always fails, or a
 * closed period that still accepts edits.
 *
 * Lifecycle:
 *   draft ──approve──> approved ──markPaid──> paid ──lock──> locked
 *     ^                    │            │            │
 *     └────────reopen──────┴────────────┴────────────┘
 *
 * Only `draft` is editable. Everything after that is a record of something that
 * happened, and a payslip an employee has already been given must not change.
 */

export type PayrollRunStatus = 'draft' | 'approved' | 'paid' | 'locked'

export type PayrollRunAction = 'approve' | 'markPaid' | 'lock' | 'reopen'

interface Transition {
  /** Statuses this action is allowed from. */
  from: PayrollRunStatus[]
  to: PayrollRunStatus
  /**
   * Translation keys, not English.
   *
   * This module is shared with the main process, which has no language context, so
   * it must stay language-neutral. The renderer resolves these through `t()`.
   */
  labelKey: string
  hintKey: string
}

export const PAYROLL_RUN_TRANSITIONS: Record<PayrollRunAction, Transition> = {
  approve: {
    from: ['draft'],
    to: 'approved',
    labelKey: 'empRunActionApprove',
    hintKey: 'empRunHintApprove',
  },
  markPaid: {
    from: ['approved', 'paid'],
    // Idempotent on purpose: pressing it twice must not be an error.
    to: 'paid',
    labelKey: 'empRunActionMarkPaid',
    hintKey: 'empRunHintMarkPaid',
  },
  lock: {
    from: ['paid'],
    to: 'locked',
    labelKey: 'empRunActionLock',
    hintKey: 'empRunHintLock',
  },
  reopen: {
    from: ['approved', 'paid', 'locked'],
    to: 'draft',
    labelKey: 'empRunActionReopen',
    hintKey: 'empRunHintReopen',
  },
}

/** Anything unrecognised is treated as a draft, which is the safe default. */
export function normalizeRunStatus(value: unknown): PayrollRunStatus {
  return value === 'approved' || value === 'paid' || value === 'locked' ? value : 'draft'
}

/**
 * The status this action would produce, or null when it is not allowed now.
 * `null` also covers "already in that state" for idempotent actions.
 */
export function nextRunStatus(current: unknown, action: PayrollRunAction): PayrollRunStatus | null {
  const status = normalizeRunStatus(current)
  const transition = PAYROLL_RUN_TRANSITIONS[action]
  if (!transition.from.includes(status)) return null
  if (transition.to === status) return null
  return transition.to
}

/** Can this action be offered at all, given the status? */
export function isRunActionAvailable(current: unknown, action: PayrollRunAction): boolean {
  const status = normalizeRunStatus(current)
  return PAYROLL_RUN_TRANSITIONS[action].from.includes(status)
}

/**
 * May the payslips in this period be changed?
 *
 * A period with no run has never been closed, so it stays editable — that is the
 * case for every period that existed before runs were introduced.
 */
export function canEditPeriod(status: unknown): boolean {
  return normalizeRunStatus(status) === 'draft'
}

/** True once the period is frozen, i.e. a run exists and is past draft. */
export function isPeriodFrozen(status: unknown): boolean {
  return !canEditPeriod(status)
}

/** Human-facing description of what a status means for the records inside it. */
export function runStatusKey(status: unknown): string {
  switch (normalizeRunStatus(status)) {
    case 'approved': return 'empRunStatusApproved'
    case 'paid':     return 'empRunStatusPaid'
    case 'locked':   return 'empRunStatusLocked'
    default:         return 'empRunStatusDraft'
  }
}
