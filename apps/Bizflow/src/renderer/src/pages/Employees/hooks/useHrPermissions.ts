/**
 * One place that answers "who may see what" in HR.
 *
 * ## The gap this closes
 *
 * The salary field was **edited** behind `manage_staff` (`EmployeeForm`) but
 * **read** behind `view_finance` (`EmployeeHero`, `OverviewTab`, `EmployeeProfile`).
 * So a manager holding `manage_staff` without `view_finance` could open the form,
 * type a number into the salary field, save it — and then see "Restricted" where
 * that same number should be on the employee's page.
 *
 * A person must never be able to change a value they are not allowed to see.
 * Rather than widen the read gate to `view_finance` (which would hand individual
 * salaries to finance-only roles who have no business seeing them), the read gate
 * moves to match the write gate.
 *
 * ## The distinction that was missing
 *
 * There are two different questions here, and the module had been answering both
 * with one capability:
 *
 * | Question                                   | Capability      | Why |
 * |--------------------------------------------|-----------------|-----|
 * | What does *this person* earn?               | `manage_staff`  | It is a fact about a member of staff. Whoever administers staff data sees it. |
 * | What does the *whole payroll* cost us?      | `view_finance`  | An aggregate financial figure about the business. It belongs with finance. |
 *
 * Individual salary is deliberately **not** gated on `view_finance`: an HR
 * administrator who cannot see a salary cannot do their job. Conversely the
 * payroll-cost aggregate is deliberately **not** satisfied by `manage_staff`: a
 * manager does not need the company's total wage bill to manage their team.
 */

import { useMemo } from 'react'

import { useAuth } from '../../../contexts/AuthContext'

export interface HrPermissions {
  /** May create, edit and delete staff records — including a person's own salary. */
  canManageStaff: boolean
  /** May read one employee's salary, rate and payslips. Mirrors `canManageStaff`. */
  canSeeSalary: boolean
  /** May read salary **for one employee** in a form field. Alias of `canSeeSalary`. */
  canManageSalary: boolean
  /** May read payroll *costs and totals* across the business. */
  canSeePayrollCosts: boolean
  /** May read the individual payroll lines that make up a cost total. */
  canSeePayrollLines: boolean
  /** May approve leave, overtime and other staff requests. */
  canApproveRequests: boolean
}

export function useHrPermissions(): HrPermissions {
  const { can } = useAuth()

  return useMemo(() => {
    const canManageStaff = can('manage_staff')
    const canSeePayrollCosts = can('view_finance')

    return {
      canManageStaff,
      canSeeSalary: canManageStaff,
      canManageSalary: canManageStaff,
      canSeePayrollCosts,
      // Payslip lines are readable by whoever administers staff (they can already
      // edit the salary that produces them) OR by finance, who need the lines to
      // reconcile the cost totals. Deliberately an OR: narrowing this would take
      // the payroll tab away from finance users who have it today.
      canSeePayrollLines: canManageStaff || canSeePayrollCosts,
      canApproveRequests: canManageStaff,
    }
  }, [can])
}
