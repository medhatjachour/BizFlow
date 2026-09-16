/**
 * Desktop performance / stress benchmark.
 *
 * Runs the real main-process code paths against a seeded, throw-away SQLite
 * database that is opened with the *production* Prisma client configuration
 * (datasource flags, serializable transactions, the six PRAGMAs), so the
 * latencies here are representative of a packaged app rather than of a
 * hand-tuned test database.
 *
 * This file only records measurements; `scripts/perf/desktop/report.mjs` turns
 * them into percentiles, budgets and a Markdown report.
 *
 *   npm run perf:bench            # from apps/Bizflow
 *   PERF_SCALE=0.25 npm run perf:bench
 */

import { afterAll, beforeAll, describe, test } from 'vitest'
import { ProductRepository } from '@/main/repositories/ProductRepository'
import { createPerfDatabase, resolveScale, seedDataset, type PerfDatabase } from './support/perfDb'
import { PerfRecorder, logLine, writeRawReport, type PerfRow } from './support/perfMeasure'

const ITERATIONS = Number(process.env.PERF_ITERATIONS ?? 30)
const WARMUP = Number(process.env.PERF_WARMUP ?? 5)
const DAY = 86_400_000

/** Local-SSD budgets: a breach means something regressed badly, not noise. */
const BUDGET = {
  catalogPage: { p95: 200, p99: 400 },
  catalogDeepPage: { p95: 300, p99: 600 },
  catalogSearch: { p95: 600, p99: 1200 },
  catalogLowStock: { p95: 200, p99: 400 },
  checkout: { p95: 400, p99: 800 },
  dailySales: { p95: 300, p99: 600 },
  topProducts: { p95: 400, p99: 800 },
  salesByDay: { p95: 500, p99: 1000 },
  salesByMonth: { p95: 600, p99: 1200 },
  inventoryLedger: { p95: 200, p99: 400 },
  inventoryValuation: { p95: 600, p99: 1200 },
  hrDirectory: { p95: 150, p99: 300 },
  payrollSummary: { p95: 400, p99: 800 },
  payrollPeriod: { p95: 300, p99: 600 },
  expenseSummary: { p95: 400, p99: 800 },
  purchaseOrders: { p95: 250, p99: 500 }
} as const

let db: PerfDatabase | undefined
let recorder: PerfRecorder | undefined
let scale = 1

interface Fixtures {
  repo: ProductRepository
  prisma: any
  productIds: string[]
  variantIds: string[]
  saleIds: string[]
  employeeId: string
  userId: string
  sampleVariantId: string
}

let fixtures: Fixtures | undefined

