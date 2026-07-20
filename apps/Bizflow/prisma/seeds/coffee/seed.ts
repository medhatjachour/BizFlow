/// <reference types="node" />

/**
 * Coffee Shop Seed Data
 * Creates starter categories, products, tables, customers, and five years of
 * historical coffee orders/shifts for realistic reporting and finance data.
 * Run with: npm run prisma:seed:coffee
 */

import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { PrismaClient } from '../../../src/generated/prisma/index.js'

const prisma = new PrismaClient()

type SeedUser = { id: string; username: string; fullName: string }
type SeedCustomer = { id: string; name: string; phone: string; email: string | null; notes: string | null }
type SeedTable = { id: string; number: number; name?: string | null; section?: string | null }
type SeedProduct = {
  id: string
  name: string
  price: number
  cost: number
  stock: number
  category?: { name: string }
}

type ProductQuantityMap = Map<string, number>

const SEED_USER_DEFS = [
  { username: 'coffee.seed.nour', fullName: 'Nour Emad' },
  { username: 'coffee.seed.youssef', fullName: 'Youssef Adel' },
  { username: 'coffee.seed.mariam', fullName: 'Mariam Hany' },
  { username: 'coffee.seed.ziad', fullName: 'Ziad Tarek' }
]

const FIRST_NAMES = ['Ahmed', 'Sara', 'Omar', 'Layla', 'Karim', 'Nour', 'Yara', 'Mostafa', 'Hana', 'Mina', 'Salma', 'Malak', 'Adham', 'Farah', 'Hassan', 'Rana', 'Mariam', 'Tamer', 'Nadine', 'Aly']
const LAST_NAMES = ['Hassan', 'Mohamed', 'Ibrahim', 'Adel', 'Samir', 'Khaled', 'Mahmoud', 'Nabil', 'Fouad', 'Sayed', 'Shawky', 'Yehia', 'Hamdy', 'Soliman', 'Wael']
const CUSTOMER_NOTES = [null, null, null, 'No sugar', 'Extra hot', 'Prefers oat milk', 'Lactose free', 'Double shot lover', 'Call before delivery', 'Prefers window seat']
const DELIVERY_AREAS = ['Nasr City', 'Heliopolis', 'Maadi', 'Zamalek', 'Dokki', '6th of October', 'Sheikh Zayed', 'New Cairo', 'Mohandessin', 'Hadayek El Maadi']
const ITEM_NOTES = [undefined, undefined, undefined, 'No sugar', 'Extra ice', 'Extra shot', 'Light milk', 'Takeaway lid', 'Serve warm']

function makeRng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const rng = makeRng(20260720)

function randInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function chance(probability: number) {
  return rng() < probability
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(rng() * items.length)]
}

