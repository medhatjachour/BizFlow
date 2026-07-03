/**
 * Restaurant Plugin – Development Seed
 *
 * Populates tables, menu items, reservations and dine-in orders so the
 * Restaurant module's Overview / Floor Plan / Reservations / Menu / Orders
 * tabs show realistic data.
 *
 * Usage: npx ts-node prisma/seeds/restaurant/seed.ts
 */
import { PrismaClient } from '../../../src/generated/prisma'

const prisma = new PrismaClient()
const ri = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const SECTIONS = ['Indoor', 'Outdoor', 'Bar', 'Patio']
const TABLE_STATUS = ['available', 'available', 'available', 'occupied', 'reserved', 'cleaning']
const MENU: Array<[string, string, number, number, number]> = [
  // name, category, price, cost, prepTime
  ['Bruschetta', 'Starters', 7.5, 2.1, 8], ['Garlic Bread', 'Starters', 5.0, 1.2, 6],
  ['Caprese Salad', 'Starters', 9.0, 3.0, 7], ['Soup of the Day', 'Starters', 6.5, 1.8, 10],
  ['Margherita Pizza', 'Main', 12.0, 3.5, 16], ['Pepperoni Pizza', 'Main', 14.0, 4.2, 16],
  ['Spaghetti Bolognese', 'Main', 13.5, 3.8, 18], ['Grilled Salmon', 'Main', 19.0, 7.5, 20],
  ['Ribeye Steak', 'Main', 26.0, 11.0, 22], ['Chicken Alfredo', 'Main', 15.5, 4.6, 18],
  ['Veggie Burger', 'Main', 12.5, 3.9, 14], ['Beef Burger', 'Main', 13.5, 4.8, 14],
  ['Caesar Salad', 'Main', 10.5, 3.1, 9], ['Lamb Chops', 'Main', 24.0, 10.0, 24],
  ['Tiramisu', 'Dessert', 7.0, 2.0, 5], ['Cheesecake', 'Dessert', 7.5, 2.2, 5],
  ['Chocolate Lava Cake', 'Dessert', 8.0, 2.5, 12], ['Gelato (3 scoops)', 'Dessert', 6.0, 1.5, 3],
  ['Espresso', 'Drinks', 3.0, 0.5, 3], ['Cappuccino', 'Drinks', 4.0, 0.8, 4],
  ['Fresh Orange Juice', 'Drinks', 4.5, 1.3, 3], ['House Red Wine', 'Drinks', 8.0, 2.5, 2],
  ['Craft Beer', 'Drinks', 6.5, 2.0, 2], ['Sparkling Water', 'Drinks', 3.5, 0.6, 1],
]
const FIRST = ['Omar', 'Sara', 'Khaled', 'Lina', 'Hassan', 'Maya', 'Tariq', 'Nour', 'Ali', 'Rana', 'James', 'Emma', 'Luca', 'Sofia']
const LAST = ['Haddad', 'Khoury', 'Nasser', 'Saab', 'Aziz', 'Fares', 'Karam', 'Rizk', 'Smith', 'Rossi', 'Garcia']
const SERVERS = ['Yousef', 'Dana', 'Marco', 'Lea', 'Sami']

async function main() {
  console.log('Restaurant seed starting…')
  // Clear (children first)
  await prisma.dineInOrderItem?.deleteMany().catch(() => {})
  await prisma.dineInOrder?.deleteMany().catch(() => {})
  await prisma.tableReservation?.deleteMany().catch(() => {})
  await prisma.menuItem?.deleteMany().catch(() => {})
  await prisma.restaurantTable?.deleteMany().catch(() => {})

  // Tables
  const tables: any[] = []
  for (let n = 1; n <= 18; n++) {
    tables.push(await prisma.restaurantTable.create({
      data: { number: n, capacity: pick([2, 2, 4, 4, 4, 6, 8]), status: pick(TABLE_STATUS), section: pick(SECTIONS), isActive: true },
    }))
  }
  console.log(`  ✓ ${tables.length} tables`)

  // Menu
  const menu: any[] = []
  for (let i = 0; i < MENU.length; i++) {
    const [name, category, price, cost, prep] = MENU[i]
    menu.push(await prisma.menuItem.create({
      data: { name, category, price, cost, preparationTime: prep, isAvailable: Math.random() > 0.08, displayOrder: i },
    }))
  }
  console.log(`  ✓ ${menu.length} menu items`)

  // Reservations (today + next 6 days, plus a few past)
  let resCount = 0
  for (let d = -2; d <= 6; d++) {
    for (let k = 0; k < ri(2, 5); k++) {
      const day = new Date(); day.setDate(day.getDate() + d); day.setHours(ri(12, 21), pick([0, 15, 30, 45]), 0, 0)
      const status = d < 0 ? 'completed' : d === 0 ? pick(['confirmed', 'seated', 'pending']) : pick(['pending', 'confirmed'])
      await prisma.tableReservation.create({
        data: {
          tableId: pick(tables).id,
          customerName: `${pick(FIRST)} ${pick(LAST)}`,
          customerPhone: `+961-${ri(70, 79)}-${ri(100000, 999999)}`,
          partySize: ri(1, 8), date: day, status,
          notes: Math.random() > 0.7 ? pick(['Window seat please', 'Birthday', 'Allergy: nuts', 'High chair needed']) : null,
        },
      })
      resCount++
    }
  }
  console.log(`  ✓ ${resCount} reservations`)

  // Dine-in orders (some open now, many paid over past 14 days)
  let orderCount = 0, itemCount = 0
  const TAX = 0.11
  for (let i = 0; i < 60; i++) {
    const openPast = i < 50
    const opened = new Date(); opened.setDate(opened.getDate() - (openPast ? ri(0, 14) : 0)); opened.setHours(ri(12, 22), ri(0, 59), 0, 0)
    const status = openPast ? 'paid' : pick(['open', 'open', 'ready'])
    const nItems = ri(2, 6)
    let subtotal = 0
    const itemsData: any[] = []
    for (let j = 0; j < nItems; j++) {
      const m = pick(menu); const qty = ri(1, 3)
      subtotal += m.price * qty
      itemsData.push({ menuItemId: m.id, itemName: m.name, quantity: qty, unitPrice: m.price, status: status === 'paid' ? 'served' : pick(['pending', 'preparing', 'ready', 'served']) })
    }
    const tax = +(subtotal * TAX).toFixed(2)
    const total = +(subtotal + tax).toFixed(2)
    await prisma.dineInOrder.create({
      data: {
        tableId: pick(tables).id, status, serverName: pick(SERVERS),
        subtotal: +subtotal.toFixed(2), tax, total,
        openedAt: opened, closedAt: status === 'paid' ? new Date(opened.getTime() + ri(40, 120) * 60000) : null,
        items: { create: itemsData },
      },
    })
    orderCount++; itemCount += itemsData.length
  }
  console.log(`  ✓ ${orderCount} dine-in orders, ${itemCount} order items`)

  console.log('✅  Restaurant seed complete.')
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1) }).finally(() => prisma.$disconnect())
