/**
 * HR demo data.
 *
 * Exists so the employee module can actually be looked at: every alert, empty
 * state and badge in the UI is driven by a data condition, and most of them are
 * impossible to reach by hand. This creates the conditions deliberately —
 * probation about to end, a contract and an ID about to expire, an onboarding
 * that is not finished, payroll in two different states, approval queues with
 * something in them.
 *
 * Run with:  npm run prisma:seed:hr-demo
 *
 * Idempotent: it deletes the demo employees (cascading to all their records) and
 * recreates them, so running it twice does not double anything up. Real employees
 * are never touched — it only ever looks at the `@bizflow.demo` addresses below.
 */

import { PrismaClient } from '../../../src/generated/prisma'
import { ensureHrSchema } from '../../../src/shared/hrSchema'

const prisma = new PrismaClient()

// ─── helpers ──────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000
const today = new Date()
const utcMidnight = (d: Date) => {
  const copy = new Date(d)
  copy.setUTCHours(0, 0, 0, 0)
  return copy
}
const daysFromNow = (n: number) => utcMidnight(new Date(today.getTime() + n * DAY))
const daysAgo = (n: number) => daysFromNow(-n)

/** Is this a weekend? Used so attendance never records work on Sat/Sun. */
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6

/**
 * Packed period key for a monthly period.
 *
 * Mirrors `encodePayrollPeriodKey` in `src/shared/hrPayrollPeriod.ts`: for monthly
 * periods the packed `month` column is simply 1–12, and the real dates live in
 * `periodStart`/`periodEnd`. Note `periodEnd` is INCLUSIVE.
 */
function monthlyPeriod(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0)) // day 0 of next month = last day of this
  const pad = String(month).padStart(2, '0')
  return {
    month,
    year,
    periodType: 'monthly',
    periodKey: `${year}-${pad}`,
    periodStart: start,
    periodEnd: end,
  }
}

/** A plausible check-in/out pair, with occasional lateness. */
function attendanceTimes(status: string, date: Date) {
  if (status === 'absent' || status === 'leave') return { checkIn: null, checkOut: null }
  const late = status === 'late'
  const inH = late ? 9 : 8
  const inM = late ? 25 : 0
  const checkIn = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), inH, inM))
  const checkOut = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 17, 5))
  return { checkIn, checkOut }
}

// ─── the demo cast ────────────────────────────────────────────────────────────
//
// Chosen so that between them they exercise every branch in the module:
//   • a manager with several direct reports (org chart)
//   • probation ending in 12 days            (lifecycle banner)
//   • contract in 40 days + ID in 25 days    (expiry alerts)
//   • an hourly and a daily worker           (rate maths — the bug fixed earlier)
//   • a new hire mid-onboarding              (checklist progress)
//   • someone terminated 20 days ago         (offboarding, final payslip)
//   • pending leave and pending overtime     (approvals inbox)

interface DemoEmployee {
  email: string
  name: string
  role: string
  department: string
  phone: string
  salary: number
  salaryType: 'monthly' | 'hourly' | 'daily' | 'weekly'
  employmentType: string
  status: string
  hireDaysAgo: number
  performanceScore?: number
  bank?: boolean
  contractEndInDays?: number
  idExpiryInDays?: number
  probationEndInDays?: number
  terminatedDaysAgo?: number
  exitReason?: string
  lastWorkingDaysAgo?: number
  iban?: string
  /** Index into the created-employee array for the manager, resolved after insert. */
  reportsToEmail?: string
}

