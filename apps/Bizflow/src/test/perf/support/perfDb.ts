/**
 * Throw-away SQLite database for the desktop performance benchmark.
 *
 * Two rules, both non-negotiable:
 *
 *  1. The user's real database is never opened. `prisma/dev.db` is only ever
 *     read as a *template* (copied) or as a schema source for `prisma db push`.
 *  2. The client is configured exactly like the production main process
 *     (`src/main/ipc/handlers/index.ts`): same datasource query string, the
 *     same PRAGMAs, the same Serializable transaction options. A benchmark on a
 *     differently configured client would measure the wrong thing.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

/** `apps/Bizflow` */
export const APP_ROOT = path.resolve(here, '..', '..', '..', '..')

/** Same connection string the desktop app uses. */
export function connectionString(dbPath: string): string {
  return `file:${dbPath}?connection_limit=1&timeout=60000&journal_mode=WAL`
}

/**
 * Multiply the dataset size. `PERF_SCALE=0.25` keeps a CI run short while still
 * exercising every index; `1` is the "busy shop one year in" dataset.
 */
export function resolveScale(): number {
  const raw = Number(process.env.PERF_SCALE ?? '1')
  if (!Number.isFinite(raw) || raw <= 0) return 1
  return raw
}

export interface PerfDatabase {
  dir: string
  file: string
  prisma: any
  source: string
  dispose: () => Promise<void>
}

/**
 * Build the schema. Copying `prisma/dev.db` (schema only, empty in a clean
 * checkout) is instant; `prisma db push` is the fallback for a fresh clone or a
 * CI runner that has no local database yet.
 */
