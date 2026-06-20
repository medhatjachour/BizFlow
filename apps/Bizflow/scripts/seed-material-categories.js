const path = require('path')
const { PrismaClient } = require('../src/generated/prisma/index.js')
const dbPath = path.resolve(__dirname, '../prisma/dev.db')
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } })

const DEFAULT_CATEGORIES = [
  { name: 'Dental',      color: 'teal',    sortOrder: 0 },
  { name: 'Surgical',    color: 'violet',  sortOrder: 1 },
  { name: 'Consumable',  color: 'blue',    sortOrder: 2 },
  { name: 'Device',      color: 'indigo',  sortOrder: 3 },
  { name: 'Medication',  color: 'emerald', sortOrder: 4 },
  { name: 'Laboratory',  color: 'cyan',    sortOrder: 5 },
  { name: 'Other',       color: 'slate',   sortOrder: 6 },
]

async function run() {
  for (const cat of DEFAULT_CATEGORIES) {
    try {
      await prisma.clinicMaterialCategory.upsert({
        where: { name: cat.name },
        create: cat,
        update: { color: cat.color, sortOrder: cat.sortOrder },
      })
    } catch (e) {
      console.log('Skip', cat.name, e.message)
    }
  }
  const all = await prisma.clinicMaterialCategory.findMany({ orderBy: { sortOrder: 'asc' } })
  console.log('Categories seeded:', all.map(c => `${c.name} (${c.color})`).join(', '))
  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
