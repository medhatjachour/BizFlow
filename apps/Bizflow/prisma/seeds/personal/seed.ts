/**
 * Personal Work — sample workspace.
 *
 * Fills the personal plugin with a complete solo-freelancer workspace: clients
 * with health scores, projects spread across every pipeline stage, change
 * requests, client waiting logs, invoices with deposits and retainers, expenses,
 * subscriptions, the tax vault, capacity and blackout dates, focus sessions,
 * work logs, scripts and scratchpads. It exists so every tab, KPI and chart can
 * actually be looked at — most empty states are unreachable by hand.
 *
 * Run with:
 *   npm run prisma:seed:personal              seed the sample workspace
 *   npm run prisma:seed:personal -- --force   replace an existing sample batch
 *   npm run prisma:seed:personal -- --clear   remove the sample batch
 *   npm run prisma:seed:personal -- --status  report what is in the workspace
 *
 * Idempotent: every row it creates is recorded in a marker note, so `--clear`
 * (and `--force`) removes *exactly* that batch. Rows you added yourself are never
 * touched.
 *
 * The dataset is built by the same pure builder the unit tests use
 * (`src/plugins/personal/handlers/demo.ts`); this file only wires it to Prisma.
 */

import { PrismaClient } from '../../../src/generated/prisma'
import {
  clearDemoData,
  countTableRows,
  demoStatus,
  seedDemoData
} from '../../../src/plugins/personal/handlers/demo-seed'

const prisma = new PrismaClient()

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2).map((arg) => arg.replace(/^--?/, '').toLowerCase()))

const USAGE = `
Personal Work — sample workspace

  npm run prisma:seed:personal              seed the sample workspace
  npm run prisma:seed:personal -- --force   replace an existing sample batch
  npm run prisma:seed:personal -- --clear   remove the sample batch
  npm run prisma:seed:personal -- --status  report what is in the workspace
`.trim()

/** Row-per-table comparison, so a silent partial write can never go unnoticed. */
async function reportWrites(created: Record<string, number>, expected: Record<string, number>) {
  const rows = Object.keys(expected)
    .filter((table) => table !== '__total')
    .map((table) => ({
      table,
      rows: expected[table] ?? 0,
      created: created[table] ?? 0,
      note: ''
    }))

  // Two tables are deliberately shared rather than created: a checklist template
  // or a rate profile the user already tuned is reused, so the workspace ends up
  // with the dataset's rows without a single write. Only a table that is genuinely
  // short of the dataset is a problem.
  const missing: string[] = []
  for (const row of rows) {
    if (row.created >= row.rows) continue
    const present = await countTableRows(prisma, row.table)
    if (present >= row.rows) {
      const reused = row.rows - row.created
      row.note = `${reused} already in the workspace`
      row.rows = present
      continue
    }
    row.note = `${row.rows - present} missing`
    missing.push(`  ${row.table}: expected ${row.rows}, created ${row.created}, found ${present}`)
  }

  console.table(rows)

  if (missing.length > 0) {
    console.warn(`\nWarning: the workspace is short of the dataset in ${missing.length} table(s):\n${missing.join('\n')}`)
  }

  const total = rows.reduce((sum, row) => sum + row.created, 0)
  console.log(`\nCreated ${total} row(s) across ${rows.length} tables.`)
}

function printStatus(status: Awaited<ReturnType<typeof demoStatus>>) {
  console.log(status.hasDemoData ? 'Sample workspace: loaded' : 'Sample workspace: not loaded')
  if (status.seededAt) console.log(`Loaded at: ${status.seededAt}`)
  console.log(`Rows in the personal workspace: ${status.rows}`)

  const tables = Object.entries(status.counts).sort(([a], [b]) => a.localeCompare(b))
  if (tables.length > 0) {
    console.log('\nSample rows per table:')
    console.table(tables.map(([table, rows]) => ({ table, rows })))
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function main() {
  if (args.has('help') || args.has('h')) {
    console.log(USAGE)
    return
  }

  if (args.has('status')) {
    printStatus(await demoStatus(prisma))
    return
  }

  if (args.has('clear')) {
    const { removed, tables } = await clearDemoData(prisma)
    if (removed === 0) {
      console.log('Nothing to clear — the workspace holds no sample data.')
      return
    }
    console.log(`Removed ${removed} sample row(s).`)
    console.table(Object.entries(tables).map(([table, rows]) => ({ table, rows })))
    return
  }

  const outcome = await seedDemoData(prisma, { force: args.has('force') || args.has('f') })
  await reportWrites(outcome.created, outcome.expected)

  console.log('\nWhat to look at in the app:')
  console.log('  • Overview — deadlines, the daily 3, unearned cash and capacity at a glance')
  console.log('  • Projects — a project sitting in every pipeline stage')
  console.log('  • Requests — change requests with their extra cost and extra days')
  console.log('  • Waits — client bottleneck logs that pushed delivery dates back')
  console.log('  • Invoices / Finance — deposit, final payment, retainers and the tax vault')
  console.log('  • Capacity — a week that is deliberately booked over 100%')
  console.log('  • Playbook / Notes — scripts and per-project scratchpads')
}

main()
  .catch((err) => {
    console.error('Personal sample workspace seed failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
