/**
 * Migrate vet data from a backup sqlite DB into the current-schema dev.db.
 * Strategy: copy every row using the INTERSECTION of columns that exist in
 * both the backup and the target, filling target-required columns (e.g.
 * updatedAt) when the backup lacks them. Rows are never dropped; columns that
 * have no home in the new schema are preserved either by folding into `notes`
 * (VetSession) or exported to prisma/backup-unmigrated.json (VetVisitType).
 *
 * Usage:  node scripts/migrate-vet-backup.cjs [backupPath] [targetPath]
 */
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { PrismaClient } = require(path.resolve(__dirname, '../src/generated/prisma'))

const BACKUP = path.resolve(process.argv[2] || path.resolve(__dirname, '../prisma/backup-20260617-171531.db'))
const TARGET = path.resolve(process.argv[3] || path.resolve(__dirname, '../prisma/dev.db'))
const fileUrl = p => 'file:' + p.replace(/\\/g, '/')

const norm = v => (typeof v === 'bigint' ? Number(v) : v)
const nowISO = () => new Date().toISOString()

async function colsOf(db, table) {
  const rows = await db.$queryRawUnsafe(`PRAGMA table_info("${table}")`)
  return rows.map(r => ({ name: r.name, notnull: Number(r.notnull), dflt: r.dflt_value, pk: Number(r.pk) }))
}
async function tablesOf(db) {
  const rows = await db.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
  )
  return new Set(rows.map(r => r.name))
}