const DEMO: DemoEmployee[] = [
  {
    email: 'layla.manager@bizflow.demo',
    name: 'Layla Haddad',
    role: 'Store Manager',
    department: 'Operations',
    phone: '+961 3 111 001',
    salary: 9000,
    salaryType: 'monthly',
    employmentType: 'full-time',
    status: 'active',
    hireDaysAgo: 1400,
    performanceScore: 92,
    bank: true,
    iban: 'LB12 0000 0000 0000 0000 0001',
  },
  {
    email: 'ahmed.cashier@bizflow.demo',
    name: 'Ahmed Hassan',
    role: 'Cashier',
    department: 'Sales',
    phone: '+961 3 111 002',
    salary: 3200,
    salaryType: 'monthly',
    employmentType: 'full-time',
    status: 'active',
    hireDaysAgo: 78,
    performanceScore: 74,
    probationEndInDays: 12, // probation review is due — Lifecycle tab should flag it
    bank: true,
    iban: 'LB12 0000 0000 0000 0000 0002',
    reportsToEmail: 'layla.manager@bizflow.demo',
  },
  {
    email: 'sara.cashier@bizflow.demo',
    name: 'Sara Nasser',
    role: 'Cashier',
    department: 'Sales',
    phone: '+961 3 111 003',
    salary: 3100,
    salaryType: 'monthly',
    employmentType: 'contract',
    status: 'active',
    hireDaysAgo: 320,
    performanceScore: 88,
    contractEndInDays: 40, // renewal decision needed
    idExpiryInDays: 25, // visa / ID renewal needed
    reportsToEmail: 'layla.manager@bizflow.demo',
  },
  {
    email: 'omar.barista@bizflow.demo',
    name: 'Omar Khalid',
    role: 'Barista',
    department: 'Sales',
    phone: '+961 3 111 004',
    salary: 18,
    salaryType: 'hourly', // rate maths must not divide this by 160
    employmentType: 'part-time',
    status: 'active',
    hireDaysAgo: 210,
    performanceScore: 81,
    reportsToEmail: 'layla.manager@bizflow.demo',
  },
  {
    email: 'yusuf.warehouse@bizflow.demo',
    name: 'Yusuf Ali',
    role: 'Warehouse Lead',
    department: 'Operations',
    phone: '+961 3 111 005',
    salary: 140,
    salaryType: 'daily', // the case that was priced 20× wrong
    employmentType: 'full-time',
    status: 'active',
    hireDaysAgo: 900,
    performanceScore: 79,
    reportsToEmail: 'layla.manager@bizflow.demo',
  },
  {
    email: 'mona.accountant@bizflow.demo',
    name: 'Mona Farah',
    role: 'Accountant',
    department: 'Finance',
    phone: '+961 3 111 006',
    salary: 900,
    salaryType: 'weekly',
    employmentType: 'full-time',
    status: 'on-leave',
    hireDaysAgo: 640,
    performanceScore: 85,
    bank: true,
    iban: 'LB12 0000 0000 0000 0000 0006',
    reportsToEmail: 'layla.manager@bizflow.demo',
  },
  {
    email: 'tariq.newhire@bizflow.demo',
    name: 'Tariq Saleh',
    role: 'Sales Associate',
    department: 'Sales',
    phone: '+961 3 111 007',
    salary: 3000,
    salaryType: 'monthly',
    employmentType: 'full-time',
    status: 'active',
    hireDaysAgo: 5, // still onboarding
    reportsToEmail: 'layla.manager@bizflow.demo',
  },
  {
    email: 'hana.alumni@bizflow.demo',
    name: 'Hana Rami',
    role: 'Cashier',
    department: 'Sales',
    phone: '+961 3 111 008',
    salary: 3000,
    salaryType: 'monthly',
    employmentType: 'full-time',
    status: 'terminated',
    hireDaysAgo: 800,
    performanceScore: 68,
    terminatedDaysAgo: 20,
    lastWorkingDaysAgo: 21,
    exitReason: 'resignation',
    reportsToEmail: 'layla.manager@bizflow.demo',
  },
]

const DEMO_EMAILS = DEMO.map(e => e.email)

const DEFAULT_ONBOARDING_TASKS: { title: string; category: string }[] = [
  { title: 'Signed employment contract on file', category: 'documents' },
  { title: 'National ID / passport copied', category: 'documents' },
  { title: 'Bank details collected for salary transfer', category: 'payroll' },
  { title: 'System access and till login created', category: 'access' },
  { title: 'Uniform and locker issued', category: 'equipment' },
  { title: 'Health and safety briefing completed', category: 'compliance' },
]

