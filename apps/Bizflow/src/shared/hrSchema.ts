/**
 * Additive schema sync for the HR module.
 *
 * The HR module has grown columns and tables since the first release
 * (`managerId`, the lifecycle dates, real payroll period dates, the document
 * renewal fields, `EmployeeChecklistItem`, `PayrollRun`). Packaged installs have
 * no `prisma db push`, so the app reconciles the database itself with idempotent
 * raw DDL on boot.
 *
 * That reconciliation started life inside the Electron main-process handler,
 * which meant anything *not* running Electron — the demo seed, and more
 * importantly its verifier — queried a database the app had never booted
 * against and failed with P2022 on a column that "should" exist. The DDL now
 * lives here so the app and the standalone scripts agree by construction.
 *
 * Every column added is nullable (or has a default) and every table is created
 * only when missing, so this is safe to run against an existing database, and
 * safe to run twice.
 */

import { decodePayrollPeriod } from './hrPayrollPeriod'

/** Minimal logging surface, so this works with electron-log and with console. */
export interface HrSchemaLogger {
  info(message: string): void
  warn(message: string, error?: unknown): void
}

const silent: HrSchemaLogger = { info: () => {}, warn: () => {} }

export async function ensureHrSchema(prisma: any, logger: HrSchemaLogger = silent): Promise<void> {
  try {
    const cols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("Employee")`)
    const present = new Set(cols.map((c: any) => c.name))

    const additive: Array<[string, string]> = [
      ['managerId', 'TEXT'],
      // Lifecycle columns, added alongside onboarding/offboarding.
      ['probationEndDate', 'DATETIME'],
      ['lastWorkingDate', 'DATETIME'],
      ['exitReason', 'TEXT'],
      ['rehireEligible', 'BOOLEAN'],
      ['exitInterviewNotes', 'TEXT'],
    ]

    for (const [name, type] of additive) {
      if (present.has(name)) continue
      await prisma.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "${name}" ${type}`)
      logger.info(`\u2705 Employee.${name} column added`)
    }

    // Payroll period dates. `month` is a packed integer that only the period
    // module can read, so everything doing date maths needs these instead.
    const payrollCols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("EmployeePayroll")`)
    const payrollPresent = new Set(payrollCols.map((c: any) => c.name))
    const payrollAdditive: Array<[string, string]> = [
      ['periodType', `TEXT NOT NULL DEFAULT 'monthly'`],
      ['periodKey', 'TEXT'],
      ['periodStart', 'DATETIME'],
      ['periodEnd', 'DATETIME'],
    ]
    for (const [name, type] of payrollAdditive) {
      if (payrollPresent.has(name)) continue
      await prisma.$executeRawUnsafe(`ALTER TABLE "EmployeePayroll" ADD COLUMN "${name}" ${type}`)
      logger.info(`\u2705 EmployeePayroll.${name} column added`)
    }

    // Backfill real dates for records written before those columns existed.
    // Uses the typed client rather than raw SQL so Prisma handles date binding.
    const unbackfilled = await prisma.employeePayroll.findMany({
      where: { periodStart: null },
      select: { id: true, month: true, year: true },
      take: 20000,
    })
    for (const row of unbackfilled) {
      const period = decodePayrollPeriod(row.month, row.year)
      await prisma.employeePayroll.update({
        where: { id: row.id },
        data: {
          periodType: period.periodType,
          periodKey: period.periodKey,
          periodStart: new Date(period.periodStart),
          periodEnd: new Date(period.periodEnd),
        },
      })
    }
    if (unbackfilled.length) {
      logger.info(`\u2705 Backfilled period dates for ${unbackfilled.length} payroll record(s)`)
    }

    // Document renewal tracking. Without these the module could only ever say
    // "a file exists", never "this certificate lapsed last month" — which is the
    // one thing an HR document register is actually for.
    const docCols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("EmployeeDocument")`)
    const docPresent = new Set(docCols.map((c: any) => c.name))
    const docAdditive: Array<[string, string]> = [
      ['reference', 'TEXT'],
      ['issuedAt', 'DATETIME'],
      ['expiresAt', 'DATETIME'],
    ]
    for (const [name, type] of docAdditive) {
      if (docPresent.has(name)) continue
      await prisma.$executeRawUnsafe(`ALTER TABLE "EmployeeDocument" ADD COLUMN "${name}" ${type}`)
      logger.info(`\u2705 EmployeeDocument.${name} column added`)
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EmployeeChecklistItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "employeeId" TEXT NOT NULL,
        "phase" TEXT NOT NULL DEFAULT 'onboarding',
        "title" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'other',
        "required" BOOLEAN NOT NULL DEFAULT 1,
        "dueDate" DATETIME,
        "completed" BOOLEAN NOT NULL DEFAULT 0,
        "completedAt" DATETIME,
        "completedBy" TEXT,
        "notes" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "EmployeeChecklistItem_employeeId_fkey"
          FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `)
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "EmployeeChecklistItem_employeeId_idx" ON "EmployeeChecklistItem"("employeeId")`
    )

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PayrollRun" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "year" INTEGER NOT NULL,
        "month" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "headcount" INTEGER NOT NULL DEFAULT 0,
        "grossTotal" REAL NOT NULL DEFAULT 0,
        "netTotal" REAL NOT NULL DEFAULT 0,
        "notes" TEXT,
        "createdBy" TEXT,
        "approvedBy" TEXT,
        "approvedAt" DATETIME,
        "lockedAt" DATETIME,
        "reopenedBy" TEXT,
        "reopenedAt" DATETIME,
        "reopenReason" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_year_month_key" ON "PayrollRun"("year", "month")`
    )
  } catch (err) {
    logger.warn('Employee table migration skipped:', err)
  }
}
