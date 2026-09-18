// ─── Personal Work: Sample-workspace seeder ──────────────────────────────────
// The half of the sample data that touches Prisma. It has no IPC surface: the
// sample workspace is filled by `prisma/seeds/personal/seed.ts`
// (`npm run prisma:seed:personal`) rather than by a button in the UI.
//
// Nothing here imports Electron, so the CLI seed and the unit tests use the same
// code path. `demo.ts` holds the pure dataset this writes.
//
// Every row is recorded in a marker note (`DEMO_MARKER_TITLE`), which is what
// lets `clearDemoData` remove *exactly* this batch and never a record the user
// added themselves.
// ─────────────────────────────────────────────────────────────────────────────

import { buildDemoDataset, datasetCounts, type DemoDataset } from './demo'

/** Title of the marker note that records which rows the seeder created. */
export const DEMO_MARKER_TITLE = '__bizflow_personal_demo__'

/** Every table the seeder writes, in the order `datasetCounts` reports them. */
export const DEMO_TABLES = [
  'PersonalClient',
  'PersonalProject',
  'PersonalDeliverable',
  'PersonalStageEvent',
  'PersonalChangeRequest',
  'PersonalWaitLog',
  'PersonalChecklistTemplate',
  'PersonalChecklistItem',
  'PersonalTask',
  'PersonalFocusSession',
  'PersonalWorkLog',
  'PersonalInvoice',
  'PersonalPayment',
  'PersonalExpense',
  'PersonalSubscription',
  'PersonalRetainer',
  'PersonalRetainerUsage',
  'PersonalRateProfile',
  'PersonalTaxVaultEntry',
  'PersonalBlackout',
  'PersonalWorkload',
  'PersonalScript',
  'PersonalNote'
] as const

/** Deletion order — leaves first so no foreign key is ever left dangling. */
const DELETE_ORDER = [
  'PersonalPayment',
  'PersonalTaxVaultEntry',
  'PersonalInvoice',
  'PersonalRetainerUsage',
  'PersonalRetainer',
  'PersonalChecklistItem',
  'PersonalStageEvent',
  'PersonalDeliverable',
  'PersonalChangeRequest',
  'PersonalWaitLog',
  'PersonalFocusSession',
  'PersonalTask',
  'PersonalWorkload',
  'PersonalExpense',
  'PersonalNote',
  'PersonalProject',
  'PersonalClient',
  'PersonalSubscription',
  'PersonalWorkLog',
  'PersonalBlackout',
  'PersonalScript',
  'PersonalChecklistTemplate',
  'PersonalRateProfile'
]

// ─── Persistence ─────────────────────────────────────────────────────────────

export interface DemoSeedRecord {
  /** Row ids created per Prisma model name. */
  ids: Record<string, string[]>
  seededAt: string
}

/** How many personal rows already exist — used to refuse a destructive seed. */
export async function countPersonalRows(prisma: any): Promise<number> {
  const counts = await Promise.all(DEMO_TABLES.map((table) => prisma[delegate(table)].count()))
  return counts.reduce((sum: number, n: number) => sum + n, 0)
}

function delegate(table: string): string {
  return table.charAt(0).toLowerCase() + table.slice(1)
}

/**
 * Row count for a dataset table, for the seed CLI. A table can legitimately
 * report fewer *created* rows than the dataset asks for (a checklist template
 * with the same name, or the rate profile, is reused rather than overwritten),
 * so the CLI checks the table itself before calling anything missing.
 */
export async function countTableRows(prisma: any, table: string): Promise<number> {
  return prisma[delegate(table)].count()
}

async function readMarker(prisma: any): Promise<DemoSeedRecord | null> {
  try {
    const note = await prisma.personalNote.findFirst({ where: { title: DEMO_MARKER_TITLE } })
    if (!note) return null
    return JSON.parse(note.content) as DemoSeedRecord
  } catch {
    // A corrupted marker is treated as "no sample data" so the seeder can run again.
    return null
  }
}

/**
 * Writes the dataset. Every created id is recorded so `clearDemoData` can undo
 * exactly this batch.
 */
