/**
 * Coffee Shop Seed Data (Heavy Version)
 * Creates 10 categories, 150 products, and 5 years of dense historical data
 * (sales, incoming receipts, transit receipts, and stock movements).
 * Run with: npm run prisma:seed:coffee
 */

import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { PrismaClient } from '../../../src/generated/prisma/index.js'

const prisma = new PrismaClient()

type SeedUser = { id: string; username: string; fullName: string }
type SeedCustomer = { id: string; name: string; phone: string; notes: string | null }
type SeedTable = { id: string; number: number; name?: string | null; section?: string | null }
type SeedProduct = {
  id: string
  name: string
  price: number
  cost: number
  stock: number
  reorderPoint: number
  category?: { name: string }
}

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
const TRANSIT_ITEM_DESCRIPTIONS = [
  'Sealed Envelope', 'Gift Box', 'Legal Documents', 'Electronics Parts', 
  'Clothing Package', 'Spare Parts', 'Books', 'Pharmacy Order', 
  'Art Supplies', 'Replacement Phone'
]

// 10 Categories x 15 Products = 150 Products
const PRODUCT_DEFS = [
  { cat: 'Hot Drinks', color: 'amber', icon: '☕', items: ['Espresso', 'Americano', 'Latte', 'Cappuccino', 'Macchiato', 'Mocha', 'Flat White', 'Cortado', 'Ristretto', 'Turkish Coffee', 'French Press', 'Pour Over', 'Drip Coffee', 'Decaf Coffee', 'Affogato'] },
  { cat: 'Cold Drinks', color: 'blue', icon: '🧊', items: ['Iced Americano', 'Iced Latte', 'Cold Brew', 'Iced Cappuccino', 'Frappe', 'Iced Mocha', 'Iced Macchiato', 'Iced Flat White', 'Iced Tea', 'Iced Chai', 'Lemonade', 'Iced Chocolate', 'Smoothie', 'Milkshake', 'Iced Matcha'] },
  { cat: 'Specialty Drinks', color: 'violet', icon: '✨', items: ['Caramel Latte', 'Vanilla Latte', 'Hazelnut Latte', 'White Mocha', 'Pumpkin Spice Latte', 'Irish Coffee', 'Vienna Coffee', 'Spanish Latte', 'Dirty Chai', 'Matcha Latte', 'London Fog', 'S’mores Latte', 'Bumble Coffee', 'Purple Haze', 'Rose Latte'] },
  { cat: 'Food & Snacks', color: 'orange', icon: '🥐', items: ['Croissant', 'Chocolate Muffin', 'Blueberry Muffin', 'Avocado Toast', 'Club Sandwich', 'Cheesecake Slice', 'Bagel & Cream Cheese', 'Quiche', 'Cinnamon Roll', 'Cookie', 'Brownie', 'Pretzel', 'Panini', 'Wrap', 'Salad Bowl'] },
  { cat: 'Fresh Juice', color: 'green', icon: '🍊', items: ['Orange Juice', 'Mango Juice', 'Mixed Fruit', 'Apple Juice', 'Pineapple Juice', 'Watermelon Juice', 'Strawberry Banana', 'Green Detox', 'Carrot Ginger', 'Pomegranate Juice', 'Lemon Mint', 'Guava Juice', 'Peach Juice', 'Kiwi Juice', 'Coconut Water'] },
  { cat: 'Desserts', color: 'pink', icon: '🍰', items: ['Tiramisu', 'Macarons (Box)', 'Chocolate Lava Cake', 'New York Cheesecake', 'Apple Pie', 'Creme Brulee', 'Panna Cotta', 'Fruit Tart', 'Eclair', 'Cupcake', 'Donut', 'Ice Cream Scoop', 'Waffle', 'Pancakes', 'Tres Leches'] },
  { cat: 'Tea & Infusions', color: 'teal', icon: '🍵', items: ['Green Tea', 'Black Tea', 'Earl Grey', 'Chai Tea', 'Mint Tea', 'Chamomile', 'Hibiscus Tea', 'Jasmine Tea', 'Oolong Tea', 'White Tea', 'Rooibos', 'Peppermint Tea', 'Lemon Ginger', 'Berry Infusion', 'Matcha Tea'] },
  { cat: 'Retail Beans', color: 'stone', icon: '🛍️', items: ['House Blend 250g', 'Single Origin 250g', 'Dark Roast 250g', 'Light Roast 250g', 'Decaf 250g', 'Espresso Blend 1kg', 'French Roast 250g', 'Italian Roast 250g', 'Ethiopian Yirgacheffe', 'Colombian Supremo', 'Brazilian Santos', 'Kenyan AA', 'Sumatra Mandheling', 'Costa Rican Tarrazu', 'Guatemalan Antigua'] },
  { cat: 'Merchandise', color: 'indigo', icon: '🎁', items: ['Coffee Mug', 'Travel Tumbler', 'French Press', 'Pour Over Kit', 'Coffee Grinder', 'Espresso Cup Set', 'Barista Apron', 'Reusable Straw', 'Coffee Scoop', 'Filter Papers', 'Cleaning Tablets', 'Milk Frother', 'Coffee Table Book', 'Tote Bag', 'Gift Card'] },
  { cat: 'Add-ons & Syrups', color: 'yellow', icon: '🍯', items: ['Vanilla Syrup', 'Caramel Syrup', 'Hazelnut Syrup', 'Lavender Syrup', 'Rose Syrup', 'Extra Shot', 'Oat Milk', 'Almond Milk', 'Soy Milk', 'Whipped Cream', 'Cinnamon Powder', 'Cocoa Powder', 'Honey', 'Brown Sugar', 'Ice Cube'] }
]

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

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
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
    notes: c.notes
  }))

  const generated: SeedCustomer[] = []
  for (let i = 0; i < 150; i++) {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`
    const phone = `0155${String(1000000 + i).slice(-7)}`
    const notes = CUSTOMER_NOTES[i % CUSTOMER_NOTES.length]
    const customer = await prisma.coffeeCustomer.upsert({
      where: { phone },
      update: { name, notes },
      create: { name, phone, notes, totalSpent: 0, visitCount: 0 }
    })
    generated.push({ id: customer.id, name: customer.name, phone: customer.phone ?? phone, notes: customer.notes })
  }

  return [...starters, ...generated]
}

async function resetHistoricalData(seedUserIds: string[]) {
  await prisma.coffeeStockMovement.deleteMany({
    where: {
      OR: [
        { notes: 'Seeded incoming receipt history' },
        { reason: 'Seeded historical sale' }
      ]
    }
  })
  await prisma.coffeeIncomingReceiptItem.deleteMany({
    where: { receipt: { receiptNumber: { startsWith: 'IN-SEED-' } } }
  })
  await prisma.coffeeIncomingReceipt.deleteMany({ where: { receiptNumber: { startsWith: 'IN-SEED-' } } })
  
  await prisma.coffeeTransitReceiptItem.deleteMany({
    where: { receipt: { receiptNumber: { startsWith: 'TR-SEED-' } } }
  })
  await prisma.coffeeTransitReceipt.deleteMany({ where: { receiptNumber: { startsWith: 'TR-SEED-' } } })

  await prisma.coffeeOrder.deleteMany({ where: { orderNumber: { startsWith: 'HIST-' } } })
  await prisma.coffeeShift.deleteMany({ where: { cashierId: { in: seedUserIds } } })
}

function productWeight(product: SeedProduct) {
  const category = product.category?.name ?? ''
  if (category === 'Hot Drinks') return 15
  if (category === 'Cold Drinks') return 12
  if (category === 'Specialty Drinks') return 10
  if (category === 'Food & Snacks') return 8
  if (category === 'Fresh Juice') return 6
  if (category === 'Desserts') return 5
  if (category === 'Tea & Infusions') return 4
  return 2 // Lower weight for retail/merch/add-ons
}

async function createHistoricalData(
  users: SeedUser[],
  customers: SeedCustomer[],
  tables: SeedTable[],
  products: SeedProduct[]
) {
  const today = startOfDay(new Date())
  const start = startOfDay(new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()))
  const end = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))

  const shifts: any[] = []
  const orders: any[] = []
  const orderItems: any[] = []
  const incomingReceipts: any[] = []
  const incomingReceiptItems: any[] = []
  const transitReceipts: any[] = []
  const transitReceiptItems: any[] = []
  const stockMovements: any[] = []
  
  const currentStockMap = new Map(products.map(p => [p.id, p.stock]))
  
  let orderCounter = 1
  let inReceiptCounter = 1
  let trReceiptCounter = 1

  for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const progress = (current.getTime() - start.getTime()) / Math.max(end.getTime() - start.getTime(), 1)
    const weekday = current.getDay()
    const weekendBoost = weekday === 5 || weekday === 6 ? 2.5 : 0
    const summerBoost = [5, 6, 7].includes(current.getMonth()) ? 1.5 : 0
    const winterDrinkBoost = [11, 0, 1].includes(current.getMonth()) ? 1.0 : 0
    const baseDemand = 15 + progress * 15 + weekendBoost + summerBoost + winterDrinkBoost
    const orderCount = Math.max(5, Math.round(baseDemand + randInt(0, 10)))

    const cashier = pickOne(users)
    const shiftId = randomUUID()
    const openHour = weekday === 5 || weekday === 6 ? randInt(8, 10) : randInt(7, 9)
    const openMinute = pickOne([0, 15, 30, 45])
    const shiftOpenedAt = new Date(current)
    shiftOpenedAt.setHours(openHour, openMinute, 0, 0)
    const openingCash = roundMoney(1000 + progress * 500 + randInt(0, 500))

    let shiftSales = 0
    let shiftPaidOrders = 0
    let cashTotal = 0
    let cardTotal = 0
    let vodafoneCashTotal = 0
    let latestClose = new Date(shiftOpenedAt)

    // 1. Morning Restock (Incoming Receipt)
    const shouldRestock = weekday === 1 || weekday === 4 || chance(0.1)
    if (shouldRestock) {
      const receiptId = randomUUID()
      const itemCount = randInt(3, 8)
      const receiptDate = new Date(current)
      receiptDate.setHours(randInt(7, 10), pickOne([0, 15, 30, 45]), 0, 0)
      const selected = new Set<string>()
      let totalCost = 0

      incomingReceipts.push({
        id: receiptId,
        receiptNumber: `IN-SEED-${String(inReceiptCounter++).padStart(6, '0')}`,
        supplierName: pickOne(['Bean House Trading', 'Delta Coffee Supply', 'Nile Dairy Co.', 'Fresh Harvest Produce', 'Bakery Source Egypt', 'Premium Syrups Co.']),
        invoiceNumber: `SUP-${receiptDate.getFullYear()}-${randInt(1000, 9999)}`,
        receivedAt: receiptDate,
        totalCost: 0,
        notes: chance(0.2) ? pickOne(['Weekly refill', 'Emergency restock', 'Perishables delivery', 'Monthly refill']) : null,
        createdById: cashier.id,
        createdAt: receiptDate,
        updatedAt: receiptDate
      })

      for (let i = 0; i < itemCount; i++) {
        let pickedProduct = weightedPick(products, productWeight)
        let attempts = 0
        while (selected.has(pickedProduct.id) && attempts < 8) {
          pickedProduct = weightedPick(products, productWeight)
          attempts++
        }
        selected.add(pickedProduct.id)

        const previousStock = currentStockMap.get(pickedProduct.id) ?? pickedProduct.stock
        const quantity = pickedProduct.category?.name === 'Food & Snacks' ? randInt(10, 30) : randInt(20, 80)
        const unitCost = roundMoney(Math.max(1, pickedProduct.cost * (0.92 + rng() * 0.22)))
        const lineTotal = roundMoney(quantity * unitCost)
        const newStock = previousStock + quantity
        currentStockMap.set(pickedProduct.id, newStock)
        totalCost += lineTotal

        incomingReceiptItems.push({
          id: randomUUID(),
          receiptId,
          productId: pickedProduct.id,
          productName: pickedProduct.name,
          quantity,
          unitCost,
          lineTotal,
          notes: chance(0.12) ? pickOne(['Promo pricing', 'Seasonal batch', 'Urgent top-up', 'Fresh delivery']) : null,
          createdAt: receiptDate,
          updatedAt: receiptDate
        })

        stockMovements.push({
          id: randomUUID(),
          productId: pickedProduct.id,
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
      incomingReceipts[incomingReceipts.length - 1].totalCost = roundMoney(totalCost)
    }

    // 2. Transit Receipt
    if (chance(0.25)) {
      const receiptId = randomUUID()
      const receivedAt = new Date(current)
      receivedAt.setHours(randInt(10, 17), pickOne([0, 15, 30, 45]), 0, 0)
      const statusRoll = rng()
      const status = statusRoll < 0.8 ? 'delivered' : statusRoll < 0.9 ? 'in_transit' : 'received'
      const deliveredAt = status === 'delivered' ? new Date(receivedAt.getTime() + randInt(1, 24) * 3600000) : null
      const priority = rng() < 0.8 ? 'normal' : 'high'
      const itemCount = randInt(1, 3)
      let itemsTotal = 0
      const deliveryFee = roundMoney(randInt(30, 100))

      for (let i = 0; i < itemCount; i++) {
        const quantity = randInt(1, 5)
        const unitPrice = roundMoney(randInt(50, 500))
        const lineTotal = roundMoney(quantity * unitPrice)
        itemsTotal += lineTotal
        
        transitReceiptItems.push({
          id: randomUUID(),
          receiptId,
          description: pickOne(TRANSIT_ITEM_DESCRIPTIONS),
          quantity,
          unitPrice,
          lineTotal,
          weight: chance(0.3) ? roundMoney(rng() * 5) : null,
          notes: chance(0.2) ? pickOne(['Fragile', 'Handle with care', 'Do not bend', 'Express']) : null,
          createdAt: receivedAt,
          updatedAt: deliveredAt ?? receivedAt
        })
      }

      transitReceipts.push({
        id: receiptId,
        receiptNumber: `TR-SEED-${String(trReceiptCounter++).padStart(6, '0')}`,
        senderName: `${pickOne(FIRST_NAMES)} ${pickOne(LAST_NAMES)}`,
        senderPhone: `010${String(randInt(10000000, 99999999))}`,
        recipientName: `${pickOne(FIRST_NAMES)} ${pickOne(LAST_NAMES)}`,
        recipientPhone: `011${String(randInt(10000000, 99999999))}`,
        recipientAddress: `${randInt(10, 180)} ${pickOne(['El Tahrir St', 'Omar Lotfy St', 'Palm Street', 'Nile Corniche', 'Gardenia Ave'])}, ${pickOne(DELIVERY_AREAS)}`,
        receivedAt,
        deliveredAt,
        status,
        totalAmount: roundMoney(itemsTotal + deliveryFee),
        deliveryFee,
        priority,
        notes: chance(0.15) ? pickOne(['Evening delivery', 'Leave at front desk', 'Call on arrival']) : null,
        createdById: cashier.id,
        createdAt: receivedAt,
        updatedAt: deliveredAt ?? receivedAt
      })
    }

    // 3. Daily Sales (Orders)
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
        let pickedProduct = weightedPick(products, productWeight)
        let attempts = 0
        while (selectedProductIds.has(pickedProduct.id) && attempts < 6) {
          pickedProduct = weightedPick(products, productWeight)
          attempts++
        }
        selectedProductIds.add(pickedProduct.id)

        const quantity = pickedProduct.category?.name === 'Food & Snacks' ? randInt(1, 2) : randInt(1, 3)
        const unitPrice = roundMoney(Math.max(8, Math.round(pickedProduct.price * priceFactor)))
        const total = roundMoney(unitPrice * quantity)
        subtotal += total

        if (!isVoided) {
          const previousStock = currentStockMap.get(pickedProduct.id) ?? pickedProduct.stock
          const newStock = Math.max(0, previousStock - quantity)
          currentStockMap.set(pickedProduct.id, newStock)

          stockMovements.push({
            id: randomUUID(),
            productId: pickedProduct.id,
            type: 'sale',
            quantity: -quantity,
            previousStock,
            newStock,
            reason: 'Seeded historical sale',
            referenceId: orderId,
            notes: `Order ${orderCounter}`,
            createdAt: openedAt
          })
        }

        orderItems.push({
          id: randomUUID(),
          orderId,
          productId: pickedProduct.id,
          productName: pickedProduct.name,
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
      const orderNumber = `HIST-${current.toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCounter).padStart(6, '0')}`
      orderCounter++

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
  for (const batch of chunk(orderItems, 800)) {
    await prisma.coffeeOrderItem.createMany({ data: batch })
  }
  for (const batch of chunk(incomingReceipts, 200)) {
    await prisma.coffeeIncomingReceipt.createMany({ data: batch })
  }
  for (const batch of chunk(incomingReceiptItems, 400)) {
    await prisma.coffeeIncomingReceiptItem.createMany({ data: batch })
  }
  for (const batch of chunk(transitReceipts, 200)) {
    await prisma.coffeeTransitReceipt.createMany({ data: batch })
  }
  for (const batch of chunk(transitReceiptItems, 400)) {
    await prisma.coffeeTransitReceiptItem.createMany({ data: batch })
  }
  for (const batch of chunk(stockMovements, 800)) {
    await prisma.coffeeStockMovement.createMany({ data: batch })
  }

  for (const [productId, stock] of Array.from(currentStockMap.entries())) {
    await prisma.coffeeProduct.update({ where: { id: productId }, data: { stock } })
  }

  console.log(`  ✅ ${shifts.length} historical shifts seeded`)
  console.log(`  ✅ ${orders.length} historical orders seeded`)
  console.log(`  ✅ ${orderItems.length} historical order items seeded`)
  console.log(`  ✅ ${incomingReceipts.length} historical incoming receipts seeded`)
  console.log(`  ✅ ${transitReceipts.length} historical transit receipts seeded`)
  console.log(`  ✅ ${stockMovements.length} historical stock movements seeded`)
}

async function refreshCustomerStats() {
  const paidOrders = await prisma.coffeeOrder.findMany({
    where: { status: 'paid', customerId: { not: null } },
    select: { customerId: true, total: true, closedAt: true }
  })

  const totals = new Map<string, { spent: number, visits: number, lastVisit: Date | null }>()
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
  console.log('☕ Seeding heavy coffee shop data (10 cats, 150 products, 5 years)...')

  let productCount = 0
  for (const def of PRODUCT_DEFS) {
    const category = await prisma.coffeeCategory.upsert({
      where: { name: def.cat },
      update: { color: def.color, icon: def.icon },
      create: { name: def.cat, color: def.color, icon: def.icon, displayOrder: PRODUCT_DEFS.indexOf(def) + 1 }
    })

    for (const itemName of def.items) {
      const price = def.cat === 'Retail Beans' ? randInt(100, 300) : def.cat === 'Merchandise' ? randInt(50, 200) : randInt(15, 80)
      const cost = roundMoney(price * (0.3 + rng() * 0.3))
      const stock = def.cat === 'Food & Snacks' ? randInt(10, 30) : randInt(50, 150)
      
      const existing = await prisma.coffeeProduct.findFirst({ where: { name: itemName, categoryId: category.id } })
      if (existing) {
        await prisma.coffeeProduct.update({
          where: { id: existing.id },
          data: { price, cost, stock, reorderPoint: Math.floor(stock * 0.2), isAvailable: true }
        })
      } else {
        await prisma.coffeeProduct.create({
          data: { name: itemName, categoryId: category.id, price, cost, stock, reorderPoint: Math.floor(stock * 0.2), isAvailable: true }
        })
      }
      productCount++
    }
  }
  console.log(`  ✅ ${PRODUCT_DEFS.length} categories and ${productCount} products seeded`)

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

  const customers = [
    { name: 'Ahmed Hassan',   phone: '01012345678', notes: 'Prefers oat milk' },
    { name: 'Sara Mohamed',   phone: '01098765432', notes: 'Lactose intolerant' },
    { name: 'Omar Khaled',    phone: '01156789012', notes: null },
    { name: 'Layla Ibrahim',  phone: '01234567890', notes: 'No sugar please' },
    { name: 'Karim Adel',     phone: '01187654321', notes: null }
  ]

  let customerCount = 0
  for (const c of customers) {
    const exists = await prisma.coffeeCustomer.findFirst({ where: { phone: c.phone ?? undefined } })
    if (!exists) {
      await prisma.coffeeCustomer.create({ data: { ...c, totalSpent: 0, visitCount: 0 } })
      customerCount++
    }
  }
  console.log(`  ✅ ${customerCount} base customers seeded`)

  const seedUsers = await ensureSeedUsers()
  console.log(`  ✅ ${seedUsers.length} seed cashier users ready`)

  const allCustomers = await ensureSeedCustomers(
    (await prisma.coffeeCustomer.findMany({
      where: { phone: { in: customers.map(c => c.phone!).filter(Boolean) } },
      select: { id: true, name: true, phone: true, notes: true }
    })).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? '',
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
    select: { id: true, name: true, price: true, cost: true, stock: true, reorderPoint: true, category: { select: { name: true } } }
  }) as SeedProduct[]

  await createHistoricalData(seedUsers, allCustomers, seedTables, seedProducts)
  await refreshCustomerStats()
  console.log('  ✅ Customer totals refreshed from paid orders')

  console.log('✅ Heavy coffee seed complete!')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
