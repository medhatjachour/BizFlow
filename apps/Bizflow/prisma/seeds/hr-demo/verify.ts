/**
 * Verifies the HR demo data is actually usable.
 *
 * The seed is only worth having if it reaches the states the UI branches on. A
 * seed can "succeed" and still leave every alert empty — that is exactly the
 * failure this catches. Run it after the seed:
 *
 *   npm run prisma:seed:hr-demo:verify
 *
 * Exits non-zero on failure so it can be wired into CI later.
 */

import { PrismaClient } from '../../../src/generated/prisma'
import { hourlyRateFor, standardHoursFor } from '../../../src/shared/hrRate'
import { ensureHrSchema } from '../../../src/shared/hrSchema'

const prisma = new PrismaClient()

const DEMO_EMAILS = [
  'layla.manager@bizflow.demo',
  'ahmed.cashier@bizflow.demo',
  'sara.cashier@bizflow.demo',
  'omar.barista@bizflow.demo',
  'yusuf.warehouse@bizflow.demo',
  'mona.accountant@bizflow.demo',
  'tariq.newhire@bizflow.demo',
  'hana.alumni@bizflow.demo',
]

const DAY = 24 * 60 * 60 * 1000
const failures: string[] = []
const notes: string[] = []

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    notes.push(`  PASS  ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function main() {
  // The verifier runs outside Electron, so it applies the same additive DDL the
  // app applies on boot. Otherwise it would query columns that only exist after
  // someone has launched the app against this database once.
  await ensureHrSchema(prisma, console)

  const employees = await prisma.employee.findMany({
    where: { email: { in: DEMO_EMAILS } },
    include: {
      reports: { select: { id: true } },
      payrollRecords: true,
      leaveRecords: true,
      overtimeRecords: true,
      checklistItems: true,
      documents: true,
    },
  })

  // ── presence ───────────────────────────────────────────────────────────────
  check('all 8 demo employees exist', employees.length === 8, `found ${employees.length}`)
  if (employees.length === 0) {
    failures.push('nothing to verify — run the seed first')
    return
  }

  // ── salary-type coverage (the rate rule differs per type) ──────────────────
  const types = new Set(employees.map(e => e.salaryType))
  check(
    'every salary type is represented (monthly, hourly, daily, weekly)',
    ['monthly', 'hourly', 'daily', 'weekly'].every(t => types.has(t)),
    `have: ${Array.from(types).join(', ')}`
  )

  // The specific bug that was fixed: a daily-paid employee must not be priced
  // against 160 hours. Assert the *data* would expose it if it regressed.
  const daily = employees.find(e => e.salaryType === 'daily')
  if (daily) {
    const correct = hourlyRateFor(daily.salary, daily.salaryType)
    const wrong = daily.salary / standardHoursFor('monthly')
    check(
      `daily worker (${daily.name}) prices at salary/8, not salary/160`,
      correct !== wrong && Math.abs(correct - daily.salary / 8) < 1e-9,
      `salary/8=${correct}, salary/160=${wrong}`
    )
  } else {
    check('a daily-paid employee exists to exercise the rate bug', false)
  }

  // ── lifecycle / attention signals ──────────────────────────────────────────
  const now = Date.now()
  const within = (d: Date | null, days: number) =>
    !!d && d.getTime() > now && d.getTime() <= now + days * DAY

  check(
    'someone has probation ending within 30 days',
    employees.some(e => within(e.probationEndDate, 30))
  )
  check(
    'someone has a contract ending within 60 days',
    employees.some(e => within(e.contractEndDate, 60))
  )
  check(
    'someone has an ID / visa expiring within 60 days',
    employees.some(e => within(e.idExpiryDate, 60))
  )
  check(
    'someone is terminated, with an exit reason and last working day',
    employees.some(e => e.status === 'terminated' && !!e.exitReason && !!e.lastWorkingDate)
  )
  check('someone is on leave', employees.some(e => e.status === 'on-leave'))

  // ── org chart ──────────────────────────────────────────────────────────────
  check(
    'a manager has direct reports (org chart has something to draw)',
    employees.some(e => e.reports.length > 0)
  )
  // Anyone with no manager at all is a root of the org chart. There should be
  // exactly one, or the chart has a disconnected branch.
  const roots = employees.filter(e => !e.managerId)
  check(
    'exactly one employee sits at the top of the org chart',
    roots.length === 1,
    `${roots.length} with no manager: ${roots.map(o => o.name).join(', ') || 'none'}`
  )

  // ── approvals queue ────────────────────────────────────────────────────────
  const pendingLeave = await prisma.employeeLeave.count({
    where: { employeeId: { in: employees.map(e => e.id) }, status: 'pending' },
  })
  const pendingOt = await prisma.employeeOvertime.count({
    where: { employeeId: { in: employees.map(e => e.id) }, approved: false },
  })
  check('approvals inbox has pending leave', pendingLeave >= 2, `found ${pendingLeave}`)
  check('approvals inbox has pending overtime', pendingOt >= 2, `found ${pendingOt}`)

  // Both approved and rejected must exist, or the status branches are untested.
  const approvedLeave = await prisma.employeeLeave.count({
    where: { employeeId: { in: employees.map(e => e.id) }, status: 'approved' },
  })
  const rejectedLeave = await prisma.employeeLeave.count({
    where: { employeeId: { in: employees.map(e => e.id) }, status: 'rejected' },
  })
  check('approved leave exists', approvedLeave > 0, `found ${approvedLeave}`)
  check('rejected leave exists (proves the reject branch renders)', rejectedLeave > 0, `found ${rejectedLeave}`)

  // ── payroll ────────────────────────────────────────────────────────────────
  const paid = await prisma.employeePayroll.count({
    where: { employeeId: { in: employees.map(e => e.id) }, status: 'paid' },
  })
  const pending = await prisma.employeePayroll.count({
    where: { employeeId: { in: employees.map(e => e.id) }, status: 'pending' },
  })
  check('settled payroll records exist', paid > 0, `found ${paid}`)
  check('pending payroll records exist', pending > 0, `found ${pending}`)

  const runs = await prisma.payrollRun.count({ where: { status: 'draft' } })
  check('a draft payroll run exists to act on', runs > 0, `found ${runs}`)

  // Real period dates must be populated — the whole point of the earlier fix.
  const missingDates = await prisma.employeePayroll.count({
    where: {
      employeeId: { in: employees.map(e => e.id) },
      OR: [{ periodStart: null }, { periodEnd: null }, { periodKey: null }],
    },
  })
  check(
    'every payroll row has real period dates and a key',
    missingDates === 0,
    `${missingDates} row(s) missing periodStart/periodEnd/periodKey`
  )

  // Computed totals must be self-consistent, or the payslip maths is wrong.
  const rows = await prisma.employeePayroll.findMany({
    where: { employeeId: { in: employees.map(e => e.id) } },
  })
  const badNet = rows.filter(r => Math.abs(r.netPay - (r.grossPay - r.deductions)) > 0.01)
  check('netPay equals gross − deductions on every row', badNet.length === 0, `${badNet.length} inconsistent`)
  const badGross = rows.filter(
    r =>
      Math.abs(r.grossPay - (r.baseSalary + r.overtimePay + r.extraShiftPay + r.bonuses)) > 0.01
  )
  check('grossPay is the sum of its parts on every row', badGross.length === 0, `${badGross.length} inconsistent`)

  // The terminated employee's history has to remain readable.
  const terminated = employees.find(e => e.status === 'terminated')
  check(
    'terminated employee still has payslips (history stays readable)',
    !!terminated && terminated.payrollRecords.length > 0,
    terminated ? `${terminated.name} has ${terminated.payrollRecords.length}` : 'none terminated'
  )

  // ── checklists ─────────────────────────────────────────────────────────────
  const newHire = employees.find(e => e.email === 'tariq.newhire@bizflow.demo')
  const onboarding = newHire?.checklistItems.filter(i => i.phase === 'onboarding') ?? []
  const done = onboarding.filter(i => i.completed).length
  check(
    'new hire is mid-onboarding (partially complete, not finished)',
    onboarding.length > 0 && done > 0 && done < onboarding.length,
    `${done}/${onboarding.length} done`
  )

  // ── attendance ─────────────────────────────────────────────────────────────
  const recent = await prisma.employeeAttendance.count({
    where: { employeeId: { in: employees.map(e => e.id) }, date: { gte: new Date(now - 7 * DAY) } },
  })
  check('recent attendance exists (last 7 days)', recent > 0, `found ${recent}`)

  const statuses = new Set(
    (
      await prisma.employeeAttendance.findMany({
        where: { employeeId: { in: employees.map(e => e.id) } },
        select: { status: true },
        distinct: ['status'],
      })
    ).map(a => a.status)
  )
  check('more than one attendance status appears', statuses.size > 1, `have: ${Array.from(statuses).join(', ')}`)

  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId: { in: employees.map((e) => e.id) } },
    select: { id: true, reference: true, issuedAt: true, expiresAt: true },
  })
  check('documents exist for the documents tab', docs.length > 0, `found ${docs.length}`)
  check(
    'every document carries a reference and an issue date',
    docs.length > 0 && docs.every((d) => !!d.reference && !!d.issuedAt),
    `${docs.filter((d) => !d.reference || !d.issuedAt).length} incomplete`
  )
  // The documents tab renders a different badge per expiry state and the
  // attention panel counts them, so all four states have to be reachable.
  const expiredDocs = docs.filter((d) => !!d.expiresAt && d.expiresAt.getTime() < now)
  const soonDocs = docs.filter((d) => within(d.expiresAt, 30))
  const neverDocs = docs.filter((d) => !d.expiresAt)
  const validDocs = docs.filter((d) => !!d.expiresAt && d.expiresAt.getTime() > now + 30 * DAY)
  check('an already-expired document exists (red badge)', expiredDocs.length > 0, `found ${expiredDocs.length}`)
  check('a document expiring within 30 days exists (amber badge)', soonDocs.length > 0, `found ${soonDocs.length}`)
  check('a document that never expires exists (neutral badge)', neverDocs.length > 0, `found ${neverDocs.length}`)
  check('a long-valid document exists', validDocs.length > 0, `found ${validDocs.length}`)

  const logs = await prisma.employeeActivityLog.count({
    where: { employeeId: { in: employees.map(e => e.id) } },
  })
  check('activity log entries exist for the activity tab', logs > 0, `found ${logs}`)
}

main()
  .catch(err => {
    console.error('verification errored:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()

    console.log(notes.join('\n'))
    if (failures.length) {
      console.error(`\nFAILED ${failures.length} check(s):`)
      for (const f of failures) console.error(`  FAIL  ${f}`)
      process.exitCode = 1
    } else {
      console.log(`\nAll ${notes.length} checks passed — demo data exercises every UI state.`)
    }
  })
