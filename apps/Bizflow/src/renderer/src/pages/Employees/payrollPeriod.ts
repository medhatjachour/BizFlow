/**
 * Payroll period helpers.
 *
 * The implementation lives in `src/shared/hrPayrollPeriod.ts`, because the main
 * process needs it too: a payroll record is keyed by a packed integer `month`
 * that only the period module can read, and while that decoder lived here in the
 * renderer the main process could not turn a period into real dates — which is
 * why weekly and daily payroll silently never matched its approved overtime.
 *
 * This module stays as the renderer's entry point so existing imports keep
 * working, and so there is one obvious place to look for period logic.
 */

export type { PayrollPeriodType, ResolvedPeriod } from '../../../../shared/hrPayrollPeriod'

export {
  encodePayrollPeriodKey,
  describePayrollPeriod,
  decodePayrollPeriod,
  periodTypeOf,
  periodRangeOf,
  periodsOverlap,
  resolvePayrollPeriod,
  isoWeekStart,
  calendarMonthSpan,
} from '../../../../shared/hrPayrollPeriod'

