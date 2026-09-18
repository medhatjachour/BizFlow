/**
 * Personal sample workspace — the shape of the dataset and the seed/clear contract.
 *
 * The sample workspace is how the plugin is explored: it is the only code allowed
 * to write hundreds of rows at once, and it is what `npm run prisma:seed:personal`
 * (and its `--clear` / `--force` flags) runs on. Two things therefore have to hold:
 *
 *  1. the dataset is internally consistent (every symbolic parent link resolves,
 *     every `paid` invoice is actually covered by payments, the tax vault mirrors
 *     the payments it was reserved from), and
 *  2. a clear removes *exactly* the rows the seeder created — never a row the user
 *     made themselves, and never one row short.
 *
 * The first half runs against the pure builder, the second against an in-memory
 * Prisma stand-in so the real schema is not needed here.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { buildDemoDataset, datasetCounts } from '../../plugins/personal/handlers/demo'
import {
  DEMO_MARKER_TITLE,
  DEMO_TABLES,
  clearDemoData,
  countPersonalRows,
  demoStatus,
  seedDemoData,
  seedDemoDataset
} from '../../plugins/personal/handlers/demo-seed'
import { STAGE_IDS, computeRateEngine, stageIndex } from '../../plugins/personal/handlers/domain'
import { SCRIPT_CATEGORIES, DEFAULT_SCRIPTS } from '../../plugins/personal/handlers/templates'
import { round2 } from '../../plugins/personal/handlers/utils'

// ─── In-memory Prisma stand-in ───────────────────────────────────────────────

type Row = Record<string, any>

const delegate = (table: string): string => table.charAt(0).toLowerCase() + table.slice(1)

const matches = (row: Row, where?: Row): boolean => {
  if (!where) return true
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object' && !(value instanceof Date) && 'in' in (value as object)) {
      return (value as { in: unknown[] }).in.includes(row[key])
    }
    return row[key] === value
  })
}

function createFakePrisma() {
  let seq = 0
  const store: Record<string, Row[]> = {}

  const model = (name: string) => {
    const rows: Row[] = (store[name] = store[name] ?? [])
    return {
      create: async ({ data }: { data: Row }) => {
        seq += 1
        const id = String(data.id ?? `${name}-${seq}`)
        if (rows.some((row) => row.id === id)) {
          throw Object.assign(new Error(`Unique constraint failed on ${name}`), { code: 'P2002' })
        }
        const row = { ...data, id }
        rows.push(row)
        return row
      },
      count: async () => rows.length,
      findFirst: async (args: { where?: Row } = {}) =>
        rows.find((row) => matches(row, args.where)) ?? null,
      findMany: async (args: { select?: Row } = {}) => {
        if (!args.select) return [...rows]
        const keys = Object.keys(args.select)
        return rows.map((row) => Object.fromEntries(keys.map((key) => [key, row[key]])))
      },
      findUnique: async ({ where }: { where: Row }) => rows.find((row) => matches(row, where)) ?? null,
      delete: async ({ where }: { where: Row }) => {
        const index = rows.findIndex((row) => matches(row, where))
        if (index === -1) {
          throw Object.assign(new Error(`${name} not found`), { code: 'P2025' })
        }
        return rows.splice(index, 1)[0]
      },
      deleteMany: async (args: { where?: Row } = {}) => {
        const kept = rows.filter((row) => !matches(row, args.where))
        const count = rows.length - kept.length
        rows.length = 0
        rows.push(...kept)
        return { count }
      }
    }
  }

  const prisma: Record<string, any> = {}
  for (const table of DEMO_TABLES) prisma[delegate(table)] = model(delegate(table))

  return {
    prisma,
    rows: (table: string): Row[] => store[delegate(table)] ?? [],
    /** Row count of the whole personal workspace, the same way the seeder counts it. */
    total: (): number => Object.values(store).reduce((sum, rows) => sum + rows.length, 0)
  }
}

const dayKey = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

const sum = (values: number[]): number => round2(values.reduce((total, value) => total + value, 0))

const NOW = new Date(2026, 2, 10, 9, 0, 0)

// ─── The dataset ─────────────────────────────────────────────────────────────

