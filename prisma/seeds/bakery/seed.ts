/**
 * Bakery Plugin — Comprehensive Development Seed
 *
 * Simulates 4 years of real daily bakery business activity:
 *   • 6 users (admin / managers / bakers)
 *   • 12 employees with 4 years of attendance, payroll, shifts, overtime
 *   • 20 pantry ingredients with realistic stock levels
 *   • 12 recipes (bread, pastries, cakes, cookies …) with ingredients
 *   • 4 years of production batches (daily baking runs)
 *   • 4 years of production schedules
 *   • 4 years of waste logs (expired, dropped, overbaked)
 *   • 4 years of FinancialTransaction records (income + expense)
 *
 * Usage:
 *   npx ts-node prisma/seeds/bakery/seed.ts
 *   — or —
 *   npm run prisma:seed:bakery
 */

import { PrismaClient } from '../../../src/generated/prisma'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient({ log: ['warn', 'error'] })

// ── helpers ───────────────────────────────────────────────────────────────────
const NOW = new Date()
const MS_DAY = 86_400_000

function daysAgo(n: number) { return new Date(NOW.getTime() - n * MS_DAY) }
function daysFromNow(n: number) { return new Date(NOW.getTime() + n * MS_DAY) }
function randomDate(from: Date, to: Date) {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))
}
function ri(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function rp(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function pick<T>(arr: T[]): T { return arr[ri(0, arr.length - 1)] }
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const FOUR_YEARS_AGO  = daysAgo(4 * 365)
const THREE_YEARS_AGO = daysAgo(3 * 365)
const TWO_YEARS_AGO   = daysAgo(2 * 365)
const ONE_YEAR_AGO    = daysAgo(1 * 365)

// ── constants ─────────────────────────────────────────────────────────────────

const EMPLOYEE_ROLES = [
  { role: 'Head Baker',        department: 'Production',  salary: 5_500, type: 'full-time' },
  { role: 'Assistant Baker',   department: 'Production',  salary: 3_800, type: 'full-time' },
  { role: 'Pastry Chef',       department: 'Production',  salary: 4_200, type: 'full-time' },
  { role: 'Cake Decorator',    department: 'Production',  salary: 3_500, type: 'full-time' },
  { role: 'Bakery Manager',    department: 'Management',  salary: 6_000, type: 'full-time' },
  { role: 'Sales Associate',   department: 'Sales',       salary: 2_500, type: 'full-time' },
  { role: 'Cashier',           department: 'Sales',       salary: 2_300, type: 'full-time' },
  { role: 'Delivery Driver',   department: 'Logistics',   salary: 2_800, type: 'full-time' },
  { role: 'Cleaning Staff',    department: 'Operations',  salary: 2_000, type: 'part-time' },
  { role: 'Stock Controller',  department: 'Operations',  salary: 2_600, type: 'full-time' },
  { role: 'Marketing Officer', department: 'Marketing',   salary: 3_200, type: 'full-time' },
  { role: 'Apprentice Baker',  department: 'Production',  salary: 1_800, type: 'part-time' },
]

const FIRST_NAMES = ['Ahmed','Sara','Layla','Omar','Nour','Khaled','Rana','Yusuf','Hana','Tarek','Mona','Sami']
const LAST_NAMES  = ['Hassan','Ali','Ibrahim','Mahmoud','Khalil','Nasser','Farouk','Mansour','Saleh','Bakr','Qasim','Zaki']

const WASTE_REASONS = ['Expired','Dropped','Overbaked','Underbaked','Contaminated','Quality rejection','Overproduction'] as string[]
const WASTE_TYPES   = ['ingredient','finished_product','production_batch','other'] as string[]

const FT_EXPENSE_CATS = ['rent','utilities','salary','ingredients','equipment','marketing','maintenance','other'] as string[]

// ── PANTRY INGREDIENTS ────────────────────────────────────────────────────────
const PANTRY_DEFS = [
  { name: 'All-Purpose Flour',   unit: 'kg',  costPerUnit: 0.8,  lowStock: 10, reorderPoint: 15, reorderQty: 50  },
  { name: 'Bread Flour',         unit: 'kg',  costPerUnit: 1.0,  lowStock: 8,  reorderPoint: 12, reorderQty: 40  },
  { name: 'Cake Flour',          unit: 'kg',  costPerUnit: 1.2,  lowStock: 5,  reorderPoint: 8,  reorderQty: 25  },
  { name: 'Granulated Sugar',    unit: 'kg',  costPerUnit: 0.9,  lowStock: 8,  reorderPoint: 12, reorderQty: 30  },
  { name: 'Powdered Sugar',      unit: 'kg',  costPerUnit: 1.1,  lowStock: 4,  reorderPoint: 6,  reorderQty: 20  },
  { name: 'Butter',              unit: 'kg',  costPerUnit: 5.5,  lowStock: 5,  reorderPoint: 8,  reorderQty: 20  },
  { name: 'Eggs',                unit: 'pcs', costPerUnit: 0.25, lowStock: 30, reorderPoint: 50, reorderQty: 200 },
  { name: 'Whole Milk',          unit: 'L',   costPerUnit: 1.2,  lowStock: 10, reorderPoint: 15, reorderQty: 40  },
  { name: 'Heavy Cream',         unit: 'L',   costPerUnit: 2.5,  lowStock: 5,  reorderPoint: 8,  reorderQty: 20  },
  { name: 'Yeast (dry)',         unit: 'g',   costPerUnit: 0.02, lowStock: 200,reorderPoint: 300,reorderQty: 1000},
  { name: 'Baking Powder',       unit: 'g',   costPerUnit: 0.01, lowStock: 150,reorderPoint: 200,reorderQty: 800 },
  { name: 'Baking Soda',         unit: 'g',   costPerUnit: 0.01, lowStock: 150,reorderPoint: 200,reorderQty: 800 },
  { name: 'Salt',                unit: 'g',   costPerUnit: 0.003,lowStock: 200,reorderPoint: 300,reorderQty: 1000},
  { name: 'Vanilla Extract',     unit: 'ml',  costPerUnit: 0.05, lowStock: 100,reorderPoint: 150,reorderQty: 500 },
  { name: 'Cocoa Powder',        unit: 'g',   costPerUnit: 0.025,lowStock: 200,reorderPoint: 300,reorderQty: 1000},
  { name: 'Dark Chocolate',      unit: 'kg',  costPerUnit: 8.0,  lowStock: 3,  reorderPoint: 5,  reorderQty: 15  },
  { name: 'Almond Flour',        unit: 'kg',  costPerUnit: 6.5,  lowStock: 2,  reorderPoint: 4,  reorderQty: 10  },
  { name: 'Honey',               unit: 'kg',  costPerUnit: 7.0,  lowStock: 2,  reorderPoint: 3,  reorderQty: 10  },
  { name: 'Cinnamon',            unit: 'g',   costPerUnit: 0.03, lowStock: 100,reorderPoint: 150,reorderQty: 500 },
  { name: 'Sesame Seeds',        unit: 'g',   costPerUnit: 0.015,lowStock: 200,reorderPoint: 300,reorderQty: 1000},
]

// ── RECIPE DEFINITIONS ────────────────────────────────────────────────────────
const RECIPE_DEFS = [
  {
    name: 'Classic White Bread',
    description: 'Soft sandwich loaf, perfect for daily fresh baking',
    yieldQty: 4, yieldUnit: 'loaves', expiryDays: 3,
    notes: 'Let dough rise 1 hour before baking at 200°C',
    ingredients: [
      { name: 'Bread Flour',   quantity: 0.5,  unit: 'kg',  costPerUnit: 1.0 },
      { name: 'Yeast (dry)',   quantity: 7,    unit: 'g',   costPerUnit: 0.02 },
      { name: 'Salt',          quantity: 10,   unit: 'g',   costPerUnit: 0.003 },
      { name: 'Whole Milk',    quantity: 0.3,  unit: 'L',   costPerUnit: 1.2 },
      { name: 'Butter',        quantity: 0.03, unit: 'kg',  costPerUnit: 5.5 },
    ]
  },
  {
    name: 'Sourdough Loaf',
    description: 'Artisan sourdough with crispy crust, 24-hour fermentation',
    yieldQty: 2, yieldUnit: 'loaves', expiryDays: 5,
    notes: 'Requires sourdough starter. Score before baking.',
    ingredients: [
      { name: 'Bread Flour',   quantity: 0.8,  unit: 'kg',  costPerUnit: 1.0 },
      { name: 'Salt',          quantity: 16,   unit: 'g',   costPerUnit: 0.003 },
      { name: 'Whole Milk',    quantity: 0.1,  unit: 'L',   costPerUnit: 1.2 },
    ]
  },
  {
    name: 'Chocolate Croissants',
    description: 'Buttery laminated dough filled with dark chocolate',
    yieldQty: 12, yieldUnit: 'pcs', expiryDays: 2,
    notes: 'Laminate dough 3 times with resting in between.',
    ingredients: [
      { name: 'All-Purpose Flour', quantity: 0.5,  unit: 'kg',  costPerUnit: 0.8 },
      { name: 'Butter',            quantity: 0.3,  unit: 'kg',  costPerUnit: 5.5 },
      { name: 'Eggs',              quantity: 2,    unit: 'pcs', costPerUnit: 0.25 },
      { name: 'Granulated Sugar',  quantity: 0.05, unit: 'kg',  costPerUnit: 0.9 },
      { name: 'Yeast (dry)',       quantity: 7,    unit: 'g',   costPerUnit: 0.02 },
      { name: 'Dark Chocolate',    quantity: 0.2,  unit: 'kg',  costPerUnit: 8.0 },
      { name: 'Whole Milk',        quantity: 0.15, unit: 'L',   costPerUnit: 1.2 },
      { name: 'Salt',              quantity: 5,    unit: 'g',   costPerUnit: 0.003 },
    ]
  },
  {
    name: 'Chocolate Fudge Cake',
    description: 'Rich layered chocolate cake with ganache frosting',
    yieldQty: 1, yieldUnit: 'cake (8 slices)', expiryDays: 4,
    notes: 'Bake at 175°C for 35 minutes. Cool completely before frosting.',
    ingredients: [
      { name: 'Cake Flour',     quantity: 0.3,  unit: 'kg',  costPerUnit: 1.2 },
      { name: 'Cocoa Powder',   quantity: 60,   unit: 'g',   costPerUnit: 0.025 },
      { name: 'Granulated Sugar', quantity: 0.3, unit: 'kg', costPerUnit: 0.9 },
      { name: 'Butter',         quantity: 0.15, unit: 'kg',  costPerUnit: 5.5 },
      { name: 'Eggs',           quantity: 3,    unit: 'pcs', costPerUnit: 0.25 },
      { name: 'Whole Milk',     quantity: 0.2,  unit: 'L',   costPerUnit: 1.2 },
      { name: 'Baking Powder',  quantity: 10,   unit: 'g',   costPerUnit: 0.01 },
      { name: 'Dark Chocolate', quantity: 0.2,  unit: 'kg',  costPerUnit: 8.0 },
      { name: 'Vanilla Extract',quantity: 5,    unit: 'ml',  costPerUnit: 0.05 },
    ]
  },
  {
    name: 'Butter Cookies',
    description: 'Classic shortbread-style butter cookies',
    yieldQty: 36, yieldUnit: 'pcs', expiryDays: 7,
    notes: 'Chill dough 30 min before cutting. Bake at 180°C for 12 min.',
    ingredients: [
      { name: 'All-Purpose Flour', quantity: 0.3,  unit: 'kg',  costPerUnit: 0.8 },
      { name: 'Butter',            quantity: 0.2,  unit: 'kg',  costPerUnit: 5.5 },
      { name: 'Powdered Sugar',    quantity: 0.1,  unit: 'kg',  costPerUnit: 1.1 },
      { name: 'Eggs',              quantity: 1,    unit: 'pcs', costPerUnit: 0.25 },
      { name: 'Vanilla Extract',   quantity: 5,    unit: 'ml',  costPerUnit: 0.05 },
      { name: 'Salt',              quantity: 2,    unit: 'g',   costPerUnit: 0.003 },
    ]
  },
  {
    name: 'Cinnamon Rolls',
    description: 'Soft yeast rolls with cinnamon-sugar filling and cream cheese icing',
    yieldQty: 12, yieldUnit: 'pcs', expiryDays: 2,
    notes: 'Second rise after shaping. Bake at 190°C for 20 minutes.',
    ingredients: [
      { name: 'All-Purpose Flour', quantity: 0.5,  unit: 'kg',  costPerUnit: 0.8 },
      { name: 'Yeast (dry)',       quantity: 7,    unit: 'g',   costPerUnit: 0.02 },
      { name: 'Whole Milk',        quantity: 0.25, unit: 'L',   costPerUnit: 1.2 },
      { name: 'Butter',            quantity: 0.1,  unit: 'kg',  costPerUnit: 5.5 },
      { name: 'Granulated Sugar',  quantity: 0.1,  unit: 'kg',  costPerUnit: 0.9 },
      { name: 'Eggs',              quantity: 2,    unit: 'pcs', costPerUnit: 0.25 },
      { name: 'Cinnamon',          quantity: 15,   unit: 'g',   costPerUnit: 0.03 },
      { name: 'Salt',              quantity: 5,    unit: 'g',   costPerUnit: 0.003 },
    ]
  },
  {
    name: 'Almond Croissants',
    description: 'Twice-baked croissants filled with almond cream',
    yieldQty: 8, yieldUnit: 'pcs', expiryDays: 2,
    notes: 'Fill day-old croissants with frangipane and top with sliced almonds.',
    ingredients: [
      { name: 'Almond Flour',      quantity: 0.15, unit: 'kg',  costPerUnit: 6.5 },
      { name: 'Butter',            quantity: 0.1,  unit: 'kg',  costPerUnit: 5.5 },
      { name: 'Granulated Sugar',  quantity: 0.1,  unit: 'kg',  costPerUnit: 0.9 },
      { name: 'Eggs',              quantity: 2,    unit: 'pcs', costPerUnit: 0.25 },
      { name: 'Vanilla Extract',   quantity: 3,    unit: 'ml',  costPerUnit: 0.05 },
    ]
  },
  {
    name: 'Sesame Bread Rings (Ka\'ak)',
    description: 'Traditional Middle-Eastern sesame-coated bread rings',
    yieldQty: 20, yieldUnit: 'pcs', expiryDays: 5,
    notes: 'Dip in sesame seeds before baking. Bake at 220°C for 15 min.',
    ingredients: [
      { name: 'Bread Flour',   quantity: 0.5,  unit: 'kg',  costPerUnit: 1.0 },
      { name: 'Sesame Seeds',  quantity: 100,  unit: 'g',   costPerUnit: 0.015 },
      { name: 'Yeast (dry)',   quantity: 7,    unit: 'g',   costPerUnit: 0.02 },
      { name: 'Salt',          quantity: 10,   unit: 'g',   costPerUnit: 0.003 },
      { name: 'Honey',         quantity: 0.03, unit: 'kg',  costPerUnit: 7.0 },
      { name: 'Whole Milk',    quantity: 0.2,  unit: 'L',   costPerUnit: 1.2 },
    ]
  },
  {
    name: 'Honey Cake',
    description: 'Moist cake sweetened with pure honey, lightly spiced',
    yieldQty: 1, yieldUnit: 'cake (10 slices)', expiryDays: 5,
    notes: 'Best served day 2 when honey soaks in. Bake at 170°C for 40 min.',
    ingredients: [
      { name: 'All-Purpose Flour', quantity: 0.3,  unit: 'kg',  costPerUnit: 0.8 },
      { name: 'Honey',             quantity: 0.2,  unit: 'kg',  costPerUnit: 7.0 },
      { name: 'Eggs',              quantity: 3,    unit: 'pcs', costPerUnit: 0.25 },
      { name: 'Butter',            quantity: 0.1,  unit: 'kg',  costPerUnit: 5.5 },
      { name: 'Baking Soda',       quantity: 5,    unit: 'g',   costPerUnit: 0.01 },
      { name: 'Cinnamon',          quantity: 5,    unit: 'g',   costPerUnit: 0.03 },
      { name: 'Whole Milk',        quantity: 0.1,  unit: 'L',   costPerUnit: 1.2 },
    ]
  },
  {
    name: 'Eclairs',
    description: 'French choux pastry filled with pastry cream and topped with chocolate glaze',
    yieldQty: 15, yieldUnit: 'pcs', expiryDays: 2,
    notes: 'Fill only when cold. Best served fresh.',
    ingredients: [
      { name: 'All-Purpose Flour', quantity: 0.15, unit: 'kg',  costPerUnit: 0.8 },
      { name: 'Butter',            quantity: 0.1,  unit: 'kg',  costPerUnit: 5.5 },
      { name: 'Eggs',              quantity: 4,    unit: 'pcs', costPerUnit: 0.25 },
      { name: 'Whole Milk',        quantity: 0.3,  unit: 'L',   costPerUnit: 1.2 },
      { name: 'Heavy Cream',       quantity: 0.2,  unit: 'L',   costPerUnit: 2.5 },
      { name: 'Dark Chocolate',    quantity: 0.1,  unit: 'kg',  costPerUnit: 8.0 },
      { name: 'Granulated Sugar',  quantity: 0.05, unit: 'kg',  costPerUnit: 0.9 },
      { name: 'Vanilla Extract',   quantity: 5,    unit: 'ml',  costPerUnit: 0.05 },
    ]
  },
  {
    name: 'Whole Wheat Loaf',
    description: 'Hearty whole wheat bread with nutty flavor, high fiber',
    yieldQty: 3, yieldUnit: 'loaves', expiryDays: 4,
    notes: 'Mix of whole wheat and bread flour for lighter crumb.',
    ingredients: [
      { name: 'Bread Flour',   quantity: 0.3,  unit: 'kg',  costPerUnit: 1.0 },
      { name: 'Yeast (dry)',   quantity: 7,    unit: 'g',   costPerUnit: 0.02 },
      { name: 'Salt',          quantity: 10,   unit: 'g',   costPerUnit: 0.003 },
      { name: 'Honey',         quantity: 0.02, unit: 'kg',  costPerUnit: 7.0 },
      { name: 'Whole Milk',    quantity: 0.25, unit: 'L',   costPerUnit: 1.2 },
      { name: 'Butter',        quantity: 0.02, unit: 'kg',  costPerUnit: 5.5 },
    ]
  },
  {
    name: 'Cream Puffs',
    description: 'Light choux pastry balls filled with whipped cream',
    yieldQty: 24, yieldUnit: 'pcs', expiryDays: 1,
    notes: 'Fill just before serving to keep crisp.',
    ingredients: [
      { name: 'All-Purpose Flour', quantity: 0.15, unit: 'kg',  costPerUnit: 0.8 },
      { name: 'Butter',            quantity: 0.1,  unit: 'kg',  costPerUnit: 5.5 },
      { name: 'Eggs',              quantity: 4,    unit: 'pcs', costPerUnit: 0.25 },
      { name: 'Heavy Cream',       quantity: 0.3,  unit: 'L',   costPerUnit: 2.5 },
      { name: 'Powdered Sugar',    quantity: 0.03, unit: 'kg',  costPerUnit: 1.1 },
      { name: 'Vanilla Extract',   quantity: 5,    unit: 'ml',  costPerUnit: 0.05 },
    ]
  },
]

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting Bakery seed...\n')
  const p: any = prisma

  // ── 1. CLEAR ────────────────────────────────────────────────────────────────
  console.log('🗑️  Clearing existing bakery data...')
  await p.productionSchedule?.deleteMany().catch(() => {})
  await p.wasteLog?.deleteMany().catch(() => {})
  await p.productionBatch?.deleteMany().catch(() => {})
  await p.recipeIngredient?.deleteMany().catch(() => {})
  await p.recipe?.deleteMany().catch(() => {})
  await p.pantryIngredient?.deleteMany().catch(() => {})
  await p.financialTransaction?.deleteMany().catch(() => {})
  await p.employeeOvertime?.deleteMany().catch(() => {})
  await p.employeeShift?.deleteMany().catch(() => {})
  await p.employeePayroll?.deleteMany().catch(() => {})
  await p.employeeActivityLog?.deleteMany().catch(() => {})
  await p.employeeDocument?.deleteMany().catch(() => {})
  await p.employeeAttendance?.deleteMany().catch(() => {})
  await p.employee?.deleteMany().catch(() => {})
  await p.emailReport?.deleteMany().catch(() => {})
  await p.user?.deleteMany().catch(() => {})
  console.log('✅ Cleared\n')

  // ── 2. USERS ────────────────────────────────────────────────────────────────
  console.log('👤 Creating users...')
  const passwordHash = await bcrypt.hash('password123', 10)
  const adminHash    = await bcrypt.hash('setup123', 10)

  const users = await Promise.all([
    prisma.user.create({ data: { username: 'setup',   passwordHash: adminHash,    role: 'admin',   fullName: 'Setup Admin',       isActive: true } }),
    prisma.user.create({ data: { username: 'manager', passwordHash: passwordHash, role: 'admin',   fullName: 'Bakery Manager',    isActive: true } }),
    prisma.user.create({ data: { username: 'baker1',  passwordHash: passwordHash, role: 'cashier', fullName: 'Head Baker',        isActive: true } }),
    prisma.user.create({ data: { username: 'baker2',  passwordHash: passwordHash, role: 'cashier', fullName: 'Pastry Chef',       isActive: true } }),
    prisma.user.create({ data: { username: 'sales1',  passwordHash: passwordHash, role: 'cashier', fullName: 'Sales Associate 1', isActive: true } }),
    prisma.user.create({ data: { username: 'sales2',  passwordHash: passwordHash, role: 'cashier', fullName: 'Sales Associate 2', isActive: true } }),
  ])
  console.log(`✅ ${users.length} users created`)

  // ── 3. EMPLOYEES ────────────────────────────────────────────────────────────
  console.log('👥 Creating employees + 4 years of HR data...')
  const employees: any[] = []
  for (let i = 0; i < EMPLOYEE_ROLES.length; i++) {
    const def   = EMPLOYEE_ROLES[i]
    const fname = FIRST_NAMES[i]
    const lname = LAST_NAMES[i]
    const hire  = randomDate(FOUR_YEARS_AGO, THREE_YEARS_AGO)

    const emp = await prisma.employee.create({
      data: {
        name:           `${fname} ${lname}`,
        email:          `${fname.toLowerCase()}.${lname.toLowerCase()}@bakery.com`,
        phone:          `+1-555-${String(ri(100, 999))}-${String(ri(1000, 9999))}`,
        role:           def.role,
        department:     def.department,
        salary:         def.salary,
        employmentType: def.type,
        hireDate:       hire,
        status:         'active',
        address:        `${ri(1, 999)} Main St, City`,
        nationalId:     `EMP${String(i + 1).padStart(4, '0')}`,
        notes:          `${def.role} at the bakery since ${hire.getFullYear()}`,
      }
    })
    employees.push(emp)

    // Attendance — every weekday for 4 years
    const attendanceDays = 4 * 365
    const attendanceBatch: any[] = []
    for (let d = attendanceDays; d >= 0; d--) {
      const day = daysAgo(d)
      if (day < hire) continue
      const dow = day.getDay()
      if (dow === 0 || dow === 6) continue // skip weekends
      const present = Math.random() > 0.05
      attendanceBatch.push({
        employeeId:   emp.id,
        date:         day,
        status:       present ? (Math.random() > 0.1 ? 'present' : 'late') : 'absent',
        checkIn:      present ? new Date(day.getTime() + ri(6, 9) * 3_600_000) : null,
        checkOut:     present ? new Date(day.getTime() + ri(14, 18) * 3_600_000) : null,
        notes:        null,
      })
      if (attendanceBatch.length >= 500) {
        await prisma.employeeAttendance.createMany({ data: attendanceBatch })
        attendanceBatch.length = 0
      }
    }
    if (attendanceBatch.length > 0) {
      await prisma.employeeAttendance.createMany({ data: attendanceBatch })
    }

    // Payroll — 48 monthly records
    for (let m = 47; m >= 0; m--) {
      const payDate = new Date(NOW.getFullYear(), NOW.getMonth() - m, 28)
      if (payDate < hire) continue
      const bonus     = Math.random() > 0.8 ? ri(100, 500) : 0
      const deduction = Math.random() > 0.9 ? ri(50, 200) : 0
      await prisma.employeePayroll.create({
        data: {
          employeeId:   emp.id,
          month:        payDate.getMonth() + 1,
          year:         payDate.getFullYear(),
          baseSalary:   def.salary,
          bonuses:      bonus,
          deductions:   deduction,
          netPay:       def.salary + bonus - deduction,
          paidDate:     payDate,
          status:       'paid',
          notes:        bonus > 0 ? 'Performance bonus included' : null,
        }
      }).catch(() => {})
    }

    // Shifts — last 90 days
    for (let d = 90; d >= 0; d--) {
      const shiftDate = daysAgo(d)
      if (shiftDate < hire) continue
      const dow = shiftDate.getDay()
      if (dow === 0 || dow === 6) continue
      const startHour = ri(5, 8)
      const endHour   = startHour + ri(7, 9)
      const startTime = `${String(startHour).padStart(2, '0')}:00`
      const endTime   = `${String(endHour).padStart(2, '0')}:00`
      await prisma.employeeShift.create({
        data: {
          employeeId: emp.id,
          date:       shiftDate,
          startTime,
          endTime,
          shiftType:  startHour <= 6 ? 'morning' : 'day',
          notes:      null,
        }
      }).catch(() => {})
    }

    // Overtime — 20 records
    for (let o = 0; o < 20; o++) {
      const otDate = randomDate(FOUR_YEARS_AGO, NOW)
      if (otDate < hire) continue
      const hours = rp(1, 4)
      await prisma.employeeOvertime.create({
        data: {
          employeeId:    emp.id,
          date:          otDate,
          hours,
          reason:        pick(['Holiday baking','Peak season','Special order','Staff shortage','Equipment maintenance']),
          approved:      true,
          approvedBy:    'manager',
          multiplier:    1.5,
        }
      }).catch(() => {})
    }

    // Activity log
    await prisma.employeeActivityLog.create({
      data: {
        employeeId:  emp.id,
        action:      'hired',
        details:     `${emp.name} joined as ${def.role}`,
        performedBy: 'manager',
      }
    }).catch(() => {})
  }
  console.log(`✅ ${employees.length} employees with full HR data`)

  // ── 4. PANTRY INGREDIENTS ────────────────────────────────────────────────────
  console.log('🧂 Creating pantry ingredients...')
  const pantryItems: any[] = []
  for (const def of PANTRY_DEFS) {
    const item = await prisma.pantryIngredient.create({
      data: {
        name:              def.name,
        currentStock:      rp(def.reorderPoint! * 1.5, def.reorderPoint! * 4),
        unit:              def.unit,
        costPerUnit:       def.costPerUnit,
        lowStockThreshold: def.lowStock,
        reorderPoint:      def.reorderPoint,
        reorderQuantity:   def.reorderQty,
        lastOrderedDate:   randomDate(daysAgo(14), NOW),
        supplierName:      pick(['FreshMill Supplies','Farm Direct','Wholesale Baking Co.','City Ingredients Ltd']),
        notes:             null,
      }
    })
    pantryItems.push(item)
  }
  console.log(`✅ ${pantryItems.length} pantry ingredients`)

  // Build a map for linking recipe ingredients to pantry items
  const pantryByName = new Map(pantryItems.map(p => [p.name, p]))

  // ── 5. RECIPES ──────────────────────────────────────────────────────────────
  console.log('📖 Creating recipes...')
  const recipes: any[] = []
  for (const def of RECIPE_DEFS) {
    const recipe = await prisma.recipe.create({
      data: {
        name:        def.name,
        description: def.description,
        yieldQty:    def.yieldQty,
        yieldUnit:   def.yieldUnit,
        expiryDays:  def.expiryDays,
        notes:       def.notes,
        isActive:    true,
      }
    })

    // Ingredients
    for (const ing of def.ingredients) {
      const pantry = pantryByName.get(ing.name)
      await prisma.recipeIngredient.create({
        data: {
          recipeId:           recipe.id,
          name:               ing.name,
          quantity:           ing.quantity,
          unit:               ing.unit,
          costPerUnit:        ing.costPerUnit,
          pantryIngredientId: pantry?.id ?? null,
        }
      })
    }
    recipes.push(recipe)
  }
  console.log(`✅ ${recipes.length} recipes with ingredients`)

  // ── 6. PRODUCTION BATCHES (4 years daily) ───────────────────────────────────
  console.log('🏭 Creating 4 years of production batches...')
  let batchCount = 0
  const batchRecords: any[] = []

  for (let d = 4 * 365; d >= 0; d--) {
    const batchDate = daysAgo(d)
    const dow = batchDate.getDay()
    // Bake every day except Sunday; lighter on Saturday
    if (dow === 0) continue
    const batchesPerDay = dow === 6 ? ri(2, 4) : ri(3, 6)

    for (let b = 0; b < batchesPerDay; b++) {
      const recipe   = recipes[b % recipes.length]
      const quantity = rp(1, 4)
      const unitsProduced = Math.round(quantity * recipe.yieldQty * 10) / 10

      // Compute total cost from recipe definition
      const recDef = RECIPE_DEFS.find(r => r.name === recipe.name)!
      const totalCost = recDef.ingredients.reduce(
        (sum, ing) => sum + ing.quantity * ing.costPerUnit * quantity, 0
      )

      const expiresAt = recipe.expiryDays
        ? new Date(batchDate.getTime() + recipe.expiryDays * MS_DAY)
        : null

      batchRecords.push({
        id:           uuid(),
        recipeId:     recipe.id,
        batchDate,
        quantity,
        unitsProduced,
        totalCost:    Math.round(totalCost * 100) / 100,
        expiresAt,
        notes:        Math.random() > 0.85 ? pick(['Slight over-browning','Perfect batch','Extra glaze applied','Customer rush']) : null,
        createdAt:    batchDate,
        updatedAt:    batchDate,
      })
    }

    if (batchRecords.length >= 500) {
      await prisma.productionBatch.createMany({ data: batchRecords })
      batchCount += batchRecords.length
      batchRecords.length = 0
    }
  }
  if (batchRecords.length > 0) {
    await prisma.productionBatch.createMany({ data: batchRecords })
    batchCount += batchRecords.length
  }
  console.log(`✅ ${batchCount} production batches`)

  // ── 7. PRODUCTION SCHEDULES (next 30 days + 4 years historical) ─────────────
  console.log('📅 Creating production schedules...')
  let schedCount = 0
  const schedRecords: any[] = []

  // Historical (4 years, completed)
  for (let d = 4 * 365; d >= 1; d--) {
    const schedDate = daysAgo(d)
    const dow = schedDate.getDay()
    if (dow === 0) continue
    const recipe = recipes[d % recipes.length]
    const planned = rp(2, 5)
    const completed = Math.random() > 0.1
    schedRecords.push({
      id:             uuid(),
      recipeId:       recipe.id,
      scheduledDate:  schedDate,
      plannedQuantity: planned,
      actualQuantity:  completed ? rp(planned * 0.8, planned * 1.1) : null,
      status:         completed ? 'completed' : 'cancelled',
      notes:          null,
      createdAt:      schedDate,
      updatedAt:      schedDate,
    })
    if (schedRecords.length >= 500) {
      await prisma.productionSchedule.createMany({ data: schedRecords })
      schedCount += schedRecords.length
      schedRecords.length = 0
    }
  }

  // Future 30 days (planned)
  for (let d = 0; d <= 30; d++) {
    const schedDate = daysFromNow(d)
    const dow = schedDate.getDay()
    if (dow === 0) continue
    const recipe = recipes[d % recipes.length]
    schedRecords.push({
      id:             uuid(),
      recipeId:       recipe.id,
      scheduledDate:  schedDate,
      plannedQuantity: rp(2, 5),
      actualQuantity:  null,
      status:         d === 0 ? 'in-progress' : 'planned',
      notes:          null,
      createdAt:      NOW,
      updatedAt:      NOW,
    })
  }

  if (schedRecords.length > 0) {
    await prisma.productionSchedule.createMany({ data: schedRecords })
    schedCount += schedRecords.length
  }
  console.log(`✅ ${schedCount} production schedules`)

  // ── 8. WASTE LOGS (4 years) ──────────────────────────────────────────────────
  console.log('🗑️  Creating waste logs...')
  let wasteCount = 0
  const wasteRecords: any[] = []

  for (let d = 4 * 365; d >= 0; d--) {
    const wasteDate = daysAgo(d)
    // Waste happens ~40% of days
    if (Math.random() > 0.4) continue
    const numLogs = ri(1, 3)
    for (let w = 0; w < numLogs; w++) {
      const wasteType = pick(WASTE_TYPES)
      const recipe    = Math.random() > 0.5 ? pick(recipes) : null
      const pantry    = wasteType === 'ingredient' ? pick(pantryItems) : null
      wasteRecords.push({
        id:                uuid(),
        wasteType,
        recipeId:          recipe?.id ?? null,
        pantryIngredientId: pantry?.id ?? null,
        itemName:          pantry?.name ?? (recipe?.name ?? pick(['Croissants','Bread loaf','Cake slice','Cookie batch'])),
        quantity:          rp(0.1, 5),
        unit:              pantry?.unit ?? 'pcs',
        cost:              rp(1, 30),
        reason:            pick(WASTE_REASONS),
        wasteDate,
        notes:             Math.random() > 0.7 ? 'Noted and discarded properly' : null,
        createdAt:         wasteDate,
      })
    }
    if (wasteRecords.length >= 500) {
      await prisma.wasteLog.createMany({ data: wasteRecords })
      wasteCount += wasteRecords.length
      wasteRecords.length = 0
    }
  }
  if (wasteRecords.length > 0) {
    await prisma.wasteLog.createMany({ data: wasteRecords })
    wasteCount += wasteRecords.length
  }
  console.log(`✅ ${wasteCount} waste logs`)

  // ── 9. FINANCIAL TRANSACTIONS (4 years) ──────────────────────────────────────
  console.log('💰 Creating financial transactions...')
  let ftCount = 0
  const ftRecords: any[] = []

  for (let d = 4 * 365; d >= 0; d--) {
    const txDate = daysAgo(d)
    const dow = txDate.getDay()
    if (dow === 0) continue

    // Daily income (sales revenue estimate)
    const dailyRevenue = rp(800, 3500)
    ftRecords.push({
      id:          uuid(),
      type:        'income',
      amount:      dailyRevenue,
      description: 'Daily bakery sales revenue',
      userId:      users[0].id,
      createdAt:   txDate,
      updatedAt:   txDate,
    })

    // Monthly expenses (first day of month)
    if (txDate.getDate() === 1) {
      const expenseDefs = [
        { desc: 'Monthly rent',           amount: rp(2000, 3000) },
        { desc: 'Utilities',              amount: rp(300,  600)  },
        { desc: 'Ingredients restocking', amount: rp(1500, 3000) },
        { desc: 'Staff salaries',         amount: rp(15000, 22000) },
      ]
      for (const exp of expenseDefs) {
        ftRecords.push({
          id:          uuid(),
          type:        'expense',
          amount:      exp.amount,
          description: exp.desc,
          userId:      users[0].id,
          createdAt:   txDate,
          updatedAt:   txDate,
        })
      }
    }

    // Occasional extra expenses
    if (Math.random() > 0.85) {
      const cat = pick(FT_EXPENSE_CATS)
      ftRecords.push({
        id:          uuid(),
        type:        'expense',
        amount:      rp(50, 500),
        description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} expense`,
        userId:      users[0].id,
        createdAt:   txDate,
        updatedAt:   txDate,
      })
    }

    if (ftRecords.length >= 500) {
      await prisma.financialTransaction.createMany({ data: ftRecords })
      ftCount += ftRecords.length
      ftRecords.length = 0
    }
  }
  if (ftRecords.length > 0) {
    await prisma.financialTransaction.createMany({ data: ftRecords })
    ftCount += ftRecords.length
  }
  console.log(`✅ ${ftCount} financial transactions`)

  // ── 10. BAKERY SALES (4 years) ───────────────────────────────────────────────
  console.log('🛒 Creating bakery sales...')
  let saleCount = 0
  const saleRecords: any[] = []

  // Unit sell price per recipe (keyed by recipe name)
  const SALE_PRICE_BY_NAME: Record<string, number> = {
    'Classic White Bread':         3.50,
    'Sourdough Loaf':              6.00,
    'Chocolate Croissants':        2.75,
    'Chocolate Fudge Cake':       28.00,
    'Butter Cookies':              0.60,
    'Cinnamon Rolls':              2.50,
    'Almond Croissants':           3.25,
    "Sesame Bread Rings (Ka'ak)":  1.20,
    'Honey Cake':                 24.00,
    'Eclairs':                     2.80,
    'Whole Wheat Loaf':            4.50,
    'Baklava Bites':               1.80,
  }

  for (let d = 4 * 365; d >= 0; d--) {
    const saleDate = daysAgo(d)
    const dow = saleDate.getDay()
    if (dow === 0) continue // closed Sundays

    // 3–6 recipes sell each day
    const numRecipes = ri(3, 6)
    const shuffled = [...recipes].sort(() => Math.random() - 0.5).slice(0, numRecipes)

    for (const recipe of shuffled) {
      // 1–3 transactions per recipe per day
      const numTx = ri(1, 3)
      for (let tx = 0; tx < numTx; tx++) {
        const basePrice  = SALE_PRICE_BY_NAME[recipe.name] ?? rp(2.0, 8.0)
        // slight daily price variation ±5%
        const unitPrice  = Math.round(basePrice * (0.95 + Math.random() * 0.1) * 100) / 100
        const quantity   = ri(3, 25)
        const totalAmount = Math.round(unitPrice * quantity * 100) / 100
        const saleDateTs = new Date(saleDate)
        saleDateTs.setHours(ri(8, 19), ri(0, 59), 0, 0)

        saleRecords.push({
          id:          uuid(),
          recipeId:    recipe.id,
          batchId:     null,
          itemName:    recipe.name,
          quantity,
          unitPrice,
          totalAmount,
          saleDate:    saleDateTs,
          notes:       null,
          createdAt:   saleDateTs,
          updatedAt:   saleDateTs,
        })
      }
    }

    if (saleRecords.length >= 500) {
      await prisma.bakerySale.createMany({ data: saleRecords })
      saleCount += saleRecords.length
      saleRecords.length = 0
    }
  }
  if (saleRecords.length > 0) {
    await prisma.bakerySale.createMany({ data: saleRecords })
    saleCount += saleRecords.length
  }
  console.log(`✅ ${saleCount} bakery sales`)

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n🎉 Bakery seed complete!\n')
  console.log('📊 Summary:')
  console.log(`   • ${users.length} users`)
  console.log(`   • ${employees.length} employees (attendance + payroll + shifts + overtime)`)
  console.log(`   • ${pantryItems.length} pantry ingredients`)
  console.log(`   • ${recipes.length} recipes with ingredients`)
  console.log(`   • ${batchCount} production batches (4 years)`)
  console.log(`   • ${schedCount} production schedules`)
  console.log(`   • ${wasteCount} waste logs`)
  console.log(`   • ${ftCount} financial transactions`)
  console.log(`   • ${saleCount} bakery sales`)
  console.log('\n🔐 Login: setup / setup123\n')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