export async function seedDemoDataset(
  prisma: any,
  dataset: DemoDataset,
  now: Date = new Date()
): Promise<Record<string, number>> {
  const ids: Record<string, string[]> = {}
  const track = (table: string, id: string) => {
    ids[table] = ids[table] ?? []
    ids[table].push(id)
  }

  const clientId = new Map<string, string>()
  for (const client of dataset.clients) {
    const row = await prisma.personalClient.create({ data: client.data })
    clientId.set(client.key, row.id)
    track('PersonalClient', row.id)
  }

  const projectId = new Map<string, string>()
  for (const project of dataset.projects) {
    const row = await prisma.personalProject.create({
      data: {
        ...project.data,
        ...(project.clientKey ? { clientId: clientId.get(project.clientKey) } : {})
      }
    })
    projectId.set(project.key, row.id)
    track('PersonalProject', row.id)
  }

  for (const entry of dataset.deliverables) {
    const row = await prisma.personalDeliverable.create({
      data: { ...entry.data, projectId: projectId.get(entry.projectKey) }
    })
    track('PersonalDeliverable', row.id)
  }

  for (const entry of dataset.stageEvents) {
    const row = await prisma.personalStageEvent.create({
      data: { ...entry.data, projectId: projectId.get(entry.projectKey) }
    })
    track('PersonalStageEvent', row.id)
  }

  for (const entry of dataset.changeRequests) {
    const row = await prisma.personalChangeRequest.create({
      data: { ...entry.data, projectId: projectId.get(entry.projectKey) }
    })
    track('PersonalChangeRequest', row.id)
  }

  for (const entry of dataset.waitLogs) {
    const row = await prisma.personalWaitLog.create({
      data: { ...entry.data, projectId: projectId.get(entry.projectKey) }
    })
    track('PersonalWaitLog', row.id)
  }

  // Templates are seeded by name so an existing user-edited template is kept.
  const existingTemplates = await prisma.personalChecklistTemplate.findMany({ select: { name: true } })
  const knownTemplateNames = new Set<string>(existingTemplates.map((t: any) => t.name))
  for (const entry of dataset.checklistTemplates) {
    if (knownTemplateNames.has(entry.data.name)) continue
    const row = await prisma.personalChecklistTemplate.create({ data: entry.data })
    track('PersonalChecklistTemplate', row.id)
  }

  for (const entry of dataset.checklistItems) {
    const row = await prisma.personalChecklistItem.create({
      data: { ...entry.data, projectId: projectId.get(entry.projectKey) }
    })
    track('PersonalChecklistItem', row.id)
  }

  const taskId = new Map<string, string>()
  for (const entry of dataset.tasks) {
    const row = await prisma.personalTask.create({
      data: {
        ...entry.data,
        projectId: entry.projectKey ? projectId.get(entry.projectKey) : null,
        clientId: entry.clientKey ? clientId.get(entry.clientKey) : null
      }
    })
    taskId.set(entry.key, row.id)
    track('PersonalTask', row.id)
  }

  for (const entry of dataset.focusSessions) {
    const row = await prisma.personalFocusSession.create({
      data: {
        ...entry.data,
        projectId: entry.projectKey ? projectId.get(entry.projectKey) : null,
        clientId: entry.clientKey ? clientId.get(entry.clientKey) : null,
        taskId: entry.taskKey ? taskId.get(entry.taskKey) ?? null : null
      }
    })
    track('PersonalFocusSession', row.id)
  }

  for (const entry of dataset.workLogs) {
    const row = await prisma.personalWorkLog.create({ data: entry.data })
    track('PersonalWorkLog', row.id)
  }

  const invoiceId = new Map<string, string>()
  for (const invoice of dataset.invoices) {
    const row = await prisma.personalInvoice.create({
      data: {
        ...invoice.data,
        clientId: invoice.clientKey ? clientId.get(invoice.clientKey) : null,
        projectId: invoice.projectKey ? projectId.get(invoice.projectKey) : null
      }
    })
    invoiceId.set(invoice.key, row.id)
    track('PersonalInvoice', row.id)
  }

  const paymentId = new Map<string, string>()
  for (const entry of dataset.payments) {
    const row = await prisma.personalPayment.create({
      data: { ...entry.data, invoiceId: invoiceId.get(entry.invoiceKey) }
    })
    paymentId.set(entry.invoiceKey, row.id)
    track('PersonalPayment', row.id)
  }

  for (const entry of dataset.taxVaultEntries) {
    const row = await prisma.personalTaxVaultEntry.create({
      data: {
        ...entry.data,
        invoiceId: entry.invoiceKey ? invoiceId.get(entry.invoiceKey) ?? null : null,
        paymentId: entry.invoiceKey ? paymentId.get(entry.invoiceKey) ?? null : null
      }
    })
    track('PersonalTaxVaultEntry', row.id)
  }

  for (const entry of dataset.expenses) {
    const row = await prisma.personalExpense.create({
      data: {
        ...entry.data,
        projectId: entry.projectKey ? projectId.get(entry.projectKey) : null
      }
    })
    track('PersonalExpense', row.id)
  }

  for (const entry of dataset.subscriptions) {
    const row = await prisma.personalSubscription.create({ data: entry.data })
    track('PersonalSubscription', row.id)
  }

  const retainerId = new Map<string, string>()
  for (const entry of dataset.retainers) {
    const row = await prisma.personalRetainer.create({
      data: { ...entry.data, clientId: clientId.get(entry.clientKey) }
    })
    retainerId.set(entry.key, row.id)
    track('PersonalRetainer', row.id)
  }

  for (const entry of dataset.retainerUsages) {
    const row = await prisma.personalRetainerUsage.create({
      data: { ...entry.data, retainerId: retainerId.get(entry.retainerKey) }
    })
    track('PersonalRetainerUsage', row.id)
  }

  // Single-row settings: keep whatever the user already configured, only fill gaps.
  const existingProfile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
  if (!existingProfile) {
    const row = await prisma.personalRateProfile.create({ data: dataset.rateProfile })
    track('PersonalRateProfile', row.id)
  }

  for (const entry of dataset.blackouts) {
    const row = await prisma.personalBlackout.create({ data: entry.data })
    track('PersonalBlackout', row.id)
  }

  for (const entry of dataset.workloads) {
    const row = await prisma.personalWorkload.create({
      data: {
        ...entry.data,
        projectId: entry.projectKey ? projectId.get(entry.projectKey) : null
      }
    })
    track('PersonalWorkload', row.id)
  }

  for (const entry of dataset.scripts) {
    const row = await prisma.personalScript.create({ data: entry.data })
    track('PersonalScript', row.id)
  }

  for (const entry of dataset.notes) {
    const row = await prisma.personalNote.create({
      data: {
        ...entry.data,
        projectId: entry.projectKey ? projectId.get(entry.projectKey) : null,
        clientId: entry.clientKey ? clientId.get(entry.clientKey) : null
      }
    })
    track('PersonalNote', row.id)
  }

  const marker: DemoSeedRecord = { ids, seededAt: now.toISOString() }
  const markerRow = await prisma.personalNote.create({
    data: {
      title: DEMO_MARKER_TITLE,
      content: JSON.stringify(marker),
      kind: 'note',
      isPinned: false,
      tags: 'internal,demo'
    }
  })
  // Tracked like any other row so `created` matches `datasetCounts`, but
  // `clearDemoData` pulls it out of the batch and deletes it last.
  track('PersonalNote', markerRow.id)

  const summary: Record<string, number> = {}
  for (const [table, list] of Object.entries(ids)) summary[table] = list.length
  return summary
}

