/**
 * Pay-rate maths, shared by the main process and the renderer.
 *
 * ## Why this file exists
 *
 * The main process stored overtime at `salary / 160` for everyone. The employee
 * profile modal previewed it with its own copy of the rule:
 *
 * ```ts
 * const hourlyRate = salaryType === 'hourly' ? salary
 *   : salaryType === 'weekly' ? salary / 40
 *   : salary / 160            // ← daily staff land here, and are 20× wrong
 * ```
 *
 * For a **daily**-paid employee the profile therefore advertised an overtime rate
 * twenty times lower than the one actually written to the payroll record. Nobody
 * notices that from either screen alone, because each screen is internally
 * consistent — which is exactly why the rule belongs in one shared module rather
 * than being restated wherever it is needed.
 *
 * `standardHoursFor` is the single definition. Anywhere that prices an hour must
 * call it (or `hourlyRateFor`) instead of writing the division out again.
 *
 * **A caveat worth stating plainly:** the divisor for monthly staff (160) is a
 * business convention — 40 hours × 4 weeks — not a legal formula. It does not
 * account for the actual number of working days in the month, so a month with 22
 * working days (176 hours) pays overtime at a slightly higher implied hourly rate
 * than the true one. It is applied consistently, which is what matters for
 * reconciliation, but it is a simplification rather than a payroll standard.
 */

/** Hours a pay period is spread over, per salary type. */
export function standardHoursFor(salaryType: string): number {
  // Normalised to lower case because the stored value's casing is not guaranteed
  // (the main process lower-cased, the renderer did not, so `'Monthly'` priced
  // differently depending on which screen asked).
  switch (String(salaryType).toLowerCase()) {
    case 'hourly':
      return 1
    case 'daily':
      return 8
    case 'weekly':
      return 40
    case 'monthly':
      return 160
    // An unrecognised salary type must not silently become an hourly rate, which
    // is what returning 1 would do. 160 keeps the figure conservative.
    default:
      return 160
  }
}

/** What one hour of this employee's time costs. */
export function hourlyRateFor(salary: number | null | undefined, salaryType: string): number {
  const base = Number(salary) || 0
  if (base <= 0) return 0
  return base / standardHoursFor(salaryType)
}

/**
 * Overtime pay for a given number of hours.
 *
 * `multiplier` is the contract's overtime uplift (1.25, 1.5, 2…). It defaults to
 * 1 so a caller that has not asked the user for one does not invent a premium.
 */
export function overtimePayFor(
  salary: number | null | undefined,
  salaryType: string,
  hours: number,
  multiplier = 1
): number {
  const safeHours = Number.isFinite(Number(hours)) ? Number(hours) : 0
  const safeMultiplier = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1
  return hourlyRateFor(salary, salaryType) * safeHours * safeMultiplier
}

/** Short suffix for a salary figure: `/"hr"`, `/"day"`, `/"wk"`, `/"mo"`. */
export function salaryPeriodSuffix(salaryType: string): string {
  switch (salaryType) {
    case 'hourly':
      return 'hr'
    case 'daily':
      return 'day'
    case 'weekly':
      return 'wk'
    default:
      return 'mo'
  }
}