// ─── the seed ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('HR demo seed — start')

  // The app reconciles additive HR columns on boot, but this script runs
  // standalone; without this the document expiry fields it writes would not
  // exist yet on a fresh database.
  await ensureHrSchema(prisma, console)

  // Remove any previous run. Cascades to attendance, payroll, leave, overtime,
  // shifts, documents, checklist items and activity logs.
  const removed = await prisma.employee.deleteMany({ where: { email: { in: DEMO_EMAILS } } })
  if (removed.count) console.log(`  cleared ${removed.count} previous demo employee(s)`)

  const idByEmail = new Map<string, string>()

  // Employees first (no managerId), so a manager can be referenced afterwards.
  for (const person of DEMO) {
    const created = await prisma.employee.create({
      data: {
        name: person.name,
        role: person.role,
        department: person.department,
        email: person.email,
        phone: person.phone,
        salary: person.salary,
        salaryType: person.salaryType,
        employmentType: person.employmentType,
        status: person.status,
        hireDate: daysAgo(person.hireDaysAgo),
        performanceScore: person.performanceScore ?? null,
        bankName: person.bank ? 'Demo Bank' : null,
        iban: person.iban ?? null,
        taxId: person.bank ? `TIN-${1000 + DEMO.indexOf(person)}` : null,
        socialInsuranceNo: person.bank ? `NSSF-${2000 + DEMO.indexOf(person)}` : null,
        contractEndDate:
          person.contractEndInDays != null ? daysFromNow(person.contractEndInDays) : null,
        idExpiryDate: person.idExpiryInDays != null ? daysFromNow(person.idExpiryInDays) : null,
        probationEndDate:
          person.probationEndInDays != null ? daysFromNow(person.probationEndInDays) : null,
        terminationDate:
          person.terminatedDaysAgo != null ? daysAgo(person.terminatedDaysAgo) : null,
        lastWorkingDate:
          person.lastWorkingDaysAgo != null ? daysAgo(person.lastWorkingDaysAgo) : null,
        exitReason: person.exitReason ?? null,
        rehireEligible: person.terminatedDaysAgo != null ? true : null,
        exitInterviewNotes:
          person.terminatedDaysAgo != null
            ? 'Left on good terms for a role closer to home. Eligible for rehire.'
            : null,
      },
    })
    idByEmail.set(person.email, created.id)
  }

  // Now wire the org chart.
  for (const person of DEMO) {
    if (!person.reportsToEmail) continue
    await prisma.employee.update({
      where: { id: idByEmail.get(person.email)! },
      data: { managerId: idByEmail.get(person.reportsToEmail)! },
    })
  }
  console.log(`  created ${DEMO.length} employees`)

  // ── attendance: last 60 days, weekdays only ────────────────────────────────
  let attendanceCount = 0
  for (const person of DEMO) {
    const employeeId = idByEmail.get(person.email)!
    if (person.status === 'terminated') continue // no attendance after they left

    for (let back = 60; back >= 0; back--) {
      const date = daysAgo(back)
      if (isWeekend(date)) continue

      // Weighted statuses: mostly present, a little lateness, the odd absence.
      const roll = Math.random()
      const status = roll < 0.82 ? 'present' : roll < 0.92 ? 'late' : roll < 0.97 ? 'absent' : 'leave'
      const { checkIn, checkOut } = attendanceTimes(status, date)

      await prisma.employeeAttendance.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: { employeeId, date, status, checkIn, checkOut },
        update: { status, checkIn, checkOut },
      })
      attendanceCount++
    }
  }
  console.log(`  recorded ${attendanceCount} attendance day(s)`)

  // ── leave ─────────────────────────────────────────────────────────────────
  const layla = idByEmail.get('layla.manager@bizflow.demo')!
  const ahmed = idByEmail.get('ahmed.cashier@bizflow.demo')!
  const omar = idByEmail.get('omar.barista@bizflow.demo')!
  const mona = idByEmail.get('mona.accountant@bizflow.demo')!
  const sara = idByEmail.get('sara.cashier@bizflow.demo')!
  const hana = idByEmail.get('hana.alumni@bizflow.demo')!

  await prisma.employeeLeave.createMany({
    data: [
      // Pending — should appear in the approvals inbox.
      { employeeId: ahmed, type: 'annual', startDate: daysFromNow(10), endDate: daysFromNow(14), days: 5, reason: 'Family trip', status: 'pending' },
      { employeeId: omar, type: 'sick', startDate: daysAgo(1), endDate: daysFromNow(1), days: 2, reason: 'Flu', status: 'pending' },
      // Approved — counts against the balance.
      { employeeId: sara, type: 'annual', startDate: daysAgo(30), endDate: daysAgo(26), days: 5, reason: 'Vacation', status: 'approved', approvedBy: layla, reviewedAt: daysAgo(40) },
      { employeeId: mona, type: 'annual', startDate: daysAgo(3), endDate: daysFromNow(4), days: 8, reason: 'Annual leave', status: 'approved', approvedBy: layla, reviewedAt: daysAgo(20) },
      // Rejected — proves the rejected branch renders.
      { employeeId: omar, type: 'unpaid', startDate: daysAgo(60), endDate: daysAgo(55), days: 6, reason: 'Personal', status: 'rejected', approvedBy: layla, reviewedAt: daysAgo(65) },
      // Historical, for the terminated employee.
      { employeeId: hana, type: 'annual', startDate: daysAgo(120), endDate: daysAgo(115), days: 5, reason: 'Vacation', status: 'approved', approvedBy: layla, reviewedAt: daysAgo(130) },
    ],
  })

  // ── overtime ──────────────────────────────────────────────────────────────
  await prisma.employeeOvertime.createMany({
    data: [
      { employeeId: ahmed, date: daysAgo(4), hours: 3, multiplier: 1.5, reason: 'Late stock count', approved: false },
      { employeeId: omar, date: daysAgo(6), hours: 4.5, multiplier: 1.5, reason: 'Weekend market', approved: false },
      { employeeId: sara, date: daysAgo(12), hours: 2, multiplier: 2, reason: 'Public holiday cover', approved: true, approvedBy: layla },
      { employeeId: ahmed, date: daysAgo(20), hours: 5, multiplier: 1.5, reason: 'Month-end inventory', approved: true, approvedBy: layla },
    ],
  })

  // ── shifts ────────────────────────────────────────────────────────────────
  const shiftRows: { employeeId: string; date: Date; shiftType: string; startTime: string; endTime: string; breakMins: number }[] = []
  const shiftPattern = [
    { shiftType: 'morning', startTime: '08:00', endTime: '16:00' },
    { shiftType: 'evening', startTime: '16:00', endTime: '00:00' },
    { shiftType: 'night', startTime: '00:00', endTime: '08:00' },
  ]
  // A plain index loop rather than `.entries()`: the ts-node config for these
  // scripts targets an older ES level, where array iterators are not iterable.
  const shiftEmployees = [ahmed, sara, omar, idByEmail.get('tariq.newhire@bizflow.demo')!]
  for (let idx = 0; idx < shiftEmployees.length; idx++) {
    const employeeId = shiftEmployees[idx]
    for (let fwd = 0; fwd < 8; fwd++) {
      const date = daysFromNow(fwd)
      if (isWeekend(date)) continue
      const pattern = shiftPattern[(idx + fwd) % shiftPattern.length]
      shiftRows.push({ employeeId, date, breakMins: 30, ...pattern })
    }
  }
  await prisma.employeeShift.createMany({ data: shiftRows })

  // ── documents ─────────────────────────────────────────────────────────────
  // Reference, issue date and expiry are what make a document register usable,
  // so the demo data carries them — including the two states the documents tab
  // and the attention panel branch on (already expired, expiring within 30 days)
  // and the "never expires" case, so all three badges render.
  await prisma.employeeDocument.createMany({
    data: DEMO.flatMap(person => {
      const employeeId = idByEmail.get(person.email)!
      const slug = person.email.split('@')[0]
      const issued = daysAgo(person.hireDaysAgo)
      return [
        {
          employeeId,
          title: 'Employment contract',
          type: 'contract',
          filename: `contract-${slug}.pdf`,
          reference: `CON-${slug.slice(0, 3).toUpperCase()}-${person.hireDaysAgo}`,
          issuedAt: issued,
          // Permanent staff have no contract end, so no renewal date either.
          expiresAt: person.contractEndInDays != null ? daysFromNow(person.contractEndInDays) : null,
        },
        {
          employeeId,
          title: 'National ID copy',
          type: 'id_copy',
          filename: `id-${slug}.jpg`,
          reference: `ID-${slug.slice(0, 3).toUpperCase()}-${person.hireDaysAgo}`,
          issuedAt: issued,
          expiresAt: person.idExpiryInDays != null ? daysFromNow(person.idExpiryInDays) : daysFromNow(900),
        },
      ]
    }),
  })

  // Extra certificates for the expiry branches. `-12` is already lapsed,
  // `+18` is inside the 30-day warning window, and `null` never expires.
  const certExtras: Array<{
    email: string
    title: string
    reference: string
    issuedDaysAgo: number
    expiresInDays: number | null
  }> = [
    { email: 'omar.barista@bizflow.demo', title: 'Food handling certificate', reference: 'CERT-FOOD-2291', issuedDaysAgo: 730, expiresInDays: -12 },
    { email: 'ahmed.cashier@bizflow.demo', title: 'First aid certificate', reference: 'CERT-FA-8842', issuedDaysAgo: 700, expiresInDays: 18 },
    { email: 'mona.accountant@bizflow.demo', title: 'Accounting practice licence', reference: 'CERT-ACC-5510', issuedDaysAgo: 400, expiresInDays: null },
    { email: 'sara.cashier@bizflow.demo', title: 'POS training certificate', reference: 'CERT-POS-7734', issuedDaysAgo: 120, expiresInDays: 240 },
  ]
  await prisma.employeeDocument.createMany({
    data: certExtras.map((extra) => ({
      employeeId: idByEmail.get(extra.email)!,
      title: extra.title,
      type: 'certificate',
      filename: `${extra.reference.toLowerCase()}.pdf`,
      reference: extra.reference,
      issuedAt: daysAgo(extra.issuedDaysAgo),
      expiresAt: extra.expiresInDays != null ? daysFromNow(extra.expiresInDays) : null,
    })),
  })

  // ── checklists ────────────────────────────────────────────────────────────
  // New hire: onboarding, deliberately unfinished so progress bars and the
  // "onboarding incomplete" attention signal have something to show.
  const tariq = idByEmail.get('tariq.newhire@bizflow.demo')!
  await prisma.employeeChecklistItem.createMany({
    data: DEFAULT_ONBOARDING_TASKS.map((task, i) => ({
      employeeId: tariq,
      phase: 'onboarding',
      title: task.title,
      category: task.category,
      required: true,
      sortOrder: i,
      completed: i < 2, // first two done
      completedAt: i < 2 ? daysAgo(4) : null,
      completedBy: i < 2 ? 'demo-seed' : null,
    })),
  })

  // Terminated employee: offboarding fully closed, so the "offboarding not
  // closed" signal stays quiet for them.
  await prisma.employeeChecklistItem.createMany({
    data: [
      { employeeId: hana, phase: 'offboarding', title: 'Return laptop and keys', category: 'equipment', required: true, sortOrder: 0, completed: true, completedAt: daysAgo(21), completedBy: 'demo-seed' },
      { employeeId: hana, phase: 'offboarding', title: 'Revoke till and system access', category: 'access', required: true, sortOrder: 1, completed: true, completedAt: daysAgo(21), completedBy: 'demo-seed' },
      { employeeId: hana, phase: 'offboarding', title: 'Final settlement calculated', category: 'payroll', required: true, sortOrder: 2, completed: true, completedAt: daysAgo(20), completedBy: 'demo-seed' },
      { employeeId: hana, phase: 'offboarding', title: 'Exit interview recorded', category: 'handover', required: false, sortOrder: 3, completed: true, completedAt: daysAgo(20), completedBy: 'demo-seed' },
    ],
  })

  // ── payroll: last month paid, this month mostly pending ───────────────────
  const now = new Date()
  const thisYear = now.getUTCFullYear()
  const thisMonth = now.getUTCMonth() + 1
  const prevMonthDate = new Date(Date.UTC(thisYear, thisMonth - 2, 1))
  const prevPeriod = monthlyPeriod(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth() + 1)

  let payrollCount = 0
  for (const person of DEMO) {
    const employeeId = idByEmail.get(person.email)!

    // Previous month — settled.
    const prevBase = person.salaryType === 'monthly' ? person.salary : person.salary * 4
    const prevOt = person.salaryType === 'monthly' ? 0 : 120
    const prevGross = prevBase + prevOt
    await prisma.employeePayroll.upsert({
      where: { employeeId_month_year: { employeeId, month: prevPeriod.month, year: prevPeriod.year } },
      create: {
        employeeId,
        ...prevPeriod,
        baseSalary: prevBase,
        regularHours: 160,
        overtimeHours: person.salaryType === 'monthly' ? 0 : 8,
        overtimePay: prevOt,
        grossPay: prevGross,
        deductions: Math.round(prevGross * 0.05),
        netPay: prevGross - Math.round(prevGross * 0.05),
        status: 'paid',
        paidDate: prevPeriod.periodEnd,
        notes: 'Demo seed — settled period',
      },
      update: {},
    })
    payrollCount++

    // This month — pending, except the manager whose salary already went out.
    if (person.status !== 'terminated') {
      const base = person.salaryType === 'monthly' ? person.salary : person.salary * 4
      const isPaid = person.email === 'layla.manager@bizflow.demo'
      const cur = monthlyPeriod(thisYear, thisMonth)
      await prisma.employeePayroll.upsert({
        where: { employeeId_month_year: { employeeId, month: cur.month, year: cur.year } },
        create: {
          employeeId,
          ...cur,
          baseSalary: base,
          regularHours: 160,
          overtimeHours: 0,
          overtimePay: 0,
          grossPay: base,
          deductions: 0,
          netPay: base,
          status: isPaid ? 'paid' : 'pending',
          paidDate: isPaid ? daysAgo(2) : null,
          notes: 'Demo seed — current period',
        },
        update: {},
      })
      payrollCount++
    }
  }
  console.log(`  created ${payrollCount} payroll record(s)`)

  // A payroll run for the settled period, left in draft so the run controls have
  // something real to act on.
  await prisma.payrollRun.upsert({
    where: { year_month: { year: prevPeriod.year, month: prevPeriod.month } },
    create: {
      year: prevPeriod.year,
      month: prevPeriod.month,
      status: 'draft',
      headcount: DEMO.length,
      grossTotal: 0,
      netTotal: 0,
      notes: 'Demo seed — draft run, safe to approve',
    },
    update: {},
  })

  // ── activity log ──────────────────────────────────────────────────────────
  await prisma.employeeActivityLog.createMany({
    data: [
      { employeeId: layla, action: 'employee_created', details: 'Added by demo seed', performedBy: 'demo-seed', createdAt: daysAgo(1400) },
      { employeeId: ahmed, action: 'profile_updated', details: 'salary: 3000 → 3200; phone: (unset) → +961 3 111 002', performedBy: 'demo-seed', createdAt: daysAgo(30) },
      { employeeId: ahmed, action: 'checked_in', details: 'Checked in at 08:02', performedBy: 'demo-seed', createdAt: daysAgo(1) },
      { employeeId: sara, action: 'leave_requested', details: 'annual leave · 5 day(s)', performedBy: 'demo-seed', createdAt: daysAgo(40) },
      { employeeId: tariq, action: 'checklist_item_added', details: 'Added 6 onboarding task(s)', performedBy: 'demo-seed', createdAt: daysAgo(5) },
      { employeeId: hana, action: 'offboarding_completed', details: 'Offboarding closed, final settlement paid', performedBy: 'demo-seed', createdAt: daysAgo(20) },
    ],
  })

  // ── summary ───────────────────────────────────────────────────────────────
  const [employees, attendance, leave, overtime, shifts, docs, checklist, payroll] =
    await Promise.all([
      prisma.employee.count({ where: { email: { in: DEMO_EMAILS } } }),
      prisma.employeeAttendance.count(),
      prisma.employeeLeave.count(),
      prisma.employeeOvertime.count(),
      prisma.employeeShift.count(),
      prisma.employeeDocument.count(),
      prisma.employeeChecklistItem.count(),
      prisma.employeePayroll.count(),
    ])

  console.log('HR demo seed — done')
  console.table({
    employees,
    attendance,
    leave,
    overtime,
    shifts,
    documents: docs,
    checklistItems: checklist,
    payrollRecords: payroll,
  })
  console.log('\nWhat to look at in the app:')
  console.log('  • Employees → HR attention panel: probation, expiry, approvals')
  console.log('  • Approvals tab: 2 pending leave, 2 pending overtime')
  console.log('  • Ahmed Hassan → Lifecycle: probation ending in 12 days')
  console.log('  • Sara Nasser: contract 40d, ID 25d warnings on her profile')
  console.log('  • Yusuf Ali (daily) and Omar Khalid (hourly): check overtime pricing')
  console.log('  • Tariq Saleh → Lifecycle: onboarding 2 of 6 done')
  console.log('  • Hana Rami: terminated, offboarding complete, payslips still readable')
  console.log('  • Payroll tab: last month draft run, this month pending')
}

main()
  .catch(err => {
    console.error('HR demo seed failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