async function setup(): Promise<Fixtures> {
  scale = resolveScale()
  db = await createPerfDatabase()
  const prisma = db.prisma
  const seed = await seedDataset(prisma, scale)

  const [products, variants, sales, employee, user] = await Promise.all([
    prisma.product.findMany({ take: 200, select: { id: true } }),
    prisma.productVariant.findMany({
      take: 200,
      select: { id: true, stock: true },
      orderBy: { stock: 'desc' }
    }),
    prisma.saleTransaction.findMany({
      take: 50,
      select: { id: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.employee.findFirst({ where: { status: 'active' }, select: { id: true } }),
    prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
  ])

  logLine(
    `[bench] scale=${scale} schema=${db.source} seed=${seed.insertMs}ms ` +
      `${seed.products} products / ${seed.sales} sales / ${seed.saleItems} sale items / ` +
      `${seed.employees} employees / ${seed.payrollRecords} payroll rows`
  )

  return {
    repo: new ProductRepository(prisma),
    prisma,
    productIds: products.map((p: any) => p.id),
    variantIds: variants.map((v: any) => v.id),
    saleIds: sales.map((s: any) => s.id),
    employeeId: employee?.id ?? '',
    userId: user?.id ?? '',
    // Highest-stock variant, so 30 checkout iterations never drive it negative.
    sampleVariantId: variants[0]?.id ?? ''
  }
}

function measure(
  id: string,
  group: string,
  description: string,
  operation: () => Promise<unknown>,
  budget?: { p95: number; p99: number }
): Promise<PerfRow> {
  if (!recorder) throw new Error('recorder not ready')
  return recorder.measure(id, group, description, operation, {
    warmup: WARMUP,
    iterations: ITERATIONS,
    budget: budget ? { ...budget, maxErrorRate: 0 } : undefined
  })
}

beforeAll(async () => {
  fixtures = await setup()
  recorder = new PerfRecorder()
}, 1_200_000)

afterAll(async () => {
  if (recorder && db && fixtures) {
    const rows = recorder.all
    const tables: Record<string, number> = {}
    for (const model of [
      'product',
      'productVariant',
      'saleTransaction',
      'saleItem',
      'stockMovement',
      'employee',
      'employeePayroll',
      'commerceExpense',
      'customer',
      'supplier',
      'purchaseOrder'
    ]) {
      tables[model] = await fixtures.prisma[model]
        .count()
        .catch(() => -1)
    }

    const file = writeRawReport({
      generatedAt: new Date().toISOString(),
      platform: `${process.platform}-${process.arch}`,
      node: process.version,
      scale,
      db: { file: db.file, schemaSource: db.source },
      seed: {
        tables,
        note: 'deterministic seed, same rows on every run'
      },
      rows
    })
    logLine(`[bench] ${rows.length} workloads in ${(recorder.elapsedMs / 1000).toFixed(1)}s -> ${file}`)
  }
  await db?.dispose()
}, 120_000)

describe('desktop performance benchmark', () => {
  test('catalogue: browse, paginate and search', async () => {
    const { repo, productIds } = fixtures as Fixtures
    await measure(
      'catalog.page-1',
      'catalogue',
      'findPaginated(1, 50) with variants + images',
      async () => {
        const page = await repo.findPaginated(1, 50)
        if (page.data.length === 0) throw new Error('empty catalogue')
        return page
      },
      BUDGET.catalogPage
    )
    await measure(
      'catalog.deep-page',
      'catalogue',
      'findPaginated over the tail of a 4 000-row catalogue',
      () => repo.findPaginated(70, 50),
      BUDGET.catalogDeepPage
    )
    await measure(
      'catalog.search',
      'catalogue',
      'search("Blue") across name/SKU/category/description',
      async () => {
        const hits = await repo.search('Blue')
        if (hits.length === 0) throw new Error('search returned nothing')
        return hits
      },
      BUDGET.catalogSearch
    )
    await measure(
      'catalog.low-stock',
      'catalogue',
      'findLowStock(10) — the reorder list',
      async () => {
        const low = await repo.findLowStock(10)
        if (low.length === 0) throw new Error('low-stock list is empty')
        return low
      },
      BUDGET.catalogLowStock
    )
    await measure('catalog.by-id', 'catalogue', 'findById with relations', () => repo.findById(productIds[7]))
  })

  test('pos: complete a sale', async () => {
    const { prisma, sampleVariantId, userId } = fixtures as Fixtures
    const variant = await prisma.productVariant.findUnique({
      where: { id: sampleVariantId },
      select: { productId: true, price: true }
    })

    await measure(
      'pos.checkout',
      'pos',
      'serializable transaction: sale + 3 items + stock decrement + movements',
      async () => {
        const quantity = 1
        const linePrice = variant.price
        const items = [0, 1, 2].map(() => ({
          productId: variant.productId,
          variantId: sampleVariantId,
          quantity,
          price: linePrice
        }))
        const subtotal = linePrice * items.length

        return prisma.$transaction(
          async (tx: any) => {
            const sale = await tx.saleTransaction.create({
              data: {
                userId,
                customerId: null,
                paymentMethod: 'cash',
                status: 'completed',
                completedAt: new Date(),
                subtotal,
                tax: 0,
                total: subtotal
              }
            })

            const created = await Promise.all(
              items.map((item) =>
                tx.saleItem.create({
                  data: {
                    transactionId: sale.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                    finalPrice: item.price,
                    total: item.price * item.quantity
                  }
                })
              )
            )

            await Promise.all(
              items.map(async (item) => {
                const current = await tx.productVariant.findUnique({ where: { id: item.variantId } })
                const previousStock = current.stock
                const newStock = previousStock - item.quantity
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { stock: newStock }
                })
                await tx.stockMovement.create({
                  data: {
                    variantId: item.variantId,
                    type: 'SALE',
                    quantity: -item.quantity,
                    previousStock,
                    newStock,
                    referenceId: sale.id,
                    userId
                  }
                })
              })
            )

            return { sale, items: created }
          },
          { isolationLevel: 'Serializable', maxWait: 30_000, timeout: 30_000 }
        )
      },
      BUDGET.checkout
    )
  })

  test('dashboard: the KPI queries the landing screen runs', async () => {
    const { prisma } = fixtures as Fixtures
    const since = new Date(Date.now() - DAY)

    await measure(
      'dashboard.daily-sales',
      'dashboard',
      'aggregate of today + yesterday: count, sum, average basket',
      async () => {
        const [count, totals] = await Promise.all([
          prisma.saleTransaction.count({ where: { createdAt: { gte: since } } }),
          prisma.saleTransaction.aggregate({
            where: { status: 'completed' },
            _sum: { total: true },
            _avg: { total: true },
            _count: { _all: true }
          })
        ])
        return { count, totals }
      },
      BUDGET.dailySales
    )

    await measure(
      'dashboard.top-products',
      'dashboard',
      'saleItem groupBy(productId) over 90 days joined to product names',
      async () => {
        const grouped = await prisma.saleItem.groupBy({
          by: ['productId'],
          where: { transaction: { createdAt: { gte: new Date(Date.now() - 90 * DAY) } } },
          _sum: { total: true, quantity: true },
          orderBy: { _sum: { total: 'desc' } },
          take: 10
        })
        return prisma.product.findMany({ where: { id: { in: grouped.map((g: any) => g.productId) } } })
      },
      BUDGET.topProducts
    )
  })

  test('reports: sales over time', async () => {
    const { prisma } = fixtures as Fixtures
    await measure(
      'reports.sales-by-day',
      'reports',
      'last 30 days grouped by day (date() over 12k sales)',
      () =>
        prisma.$queryRawUnsafe(
          `SELECT date(createdAt) AS day, COUNT(*) AS sales, SUM(total) AS revenue
             FROM SaleTransaction
            WHERE status = 'completed' AND createdAt >= ?
            GROUP BY day ORDER BY day DESC`,
          new Date(Date.now() - 30 * DAY)
        ),
      BUDGET.salesByDay
    )
    await measure(
      'reports.sales-by-month',
      'reports',
      'a full year grouped by month',
      () =>
        prisma.$queryRawUnsafe(
          `SELECT strftime('%Y-%m', createdAt) AS month, COUNT(*) AS sales, SUM(total) AS revenue
             FROM SaleTransaction
            WHERE status = 'completed'
            GROUP BY month ORDER BY month DESC`
        ),
      BUDGET.salesByMonth
    )
  })

  test('inventory: ledger and valuation', async () => {
    const { prisma, variantIds } = fixtures as Fixtures
    await measure(
      'inventory.ledger',
      'inventory',
      'newest 50 stock movements for one variant + total count',
      async () => {
        const [movements, total] = await Promise.all([
          prisma.stockMovement.findMany({
            where: { variantId: variantIds[3] },
            orderBy: { createdAt: 'desc' },
            take: 50
          }),
          prisma.stockMovement.count({ where: { variantId: variantIds[3] } })
        ])
        return { movements, total }
      },
      BUDGET.inventoryLedger
    )
    await measure(
      'inventory.valuation',
      'inventory',
      'stock-on-hand valuation across the whole catalogue',
      () => prisma.$queryRawUnsafe(`SELECT COUNT(*) AS variants, SUM(stock) AS units, SUM(stock * price) AS value FROM ProductVariant`),
      BUDGET.inventoryValuation
    )
  })

  test('hr: employee directory and payroll', async () => {
    const { prisma, employeeId } = fixtures as Fixtures
    const reference = new Date()

    await measure(
      'hr.directory',
      'hr',
      'first page of the employee table + headcount',
      async () => {
        const [rows, total] = await Promise.all([
          prisma.employee.findMany({
            where: { status: 'active' },
            orderBy: { name: 'asc' },
            take: 25
          }),
          prisma.employee.count({ where: { status: 'active' } })
        ])
        return { rows, total }
      },
      BUDGET.hrDirectory
    )

    await measure(
      'hr.payroll-summary',
      'hr',
      '12-month payroll totals grouped by month',
      () =>
        prisma.employeePayroll.groupBy({
          by: ['year', 'month', 'status'],
          _sum: { grossPay: true, netPay: true, deductions: true },
          _count: { _all: true }
        }),
      BUDGET.payrollSummary
    )

    await measure(
      'hr.payroll-period',
      'hr',
      'one employee, one year of payslips',
      () =>
        prisma.employeePayroll.findMany({
          where: { employeeId, year: { gte: reference.getUTCFullYear() - 1 } },
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        }),
      BUDGET.payrollPeriod
    )
  })

  test('finance: expenses and purchasing', async () => {
    const { prisma } = fixtures as Fixtures
    await measure(
      'finance.expenses-by-category',
      'finance',
      '12-month expense totals grouped by category',
      () =>
        prisma.commerceExpense.groupBy({
          by: ['category'],
          where: { date: { gte: new Date(Date.now() - 365 * DAY) } },
          _sum: { amount: true },
          _count: { _all: true },
          orderBy: { _sum: { amount: 'desc' } }
        }),
      BUDGET.expenseSummary
    )
    await measure(
      'finance.purchase-orders',
      'finance',
      'purchase order list page with supplier and lines',
      () =>
        prisma.purchaseOrder.findMany({
          include: { supplier: true, items: true },
          orderBy: { orderDate: 'desc' },
          take: 25
        }),
      BUDGET.purchaseOrders
    )
  })
})
