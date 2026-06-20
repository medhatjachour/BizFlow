const path = require('path')
const { PrismaClient } = require('../src/generated/prisma/index.js')
const dbPath = path.resolve(__dirname, '../prisma/dev.db')
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } })

async function run() {
  const tables = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  )
  console.log('Tables in prisma/dev.db:')
  console.log(tables.map(t => t.name).join('\n'))
  await prisma.$disconnect()
}
run().catch(e => { console.error(e); process.exit(1) })