describe('personal demo dataset', () => {
  const dataset = buildDemoDataset(NOW)
  const expected = datasetCounts(dataset)

  const projectKeys = new Set(dataset.projects.map((project) => project.key))
  const clientKeys = new Set(dataset.clients.map((client) => client.key))
  const invoiceKeys = new Set(dataset.invoices.map((invoice) => invoice.key))
  const taskKeys = new Set(dataset.tasks.map((task) => task.key))
  const retainerKeys = new Set(dataset.retainers.map((retainer) => retainer.key))

  it('fills every table in the plugin', () => {
    for (const table of DEMO_TABLES) {
      expect(expected[table], table).toBeGreaterThan(0)
    }
    expect(expected.PersonalRateProfile).toBe(1)

    const tables = DEMO_TABLES.reduce((total, table) => total + expected[table], 0)
    expect(expected.__total).toBe(tables)
  })

  it('is deterministic for a given clock reading', () => {
    expect(datasetCounts(buildDemoDataset(NOW))).toEqual(expected)
  })

  it('gives every keyed row a unique natural key', () => {
    expect(new Set(dataset.projects.map((project) => project.data.code)).size).toBe(dataset.projects.length)
    expect(new Set(dataset.invoices.map((invoice) => invoice.data.number)).size).toBe(dataset.invoices.length)
    expect(new Set(dataset.workLogs.map((log) => dayKey(log.data.day))).size).toBe(dataset.workLogs.length)
    expect(new Set(dataset.blackouts.map((b) => b.data.title)).size).toBe(dataset.blackouts.length)
    expect(new Set(dataset.tasks.map((task) => task.key)).size).toBe(dataset.tasks.length)
    expect(new Set(dataset.notes.map((note) => note.data.title)).size).toBe(dataset.notes.length)
  })

  it('resolves every symbolic parent link', () => {
    const parented: Array<[string, Array<{ projectKey?: string | null }>]> = [
      ['deliverables', dataset.deliverables],
      ['stageEvents', dataset.stageEvents],
      ['changeRequests', dataset.changeRequests],
      ['waitLogs', dataset.waitLogs],
      ['checklistItems', dataset.checklistItems],
      ['tasks', dataset.tasks],
      ['focusSessions', dataset.focusSessions],
      ['expenses', dataset.expenses],
      ['workloads', dataset.workloads],
      ['notes', dataset.notes]
    ]
    for (const [label, collection] of parented) {
      for (const entry of collection) {
        if (entry.projectKey == null) continue
        expect(projectKeys.has(entry.projectKey), `${label} → ${entry.projectKey}`).toBe(true)
      }
    }

    for (const project of dataset.projects) {
      if (project.clientKey == null) continue
      expect(clientKeys.has(project.clientKey), `project → ${project.clientKey}`).toBe(true)
    }
    for (const invoice of dataset.invoices) {
      if (invoice.clientKey) expect(clientKeys.has(invoice.clientKey)).toBe(true)
      if (invoice.projectKey) expect(projectKeys.has(invoice.projectKey)).toBe(true)
    }
    for (const payment of dataset.payments) {
      expect(invoiceKeys.has(payment.invoiceKey), `payment → ${payment.invoiceKey}`).toBe(true)
    }
    for (const entry of dataset.taxVaultEntries) {
      if (entry.invoiceKey == null) continue
      expect(invoiceKeys.has(entry.invoiceKey), `tax vault → ${entry.invoiceKey}`).toBe(true)
    }
    for (const retainer of dataset.retainers) {
      expect(clientKeys.has(retainer.clientKey)).toBe(true)
    }
    for (const usage of dataset.retainerUsages) {
      expect(retainerKeys.has(usage.retainerKey), `usage → ${usage.retainerKey}`).toBe(true)
    }
    for (const task of dataset.tasks) {
      if (task.clientKey) expect(clientKeys.has(task.clientKey)).toBe(true)
    }
    for (const session of dataset.focusSessions) {
      if (session.clientKey) expect(clientKeys.has(session.clientKey)).toBe(true)
      if (session.taskKey) expect(taskKeys.has(session.taskKey), `session → ${session.taskKey}`).toBe(true)
    }
    for (const note of dataset.notes) {
      if (note.clientKey) expect(clientKeys.has(note.clientKey)).toBe(true)
    }
  })

  it('walks each project through the delivery pipeline up to its current stage', () => {
    for (const event of dataset.stageEvents) {
      expect(STAGE_IDS, `stage ${event.data.stage}`).toContain(event.data.stage)
    }
    for (const project of dataset.projects) {
      expect(STAGE_IDS, `project stage ${project.data.stage}`).toContain(project.data.stage)
      const reached = dataset.stageEvents
        .filter((event) => event.projectKey === project.key)
        .map((event) => stageIndex(event.data.stage))
      expect(reached.length, `${project.key} has stage events`).toBeGreaterThan(0)
      expect(Math.max(...reached)).toBe(stageIndex(project.data.stage))
    }
  })

  it('pins exactly three tasks to the Daily 3', () => {
    const daily = dataset.tasks.filter((task) => task.data.isDailyThree)
    expect(daily).toHaveLength(3)
    for (const task of daily) {
      expect(['today', 'in_progress']).toContain(task.data.status)
      expect(task.data.title).toBeTruthy()
      expect(task.data.estimateMinutes).toBeGreaterThan(0)
    }
    expect(dataset.tasks.some((task) => task.data.status === 'done')).toBe(true)
  })

  it('never leaves a focus session running', () => {
    expect(dataset.focusSessions.length).toBeGreaterThan(0)
    for (const session of dataset.focusSessions) {
      const { startedAt, endedAt, actualMinutes } = session.data
      expect(endedAt, 'endedAt').toBeInstanceOf(Date)
      expect(startedAt.getTime()).toBeLessThan(endedAt.getTime())
      expect(actualMinutes).toBeGreaterThan(0)
    }
  })

  it('writes one local-midnight work log per day', () => {
    expect(dataset.workLogs.length).toBeGreaterThanOrEqual(5)
    for (const log of dataset.workLogs) {
      const day: Date = log.data.day
      expect([day.getHours(), day.getMinutes(), day.getSeconds()]).toEqual([0, 0, 0])
      expect(JSON.parse(log.data.completedJson)).toBeInstanceOf(Array)
      expect(JSON.parse(log.data.nextJson)).toBeInstanceOf(Array)
      expect(log.data.summary).toBeTruthy()
    }
  })

  it('keeps invoice, payment and tax-vault arithmetic coherent', () => {
    const paymentsFor = (key: string) => dataset.payments.filter((payment) => payment.invoiceKey === key)

    for (const invoice of dataset.invoices) {
      const paid = sum(paymentsFor(invoice.key).map((payment) => Number(payment.data.amount)))
      if (invoice.data.status === 'paid') {
        expect(paid, `${invoice.data.number} is marked paid`).toBe(round2(Number(invoice.data.amount)))
        expect(invoice.data.paidAt, `${invoice.data.number} paidAt`).toBeInstanceOf(Date)
      } else if (invoice.data.status === 'partial') {
        expect(paid).toBeGreaterThan(0)
        expect(paid).toBeLessThan(Number(invoice.data.amount))
      } else {
        expect(paid, `${invoice.data.number} should not be paid`).toBe(0)
      }
      if (invoice.data.paidAt) expect(invoice.data.paidAt.getTime()).toBeGreaterThanOrEqual(invoice.data.issuedAt.getTime())
      if (invoice.data.dueAt) expect(invoice.data.dueAt.getTime()).toBeGreaterThanOrEqual(invoice.data.issuedAt.getTime())
    }

    const reserved = dataset.taxVaultEntries.filter((entry) => entry.invoiceKey != null)
    expect(reserved).toHaveLength(dataset.payments.length)
    for (const payment of dataset.payments) {
      const entry = reserved.find((row) => row.invoiceKey === payment.invoiceKey)
      expect(entry, `tax reservation for ${payment.invoiceKey}`).toBeDefined()
      expect(entry!.data.rate).toBe(28)
      expect(entry!.data.amount).toBe(round2(Number(payment.data.amount) * 0.28))
      expect(entry!.data.reservedAt.getTime()).toBe((payment.data.paidAt as Date).getTime())
    }

    const withdrawals = dataset.taxVaultEntries.filter((entry) => entry.invoiceKey == null)
    expect(withdrawals).toHaveLength(1)
    expect(withdrawals[0].data.amount).toBeLessThan(0)
    expect(withdrawals[0].data.releasedAt).toBeInstanceOf(Date)
  })

  it('tracks retainer usage in minutes that add up to the hours used', () => {
    for (const retainer of dataset.retainers) {
      const minutes = sum(
        dataset.retainerUsages
          .filter((usage) => usage.retainerKey === retainer.key)
          .map((usage) => Number(usage.data.minutes))
      )
      expect(minutes).toBe(round2(Number(retainer.data.hoursUsed) * 60))
      expect(minutes).toBeLessThanOrEqual(Number(retainer.data.hoursIncluded) * 60 + Number(retainer.data.rolloverHours) * 60)
      expect(retainer.data.periodStart.getTime()).toBeLessThan(retainer.data.nextResetAt.getTime())
    }
    expect(dataset.retainerUsages.some((usage) => usage.data.isRollover)).toBe(true)
  })

  it('books a capacity heatmap with one deliberately overloaded day', () => {
    const byDay = new Map<string, number>()
    const seen = new Set<string>()
    for (const entry of dataset.workloads) {
      const { day, plannedMinutes, actualMinutes } = entry.data
      expect([day.getHours(), day.getMinutes()]).toEqual([0, 0])
      expect(plannedMinutes).toBeGreaterThanOrEqual(0)
      expect(actualMinutes).toBeGreaterThanOrEqual(0)
      const key = `${entry.projectKey}@${dayKey(day)}`
      expect(seen.has(key), `duplicate workload ${key}`).toBe(false)
      seen.add(key)
      byDay.set(dayKey(day), (byDay.get(dayKey(day)) ?? 0) + plannedMinutes)
    }
    // The heatmap needs something to flash amber/red about.
    expect(Math.max(...byDay.values())).toBeGreaterThan(8 * 60)
    expect(dataset.workloads.some((entry) => entry.data.isCommitted === false)).toBe(true)
  })

  it('shields blackout dates and only blocks delivery where it should', () => {
    expect(dataset.blackouts.length).toBeGreaterThan(0)
    for (const blackout of dataset.blackouts) {
      expect(blackout.data.startDate.getTime()).toBeLessThanOrEqual(blackout.data.endDate.getTime())
      expect(blackout.data.title).toBeTruthy()
      if (blackout.data.kind === 'vacation') expect(blackout.data.blocksDelivery).toBe(true)
    }
    expect(dataset.blackouts.some((blackout) => blackout.data.blocksDelivery === false)).toBe(true)
  })

  it('ships a playbook whose placeholders match what the bodies use', () => {
    expect(dataset.scripts).toHaveLength(DEFAULT_SCRIPTS.length + 2)
    for (const script of dataset.scripts) {
      expect(SCRIPT_CATEGORIES.map((category) => category.id)).toContain(script.data.category)
      const declared: string[] = JSON.parse(script.data.placeholderKeys)
      const used = [...script.data.body.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1])
      expect([...declared].sort()).toEqual([...new Set(used)].sort())
      expect(script.data.body).toBeTruthy()
    }
    expect(dataset.scripts.filter((script) => script.data.isBuiltIn === false).length).toBeGreaterThan(0)
  })

  it('gives the rate profile a floor price to defend', () => {
    const engine = computeRateEngine(dataset.rateProfile)
    expect(engine.currency).toBe('USD')
    expect(engine.baselineHourlyRate).toBeGreaterThan(0)
    expect(engine.floorHourlyRate).toBeGreaterThan(0)
    expect(engine.floorHourlyRate).toBeLessThan(engine.baselineHourlyRate)
    expect(engine.minimumProjectPrice).toBeGreaterThan(0)
    expect(dataset.rateProfile.taxReservePercent).toBe(28)
    expect(dataset.rateProfile.maxClientHoursPerWeek).toBeLessThanOrEqual(dataset.rateProfile.weeklyCapacityHours)
  })

  it('keeps every scratchpad note worth reading', () => {
    for (const note of dataset.notes) {
      expect(note.data.title).toBeTruthy()
      expect(String(note.data.content).length).toBeGreaterThan(20)
      expect(['note', 'credential', 'brand', 'link']).toContain(note.data.kind)
    }
  })
})