/** Removes exactly the rows recorded in the demo marker, leaves first. */
export async function clearDemoData(prisma: any): Promise<{ removed: number; tables: Record<string, number> }> {
  const markerRow = await prisma.personalNote.findFirst({ where: { title: DEMO_MARKER_TITLE } })
  if (!markerRow) return { removed: 0, tables: {} }

  const marker = await readMarker(prisma)
  const tables: Record<string, number> = {}
  let removed = 0

  if (marker?.ids) {
    for (const table of DELETE_ORDER) {
      const list = marker.ids[table]
      if (!list || list.length === 0) continue
      // The marker is deleted last, once the ids it describes are gone.
      const targets = table === 'PersonalNote' ? list.filter((id) => id !== markerRow.id) : list
      if (targets.length === 0) continue
      const result = await prisma[delegate(table)].deleteMany({ where: { id: { in: targets } } })
      if (result.count > 0) {
        tables[table] = result.count
        removed += result.count
      }
    }
  }

  await prisma.personalNote.delete({ where: { id: markerRow.id } })
  tables.PersonalNote = (tables.PersonalNote ?? 0) + 1
  removed += 1
  return { removed, tables }
}

/** Lightweight status used by the seed CLI (`npm run prisma:seed:personal`). */
export async function demoStatus(prisma: any): Promise<{
  hasDemoData: boolean
  seededAt: string | null
  rows: number
  counts: Record<string, number>
}> {
  const marker = await readMarker(prisma)
  const rows = await countPersonalRows(prisma)
  const counts: Record<string, number> = {}
  if (marker?.ids) {
    for (const [table, list] of Object.entries(marker.ids)) counts[table] = list.length
  }
  return {
    hasDemoData: Boolean(marker),
    seededAt: marker?.seededAt ?? null,
    rows,
    counts
  }
}

// ─── Entry points used by prisma/seeds/personal/seed.ts ──────────────────────

export interface DemoSeedOutcome {
  created: Record<string, number>
  expected: Record<string, number>
}

/**
 * Seeds the sample workspace. Refuses to run on a workspace that already holds
 * rows unless `force` is set, in which case the previous sample batch is removed
 * first — a user's own rows are never touched.
 */
export async function seedDemoData(prisma: any, opts?: { force?: boolean }): Promise<DemoSeedOutcome> {
  const existing = await countPersonalRows(prisma)
  if (existing > 0) {
    if (!opts?.force) {
      throw new Error(
        `The personal workspace already holds ${existing} row(s). Clear it first, or load the demo data with force.`
      )
    }
    await clearDemoData(prisma)
  }

  const dataset = buildDemoDataset()
  const expected = datasetCounts(dataset)
  const created = await seedDemoDataset(prisma, dataset)
  return { created, expected }
}