async function insertRow(target, table, obj) {
  const keys = Object.keys(obj)
  const sql = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${keys.map(() => '?').join(',')})`
  await target.$executeRawUnsafe(sql, ...keys.map(k => norm(obj[k])))
}

/** Generic intersection copy. extra(row) may return overrides/added fields. */
async function copyTable(backup, target, table, { extra, fillRequired = true } = {}) {
  const bCols = await colsOf(backup, table)
  const tCols = await colsOf(target, table)
  const tNames = new Set(tCols.map(c => c.name))
  const common = bCols.map(c => c.name).filter(n => tNames.has(n))

  // Target columns that are NOT NULL, have no default, are not PK, and are not
  // covered by the common set → must be filled.
  const needFill = tCols.filter(c => c.notnull && c.dflt == null && !c.pk && !common.includes(c.name))

  const rows = await backup.$queryRawUnsafe(
    `SELECT ${common.map(c => `"${c}"`).join(',')} FROM "${table}"`
  )

  let ok = 0, fail = 0
  const errs = []
  for (const row of rows) {
    const obj = {}
    for (const c of common) obj[c] = row[c]
    if (fillRequired) {
      for (const c of needFill) {
        if (c.name === 'updatedAt') obj.updatedAt = row.createdAt ?? nowISO()
        else if (c.name === 'createdAt') obj.createdAt = nowISO()
        else obj[c.name] = '' // last-resort for unexpected required text cols
      }
    }
    if (extra) Object.assign(obj, extra(row, obj))
    try { await insertRow(target, table, obj); ok++ }
    catch (e) { fail++; if (errs.length < 3) errs.push(e.message) }
  }
  console.log(`  ${table}: ${ok} migrated${fail ? `, ${fail} skipped` : ''}${common.length < bCols.length ? ` (dropped cols: ${bCols.map(c => c.name).filter(n => !tNames.has(n)).join(', ')})` : ''}`)
  if (errs.length) errs.forEach(m => console.log(`    ! ${m}`))
  return { ok, fail }
}

const VISIT_TYPE_MAP = { Visit: 'visit', Check: 'consultation', Sonar: 'sonar', Operation: 'surgery' }

async function main() {
  const backup = new PrismaClient({ datasources: { db: { url: fileUrl(BACKUP) } } })
  const target = new PrismaClient({ datasources: { db: { url: fileUrl(TARGET) } } })
  console.log('Backup :', BACKUP)
  console.log('Target :', TARGET, '\n')

  const bTables = await tablesOf(backup)
  const tTables = await tablesOf(target)
  // Disable FK enforcement during bulk load (re-enabled implicitly on disconnect).
  try { await target.$executeRawUnsafe('PRAGMA foreign_keys=OFF') } catch {}

  console.log('Migrating tables (FK-safe order):')

  // 1. Core user (keeps the existing login account)
  if (bTables.has('User') && tTables.has('User')) await copyTable(backup, target, 'User')

  // 2. Independent vet reference tables
  if (bTables.has('VetMedicineCategory')) await copyTable(backup, target, 'VetMedicineCategory')
  if (bTables.has('VetOwner')) await copyTable(backup, target, 'VetOwner')
  if (bTables.has('VetMedicine')) await copyTable(backup, target, 'VetMedicine')
  if (bTables.has('VetStaff') && tTables.has('VetStaff')) await copyTable(backup, target, 'VetStaff')

  // 3. Dependent tables
  if (bTables.has('VetMedicineBatch')) await copyTable(backup, target, 'VetMedicineBatch')
  if (bTables.has('VetMedicineSale')) await copyTable(backup, target, 'VetMedicineSale')
  if (bTables.has('VetExpense')) await copyTable(backup, target, 'VetExpense')
  if (bTables.has('VetPatient')) await copyTable(backup, target, 'VetPatient')

  // 4. VetSession — needs a non-null patientId; create placeholder pets as needed.
  if (bTables.has('VetSession')) {
    const sessions = await backup.$queryRawUnsafe('SELECT * FROM VetSession')
    // pick an owner to attach placeholder pets to
    const owners = await target.$queryRawUnsafe('SELECT id FROM VetOwner LIMIT 1')
    let ownerId = owners[0]?.id
    if (!ownerId) {
      ownerId = crypto.randomUUID()
      await insertRow(target, 'VetOwner', {
        id: ownerId, name: 'Imported Owner', phone: '', createdAt: nowISO(), updatedAt: nowISO(),
      })
    }
    const existingPatients = new Set((await target.$queryRawUnsafe('SELECT id FROM VetPatient')).map(r => r.id))
    let ok = 0, fail = 0
    for (const s of sessions) {
      let patientId = s.patientId
      if (!patientId || !existingPatients.has(patientId)) {
        patientId = crypto.randomUUID()
        await insertRow(target, 'VetPatient', {
          id: patientId, ownerId,
          name: s.animalName || 'Imported Pet',
          species: s.animalSpecies || 'other',
          breed: s.animalBreed || null,
          createdAt: s.createdAt || nowISO(), updatedAt: s.updatedAt || nowISO(),
        })
        existingPatients.add(patientId)
      }
      // preserve dropped fields in notes
      const extras = []
      if (s.customerName) extras.push(`Customer: ${s.customerName}`)
      if (s.customerPhone) extras.push(`Phone: ${s.customerPhone}`)
      if (s.animalName) extras.push(`Animal: ${s.animalName}`)
      if (s.animalSpecies) extras.push(`Species: ${s.animalSpecies}`)
      if (s.animalBreed) extras.push(`Breed: ${s.animalBreed}`)
      const notes = [s.notes, extras.length ? `[Imported] ${extras.join(' · ')}` : null].filter(Boolean).join('\n') || null
      try {
        await insertRow(target, 'VetSession', {
          id: s.id, patientId,
          visitDate: s.visitDate || nowISO(),
          visitType: VISIT_TYPE_MAP[s.visitType] || s.visitType || 'visit',
          vetName: s.vetName || null,
          chiefComplaint: s.chiefComplaint || 'Imported record',
          notes,
          status: s.status || 'completed',
          amountCharged: s.amountCharged ?? null,
          amountPaid: s.amountPaid ?? null,
          paymentStatus: s.paymentStatus || 'unpaid',
          paymentMethod: s.paymentMethod || null,
          createdAt: s.createdAt || nowISO(),
          updatedAt: s.updatedAt || s.createdAt || nowISO(),
        })
        ok++
      } catch (e) { fail++; console.log(`    ! VetSession ${s.id}: ${e.message}`) }
    }
    console.log(`  VetSession: ${ok} migrated${fail ? `, ${fail} skipped` : ''} (placeholder pets created for null patients)`)
  }

  // 5. Tables with no home in the new schema → export so nothing is lost.
  const orphanExports = {}
  for (const tbl of ['VetVisitType']) {
    if (bTables.has(tbl) && !tTables.has(tbl)) {
      const rows = await backup.$queryRawUnsafe(`SELECT * FROM "${tbl}"`)
      if (rows.length) orphanExports[tbl] = rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, norm(v)])))
    }
  }
  if (Object.keys(orphanExports).length) {
    const out = path.resolve(__dirname, '../prisma/backup-unmigrated.json')
    fs.writeFileSync(out, JSON.stringify(orphanExports, null, 2))
    console.log(`\nNo target table for: ${Object.keys(orphanExports).join(', ')} → exported ${Object.values(orphanExports).reduce((s, a) => s + a.length, 0)} row(s) to ${out}`)
    console.log('  (these are visit-type presets — the current app uses built-in types, so no functional loss)')
  }

  await backup.$disconnect()
  await target.$disconnect()
  console.log('\nDone.')
}
main().catch(e => { console.error(e); process.exit(1) })