function weightedPick<T>(items: T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let threshold = rng() * total
  for (const item of items) {
    threshold -= weight(item)
    if (threshold <= 0) return item
  }
  return items[items.length - 1]
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addProductQuantity(quantities: ProductQuantityMap, productId: string, quantity: number) {
  quantities.set(productId, (quantities.get(productId) ?? 0) + quantity)
}

async function ensureSeedUsers(): Promise<SeedUser[]> {
  const users: SeedUser[] = []
  for (const def of SEED_USER_DEFS) {
    const user = await prisma.user.upsert({
      where: { username: def.username },
      update: { fullName: def.fullName, role: 'sales', isActive: true },
      create: {
        username: def.username,
        passwordHash: 'seeded-history-user-not-for-login',
        role: 'sales',
        fullName: def.fullName,
        isActive: true
      }
    })
    users.push({ id: user.id, username: user.username, fullName: user.fullName ?? user.username })
  }
  return users
}

async function ensureSeedCustomers(existing: SeedCustomer[]): Promise<SeedCustomer[]> {
  const starters = existing.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: c.notes
  }))

  const generated: SeedCustomer[] = []
  for (let i = 0; i < 120; i++) {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`
    const phone = `0155${String(1000000 + i).slice(-7)}`
    const email = `coffee.customer.${i + 1}@seed.local`
    const notes = CUSTOMER_NOTES[i % CUSTOMER_NOTES.length]
    const customer = await prisma.coffeeCustomer.upsert({
      where: { phone },
      update: { name, email, notes },
      create: { name, phone, email, notes, totalSpent: 0, visitCount: 0 }
    })
    generated.push({ id: customer.id, name: customer.name, phone: customer.phone ?? phone, email: customer.email, notes: customer.notes })
  }

  return [...starters, ...generated]
}

async function resetHistoricalData(seedUserIds: string[]) {
  await prisma.coffeeStockMovement.deleteMany({
    where: {
      notes: { in: ['Seeded incoming receipt history'] }
    }
  })
  await prisma.coffeeIncomingReceiptItem.deleteMany({
    where: { receipt: { receiptNumber: { startsWith: 'IN-SEED-' } } }
  })
  await prisma.coffeeIncomingReceipt.deleteMany({ where: { receiptNumber: { startsWith: 'IN-SEED-' } } })
  await prisma.coffeeOrder.deleteMany({ where: { orderNumber: { startsWith: 'HIST-' } } })
  await prisma.coffeeShift.deleteMany({ where: { cashierId: { in: seedUserIds } } })
}

function productWeight(product: SeedProduct) {
  const category = product.category?.name ?? ''
  if (category === 'Hot Drinks') return 12
  if (category === 'Cold Drinks') return 9
  if (category === 'Specialty Drinks') return 7
  if (category === 'Food & Snacks') return 6
  if (category === 'Fresh Juice') return 5
  return 4
}

async function createHistoricalData(
  users: SeedUser[],
  customers: SeedCustomer[],
  tables: SeedTable[],
  products: SeedProduct[]
): Promise<ProductQuantityMap> {
  const today = startOfDay(new Date())
  const start = startOfDay(new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()))
  const end = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))

  const shifts: any[] = []
  const orders: any[] = []
  const items: any[] = []
  const soldQuantities = new Map<string, number>()

  for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const progress = (current.getTime() - start.getTime()) / Math.max(end.getTime() - start.getTime(), 1)
    const weekday = current.getDay()
    const weekendBoost = weekday === 5 || weekday === 6 ? 2.2 : 0
    const summerBoost = [5, 6, 7].includes(current.getMonth()) ? 1.2 : 0
    const winterDrinkBoost = [11, 0, 1].includes(current.getMonth()) ? 0.8 : 0
    const baseDemand = 2.8 + progress * 2.4 + weekendBoost + summerBoost + winterDrinkBoost
    const orderCount = Math.max(2, Math.round(baseDemand + randInt(0, 4)))

    const cashier = pickOne(users)
    const shiftId = randomUUID()
    const openHour = weekday === 5 || weekday === 6 ? randInt(8, 10) : randInt(7, 9)
    const openMinute = pickOne([0, 15, 30, 45])
    const shiftOpenedAt = new Date(current)
    shiftOpenedAt.setHours(openHour, openMinute, 0, 0)
    const openingCash = roundMoney(650 + progress * 450 + randInt(0, 500))

    let shiftSales = 0
    let shiftPaidOrders = 0
    let cashTotal = 0
    let cardTotal = 0
    let vodafoneCashTotal = 0
    let latestClose = new Date(shiftOpenedAt)

    for (let orderIndex = 0; orderIndex < orderCount; orderIndex++) {
      const orderId = randomUUID()
      const minutesIntoShift = randInt(20, 660)
      const openedAt = new Date(shiftOpenedAt.getTime() + minutesIntoShift * 60000)
      const closedAt = new Date(openedAt.getTime() + randInt(8, 95) * 60000)
      if (closedAt > latestClose) latestClose = closedAt

      const typeRoll = rng()
      const type = typeRoll < 0.54 ? 'dine_in' : typeRoll < 0.82 ? 'takeaway' : 'delivery'
      const paymentRoll = rng()
      const paymentMethod = paymentRoll < 0.57 ? 'cash' : paymentRoll < 0.84 ? 'card' : 'vodafone_cash'
      const isVoided = chance(0.035)
      const table = type === 'dine_in' ? pickOne(tables) : null
      const customer = chance(type === 'delivery' ? 0.92 : 0.48) ? pickOne(customers) : null
      const linkCustomer = customer && chance(0.88)
      const customerName = customer ? customer.name : (chance(0.35) ? `${pickOne(FIRST_NAMES)} ${pickOne(LAST_NAMES)}` : null)
      const customerPhone = customer ? customer.phone : null
      const deliveryAddress = type === 'delivery' ? `${randInt(10, 180)} ${pickOne(['El Tahrir St', 'Omar Lotfy St', 'Palm Street', 'Nile Corniche', 'Gardenia Ave'])}, ${pickOne(DELIVERY_AREAS)}` : null
      const itemCount = type === 'dine_in' ? randInt(2, 5) : randInt(1, 4)
      const priceFactor = 0.72 + progress * 0.28

      let subtotal = 0
      const selectedProductIds = new Set<string>()
      for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
        let product = weightedPick(products, productWeight)
        let attempts = 0
        while (selectedProductIds.has(product.id) && attempts < 6) {
          product = weightedPick(products, productWeight)
          attempts++
        }
        selectedProductIds.add(product.id)

        const quantity = product.category?.name === 'Food & Snacks' ? randInt(1, 2) : randInt(1, 3)
        const unitPrice = roundMoney(Math.max(8, Math.round(product.price * priceFactor)))
        const total = roundMoney(unitPrice * quantity)
        subtotal += total

        if (!isVoided) addProductQuantity(soldQuantities, product.id, quantity)

        items.push({
          id: randomUUID(),
          orderId,
          productId: product.id,
          productName: product.name,
          unitPrice,
          quantity,
          total,
          notes: pickOne(ITEM_NOTES),
          status: isVoided ? 'pending' : pickOne(['ready', 'served', 'served', 'served']) ,
          createdAt: openedAt,
          updatedAt: closedAt
        })
      }

      const discount = chance(0.18) ? roundMoney(subtotal * (randInt(5, 15) / 100)) : 0
      const total = roundMoney(Math.max(0, subtotal - discount))
      const orderNumber = `HIST-${current.toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderIndex + 1).padStart(3, '0')}`

      if (!isVoided) {
        shiftSales += total
        shiftPaidOrders += 1
        if (paymentMethod === 'cash') cashTotal += total
        else if (paymentMethod === 'card') cardTotal += total
        else vodafoneCashTotal += total
      }

      orders.push({
        id: orderId,
        orderNumber,
        type,
        tableId: table?.id ?? null,
        customerName,
        customerPhone,
        deliveryAddress,
        customerId: linkCustomer ? customer?.id ?? null : null,
        cashierId: cashier.id,
        shiftId,
        status: isVoided ? 'voided' : 'paid',
        paymentMethod: isVoided ? null : paymentMethod,
        subtotal,
        discount,
        tax: 0,
        total,
        notes: type === 'delivery' ? 'Please handle carefully' : (chance(0.1) ? 'VIP regular order' : null),
        openedAt,
        closedAt,
        createdAt: openedAt,
        updatedAt: closedAt
      })
    }

    const closingCash = roundMoney(openingCash + cashTotal + randInt(-40, 35))
    shifts.push({
      id: shiftId,
      cashierId: cashier.id,
      status: 'closed',
      openingCash,
      closingCash,
      totalSales: roundMoney(shiftSales),
      totalOrders: shiftPaidOrders,
      cashTotal: roundMoney(cashTotal),
      cardTotal: roundMoney(cardTotal),
      vodafoneCashTotal: roundMoney(vodafoneCashTotal),
      cashDifference: roundMoney(closingCash - (openingCash + cashTotal)),
      notes: chance(0.16) ? pickOne(['Busy afternoon rush', 'Smooth handover', 'Strong delivery demand', 'Weekend promo traffic', 'Heavy dine-in evening']) : null,
      openedAt: shiftOpenedAt,
      closedAt: latestClose,
      createdAt: shiftOpenedAt,
      updatedAt: latestClose
    })
  }

  for (const batch of chunk(shifts, 200)) {
    await prisma.coffeeShift.createMany({ data: batch })
  }
  for (const batch of chunk(orders, 300)) {
    await prisma.coffeeOrder.createMany({ data: batch })
  }
  for (const batch of chunk(items, 800)) {
    await prisma.coffeeOrderItem.createMany({ data: batch })
  }

  console.log(`  ✅ ${shifts.length} historical shifts seeded`)
  console.log(`  ✅ ${orders.length} historical orders seeded`)
  console.log(`  ✅ ${items.length} historical order items seeded`)

  return soldQuantities
}

async function createHistoricalIncomingReceipts(
  users: SeedUser[],
  products: SeedProduct[],
  soldQuantities: ProductQuantityMap
) {
  const today = startOfDay(new Date())
  const start = startOfDay(new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()))
  const end = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))
  const byProduct = new Map<string, number>(products.map(product => [product.id, product.stock]))
  const suppliers = ['Bean House Trading', 'Delta Coffee Supply', 'Nile Dairy Co.', 'Fresh Harvest Produce', 'Bakery Source Egypt', 'Premium Syrups Co.']
  const receipts: any[] = []
  const receiptItems: any[] = []
  const stockMovements: any[] = []
  let receiptNumberCounter = 1

  for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const weekday = current.getDay()
    const shouldRestock = weekday === 1 || weekday === 4 || chance(0.08)
    if (!shouldRestock) continue

    const receiptId = randomUUID()
    const createdBy = pickOne(users)
    const itemCount = randInt(2, 6)
    const receiptDate = new Date(current)
    receiptDate.setHours(randInt(7, 11), pickOne([0, 15, 30, 45]), 0, 0)
    const selected = new Set<string>()
    let totalCost = 0

    receipts.push({
      id: receiptId,
      receiptNumber: `IN-SEED-${String(receiptNumberCounter++).padStart(6, '0')}`,
      supplierName: pickOne(suppliers),
      invoiceNumber: `SUP-${receiptDate.getFullYear()}-${randInt(1000, 9999)}`,
      receivedAt: receiptDate,
      totalCost: 0,
      notes: chance(0.2) ? pickOne(['Weekly refill', 'Emergency restock before weekend', 'Milk and perishables delivery', 'Monthly dry goods refill']) : null,
      createdById: createdBy.id,
      createdAt: receiptDate,
      updatedAt: receiptDate
    })

    for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
      let product = weightedPick(products, productWeight)
      let attempts = 0
      while (selected.has(product.id) && attempts < 8) {
        product = weightedPick(products, productWeight)
        attempts++
      }
      selected.add(product.id)

      const previousStock = byProduct.get(product.id) ?? product.stock
      const quantity = product.category?.name === 'Food & Snacks' ? randInt(6, 18) : randInt(10, 45)
      const unitCost = roundMoney(Math.max(1, product.cost * (0.92 + rng() * 0.22)))
      const lineTotal = roundMoney(quantity * unitCost)
      const newStock = previousStock + quantity
      byProduct.set(product.id, newStock)
      totalCost += lineTotal

      receiptItems.push({
        id: randomUUID(),
        receiptId,
        productId: product.id,
        productName: product.name,
        quantity,
        unitCost,
        lineTotal,
        notes: chance(0.12) ? pickOne(['Promo pricing', 'Seasonal batch', 'Urgent top-up', 'Fresh delivery']) : null,
        createdAt: receiptDate,
        updatedAt: receiptDate
      })

      stockMovements.push({
        id: randomUUID(),
        productId: product.id,
        type: 'restock',
        quantity,
        previousStock,
        newStock,
        reason: 'Incoming receipt',
        referenceId: receiptId,
        notes: 'Seeded incoming receipt history',
        createdAt: receiptDate
      })
    }

    receipts[receipts.length - 1].totalCost = roundMoney(totalCost)
  }

  for (const batch of chunk(receipts, 200)) {
    await prisma.coffeeIncomingReceipt.createMany({ data: batch })
  }
  for (const batch of chunk(receiptItems, 400)) {
    await prisma.coffeeIncomingReceiptItem.createMany({ data: batch })
  }
  for (const batch of chunk(stockMovements, 800)) {
    await prisma.coffeeStockMovement.createMany({ data: batch })
  }

  for (const [productId, stock] of Array.from(byProduct.entries())) {
    const finalStock = Math.max(0, stock - (soldQuantities.get(productId) ?? 0))
    await prisma.coffeeProduct.update({ where: { id: productId }, data: { stock: finalStock } })
  }

  console.log(`  ✅ ${receipts.length} historical incoming receipts seeded`)
  console.log(`  ✅ ${stockMovements.length} historical restock movements seeded`)
}

async function refreshCustomerStats() {
  const paidOrders = await prisma.coffeeOrder.findMany({
    where: { status: 'paid', customerId: { not: null } },
    select: { customerId: true, total: true, closedAt: true }
  })

  const totals = new Map<string, { spent: number; visits: number; lastVisit: Date | null }>()
  for (const order of paidOrders) {
    if (!order.customerId) continue
    const row = totals.get(order.customerId) || { spent: 0, visits: 0, lastVisit: null }
    row.spent += Number(order.total || 0)
    row.visits += 1
    if (order.closedAt && (!row.lastVisit || order.closedAt > row.lastVisit)) row.lastVisit = order.closedAt
    totals.set(order.customerId, row)
  }

  const customers = await prisma.coffeeCustomer.findMany({ select: { id: true } })
  for (const customer of customers) {
    const stats = totals.get(customer.id)
    await prisma.coffeeCustomer.update({
      where: { id: customer.id },
      data: {
        totalSpent: roundMoney(stats?.spent ?? 0),
        visitCount: stats?.visits ?? 0,
        lastVisit: stats?.lastVisit ?? null
      }
    })
  }
}

async function main() {
  console.log('☕ Seeding coffee shop data…')

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.coffeeCategory.upsert({
      where: { name: 'Hot Drinks' },
      update: {},
      create: { name: 'Hot Drinks', color: 'amber', icon: '☕', displayOrder: 1 }
    }),
    prisma.coffeeCategory.upsert({
      where: { name: 'Cold Drinks' },
      update: {},
      create: { name: 'Cold Drinks', color: 'blue', icon: '🧊', displayOrder: 2 }
    }),
    prisma.coffeeCategory.upsert({
      where: { name: 'Specialty Drinks' },
      update: {},
      create: { name: 'Specialty Drinks', color: 'violet', icon: '✨', displayOrder: 3 }
    }),
    prisma.coffeeCategory.upsert({
      where: { name: 'Food & Snacks' },
      update: {},
      create: { name: 'Food & Snacks', color: 'orange', icon: '🥐', displayOrder: 4 }
    }),
    prisma.coffeeCategory.upsert({
      where: { name: 'Fresh Juice' },
      update: {},
      create: { name: 'Fresh Juice', color: 'green', icon: '🍊', displayOrder: 5 }
    })
  ])

  const [hotDrinks, coldDrinks, specialty, food, juice] = categories
  console.log(`  ✅ ${categories.length} categories seeded`)

  // ── Products ─────────────────────────────────────────────────────────────────
  const products = [
    // Hot Drinks
    { name: 'Espresso',          categoryId: hotDrinks.id,  price: 15,  cost: 4,  stock: 100, reorderPoint: 20, displayOrder: 1 },
    { name: 'Americano',         categoryId: hotDrinks.id,  price: 20,  cost: 5,  stock: 100, reorderPoint: 20, displayOrder: 2 },
    { name: 'Cappuccino',        categoryId: hotDrinks.id,  price: 35,  cost: 9,  stock: 100, reorderPoint: 15, displayOrder: 3 },
    { name: 'Latte',             categoryId: hotDrinks.id,  price: 40,  cost: 10, stock: 100, reorderPoint: 15, displayOrder: 4 },
    { name: 'Flat White',        categoryId: hotDrinks.id,  price: 40,  cost: 10, stock: 100, reorderPoint: 10, displayOrder: 5 },
    { name: 'Macchiato',         categoryId: hotDrinks.id,  price: 30,  cost: 7,  stock: 100, reorderPoint: 10, displayOrder: 6 },
    { name: 'Turkish Coffee',    categoryId: hotDrinks.id,  price: 25,  cost: 5,  stock: 100, reorderPoint: 15, displayOrder: 7 },
    { name: 'Hot Chocolate',     categoryId: hotDrinks.id,  price: 35,  cost: 8,  stock: 80,  reorderPoint: 10, displayOrder: 8 },
    { name: 'Tea',               categoryId: hotDrinks.id,  price: 15,  cost: 2,  stock: 200, reorderPoint: 30, displayOrder: 9 },
    // Cold Drinks
    { name: 'Iced Americano',    categoryId: coldDrinks.id, price: 30,  cost: 7,  stock: 100, reorderPoint: 15, displayOrder: 1 },
    { name: 'Iced Latte',        categoryId: coldDrinks.id, price: 45,  cost: 11, stock: 100, reorderPoint: 15, displayOrder: 2 },
    { name: 'Cold Brew',         categoryId: coldDrinks.id, price: 45,  cost: 10, stock: 50,  reorderPoint: 10, displayOrder: 3 },
    { name: 'Iced Cappuccino',   categoryId: coldDrinks.id, price: 45,  cost: 11, stock: 80,  reorderPoint: 10, displayOrder: 4 },
    { name: 'Frappe',            categoryId: coldDrinks.id, price: 50,  cost: 13, stock: 80,  reorderPoint: 10, displayOrder: 5 },
    // Specialty
    { name: 'Caramel Latte',     categoryId: specialty.id,  price: 50,  cost: 14, stock: 80,  reorderPoint: 10, displayOrder: 1 },
    { name: 'Vanilla Latte',     categoryId: specialty.id,  price: 50,  cost: 13, stock: 80,  reorderPoint: 10, displayOrder: 2 },
    { name: 'Mocha',             categoryId: specialty.id,  price: 50,  cost: 14, stock: 80,  reorderPoint: 10, displayOrder: 3 },
    { name: 'Matcha Latte',      categoryId: specialty.id,  price: 55,  cost: 15, stock: 60,  reorderPoint: 10, displayOrder: 4 },
    { name: 'Hazelnut Latte',    categoryId: specialty.id,  price: 55,  cost: 15, stock: 60,  reorderPoint: 10, displayOrder: 5 },
    // Food & Snacks
    { name: 'Croissant',         categoryId: food.id,        price: 25,  cost: 8,  stock: 20,  reorderPoint: 5,  displayOrder: 1 },
    { name: 'Chocolate Muffin',  categoryId: food.id,        price: 30,  cost: 9,  stock: 15,  reorderPoint: 5,  displayOrder: 2 },
    { name: 'Blueberry Muffin',  categoryId: food.id,        price: 30,  cost: 9,  stock: 15,  reorderPoint: 5,  displayOrder: 3 },
    { name: 'Avocado Toast',     categoryId: food.id,        price: 60,  cost: 20, stock: 10,  reorderPoint: 3,  displayOrder: 4 },
    { name: 'Club Sandwich',     categoryId: food.id,        price: 75,  cost: 25, stock: 10,  reorderPoint: 3,  displayOrder: 5 },
    { name: 'Cheesecake Slice',  categoryId: food.id,        price: 45,  cost: 12, stock: 8,   reorderPoint: 3,  displayOrder: 6 },
    // Fresh Juice
    { name: 'Orange Juice',      categoryId: juice.id,       price: 30,  cost: 8,  stock: 50,  reorderPoint: 10, displayOrder: 1 },
    { name: 'Mango Juice',       categoryId: juice.id,       price: 35,  cost: 10, stock: 40,  reorderPoint: 10, displayOrder: 2 },
    { name: 'Mixed Fruit',       categoryId: juice.id,       price: 40,  cost: 12, stock: 40,  reorderPoint: 10, displayOrder: 3 }
  ]

  let productCount = 0
  for (const p of products) {
    const existing = await prisma.coffeeProduct.findFirst({ where: { name: p.name } })
    if (existing) {
      await prisma.coffeeProduct.update({
        where: { id: existing.id },
        data: { ...p, isAvailable: true }
      })
    } else {
      await prisma.coffeeProduct.create({ data: { ...p, isAvailable: true } })
    }
    productCount++
  }
  console.log(`  ✅ ${productCount} products reset to seed baseline`)

  // ── Tables ───────────────────────────────────────────────────────────────────
  const tables = [
    { number: 1, name: 'Table 1',  capacity: 2, section: 'Indoor'  },
    { number: 2, name: 'Table 2',  capacity: 2, section: 'Indoor'  },
    { number: 3, name: 'Table 3',  capacity: 4, section: 'Indoor'  },
    { number: 4, name: 'Table 4',  capacity: 4, section: 'Indoor'  },
    { number: 5, name: 'Table 5',  capacity: 4, section: 'Indoor'  },
    { number: 6, name: 'Window 1', capacity: 2, section: 'Window'  },
    { number: 7, name: 'Window 2', capacity: 2, section: 'Window'  },
    { number: 8, name: 'Patio 1',  capacity: 4, section: 'Outdoor' },
    { number: 9, name: 'Patio 2',  capacity: 4, section: 'Outdoor' },
    { number: 10, name: 'Bar 1',   capacity: 2, section: 'Bar'     },
    { number: 11, name: 'Bar 2',   capacity: 2, section: 'Bar'     },
    { number: 12, name: 'VIP',     capacity: 6, section: 'VIP'     }
  ]

  let tableCount = 0
  for (const t of tables) {
    const exists = await prisma.coffeeTable.findFirst({ where: { number: t.number } })
    if (!exists) {
      await prisma.coffeeTable.create({ data: t })
      tableCount++
    }
  }
  console.log(`  ✅ ${tableCount} tables seeded`)

  // ── Customers ────────────────────────────────────────────────────────────────
  const customers = [
    { name: 'Ahmed Hassan',   phone: '01012345678', email: 'ahmed@example.com',  notes: 'Prefers oat milk' },
    { name: 'Sara Mohamed',   phone: '01098765432', email: 'sara@example.com',   notes: 'Lactose intolerant' },
    { name: 'Omar Khaled',    phone: '01156789012', email: null,                 notes: null },
    { name: 'Layla Ibrahim',  phone: '01234567890', email: null,                 notes: 'No sugar please' },
    { name: 'Karim Adel',     phone: '01187654321', email: 'karim@example.com',  notes: null }
  ]

  let customerCount = 0
  for (const c of customers) {
    const exists = await prisma.coffeeCustomer.findFirst({ where: { phone: c.phone ?? undefined } })
    if (!exists) {
      await prisma.coffeeCustomer.create({ data: { ...c, totalSpent: 0, visitCount: 0 } })
      customerCount++
    }
  }
  console.log(`  ✅ ${customerCount} customers seeded`)

  // ── Historical Data (5 years) ──────────────────────────────────────────────
  const seedUsers = await ensureSeedUsers()
  console.log(`  ✅ ${seedUsers.length} seed cashier users ready`)

  const allCustomers = await ensureSeedCustomers(
    (await prisma.coffeeCustomer.findMany({
      where: { phone: { in: customers.map(c => c.phone!).filter(Boolean) } },
      select: { id: true, name: true, phone: true, email: true, notes: true }
    })).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? '',
      email: c.email,
      notes: c.notes
    }))
  )
  console.log(`  ✅ ${allCustomers.length} customers available for history`)

  await resetHistoricalData(seedUsers.map(user => user.id))
  console.log('  ✅ Previous seeded history cleared')

  const seedTables = (await prisma.coffeeTable.findMany({
    where: { isActive: true },
    select: { id: true, number: true, name: true, section: true }
  })) as SeedTable[]
  const seedProducts = await prisma.coffeeProduct.findMany({
    where: { isAvailable: true },
    select: { id: true, name: true, price: true, cost: true, stock: true, category: { select: { name: true } } }
  }) as SeedProduct[]

  const soldQuantities = await createHistoricalData(seedUsers, allCustomers, seedTables, seedProducts)
  await createHistoricalIncomingReceipts(seedUsers, seedProducts, soldQuantities)
  await refreshCustomerStats()
  console.log('  ✅ Customer totals refreshed from paid orders')

  console.log('✅ Coffee seed complete!')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
