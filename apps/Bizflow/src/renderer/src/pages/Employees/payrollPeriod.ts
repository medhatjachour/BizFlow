/**
 * Backwards-compatible shim — payroll period helpers now live in `./utils`.
 * Keep this file until all imports point at `./utils`.
 */
export {
  encodePayrollPeriodKey,
  describePayrollPeriod,
  getWeekNumber,
  getWeekLabel,
  type PayrollPeriodType,
} from './utils'