function materialiseSchema(target: string): string {
  const template = path.join(APP_ROOT, 'prisma', 'dev.db')
  if (fs.existsSync(template) && fs.statSync(template).size > 0) {
    fs.copyFileSync(template, target)
    return 'copied local dev.db template'
  }

  const schema = path.join(APP_ROOT, 'prisma', 'merged.prisma')
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'db', 'push', `--schema=${schema}`, '--accept-data-loss', '--skip-generate'],
    {
      cwd: APP_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${target}` },
      stdio: 'pipe',
      timeout: 300_000
    }
  )
  return 'prisma db push (fresh schema)'
}

/** Models the benchmark touches, deleted child-first. */
const WIPE_ORDER = [
  'saleItem',
  'saleTransaction',
  'stockMovement',
  'productVariant',
  'product',
  'category',
  'customer',
  'commerceExpense',
  'employeePayroll',
  'payrollRun',
  'employee',
  'supplierProduct',
  'purchaseOrderItem',
  'purchaseOrder',
  'supplier',
  'store',
  'user'
]

async function wipe(prisma: any): Promise<void> {
  for (const model of WIPE_ORDER) {
    const delegate = prisma[model]
    if (delegate?.deleteMany) await delegate.deleteMany({})
  }
}

export async function createPerfDatabase(): Promise<PerfDatabase> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bizflow-perf-'))
  const file = path.join(dir, 'perf.db')
  const source = materialiseSchema(file)

  const prisma = new PrismaClient({
    datasources: { db: { url: connectionString(file) } },
    log: ['error'],
    transactionOptions: { maxWait: 30_000, timeout: 30_000, isolationLevel: 'Serializable' }
  })

  for (const pragma of [
    'PRAGMA journal_mode = WAL;',
    'PRAGMA synchronous = NORMAL;',
    'PRAGMA cache_size = -65536;',
    'PRAGMA temp_store = MEMORY;',
    'PRAGMA mmap_size = 536870912;',
    'PRAGMA busy_timeout = 10000;'
  ]) {
    await prisma.$queryRawUnsafe(pragma)
  }

  await wipe(prisma)

  return {
    dir,
    file,
    prisma,
    source,
    dispose: async () => {
      await prisma.$disconnect().catch(() => undefined)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
}

/**
 * Deterministic PRNG, so two runs of the benchmark see the same rows and the
 * numbers stay comparable.
 */
export function makeRandom(seed = 0x5eed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

async function insertMany(prisma: any, model: string, rows: any[], chunk = 1000): Promise<void> {
  for (let i = 0; i < rows.length; i += chunk) {
    await prisma[model].createMany({ data: rows.slice(i, i + chunk) })
  }
}

export interface SeedSummary {
  categories: number
  products: number
  variants: number
  customers: number
  sales: number
  saleItems: number
  stockMovements: number
  employees: number
  payrollRecords: number
  expenses: number
  suppliers: number
  purchaseOrders: number
  purchaseOrderItems: number
  insertMs: number
}

/**
 * Seed a dataset that looks like a busy multi-store shop one year in: a year of
 * sales spread over every weekday, a low-stock tail, HR payroll history, and
 * expense records, so every dashboard/report query has something to chew on.
 */
export async function seedDataset(prisma: any, scale: number): Promise<SeedSummary> {
  const started = Date.now()
  const random = makeRandom()
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)]
  const round = (value: number, to = 2) => Number(value.toFixed(to))
  const id = (prefix: string, i: number) => `${prefix}-${String(i).padStart(6, '0')}`

  const now = Date.now()
  const DAY = 86_400_000

  const stores = Array.from({ length: Math.max(1, Math.round(3 * Math.min(1, scale))) }, (_, i) => ({
    id: id('store', i),
    name: `Store ${i + 1}`,
    location: `City ${i + 1}`,
    phone: `+1000000${i}`,
    hours: '09:00-21:00',
    manager: `Manager ${i + 1}`,
    status: 'active'
  }))
  await insertMany(prisma, 'store', stores)

  const users = [
    {
      id: 'user-admin',
      username: 'perf-admin',
      passwordHash: 'x',
      role: 'admin',
      fullName: 'Perf Admin',
      email: 'perf-admin@example.invalid',
      isActive: true
    },
    ...[0, 1, 2, 3, 4].map((i) => ({
      id: id('user', i),
      username: `perf-cashier-${i}`,
      passwordHash: 'x',
      role: 'sales',
      fullName: `Cashier ${i}`,
      email: `perf-cashier-${i}@example.invalid`,
      isActive: true
    }))
  ]
  await insertMany(prisma, 'user', users)

  const categories = Array.from(
    { length: Math.max(4, Math.round(40 * Math.min(1, scale))) },
    (_, i) => ({ id: id('cat', i), name: `Category ${i}`, description: `Perf category ${i}` })
  )
  await insertMany(prisma, 'category', categories)

  const products: any[] = []
  const variants: any[] = []
  for (let i = 0; i < Math.round(4000 * scale); i += 1) {
    const category = pick(categories)
    const price = round(5 + random() * 195)
    const productId = id('prod', i)
    products.push({
      id: productId,
      name: `Product ${i} ${['Blue', 'Red', 'XL', 'Pro', 'Lite'][i % 5]}`,
      baseSKU: `SKU-${String(i).padStart(6, '0')}`,
      categoryId: category.id,
      description: `Perf product ${i}`,
      basePrice: price,
      baseCost: round(price * 0.6),
      hasVariants: i % 4 === 0,
      storeId: stores[i % stores.length].id,
      createdAt: new Date(now - Math.floor(random() * 365) * DAY)
    })
    variants.push({
      id: id('var', i),
      productId,
      sku: `SKU-${String(i).padStart(6, '0')}-01`,
      price,
      cost: round(price * 0.6),
      // ~8% of the catalogue sits under its reorder point on purpose: the
      // low-stock list is a real screen and it must not come back empty.
      stock: i % 12 === 0 ? Math.floor(random() * 8) : 20 + Math.floor(random() * 500),
      reorderPoint: 10
    })
  }
  await insertMany(prisma, 'product', products)
  await insertMany(prisma, 'productVariant', variants)

  const customers = Array.from({ length: Math.round(400 * scale) }, (_, i) => ({
    id: id('cust', i),
    name: `Customer ${i}`,
    email: i % 3 === 0 ? `customer-${i}@example.invalid` : null,
    phone: `+2000${String(i).padStart(6, '0')}`,
    loyaltyTier: ['Bronze', 'Silver', 'Gold'][i % 3],
    totalSpent: round(random() * 5000),
    createdAt: new Date(now - Math.floor(random() * 400) * DAY)
  }))
  await insertMany(prisma, 'customer', customers)

  const sales: any[] = []
  const saleItems: any[] = []
  const stockMovements: any[] = []
  for (let i = 0; i < Math.round(12_000 * scale); i += 1) {
    const itemCount = 1 + Math.floor(random() * 4)
    const saleId = id('sale', i)
    const createdAt = new Date(now - Math.floor(random() * 365) * DAY - Math.floor(random() * DAY))
    let subtotal = 0
    for (let j = 0; j < itemCount; j += 1) {
      const variant = pick(variants)
      const quantity = 1 + Math.floor(random() * 3)
      const total = round(variant.price * quantity)
      subtotal = round(subtotal + total)
      saleItems.push({
        id: `${saleId}-item-${j}`,
        transactionId: saleId,
        productId: variant.productId,
        variantId: variant.id,
        quantity,
        price: variant.price,
        finalPrice: variant.price,
        total,
        createdAt
      })
      stockMovements.push({
        id: `${saleId}-mv-${j}`,
        variantId: variant.id,
        type: 'SALE',
        quantity: -quantity,
        previousStock: variant.stock,
        newStock: variant.stock - quantity,
        referenceId: saleId,
        userId: users[1 + (i % 5)].id,
        createdAt
      })
    }
    const tax = round(subtotal * 0.14)
    sales.push({
      id: saleId,
      userId: users[1 + (i % 5)].id,
      customerId: i % 2 === 0 ? customers[i % customers.length].id : null,
      paymentMethod: i % 3 === 0 ? 'card' : 'cash',
      status: 'completed',
      completedAt: createdAt,
      subtotal,
      tax,
      total: round(subtotal + tax),
      createdAt
    })
  }
  await insertMany(prisma, 'saleTransaction', sales)
  await insertMany(prisma, 'saleItem', saleItems)
  await insertMany(prisma, 'stockMovement', stockMovements)

  const employees = Array.from({ length: Math.round(120 * scale) }, (_, i) => ({
    id: id('emp', i),
    name: `Employee ${i}`,
    role: ['Cashier', 'Manager', 'Warehouse', 'Accountant', 'Sales Rep'][i % 5],
    department: ['Sales', 'Operations', 'Finance', 'Warehouse'][i % 4],
    email: `employee-${i}@example.invalid`,
    phone: `+3000${String(i).padStart(6, '0')}`,
    employmentType: i % 7 === 0 ? 'part-time' : 'full-time',
    status: i % 23 === 0 ? 'on-leave' : 'active',
    hireDate: new Date(now - Math.floor(random() * 1200) * DAY),
    salary: round(2000 + random() * 4000),
    salaryType: 'monthly',
    annualLeaveDays: 21,
    performanceScore: round(50 + random() * 50, 1),
    createdAt: new Date(now - Math.floor(random() * 1200) * DAY)
  }))
  await insertMany(prisma, 'employee', employees)

  const payroll: any[] = []
  const reference = new Date()
  for (let m = 0; m < 12; m += 1) {
    const period = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - m, 1)
    )
    for (const employee of employees) {
      const base = employee.salary
      const overtimeHours = Math.floor(random() * 20)
      const overtimePay = round((base / 208) * 1.5 * overtimeHours)
      const bonuses = random() > 0.8 ? 250 : 0
      const deductions = round(base * 0.11)
      const gross = round(base + overtimePay + bonuses)
      payroll.push({
        id: `pay-${period.getUTCFullYear()}-${period.getUTCMonth() + 1}-${employee.id}`,
        employeeId: employee.id,
        month: period.getUTCMonth() + 1,
        year: period.getUTCFullYear(),
        periodType: 'monthly',
        periodKey: `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, '0')}`,
        periodStart: period,
        periodEnd: new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 0)),
        baseSalary: base,
        regularHours: 208,
        overtimeHours,
        overtimePay,
        bonuses,
        deductions,
        grossPay: gross,
        netPay: round(gross - deductions),
        status: m === 0 ? 'pending' : 'paid',
        paidDate: m === 0 ? null : period,
        createdAt: period
      })
    }
  }
  await insertMany(prisma, 'employeePayroll', payroll)

  const expenses = Array.from({ length: Math.round(2000 * scale) }, (_, i) => {
    const date = new Date(now - Math.floor(random() * 365) * DAY)
    return {
      id: id('exp', i),
      date,
      category: ['rent', 'utilities', 'marketing', 'supplies', 'salaries', 'other'][i % 6],
      description: `Expense ${i}`,
      amount: round(50 + random() * 4000),
      vendor: `Vendor ${i % 60}`,
      paymentMethod: ['cash', 'card', 'bank_transfer', 'cheque'][i % 4],
      recurrence: 'one_time',
      createdAt: date
    }
  })
  await insertMany(prisma, 'commerceExpense', expenses)

  const suppliers = Array.from({ length: Math.round(60 * scale) }, (_, i) => ({
    id: id('sup', i),
    name: `Supplier ${i}`,
    contactName: `Contact ${i}`,
    email: `supplier-${i}@example.invalid`,
    phone: `+4000${String(i).padStart(6, '0')}`,
    isActive: true
  }))
  await insertMany(prisma, 'supplier', suppliers)

  const purchaseOrders: any[] = []
  const purchaseOrderItems: any[] = []
  for (let i = 0; i < Math.round(300 * scale); i += 1) {
    const orderDate = new Date(now - Math.floor(random() * 365) * DAY)
    const lineCount = 1 + Math.floor(random() * 4)
    let totalAmount = 0
    for (let j = 0; j < lineCount; j += 1) {
      const variant = pick(variants)
      const quantity = 10 + Math.floor(random() * 90)
      const unitCost = round(variant.price * 0.6)
      const totalCost = round(unitCost * quantity)
      totalAmount = round(totalAmount + totalCost)
      purchaseOrderItems.push({
        id: `po-${String(i).padStart(5, '0')}-line-${j}`,
        purchaseOrderId: id('po', i),
        productId: variant.productId,
        variantId: variant.id,
        quantity,
        unitCost,
        totalCost,
        receivedQty: 0,
        createdAt: orderDate
      })
    }
    purchaseOrders.push({
      id: id('po', i),
      poNumber: `PO-${String(i).padStart(5, '0')}`,
      supplierId: suppliers[i % suppliers.length].id,
      status: ['draft', 'ordered', 'received', 'cancelled'][i % 4],
      orderDate,
      expectedDate: new Date(orderDate.getTime() + 7 * DAY),
      totalAmount,
      orderedBy: users[0].id,
      createdAt: orderDate
    })
  }
  await insertMany(prisma, 'purchaseOrder', purchaseOrders)
  await insertMany(prisma, 'purchaseOrderItem', purchaseOrderItems)

  return {
    categories: categories.length,
    products: products.length,
    variants: variants.length,
    customers: customers.length,
    sales: sales.length,
    saleItems: saleItems.length,
    stockMovements: stockMovements.length,
    employees: employees.length,
    payrollRecords: payroll.length,
    expenses: expenses.length,
    suppliers: suppliers.length,
    purchaseOrders: purchaseOrders.length,
    purchaseOrderItems: purchaseOrderItems.length,
    insertMs: Date.now() - started
  }
}
