/**
 * Commerce Plugin — Comprehensive Development Seed
 *
 * Simulates 4 years of real daily business activity:
 *   • 7 categories, 500 products (simple + variant) with EAV attributes
 *   • 3 stores, 6 users (admin / managers / cashiers)
 *   • 1 500 customers with loyalty tiers
 *   • 10 suppliers + supplier-product links + purchase orders
 *   • Installment plans + deposits
 *   • 60 000 sale transactions (line items, discounts, refunds)
 *   • Realistic stock movements (RESTOCK / SALE / ADJUSTMENT / RETURN / SHRINKAGE)
 *   • Receipt templates per store
 *   • Full HR module (Employees, Attendance, Payroll, Shifts, Overtime, Leaves, Docs, Org Chart)
 *   • 4 years of CommerceExpense records (rent, utilities, salary, marketing …)
 *   • Financial transactions mirroring sales & expenses
 *
 * Usage:
 *   npx ts-node prisma/seeds/commerce/seed.ts
 *   — or —
 *   npm run prisma:seed:commerce
 */

import { PrismaClient } from '../../../src/generated/prisma'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  log: ['warn', 'error'],
})

const t0 = Date.now()

// ── helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date()
const MS_DAY = 86_400_000
const MS_YEAR = 365.25 * MS_DAY

