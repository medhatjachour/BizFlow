const path = require('path')
const { PrismaClient } = require('../src/generated/prisma/index.js')
const dbPath = path.resolve(__dirname, '../prisma/dev.db')
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } })

async function run() {
  const count = await prisma.clinicMaterial.count()
  const batchCount = await prisma.clinicMaterialBatch.count()
  const categoryCount = await prisma.clinicMaterialCategory.count()
  console.log(`ClinicMaterial rows: ${count}`)
  console.log(`ClinicMaterialBatch rows: ${batchCount}`)
  console.log(`ClinicMaterialCategory rows: ${categoryCount}`)
  if (count > 0) {
    const mats = await prisma.clinicMaterial.findMany({ take: 3 })
    mats.forEach(m => console.log(' -', m.name, '| qty:', m.quantity, '| category:', m.category))
  }
  await prisma.$disconnect()
}
run().catch(e => { console.error(e); process.exit(1) })
