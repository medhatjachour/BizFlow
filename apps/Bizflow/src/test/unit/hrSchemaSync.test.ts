/**
 * Additive HR schema sync.
 *
 * Packaged installs have no `prisma db push`, so the app adds the columns and
 * tables the HR module grew with idempotent raw DDL on boot. That DDL used to
 * live inside the Electron main-process handler, which meant the demo seed and
 * its verifier — neither of which runs Electron — queried a database the app had
 * never booted against, and failed with P2022 on a column that "should" exist.
 *
 * The fix was to move the DDL into `shared/hrSchema.ts` and have all three call
 * it. This test pins that arrangement down, because the failure mode is silent:
 * a second copy of the DDL drifts, the app keeps working, and only the scripts
 * that run outside Electron break.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ensureHrSchema } from '../../shared/hrSchema'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = join(here, '..', '..', '..')

const read = (relativePath: string) => readFileSync(join(appRoot, relativePath), 'utf8')

const HANDLER = 'src/main/ipc/handlers/employees.handlers.ts'
const SCHEMA = 'src/shared/hrSchema.ts'
const SEED = 'prisma/seeds/hr-demo/seed.ts'
const VERIFY = 'prisma/seeds/hr-demo/verify.ts'

/** Minimal Prisma double: records the DDL it is asked to run. */
function fakePrisma(present: { employee?: string[]; payroll?: string[]; document?: string[] } = {}) {
  const executed: string[] = []
  const updated: any[] = []
  const backfill: any[] = []
  return {
    executed,
    updated,
    setBackfill(rows: any[]) {
      backfill.length = 0
      backfill.push(...rows)
    },
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('"EmployeePayroll"')) return (present.payroll ?? []).map((name) => ({ name }))
      if (sql.includes('"EmployeeDocument"')) return (present.document ?? []).map((name) => ({ name }))
      return (present.employee ?? []).map((name) => ({ name }))
    },
    $executeRawUnsafe: async (sql: string) => {
      executed.push(sql)
      return 0
    },
    employeePayroll: {
      findMany: async () => backfill,
      update: async (args: any) => {
        updated.push(args)
        return args
      },
    },
  }
}

const alterTargets = (statements: string[]) =>
  statements.filter((s) => s.startsWith('ALTER TABLE')).map((s) => /ADD COLUMN "([^"]+)"/.exec(s)![1])

describe('HR schema sync', () => {
  it('lives in exactly one module, and every entry point calls it', () => {
    expect(read(SCHEMA)).toContain('export async function ensureHrSchema')

    // Three callers: the app on boot, the seed, and the verifier. If a fourth
    // copy of the DDL ever appears, the app and the scripts can disagree about
    // what a database needs.
    for (const file of [HANDLER, SEED, VERIFY]) {
      const source = read(file)
      expect(source, `${file} must import the shared sync`).toMatch(
        /import \{ ensureHrSchema \} from '[^']*shared\/hrSchema'/
      )
      expect(source, `${file} must call the shared sync`).toContain('ensureHrSchema(prisma')
      expect(source, `${file} must not carry its own DDL`).not.toContain('ALTER TABLE "EmployeeDocument"')
    }
  })

  it('adds every post-release column when the database predates the module', async () => {
    const prisma = fakePrisma()
    await ensureHrSchema(prisma)

    expect(alterTargets(prisma.executed)).toEqual([
      'managerId',
      'probationEndDate',
      'lastWorkingDate',
      'exitReason',
      'rehireEligible',
      'exitInterviewNotes',
      'periodType',
      'periodKey',
      'periodStart',
      'periodEnd',
      'reference',
      'issuedAt',
      'expiresAt',
    ])
    // The renewal fields are the ones the verifier tripped over, so assert the
    // table they belong to explicitly rather than trusting the ordering above.
    const docAlter = prisma.executed.find((s) => s.includes('"EmployeeDocument"') && s.includes('"reference"'))
    expect(docAlter).toBe('ALTER TABLE "EmployeeDocument" ADD COLUMN "reference" TEXT')
  })

  it('is idempotent — a migrated database gets no ALTER statements', async () => {
    const prisma = fakePrisma({
      employee: ['managerId', 'probationEndDate', 'lastWorkingDate', 'exitReason', 'rehireEligible', 'exitInterviewNotes'],
      payroll: ['periodType', 'periodKey', 'periodStart', 'periodEnd'],
      document: ['reference', 'issuedAt', 'expiresAt'],
    })
    await ensureHrSchema(prisma)

    expect(alterTargets(prisma.executed)).toEqual([])
    // Tables are created only when missing, so they are always attempted.
    expect(prisma.executed.filter((s) => /CREATE TABLE IF NOT EXISTS "\w+"/.test(s))).toHaveLength(2)
  })

  it('backfills real period dates for payroll rows written before the columns existed', async () => {
    const prisma = fakePrisma({
      employee: ['managerId', 'probationEndDate', 'lastWorkingDate', 'exitReason', 'rehireEligible', 'exitInterviewNotes'],
      payroll: ['periodType', 'periodKey', 'periodStart', 'periodEnd'],
      document: ['reference', 'issuedAt', 'expiresAt'],
    })
    prisma.setBackfill([{ id: 'p1', month: 1, year: 2025 }])
    await ensureHrSchema(prisma)

    expect(prisma.updated).toHaveLength(1)
    expect(prisma.updated[0]).toMatchObject({
      where: { id: 'p1' },
      data: {
        periodType: 'monthly',
        periodKey: '2025-01',
        periodStart: new Date(Date.UTC(2025, 0, 1)),
        periodEnd: new Date(Date.UTC(2025, 1, 0)),
      },
    })
  })

  it('reports what it changed instead of failing silently', async () => {
    const messages: string[] = []
    const logger = { info: (m: string) => messages.push(m), warn: (m: string) => messages.push(`warn: ${m}`) }
    await ensureHrSchema(fakePrisma(), logger)

    expect(messages.some((m) => m.includes('EmployeeDocument.expiresAt'))).toBe(true)
    expect(messages.some((m) => m.includes('Employee.managerId'))).toBe(true)
  })

  it('never throws when the migration fails — a read-only database still boots', async () => {
    const prisma = fakePrisma()
    prisma.$queryRawUnsafe = async () => {
      throw new Error('database is locked')
    }
    const warnings: string[] = []
    await expect(
      ensureHrSchema(prisma, { info: () => {}, warn: (m) => warnings.push(m) })
    ).resolves.toBeUndefined()
    expect(warnings).toHaveLength(1)
  })
})