// ─── Seed, status, clear ─────────────────────────────────────────────────────

describe('personal demo seeder', () => {
  let db: ReturnType<typeof createFakePrisma>

  beforeEach(() => {
    db = createFakePrisma()
  })

  it('writes every table and reports exactly what it created', async () => {
    const dataset = buildDemoDataset(NOW)
    const expected = datasetCounts(dataset)
    const created = await seedDemoDataset(db.prisma, dataset, NOW)

    for (const table of DEMO_TABLES) {
      expect(db.rows(table), table).toHaveLength(expected[table])
    }
    expect(created).toEqual(
      Object.fromEntries(DEMO_TABLES.map((table) => [table, expected[table]]))
    )
    expect(db.total()).toBe(expected.__total)
    expect(await countPersonalRows(db.prisma)).toBe(expected.__total)
  })

  it('marks the workspace and reports the status the settings card shows', async () => {
    const outcome = await seedDemoData(db.prisma)
    expect(outcome.created).toEqual(
      Object.fromEntries(DEMO_TABLES.map((table) => [table, outcome.expected[table]]))
    )
    expect(outcome.expected.__total).toBeGreaterThan(0)

    const status = await demoStatus(db.prisma)
    expect(status.hasDemoData).toBe(true)
    expect(status.rows).toBe(outcome.expected.__total)
    expect(status.counts.PersonalProject).toBe(outcome.expected.PersonalProject)
    expect(Number.isNaN(Date.parse(status.seededAt as string))).toBe(false)

    const marker = db.rows('PersonalNote').find((note) => note.title === DEMO_MARKER_TITLE)
    expect(marker).toBeDefined()
    const parsed = JSON.parse(marker!.content)
    expect(parsed.seededAt).toBe(status.seededAt)
    expect(Object.keys(parsed.ids).sort()).toEqual([...DEMO_TABLES].sort())
  })

  it('refuses to seed over existing rows, then replaces its own batch when forced', async () => {
    const mine = await db.prisma.personalClient.create({
      data: { name: 'Mine, not demo', company: 'Real work' }
    })

    await expect(seedDemoData(db.prisma)).rejects.toThrow(/already holds 1 row/)

    const first = await seedDemoData(db.prisma, { force: true })
    expect(db.rows('PersonalClient')).toHaveLength(first.expected.PersonalClient + 1)
    expect(db.total()).toBe(first.expected.__total + 1)

    // Forcing again replaces the batch instead of stacking a second copy.
    const second = await seedDemoData(db.prisma, { force: true })
    expect(second.created.PersonalClient).toBe(first.expected.PersonalClient)
    expect(db.total()).toBe(first.expected.__total + 1)

    const cleared = await clearDemoData(db.prisma)
    expect(cleared.removed).toBe(first.expected.__total)
    expect(db.total()).toBe(1)
    expect(await db.prisma.personalClient.findUnique({ where: { id: mine.id } })).not.toBeNull()

    const status = await demoStatus(db.prisma)
    expect(status.hasDemoData).toBe(false)
    expect(status.rows).toBe(1)

    // Clearing a cleared workspace is a no-op, not an error.
    expect(await clearDemoData(db.prisma)).toEqual({ removed: 0, tables: {} })
  })

  it('counts the marker row in what it removed, so the total never drifts', async () => {
    const outcome = await seedDemoData(db.prisma)
    const cleared = await clearDemoData(db.prisma)
    expect(cleared.removed).toBe(outcome.expected.__total)
    expect(sum(Object.values(cleared.tables))).toBe(outcome.expected.__total)
    expect(cleared.tables.PersonalNote).toBe(outcome.expected.PersonalNote)
    expect(db.total()).toBe(0)
  })

  it('keeps the checklists and rate profile a user already tuned', async () => {
    const dataset = buildDemoDataset(NOW)
    const expected = datasetCounts(dataset)
    const firstName = dataset.checklistTemplates[0].data.name
    await db.prisma.personalChecklistTemplate.create({
      data: { name: firstName, profession: 'developer', isDefault: true, itemsJson: '["mine"]' }
    })
    await db.prisma.personalRateProfile.create({ data: { id: 'default', currency: 'EUR', monthlyOther: 5 } })

    const created = await seedDemoDataset(db.prisma, dataset, NOW)

    expect(created.PersonalChecklistTemplate).toBe(expected.PersonalChecklistTemplate - 1)
    expect(db.rows('PersonalChecklistTemplate')).toHaveLength(expected.PersonalChecklistTemplate)
    expect(db.rows('PersonalChecklistTemplate')[0].itemsJson).toBe('["mine"]')
    expect(created.PersonalRateProfile).toBeUndefined()
    expect(db.rows('PersonalRateProfile')).toHaveLength(1)
    expect(db.rows('PersonalRateProfile')[0].currency).toBe('EUR')

    // Only the demo rows are cleared — the user's template and profile stay.
    const cleared = await clearDemoData(db.prisma)
    expect(cleared.removed).toBe(sum(Object.values(created)))
    expect(db.rows('PersonalChecklistTemplate')).toHaveLength(1)
    expect(db.rows('PersonalRateProfile')).toHaveLength(1)
  })

  it('treats an unreadable marker as a workspace with no sample data', async () => {
    const outcome = await seedDemoData(db.prisma)
    const marker = db.rows('PersonalNote').find((note) => note.title === DEMO_MARKER_TITLE)
    marker!.content = '{ this is not json'

    const status = await demoStatus(db.prisma)
    expect(status.hasDemoData).toBe(false)
    expect(status.counts).toEqual({})
    expect(status.rows).toBe(outcome.expected.__total)

    // Nothing can be identified as demo data, so only the marker is dropped.
    const cleared = await clearDemoData(db.prisma)
    expect(cleared).toEqual({ removed: 1, tables: { PersonalNote: 1 } })
    expect(await clearDemoData(db.prisma)).toEqual({ removed: 0, tables: {} })
  })
})