function daysAgo(n: number) { return new Date(NOW.getTime() - n * MS_DAY) }
function randomDate(from: Date, to: Date) {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))
}
function ri(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function rp(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function pick<T>(arr: T[]): T { return arr[ri(0, arr.length - 1)] }
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ── constants ─────────────────────────────────────────────────────────────────

const FOUR_YEARS_AGO  = daysAgo(4 * 365)
const THREE_YEARS_AGO = daysAgo(3 * 365)
const TWO_YEARS_AGO   = daysAgo(2 * 365)
const ONE_YEAR_AGO    = daysAgo(365)
const SIX_MONTHS_AGO  = daysAgo(180)

const CONFIG = {
  PRODUCTS:      500,
  CUSTOMERS:   1_500,
  SALES:      60_000,
  BATCH_SALE:    500,
}

const CATEGORY_DEFS = [
  { name: 'Electronics',       icon: '💻', color: '#3B82F6', weight: 0.15 },
  { name: 'Clothing',          icon: '👗', color: '#EC4899', weight: 0.22 },
  { name: 'Home & Kitchen',    icon: '🏠', color: '#10B981', weight: 0.18 },
  { name: 'Sports & Fitness',  icon: '🏃', color: '#F59E0B', weight: 0.10 },
  { name: 'Books & Stationery',icon: '📚', color: '#8B5CF6', weight: 0.08 },
  { name: 'Food & Beverages',  icon: '🍎', color: '#EF4444', weight: 0.14 },
  { name: 'Beauty & Health',   icon: '💄', color: '#F472B6', weight: 0.13 },
]

const PRODUCT_NAMES: Record<string, string[]> = {
  'Electronics':       ['Wireless Headphones','Bluetooth Speaker','USB-C Hub','Mechanical Keyboard','Gaming Mouse','4K Webcam','Smart LED Bulb','Power Bank 20000mAh','Portable SSD','Laptop Stand','Screen Protector','HDMI Cable 2m','USB Desk Fan','Digital Alarm Clock','Mini Projector'],
  'Clothing':          ['Classic T-Shirt','Slim-Fit Jeans','Zip Hoodie','Leather Belt','Cotton Socks Pack','Running Shorts','Chino Trousers','V-Neck Sweater','Puffer Jacket','Formal Shirt','Denim Jacket','Yoga Leggings','Polo Shirt','Linen Blouse','Cargo Shorts'],
  'Home & Kitchen':    ['French Press Coffee Maker','Non-Stick Frying Pan','Bamboo Cutting Board','Stainless Steel Kettle','Ceramic Dinner Set','Glass Storage Jars','Silicone Spatula Set','Digital Kitchen Scale','Airtight Lunch Box','Dish Drying Rack','Stainless Mixing Bowls','Wooden Salad Bowl','Coffee Mug Pair','Instant Pot Insert','Cast Iron Skillet'],
  'Sports & Fitness':  ['Yoga Mat 6mm','Adjustable Dumbbells','Resistance Band Set','Jump Rope','Foam Roller','Gym Gloves','Sports Water Bottle','Ankle Weights','Pull-Up Bar','Exercise Ball','Skipping Rope','Treadmill Mat','Weight Belt','Wrist Wraps','Protein Shaker'],
  'Books & Stationery':['Hardcover Notebook A5','Gel Pen Set 10pc','Highlighter Pack','Sticky Notes Multicolour','Desk Organiser','Planner 2025','Fountain Pen','Washi Tape Set','Mechanical Pencil 0.5','Leather Journal','Index Cards 200pc','Binder Clips Set','Correction Tape','Whiteboard Marker Set','Document Folder'],
  'Food & Beverages':  ['Arabica Ground Coffee 500g','Assorted Tea 80 bags','Premium Olive Oil 750ml','Raw Honey 500g','Dark Chocolate 70%','Mixed Nuts 300g','Protein Bar Box 12pc','Instant Oats 1kg','Green Tea Extract','Coconut Water 330ml','Apple Cider Vinegar','Chia Seeds 250g','Trail Mix 400g','Almond Butter 350g','Sparkling Water Pack'],
  'Beauty & Health':   ['Vitamin C Serum','Moisturising Face Cream','Argan Oil Hair Mask','Bamboo Charcoal Soap','Micellar Cleansing Water','Retinol Night Cream','SPF 50 Sunscreen','Aloe Vera Gel','Rose Water Toner','Nail Care Kit','Collagen Capsules 60pc','Biotin Supplement','Vitamin D3 1000IU','Omega-3 Fish Oil','Zinc & Magnesium 90 caps'],
}

const COLORS = ['Black','White','Red','Blue','Green','Gray','Navy','Brown','Pink','Purple','Orange','Yellow']
const SIZES  = ['XS','S','M','L','XL','XXL','One Size']

const FIRST_NAMES = ['Ahmed','Mohammed','Ali','Omar','Hassan','Ibrahim','Khalid','Youssef','Tariq','Samir','Nour','Lina','Sara','Hana','Rania','Dina','Maya','Layla','Yasmin','Fatima','Adam','Karim','Bilal','Sami','Walid','David','Daniel','Michael','James','Robert','Emma','Olivia','Sophia','Isabella','Charlotte','Elena','Laura','Nicole','Maria','Sandra']
const LAST_NAMES  = ['Al-Hassan','Al-Omar','Ibrahim','Khalil','Nasser','Mansour','Haddad','Khoury','Salam','Farah','Nasr','Sabbagh','Tannous','Rizk','Jaber','Assaf','Barakat','Moussa','Diab','Saad','Smith','Johnson','Williams','Brown','Jones','Garcia','Martinez','Davis','Wilson','Anderson']

const CITIES = ['Beirut','Dubai','Cairo','Riyadh','Amman','Doha','Kuwait City','Muscat','Baghdad','Casablanca','New York','London','Paris','Berlin','Istanbul','Lagos','Nairobi','Karachi','Mumbai','Jakarta']

const SUPPLIER_NAMES = [
  'Global Tech Distributors','Fashion Forward Wholesale','Kitchen Essentials Co.','FitPro Supply Chain','Bookworld Wholesale','NutriChoice Suppliers','BeautyHive Wholesale','ElectroSource Ltd','ThreadMasters B2B','HomeStyle Distribution','ActiveGear Imports','PaperTrail Supplies','GourmetWorld Trading','GlowUp Cosmetics Wholesale','OmniGoods Trading',
]

const EXPENSE_CATEGORIES = ['rent','utilities','supplies','inventory','marketing','maintenance','fees','insurance','other'] as string[]
const EXPENSE_VENDORS: Record<string, string[]> = {
  rent:        ['Prime Properties LLC','CitySpace Realty','Downtown Property Group'],
  utilities:   ['Power & Light Corp','WaterWorks Municipal','TelecomNet'],
  supplies:    ['OfficeDepot Pro','PackageMart','CleanPro Janitorial'],
  inventory:   ['Global Tech Distributors','Fashion Forward Wholesale','NutriChoice Suppliers'],
  marketing:   ['AdAgency Digital','SocialBoost Marketing','PrintMaster Pro'],
  maintenance: ['BuildRight Services','Fix-It Pro','TechSupport Solutions'],
  fees:        ['CityHall Licensing','Chamber of Commerce','PaymentGateway Inc'],
  insurance:   ['SafeGuard Insurance','ShieldPro Brokers','AllRisk Coverage'],
  other:       ['Miscellaneous Vendor','General Supplies Co','Other Services'],
}

const PAYMENT_METHODS = ['cash','card','bank_transfer','cheque']

// Standardized safe image references (stored relative to assets/images folder or served as placeholders)
const DUMMY_IMAGES = [
  'placeholder-product-1.webp',
  'placeholder-product-2.webp',
  'placeholder-product-3.webp',
  'placeholder-product-4.webp',
  'placeholder-product-5.webp',
]

const EMPLOYEE_ROLES = [
  { role: 'Store Manager',      department: 'Management', salary: 5_500, type: 'full-time', isManager: true },
  { role: 'Assistant Manager',  department: 'Management', salary: 4_000, type: 'full-time', isManager: true },
  { role: 'Cashier',            department: 'Sales',      salary: 2_500, type: 'full-time', isManager: false },
  { role: 'Cashier',            department: 'Sales',      salary: 2_500, type: 'full-time', isManager: false },
  { role: 'Sales Associate',    department: 'Sales',      salary: 2_800, type: 'full-time', isManager: false },
  { role: 'Sales Associate',    department: 'Sales',      salary: 2_800, type: 'part-time', isManager: false },
  { role: 'Stock Clerk',        department: 'Warehouse',  salary: 2_200, type: 'full-time', isManager: false },
  { role: 'Inventory Analyst',  department: 'Warehouse',  salary: 3_000, type: 'full-time', isManager: false },
  { role: 'Finance Officer',    department: 'Finance',    salary: 4_500, type: 'full-time', isManager: false },
  { role: 'IT Support',         department: 'IT',         salary: 3_800, type: 'full-time', isManager: false },
  { role: 'Security Guard',     department: 'Operations', salary: 2_000, type: 'full-time', isManager: false },
  { role: 'Cleaning Staff',     department: 'Operations', salary: 1_500, type: 'part-time', isManager: false },
]

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Commerce Seed — 4 years of business data\n')

  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
  await prisma.$queryRawUnsafe('PRAGMA cache_size = -65536;')
  await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')

  // ── CLEAR ────────────────────────────────────────────────────────────────
  console.log('🗑️  Clearing existing commerce & HR data...')
  await prisma.commerceExpense.deleteMany()
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.supplierProduct.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.variantAttributeValue.deleteMany()
  await prisma.productAttribute.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.installment.deleteMany()
  await prisma.deposit.deleteMany()
  await prisma.saleTransaction.deleteMany()
  await prisma.installmentPlan.deleteMany()
  await prisma.receiptTemplate.deleteMany()
  await prisma.productImage.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.store.deleteMany()
  await prisma.financialTransaction.deleteMany()
  await prisma.emailReport.deleteMany()
  
  // HR / Employees (clean in reverse foreign-key order)
  await prisma.employeeLeave.deleteMany()
  await prisma.employeeOvertime.deleteMany()
  await prisma.employeeShift.deleteMany()
  await prisma.employeePayroll.deleteMany()
  await prisma.employeeActivityLog.deleteMany()
  await prisma.employeeDocument.deleteMany()
  await prisma.employeeAttendance.deleteMany()
  await prisma.employee.deleteMany()
  console.log('✅ Cleared\n')

  // ── USERS ────────────────────────────────────────────────────────────────
  console.log('👤 Creating users...')
  await prisma.user.deleteMany()
  const passwordHash = await bcrypt.hash('admin123', 10)

  const [uAdmin, uManager, uCashier1, uCashier2, uSales1, uSales2] = await Promise.all([
    prisma.user.create({ data: { username: 'setup',    passwordHash: await bcrypt.hash('setup123', 10), role: 'admin',   fullName: 'Setup Admin',     email: 'setup@store.com',    isActive: true } }),
    prisma.user.create({ data: { username: 'admin',    passwordHash, role: 'admin',   fullName: 'Admin User',      email: 'admin@store.com',    isActive: true } }),
    prisma.user.create({ data: { username: 'manager',  passwordHash: await bcrypt.hash('manager123', 10), role: 'manager', fullName: 'Faris Khoury',  email: 'faris@store.com',    isActive: true } }),
    prisma.user.create({ data: { username: 'cashier1', passwordHash: await bcrypt.hash('cashier123', 10), role: 'cashier', fullName: 'Sara Hassan',   email: 'sara@store.com',     isActive: true } }),
    prisma.user.create({ data: { username: 'cashier2', passwordHash: await bcrypt.hash('cashier123', 10), role: 'cashier', fullName: 'Omar Nasser',   email: 'omar@store.com',     isActive: true } }),
    prisma.user.create({ data: { username: 'sales1',   passwordHash: await bcrypt.hash('sales123', 10),   role: 'cashier', fullName: 'Lina Mansour',  email: 'lina@store.com',     isActive: true } }),
  ])
  const users = [uAdmin, uManager, uCashier1, uCashier2, uSales1, uSales2]
  console.log(`✅ ${users.length} users\n`)

  // ── EMPLOYEES ────────────────────────────────────────────────────────────
  console.log('👷 Creating employees with 4 years of HR data…')
  const EMP_NAMES = [
    'Faris Khoury','Sara Hassan','Omar Nasser','Lina Mansour','Karim Sabbagh',
    'Maya Haddad','Bilal Nasser','Rania Ibrahim','Tariq Farah','Hana Rizk',
    'Sami Barakat','Dina Moussa',
  ]
  const employeeRecords: any[] = []
  let storeManagerId: string | null = null

  for (let ei = 0; ei < EMPLOYEE_ROLES.length; ei++) {
    const def      = EMPLOYEE_ROLES[ei]
    const name     = EMP_NAMES[ei]
    const hireDate = randomDate(FOUR_YEARS_AGO, TWO_YEARS_AGO)
    const emp = await prisma.employee.create({ data: {
      name,
      role:             def.role,
      department:       def.department,
      email:            `${name.toLowerCase().replace(/[^a-z]/g,'.')}.${ei}@store.com`,
      phone:            `+961-70-${String(ri(100000,999999))}`,
      address:          `${ri(10, 999)} Beirut Central District, Lebanon`,
      nationalId:       `NID-${ri(1000000, 9999999)}`,
      avatarUrl:        `avatars/employee-${(ei % 6) + 1}.png`,
      salary:           def.salary,
      salaryType:       'monthly',
      employmentType:   def.type,
      status:           'active',
      hireDate,
      performanceScore: rp(70, 98),
      annualLeaveDays:  21,
      taxId:            `TAX-LEB-${ri(10000, 99999)}`,
      socialInsuranceNo:`NSSF-${ri(100000, 999999)}`,
      bankName:         'Bank Audi',
      iban:             `LB62000200000000${String(ri(10000000, 99999999))}`,
      emergencyName:    pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
      emergencyPhone:   `+961-71-${String(ri(100000,999999))}`,
      managerId:        def.isManager ? null : storeManagerId,
    }})
    
    if (def.role === 'Store Manager' && !storeManagerId) {
      storeManagerId = emp.id
    }
    employeeRecords.push(emp)

    // Attendance: every working day for 4 years
    const ATT_STATUSES = ['present','present','present','present','present','late','absent','half-day']
    const today = new Date(); today.setHours(0,0,0,0)
    const attRecords: any[] = []
    for (let d = Math.round(4 * 365); d >= 0; d--) {
      const date = new Date(today.getTime() - d * MS_DAY)
      if (date < hireDate) continue
      const dow = date.getDay()
      if (dow === 0 || dow === 5) continue // Fri/Sun off
      const status   = pick(ATT_STATUSES)
      const checkIn  = status !== 'absent' ? new Date(date.getTime() + (8 + (status === 'late' ? ri(1,2) : 0)) * 3600_000) : null
      const checkOut = checkIn ? new Date(date.getTime() + (16 + ri(0,3)) * 3600_000) : null
      attRecords.push({ employeeId: emp.id, date, status, checkIn, checkOut })
    }
    for (let i = 0; i < attRecords.length; i += 500) {
      await prisma.employeeAttendance.createMany({ data: attRecords.slice(i, i + 500) }).catch(() => {})
    }

    // Payroll: all 48 months
    for (let m = 47; m >= 0; m--) {
      const d = new Date(NOW); d.setDate(1); d.setMonth(d.getMonth() - m)
      if (d < hireDate) continue
      const bonuses    = Math.random() > 0.7 ? rp(100, 800) : 0
      const deductions = Math.random() > 0.8 ? rp(50,  300) : 0
      const otHours    = Math.random() > 0.6 ? ri(2, 20) : 0
      const otPay      = rp(otHours * (def.salary / 176) * 1.5, otHours * (def.salary / 176) * 1.5)
      const grossPay   = def.salary + otPay + bonuses
      const netPay     = grossPay - deductions
      await prisma.employeePayroll.create({ data: {
        employeeId:   emp.id,
        month:        d.getMonth() + 1,
        year:         d.getFullYear(),
        baseSalary:   def.salary,
        regularHours: ri(150, 176),
        overtimeHours:otHours,
        overtimePay:  otPay,
        bonuses, deductions, grossPay, netPay,
        status:       m > 0 ? 'paid' : 'pending',
        paidDate:     m > 0 ? new Date(d.getFullYear(), d.getMonth(), 28) : null,
      }}).catch(() => {})
    }

    // Shifts: last 90 days
    const SHIFTS = [
      { type: 'morning', start: '08:00', end: '16:00' },
      { type: 'evening', start: '14:00', end: '22:00' },
    ]
    for (let d = 89; d >= 0; d--) {
      const date = new Date(today.getTime() - d * MS_DAY)
      if (date.getDay() === 0 || date.getDay() === 5) continue
      const shift = pick(SHIFTS)
      await prisma.employeeShift.create({ data: {
        employeeId: emp.id, date,
        shiftType: shift.type, startTime: shift.start, endTime: shift.end,
        breakMins: 30,
      }})
    }

    // Overtime: ~20 records per employee
    for (let o = 0; o < 20; o++) {
      await prisma.employeeOvertime.create({ data: {
        employeeId: emp.id,
        date:       randomDate(ONE_YEAR_AGO, NOW),
        hours:      ri(1, 5),
        reason:     pick(['High sales volume','Stock count','End-of-month close','Holiday coverage','System upgrade']),
        approved:   Math.random() > 0.2,
        approvedBy: uAdmin.id,
        multiplier: 1.5,
      }})
    }

    // Leaves / PTO (4–8 leave records over past 4 years)
    const numLeaves = ri(4, 8)
    for (let l = 0; l < numLeaves; l++) {
      const lStart = randomDate(hireDate, NOW)
      const lDays = ri(1, 5)
      const lEnd = new Date(lStart.getTime() + lDays * MS_DAY)
      await prisma.employeeLeave.create({ data: {
        employeeId: emp.id,
        type:       pick(['annual','sick','unpaid']),
        startDate:  lStart,
        endDate:    lEnd,
        days:       lDays,
        reason:     pick(['Annual vacation','Medical leave','Personal leave','Family emergency']),
        status:     'approved',
        approvedBy: uAdmin.id,
        reviewedAt: lStart,
      }}).catch(() => {})
    }

    // Documents
    await prisma.employeeDocument.createMany({ data: [
      { employeeId: emp.id, title: 'Employment Contract', type: 'contract', filename: `contracts/${emp.id}-contract.pdf` },
      { employeeId: emp.id, title: 'National ID Copy',    type: 'id_copy',  filename: `ids/${emp.id}-id.pdf` },
    ]}).catch(() => {})

    // Activity log
    await prisma.employeeActivityLog.createMany({ data: [
      { employeeId: emp.id, action: 'hired',          details: 'Employee onboarded', performedBy: uAdmin.id, createdAt: hireDate },
      { employeeId: emp.id, action: 'salary_updated', details: `Base salary set to ${def.salary}`, performedBy: uAdmin.id, createdAt: hireDate },
    ]})
  }
  console.log(`✅ ${employeeRecords.length} employees (attendance, payroll, shifts, overtime, leaves, docs)\n`)

  // ── STORES ───────────────────────────────────────────────────────────────
  console.log('🏪 Creating stores...')
  const [sMain, sWest, sEast] = await Promise.all([
    prisma.store.create({ data: { name: 'Main Branch',    location: 'Downtown City Centre', phone: '+961-1-100100', hours: '9:00 AM – 9:00 PM', manager: 'Faris Khoury',  status: 'active' } }),
    prisma.store.create({ data: { name: 'West Branch',    location: 'West Mall, Level 2',   phone: '+961-1-200200', hours: '10:00 AM – 10:00 PM', manager: 'Sara Hassan', status: 'active' } }),
    prisma.store.create({ data: { name: 'Airport Branch', location: 'Terminal 1, Arrivals', phone: '+961-1-300300', hours: '6:00 AM – 11:00 PM', manager: 'Omar Nasser',  status: 'active' } }),
  ])
  const stores = [sMain, sWest, sEast]
  console.log(`✅ ${stores.length} stores\n`)

  // ── RECEIPT TEMPLATES ────────────────────────────────────────────────────
  console.log('🧾 Creating receipt templates...')
  await prisma.receiptTemplate.createMany({ data: [
    { name: 'Thermal Default', type: 'thermal', storeId: sMain.id,  isDefault: true,  isActive: true, showLogo: true,  fontSize: 12, layout: 'standard' },
    { name: 'A4 Invoice',      type: 'a4',      storeId: sMain.id,  isDefault: false, isActive: true, showLogo: true,  fontSize: 11, layout: 'detailed', showQRCode: true },
    { name: 'Thermal Compact', type: 'thermal', storeId: sWest.id,  isDefault: true,  isActive: true, showLogo: false, fontSize: 11, layout: 'compact'  },
    { name: 'Thermal Default', type: 'thermal', storeId: sEast.id,  isDefault: true,  isActive: true, showLogo: true,  fontSize: 12, layout: 'standard' },
  ]})
  console.log('✅ Receipt templates\n')

  // ── INSTALLMENT PLANS ────────────────────────────────────────────────────
  console.log('💳 Creating installment plans...')
  const [plan3, plan6, plan12, plan24] = await Promise.all([
    prisma.installmentPlan.create({ data: { name: '3 Months',  downPaymentPercent: 30, numberOfPayments:  3, intervalDays: 30, interestRate: 0,   minAmount: 200,   isActive: true } }),
    prisma.installmentPlan.create({ data: { name: '6 Months',  downPaymentPercent: 25, numberOfPayments:  6, intervalDays: 30, interestRate: 2.5, minAmount: 500,   isActive: true } }),
    prisma.installmentPlan.create({ data: { name: '12 Months', downPaymentPercent: 20, numberOfPayments: 12, intervalDays: 30, interestRate: 5,   minAmount: 1_000, isActive: true } }),
    prisma.installmentPlan.create({ data: { name: '24 Months', downPaymentPercent: 15, numberOfPayments: 24, intervalDays: 30, interestRate: 7.5, minAmount: 2_000, isActive: true } }),
  ])
  const installmentPlans = [plan3, plan6, plan12, plan24]
  console.log(`✅ ${installmentPlans.length} plans\n`)

  // ── CATEGORIES ───────────────────────────────────────────────────────────
  console.log('📂 Creating categories...')
  const categoryRecords = await Promise.all(
    CATEGORY_DEFS.map(c => prisma.category.create({ data: { name: c.name, description: `${c.name} — curated collection`, icon: c.icon, color: c.color } }))
  )
  console.log(`✅ ${categoryRecords.length} categories\n`)

  // ── SUPPLIERS ────────────────────────────────────────────────────────────
  console.log('🏭 Creating suppliers...')
  const suppliers = await Promise.all(
    SUPPLIER_NAMES.map((name, i) => prisma.supplier.create({ data: {
      name,
      contactName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      email:        `contact@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      phone:        `+1-800-${String(i + 1).padStart(3,'0')}-${String(ri(1000,9999))}`,
      address:      `${ri(1,999)} ${pick(['Main St','Trade Ave','Commerce Blvd','Industrial Rd','Market Lane'])}, ${pick(CITIES)}`,
      paymentTerms: pick(['Net 30','Net 60','Net 15','COD','Net 45']),
      isActive:     true,
      notes:        Math.random() > 0.5 ? `Preferred supplier for ${name.split(' ')[0]} items` : null,
    }}))
  )
  console.log(`✅ ${suppliers.length} suppliers\n`)

  // ── PRODUCTS (500) ───────────────────────────────────────────────────────
  console.log(`📦 Creating ${CONFIG.PRODUCTS} products…`)
  const productRecords: any[] = []
  let productIdx = 0

  for (const catRecord of categoryRecords) {
    const catDef    = CATEGORY_DEFS.find(c => c.name === catRecord.name)!
    const catWeight = catDef.weight
    const catCount  = Math.round(CONFIG.PRODUCTS * catWeight)
    const names     = PRODUCT_NAMES[catRecord.name]

    for (let i = 0; i < catCount; i++) {
      productIdx++
      const prefix      = catRecord.name.substring(0, 3).toUpperCase()
      const baseSKU     = `${prefix}-${String(productIdx).padStart(5,'0')}`
      const basePrice   = rp(5, 500)
      const baseCost    = rp(basePrice * 0.45, basePrice * 0.70)
      const hasVariants = Math.random() > 0.35
      const createdAt   = randomDate(THREE_YEARS_AGO, NOW)
      const supplier    = pick(suppliers)

      // Variants
      const numVariants = hasVariants ? ri(2, 5) : 1
      const variantRows: Array<{ sku: string; barcode: string; price: number; cost: number; stock: number; reorderPoint: number; attrColor: string; attrSize: string }> = []
      for (let v = 0; v < numVariants; v++) {
        const color = hasVariants ? pick(COLORS) : 'Default'
        const size  = hasVariants ? pick(SIZES)  : 'One Size'
        const sku   = hasVariants ? `${baseSKU}-V${v}` : baseSKU
        const price = hasVariants ? rp(basePrice * 0.8, basePrice * 1.3) : basePrice
        const cost  = rp(price * 0.45, price * 0.70)
        variantRows.push({ sku, barcode: `EAN${productIdx}V${v}`, price, cost, stock: ri(20, 300), reorderPoint: ri(10, 40), attrColor: color, attrSize: size })
      }

      // Safe image reference (category slug based or clean dummy file name)
      const imgName = `${catRecord.name.toLowerCase().replace(/[^a-z]/g, '-')}-${(productIdx % 5) + 1}.webp`

      const product = await prisma.product.create({
        data: {
          name:        `${names[i % names.length]} — ${catRecord.name}`,
          baseSKU,
          baseBarcode: hasVariants ? null : `EAN${productIdx}V0`,
          categoryId:  catRecord.id,
          description: `Premium quality ${names[i % names.length].toLowerCase()}. Sourced from ${supplier.name}.`,
          basePrice,
          baseCost,
          hasVariants,
          storeId:  pick(stores).id,
          createdAt,
          images:   { create: [{ filename: imgName, order: 0 }] },
          variants: { create: variantRows.map(({ attrColor: _c, attrSize: _s, ...vr }) => vr) },
        },
        include: { variants: true },
      })

      // EAV: Color & Size per variant
      const colorAttr = await prisma.productAttribute.create({ data: { productId: product.id, name: 'Color', position: 0 } })
      const sizeAttr  = await prisma.productAttribute.create({ data: { productId: product.id, name: 'Size',  position: 1 } })
      for (let vi = 0; vi < product.variants.length; vi++) {
        await prisma.variantAttributeValue.createMany({ data: [
          { variantId: product.variants[vi].id, attributeId: colorAttr.id, value: variantRows[vi].attrColor },
          { variantId: product.variants[vi].id, attributeId: sizeAttr.id,  value: variantRows[vi].attrSize  },
        ]})
      }

      // Initial RESTOCK stock movements
      for (const v of product.variants) {
        await prisma.stockMovement.create({ data: {
          variantId:     v.id,
          type:          'RESTOCK',
          quantity:      v.stock,
          previousStock: 0,
          newStock:      v.stock,
          reason:        'Initial inventory load',
          userId:        uAdmin.id,
          createdAt,
        }})
      }

      // Supplier–product link
      await prisma.supplierProduct.create({ data: {
        supplierId:  supplier.id,
        productId:   product.id,
        sku:         `SUP-${baseSKU}`,
        cost:        baseCost * 0.95,
        leadTime:    ri(3, 21),
        minOrderQty: ri(5, 50),
        isPreferred: Math.random() > 0.5,
      }}).catch(() => {})

      productRecords.push(product)
    }
    console.log(`   ✓ ${catRecord.name}: ${catCount} products`)
  }
  console.log(`✅ ${productRecords.length} products\n`)

  // ── PURCHASE ORDERS ──────────────────────────────────────────────────────
  console.log('📋 Creating purchase orders…')
  let poNumber = 1
  const purchaseOrders: any[] = []

  const topSuppliers = suppliers.slice(0, 8)
  for (const supplier of topSuppliers) {
    for (let monthOffset = 42; monthOffset >= 0; monthOffset--) {
      if (Math.random() > 0.7) continue
      const orderDate = new Date(NOW); orderDate.setMonth(orderDate.getMonth() - monthOffset); orderDate.setDate(ri(1,28))
      const expectedDate = new Date(orderDate.getTime() + ri(7, 21) * MS_DAY)
      const status = orderDate < daysAgo(30) ? 'received' : orderDate < daysAgo(7) ? 'ordered' : 'draft'
      const receivedDate = status === 'received' ? new Date(expectedDate.getTime() + ri(0,5) * MS_DAY) : null

      const supplierProds = productRecords.slice(0, Math.min(productRecords.length, 50))
      const poProducts = pickN(supplierProds, ri(3, 6))

      let totalAmount = 0
      const poItems: any[] = []
      for (const prod of poProducts) {
        const variant  = prod.variants[0]
        const qty      = ri(20, 200)
        const unitCost = rp(variant.price * 0.45, variant.price * 0.65)
        const total    = rp(unitCost * qty, unitCost * qty)
        totalAmount   += total
        poItems.push({ productId: prod.id, variantId: variant.id, quantity: qty, unitCost, totalCost: total, receivedQty: status === 'received' ? qty : 0 })
      }
      const tax      = rp(totalAmount * 0.05, totalAmount * 0.1)
      const shipping = rp(20, 150)

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber:     `PO-${String(poNumber++).padStart(5,'0')}`,
          supplierId:   supplier.id,
          status,
          orderDate,
          expectedDate,
          receivedDate,
          totalAmount,
          taxAmount:    tax,
          shippingCost: shipping,
          orderedBy:    uManager.id,
          approvedBy:   Math.random() > 0.3 ? uAdmin.id : null,
          notes:        Math.random() > 0.6 ? `Seasonal restock — ${pick(['Spring','Summer','Autumn','Winter'])} collection` : null,
          items:        { create: poItems },
        },
      })
      purchaseOrders.push(po)
    }
  }
  console.log(`✅ ${purchaseOrders.length} purchase orders\n`)

  // Add RESTOCK stock movements for received POs
  console.log('📊 Adding restock movements for received POs…')
  const receivedPOs = await prisma.purchaseOrder.findMany({ where: { status: 'received' }, include: { items: true } })
  for (const po of receivedPOs) {
    for (const item of po.items) {
      if (!item.variantId) continue
      const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } })
      if (!variant) continue
      await prisma.stockMovement.create({ data: {
        variantId:     item.variantId,
        type:          'RESTOCK',
        quantity:      item.receivedQty,
        previousStock: variant.stock,
        newStock:      variant.stock + item.receivedQty,
        reason:        `PO ${po.poNumber}`,
        referenceId:   po.id,
        userId:        uManager.id,
        createdAt:     po.receivedDate ?? po.orderDate,
      }})
    }
  }
  console.log('✅ Restock movements added\n')

  // ── CUSTOMERS (1500) ─────────────────────────────────────────────────────
  console.log(`👥 Creating ${CONFIG.CUSTOMERS} customers…`)
  const loyaltyWeights = ['Bronze','Bronze','Bronze','Silver','Silver','Gold','Gold','Platinum']
  const customerRows: any[] = []
  for (let i = 0; i < CONFIG.CUSTOMERS; i++) {
    const fn   = pick(FIRST_NAMES)
    const ln   = pick(LAST_NAMES)
    const num  = String(i + 1).padStart(4,'0')
    customerRows.push({
      name:        `${fn} ${ln}`,
      email:       `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g,'')}${num}@email.com`,
      phone:       `+1-555-${num}`,
      loyaltyTier: pick(loyaltyWeights),
      totalSpent:  rp(0, 8_000),
      createdAt:   randomDate(FOUR_YEARS_AGO, NOW),
    })
  }
  await prisma.customer.createMany({ data: customerRows })
  const customers = await prisma.customer.findMany()
  console.log(`✅ ${customers.length} customers\n`)

  const allVariants = await prisma.productVariant.findMany({ include: { product: { select: { categoryId: true } } } })

  // ── SALE TRANSACTIONS (60 000) ───────────────────────────────────────────
  console.log(`💰 Creating ${CONFIG.SALES.toLocaleString()} sales across 4 years…`)

  const SEASONAL_BOOST = (d: Date) => {
    const m = d.getMonth()
    if (m === 11 || m === 0) return 1.6   // Dec / Jan peak
    if (m === 6  || m === 7) return 1.3   // Summer
    if (m === 3  || m === 4) return 1.1   // Spring
    return 1.0
  }

  let totalSalesCreated = 0
  const totalBatches = Math.ceil(CONFIG.SALES / CONFIG.BATCH_SALE)

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(CONFIG.BATCH_SALE, CONFIG.SALES - totalSalesCreated)

    await prisma.$transaction(async (tx) => {
      for (let s = 0; s < batchSize; s++) {
        const saleDate      = randomDate(FOUR_YEARS_AGO, NOW)
        const customer      = pick(customers)
        const cashier       = pick([uCashier1, uCashier2, uSales1, uSales2])
        const payMethod     = pick(PAYMENT_METHODS.slice(0, 3))
        const numItems      = ri(1, 4)
        const chosenVariants = pickN(allVariants, Math.min(numItems, allVariants.length))

        const itemsData: any[] = []
        let subtotal = 0

        for (const variant of chosenVariants) {
          const qty           = ri(1, 3)
          const price         = variant.price
          const hasDiscount   = Math.random() < 0.25
          const discountType  = hasDiscount ? (Math.random() < 0.5 ? 'PERCENTAGE' : 'FIXED_AMOUNT') : 'NONE'
          const discountValue = discountType === 'PERCENTAGE' ? pick([5,10,15,20]) : discountType === 'FIXED_AMOUNT' ? rp(1, price * 0.2) : 0
          const finalPrice    = discountType === 'PERCENTAGE'  ? rp(price * (1 - discountValue / 100), price * (1 - discountValue / 100))
                              : discountType === 'FIXED_AMOUNT' ? Math.max(0, price - discountValue)
                              : price
          const total         = rp(finalPrice * qty, finalPrice * qty)
          const isRefunded    = Math.random() < 0.03
          subtotal           += total
          itemsData.push({
            productId:        variant.productId,
            variantId:        variant.id,
            quantity:         qty,
            refundedQuantity: isRefunded ? qty : 0,
            price,
            discountType,
            discountValue,
            finalPrice,
            total,
            discountReason:   hasDiscount ? pick(['Loyalty discount','Seasonal promo','Staff discount','Clearance','Bundle deal']) : null,
            discountAppliedBy:hasDiscount ? cashier.id : null,
            discountAppliedAt:hasDiscount ? saleDate : null,
            refundedAt:       isRefunded ? new Date(saleDate.getTime() + ri(1,7) * MS_DAY) : null,
            createdAt:        saleDate,
          })
        }

        const tax    = rp(subtotal * 0.08, subtotal * 0.08)
        const total  = rp(subtotal + tax, subtotal + tax)
        const status = Math.random() < 0.015 ? 'refunded' : Math.random() < 0.01 ? 'partially_refunded' : 'completed'

        await tx.saleTransaction.create({
          data: {
            userId:       cashier.id,
            customerId:   customer.id,
            paymentMethod: payMethod,
            status,
            subtotal,
            tax,
            total,
            createdAt:    saleDate,
            updatedAt:    saleDate,
            items:        { create: itemsData },
          },
        })
      }
    }, { timeout: 60_000 })

    totalSalesCreated += batchSize
    if (batch % 10 === 0) console.log(`   ${totalSalesCreated.toLocaleString()} / ${CONFIG.SALES.toLocaleString()} sales…`)
  }
  console.log(`✅ ${totalSalesCreated.toLocaleString()} sales\n`)

  // ── DEPOSITS & INSTALLMENTS ──────────────────────────────────────────────
  console.log('💳 Creating deposits & installments…')
  const bigSales = await prisma.saleTransaction.findMany({ where: { total: { gte: 500 } }, take: 300, orderBy: { total: 'desc' } })
  for (const sale of bigSales) {
    const plan    = pick(installmentPlans)
    const deposit = rp(sale.total * (plan.downPaymentPercent / 100), sale.total * (plan.downPaymentPercent / 100))
    const remaining = sale.total - deposit
    const perInstallment = rp(remaining / plan.numberOfPayments, remaining / plan.numberOfPayments)
    const isPastSale = sale.createdAt < SIX_MONTHS_AGO

    await prisma.deposit.create({ data: {
      amount:     deposit,
      date:       sale.createdAt,
      method:     pick(PAYMENT_METHODS),
      status:     'paid',
      note:       `Down payment — ${plan.name} plan`,
      customerId: sale.customerId,
      saleId:     sale.id,
      createdAt:  sale.createdAt,
    }})

    for (let p = 0; p < plan.numberOfPayments; p++) {
      const dueDate   = new Date(sale.createdAt.getTime() + (p + 1) * plan.intervalDays * MS_DAY)
      const isPaid    = isPastSale && dueDate < NOW
      const isOverdue = !isPaid && dueDate < NOW
      await prisma.installment.create({ data: {
        amount:     perInstallment,
        dueDate,
        paidDate:   isPaid ? new Date(dueDate.getTime() + ri(0, 5) * MS_DAY) : null,
        status:     isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
        note:       `Installment ${p + 1} of ${plan.numberOfPayments}`,
        customerId: sale.customerId,
        saleId:     sale.id,
        planId:     plan.id,
        createdAt:  sale.createdAt,
      }})
    }
  }
  console.log(`✅ ${bigSales.length} installment plans created\n`)

  // ── STOCK ADJUSTMENTS ────────────────────────────────────────────────────
  console.log('📉 Creating stock adjustment & shrinkage movements…')
  const sampleVariants = pickN(allVariants, 120)
  for (const variant of sampleVariants) {
    const adjCount = ri(1, 3)
    for (let a = 0; a < adjCount; a++) {
      const adjDate = randomDate(TWO_YEARS_AGO, NOW)
      const delta   = ri(-20, -1)
      const current = variant.stock
      const type    = Math.random() < 0.6 ? 'ADJUSTMENT' : 'SHRINKAGE'
      await prisma.stockMovement.create({ data: {
        variantId:     variant.id,
        type,
        quantity:      delta,
        previousStock: current,
        newStock:      Math.max(0, current + delta),
        reason:        type === 'SHRINKAGE' ? pick(['Damaged in transit','Expired','Theft','Water damage']) : pick(['Cycle count correction','System reconciliation','Warehouse audit']),
        userId:        uManager.id,
        createdAt:     adjDate,
      }})
    }
    if (Math.random() < 0.25) {
      const retDate = randomDate(ONE_YEAR_AGO, NOW)
      await prisma.stockMovement.create({ data: {
        variantId:     variant.id,
        type:          'RETURN',
        quantity:      ri(1, 5),
        previousStock: variant.stock,
        newStock:      variant.stock + ri(1, 5),
        reason:        pick(['Customer return — defective','Customer return — wrong size','Customer return — changed mind','Supplier return']),
        userId:        pick([uCashier1, uCashier2]).id,
        createdAt:     retDate,
      }})
    }
  }
  console.log('✅ Stock adjustments & returns\n')

  // ── COMMERCE EXPENSES ────────────────────────────────────────────────────
  console.log('💸 Creating 4 years of commerce expenses…')
  const expenseRows: any[] = []

  const MONTHLY_FIXED: Array<{ category: string; desc: string; vendor: string; amount: [number,number]; paymentMethod: string }> = [
    { category: 'rent',       desc: 'Monthly retail space rental — Main Branch',      vendor: 'Prime Properties LLC',     amount: [3_500, 3_500], paymentMethod: 'bank_transfer' },
    { category: 'rent',       desc: 'Monthly retail space rental — West Branch',      vendor: 'CitySpace Realty',         amount: [2_200, 2_200], paymentMethod: 'bank_transfer' },
    { category: 'rent',       desc: 'Monthly retail space rental — Airport Branch',   vendor: 'Downtown Property Group',  amount: [4_800, 4_800], paymentMethod: 'bank_transfer' },
    { category: 'insurance',  desc: 'Commercial property & liability insurance',       vendor: 'SafeGuard Insurance',      amount: [850, 950],     paymentMethod: 'cheque'        },
    { category: 'fees',       desc: 'Business licensing & municipal fees',             vendor: 'CityHall Licensing',       amount: [200, 300],     paymentMethod: 'cash'          },
    { category: 'fees',       desc: 'Payment gateway processing subscription',         vendor: 'PaymentGateway Inc',       amount: [120, 180],     paymentMethod: 'card'          },
    { category: 'marketing',  desc: 'Monthly social media management & ad budget',     vendor: 'SocialBoost Marketing',    amount: [600, 1_200],   paymentMethod: 'card'          },
  ]

  const MONTHLY_VARIABLE: Array<{ category: string; desc: string; vendor: string; amount: [number,number]; paymentMethod: string }> = [
    { category: 'utilities',   desc: 'Electricity & power bill',                       vendor: 'Power & Light Corp',       amount: [400, 900],   paymentMethod: 'bank_transfer' },
    { category: 'utilities',   desc: 'Water & sewage bill',                            vendor: 'WaterWorks Municipal',     amount: [80,  200],   paymentMethod: 'cash'          },
    { category: 'utilities',   desc: 'Internet & phone plan',                          vendor: 'TelecomNet',               amount: [150, 300],   paymentMethod: 'card'          },
    { category: 'supplies',    desc: 'Packaging materials & carrier bags',             vendor: 'PackageMart',              amount: [200, 600],   paymentMethod: 'cash'          },
    { category: 'supplies',    desc: 'Office & stationery supplies',                   vendor: 'OfficeDepot Pro',          amount: [50,  200],   paymentMethod: 'card'          },
    { category: 'maintenance', desc: 'Store cleaning & janitorial services',           vendor: 'CleanPro Janitorial',      amount: [300, 500],   paymentMethod: 'cash'          },
  ]

  const IRREGULAR: Array<{ category: string; desc: string; vendor: string; amount: [number,number]; paymentMethod: string; freqMonths: number }> = [
    { category: 'maintenance', desc: 'POS system maintenance & software licence',      vendor: 'TechSupport Solutions',    amount: [500,  800],   paymentMethod: 'card',          freqMonths: 3  },
    { category: 'maintenance', desc: 'HVAC service & filter replacement',              vendor: 'BuildRight Services',      amount: [300,  700],   paymentMethod: 'bank_transfer', freqMonths: 6  },
    { category: 'marketing',   desc: 'Seasonal print advertising campaign',            vendor: 'PrintMaster Pro',          amount: [800, 2_000],  paymentMethod: 'card',          freqMonths: 3  },
    { category: 'supplies',    desc: 'Uniform & workwear reorder for staff',           vendor: 'ThreadMasters B2B',        amount: [400,  900],   paymentMethod: 'card',          freqMonths: 6  },
    { category: 'fees',        desc: 'Annual Chamber of Commerce membership',          vendor: 'Chamber of Commerce',      amount: [350,  500],   paymentMethod: 'cheque',        freqMonths: 12 },
    { category: 'other',       desc: 'Staff training & development workshop',          vendor: 'General Supplies Co',      amount: [500, 1_500],  paymentMethod: 'bank_transfer', freqMonths: 4  },
    { category: 'marketing',   desc: 'Digital advertising — Google & Meta',            vendor: 'AdAgency Digital',         amount: [300, 1_500],  paymentMethod: 'card',          freqMonths: 1  },
    { category: 'inventory',   desc: 'Emergency stock purchase — fast-moving item',    vendor: 'Global Tech Distributors', amount: [1_000, 5_000],paymentMethod: 'bank_transfer', freqMonths: 2  },
  ]

  for (let monthsBack = 47; monthsBack >= 0; monthsBack--) {
    const monthDate = new Date(NOW); monthDate.setDate(1); monthDate.setMonth(monthDate.getMonth() - monthsBack)

    for (const exp of MONTHLY_FIXED) {
      expenseRows.push({
        date:          new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 5)),
        category:      exp.category,
        description:   exp.desc,
        amount:        rp(exp.amount[0], exp.amount[1]),
        vendor:        exp.vendor,
        paymentMethod: exp.paymentMethod,
        recurrence:    'monthly',
        notes:         null,
        createdAt:     new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 5)),
        updatedAt:     new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 5)),
      })
    }

    for (const exp of MONTHLY_VARIABLE) {
      if (Math.random() < 0.1) continue
      expenseRows.push({
        date:          new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 28)),
        category:      exp.category,
        description:   exp.desc,
        amount:        rp(exp.amount[0], exp.amount[1]),
        vendor:        exp.vendor,
        paymentMethod: exp.paymentMethod,
        recurrence:    'monthly',
        notes:         null,
        createdAt:     new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 28)),
        updatedAt:     new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 28)),
      })
    }

    for (const exp of IRREGULAR) {
      if (monthsBack % exp.freqMonths !== 0) continue
      expenseRows.push({
        date:          new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(5, 25)),
        category:      exp.category,
        description:   exp.desc,
        amount:        rp(exp.amount[0], exp.amount[1]),
        vendor:        exp.vendor,
        paymentMethod: exp.paymentMethod,
        recurrence:    exp.freqMonths === 1 ? 'monthly' : exp.freqMonths === 3 ? 'monthly' : exp.freqMonths === 12 ? 'yearly' : 'monthly',
        notes:         Math.random() > 0.5 ? `${monthDate.toLocaleString('en',{month:'long',year:'numeric'})} — approved` : null,
        createdAt:     new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(5, 25)),
        updatedAt:     new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(5, 25)),
      })
    }

    for (let u = 0; u < ri(1, 3); u++) {
      const catKey = pick(EXPENSE_CATEGORIES)
      const vendor = pick(EXPENSE_VENDORS[catKey])
      expenseRows.push({
        date:          new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 28)),
        category:      catKey,
        description:   `One-off ${catKey} expense — ${monthDate.toLocaleString('en',{month:'short',year:'numeric'})}`,
        amount:        rp(50, 800),
        vendor,
        paymentMethod: pick(PAYMENT_METHODS),
        recurrence:    'one_time',
        notes:         null,
        createdAt:     new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 28)),
        updatedAt:     new Date(monthDate.getFullYear(), monthDate.getMonth(), ri(1, 28)),
      })
    }
  }

  const EXP_BATCH = 500
  for (let i = 0; i < expenseRows.length; i += EXP_BATCH) {
    await prisma.commerceExpense.createMany({ data: expenseRows.slice(i, i + EXP_BATCH) })
  }
  console.log(`✅ ${expenseRows.length} expense records\n`)

  // ── FINANCIAL TRANSACTIONS ───────────────────────────────────────────────
  console.log('📊 Creating financial transactions…')
  const ftRows: any[] = []

  const recentSales = await prisma.saleTransaction.findMany({ take: 2_000, orderBy: { createdAt: 'desc' } })
  for (const sale of recentSales) {
    ftRows.push({
      type:        'income',
      amount:      sale.total,
      description: `Sale revenue`,
      userId:      sale.userId,
      createdAt:   sale.createdAt,
    })
  }

  for (const exp of expenseRows.slice(0, 1_000)) {
    ftRows.push({
      type:        'expense',
      amount:      exp.amount,
      description: exp.description,
      userId:      uAdmin.id,
      createdAt:   exp.date,
    })
  }

  const FT_BATCH = 1_000
  for (let i = 0; i < ftRows.length; i += FT_BATCH) {
    await prisma.financialTransaction.createMany({ data: ftRows.slice(i, i + FT_BATCH) })
  }
  console.log(`✅ ${ftRows.length} financial transactions\n`)

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('═══════════════════════════════════════════════════')
  console.log('🎉  Commerce seed complete!')
  console.log(`   ⏱  ${elapsed}s`)
  console.log(`   👤  ${users.length} users`)
  console.log(`   👷  ${employeeRecords.length} employees`)
  console.log(`   🏪  ${stores.length} stores`)
  console.log(`   📂  ${categoryRecords.length} categories`)
  console.log(`   🏭  ${suppliers.length} suppliers`)
  console.log(`   📦  ${productRecords.length} products`)
  console.log(`   📋  ${purchaseOrders.length} purchase orders`)
  console.log(`   👥  ${customers.length} customers`)
  console.log(`   💰  ${totalSalesCreated.toLocaleString()} sale transactions`)
  console.log(`   💳  ${bigSales.length} installment plans + deposits`)
  console.log(`   💸  ${expenseRows.length} expense records`)
  console.log(`   📊  ${ftRows.length} financial transactions`)
  console.log('═══════════════════════════════════════════════════')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())