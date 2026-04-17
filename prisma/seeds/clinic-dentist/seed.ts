import { PrismaClient } from '../../../src/generated/prisma'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const CONFIG = {
  patientCount: Number(process.env.CLINIC_SEED_PATIENTS ?? 7_500),
  batchSize: Number(process.env.CLINIC_SEED_BATCH ?? 200),
  staffCount: Number(process.env.CLINIC_SEED_STAFF ?? 14),
  salaryMonths: Number(process.env.CLINIC_SEED_SALARY_MONTHS ?? 18),
  expenseMonths: Number(process.env.CLINIC_SEED_EXPENSE_MONTHS ?? 18),
  futureAppointmentDays: Number(process.env.CLINIC_SEED_FUTURE_APPOINTMENT_DAYS ?? 210),
  sharedResultFiles: Number(process.env.CLINIC_SEED_RESULT_FILES ?? 8),
}

const NOW = new Date()
const FOUR_YEARS_AGO = new Date(NOW.getTime() - 4 * 365.25 * 24 * 3_600_000)
const FUTURE_WINDOW_END = new Date(NOW.getTime() + CONFIG.futureAppointmentDays * 86_400_000)
const GENERATED_RESULTS_DIR = path.resolve(__dirname, 'generated-check-results')

const FIRST_NAMES = [
  'Ahmed', 'Mohammed', 'Ali', 'Omar', 'Hassan', 'Ibrahim', 'Khalid', 'Youssef',
  'Tariq', 'Samir', 'Nour', 'Lina', 'Sara', 'Hana', 'Rania', 'Dina', 'Maya',
  'Layla', 'Yasmin', 'Fatima', 'Zara', 'Adam', 'Karim', 'Bilal', 'Sami',
  'Walid', 'Faris', 'Mazen', 'Jad', 'Elie', 'Georges', 'Pierre', 'Mark',
  'David', 'Daniel', 'Joseph', 'Michael', 'James', 'Robert', 'John'
]

const LAST_NAMES = [
  'Al-Hassan', 'Al-Omar', 'Ibrahim', 'Khalil', 'Nasser', 'Mansour', 'Haddad',
  'Khoury', 'Salam', 'Farah', 'Nasr', 'Sabbagh', 'Tannous', 'Rizk', 'Gemayel',
  'Jaber', 'Assaf', 'Barakat', 'Moussa', 'Diab', 'Saad', 'Ghazal', 'Issa',
  'Akl', 'Chaaban', 'Daher', 'Fawaz', 'Ghanem', 'Hamdan', 'Jamal'
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const GENDERS = ['male', 'female']
const ALLERGIES = ['Penicillin', 'Aspirin', 'Latex', 'Ibuprofen', 'Codeine', 'Seafood anesthesia reaction']
const CLINIC_AREAS = ['Hamra', 'Verdun', 'Achrafieh', 'Badaro', 'Jounieh', 'Zalka', 'Saida', 'Tripoli']

const DENTAL_COMPLAINTS = [
  'Toothache – upper left molar',
  'Sensitivity to cold on lower right',
  'Chipped front tooth',
  'Bleeding gums on brushing',
  'Routine check-up and cleaning',
  'Wisdom tooth pain',
  'Loose filling – lower left',
  'Broken crown – upper right',
  'Jaw pain and clicking',
  'Gum swelling and redness',
  'Tooth discoloration',
  'Implant consultation',
  'Follow-up after root canal',
  'Pain after extraction',
  'Cracked tooth – upper premolar',
  'Orthodontic wire issue',
  'Mouth ulcer not healing',
  'Bad breath concern',
  'Sports guard fitting',
  'Night guard review'
]

const DENTAL_DIAGNOSES = [
  'Dental caries – Class II',
  'Gingivitis – mild',
  'Periodontitis – moderate',
  'Pulpitis – irreversible',
  'Periapical abscess',
  'Fractured cusp',
  'Failed restoration',
  'Impacted wisdom tooth',
  'Bruxism – moderate wear',
  'TMJ dysfunction',
  'Aphthous stomatitis',
  'Calculus build-up – generalized',
  'Dry socket post-extraction',
  'Hypersensitivity – dentinal',
  'Enamel erosion – dietary',
  'Healthy dentition'
]

const DENTAL_PROCEDURES = [
  'Composite resin restoration',
  'Amalgam restoration',
  'Porcelain crown preparation',
  'Root canal therapy – single canal',
  'Root canal therapy – molar',
  'Simple extraction',
  'Surgical wisdom tooth extraction',
  'Scale and polish',
  'Fluoride varnish application',
  'Fissure sealant application',
  'Dental implant placement',
  'Impression for partial denture',
  'Orthodontic adjustment',
  'Teeth whitening – in-office',
  'Bone graft – socket preservation',
  'Temporary crown placement'
]

const DENTAL_MEDICATIONS = [
  { name: 'Amoxicillin 500 mg', dosage: '500 mg', frequency: '3x daily', duration: '7 days', quantity: 21 },
  { name: 'Metronidazole 400 mg', dosage: '400 mg', frequency: '3x daily', duration: '7 days', quantity: 21 },
  { name: 'Ibuprofen 400 mg', dosage: '400 mg', frequency: 'Every 8h PRN', duration: '5 days', quantity: 15 },
  { name: 'Paracetamol 500 mg', dosage: '500 mg', frequency: 'Every 6h PRN', duration: '5 days', quantity: 20 },
  { name: 'Chlorhexidine 0.12% Mouthwash', dosage: '15 mL', frequency: '2x daily', duration: '14 days', quantity: 1 },
  { name: 'Clindamycin 300 mg', dosage: '300 mg', frequency: '4x daily', duration: '7 days', quantity: 28 },
  { name: 'Dexamethasone 4 mg', dosage: '4 mg', frequency: 'Once daily', duration: '3 days', quantity: 3 },
  { name: 'Benzydamine Mouthwash', dosage: '15 mL', frequency: 'Every 3h', duration: '7 days', quantity: 1 },
]

const RESULT_TITLES = [
  'Panoramic X-Ray',
  'Periapical X-Ray',
  'CBCT Scan',
  'Blood Test',
  'Biopsy Result',
  'Implant Planning Report',
  'Orthodontic Assessment',
  'Pathology Report'
]

const RESULT_FILE_NAMES = [
  'panoramic-xray.pdf',
  'periapical-xray.pdf',
  'cbct-scan.pdf',
  'blood-test.pdf',
  'biopsy-result.pdf',
  'implant-plan.pdf',
  'ortho-assessment.pdf',
  'pathology-report.pdf'
]

const STAFF_PROFILES = [
  { role: 'doctor', employmentType: 'full_time', salaryType: 'monthly', baseSalary: 4200, hourlyRate: 38, overtimeRate: 1.75, doubleShiftRate: 65 },
  { role: 'doctor', employmentType: 'full_time', salaryType: 'monthly', baseSalary: 3900, hourlyRate: 35, overtimeRate: 1.5, doubleShiftRate: 60 },
  { role: 'doctor', employmentType: 'contract', salaryType: 'daily', baseSalary: 180, hourlyRate: 24, overtimeRate: 1.5, doubleShiftRate: 45 },
  { role: 'nurse', employmentType: 'full_time', salaryType: 'monthly', baseSalary: 1500, hourlyRate: 10, overtimeRate: 1.5, doubleShiftRate: 30 },
  { role: 'nurse', employmentType: 'full_time', salaryType: 'monthly', baseSalary: 1450, hourlyRate: 9.5, overtimeRate: 1.5, doubleShiftRate: 30 },
  { role: 'receptionist', employmentType: 'full_time', salaryType: 'monthly', baseSalary: 1100, hourlyRate: 8, overtimeRate: 1.25, doubleShiftRate: 20 },
  { role: 'technician', employmentType: 'part_time', salaryType: 'hourly', baseSalary: 0, hourlyRate: 14, overtimeRate: 1.5, doubleShiftRate: 18 },
  { role: 'technician', employmentType: 'contract', salaryType: 'daily', baseSalary: 95, hourlyRate: 13, overtimeRate: 1.25, doubleShiftRate: 15 },
  { role: 'pharmacist', employmentType: 'part_time', salaryType: 'hourly', baseSalary: 0, hourlyRate: 16, overtimeRate: 1.5, doubleShiftRate: 16 },
  { role: 'other', employmentType: 'full_time', salaryType: 'monthly', baseSalary: 900, hourlyRate: 6.5, overtimeRate: 1.25, doubleShiftRate: 12 },
]

const EXPENSE_CATEGORIES = [
  'rent', 'utilities', 'medical_supplies', 'medications', 'equipment',
  'maintenance', 'lab_fees', 'insurance', 'marketing', 'cleaning', 'other'
]

const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'other'] as const
const VISIT_TYPES = ['first_visit', 'follow_up', 'routine', 'emergency'] as const
const SESSION_STATUSES = ['completed', 'completed', 'completed', 'active', 'cancelled'] as const
const APPOINTMENT_TYPES = ['consultation', 'follow_up', 'procedure', 'checkup'] as const
const PAST_APPOINTMENT_STATUSES = ['completed', 'completed', 'completed', 'cancelled', 'no_show'] as const
const FUTURE_APPOINTMENT_STATUSES = ['scheduled', 'scheduled', 'scheduled', 'confirmed'] as const

type SeedPatient = {
  id: string
  name: string
  dateOfBirth: Date | null
  gender: string | null
  phone: string
  email: string | null
  address: string | null
  nationalId: string
  folderNumber: string
  bloodType: string | null
  allergies: string | null
  medicalNotes: string | null
  createdAt: Date
  updatedAt: Date
}

type SeedSession = {
  id: string
  patientId: string
  visitDate: Date
  visitType: string
  doctorName: string | null
  chiefComplaint: string
  vitals: string | null
  diagnosis: string | null
  notes: string | null
  followUpDate: Date | null
  status: string
  amountCharged: number | null
  amountPaid: number | null
  paymentStatus: string
  paymentMethod: string | null
  dentalChart: string | null
  createdAt: Date
  updatedAt: Date
}

type SeedPrescription = {
  id: string
  sessionId: string
  medicineName: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  quantity: number | null
  instructions: string | null
  isActive: boolean
  startDate: Date | null
  stoppedAt: Date | null
  stopReason: string | null
  createdAt: Date
}

type SeedAppointment = {
  id: string
  patientId: string
  appointmentDate: Date
  duration: number
  type: string
  doctorName: string | null
  notes: string | null
  status: string
  reminderSent: boolean
  createdAt: Date
  updatedAt: Date
}

type SeedCheckResult = {
  id: string
  patientId: string
  title: string
  description: string | null
  fileName: string
  filePath: string
  fileSize: number
  resultDate: Date
  createdAt: Date
}

type SeedExpense = {
  id: string
  date: Date
  category: string
  description: string
  amount: number
  vendor: string | null
  paymentMethod: string
  recurrence: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type SeedStaff = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  employmentType: string
  status: string
  baseSalary: number
  salaryType: string
  hourlyRate: number | null
  overtimeRate: number
  doubleShiftRate: number
  hireDate: Date
  notes: string | null
  employeeId: string | null
  createdAt: Date
  updatedAt: Date
}

type SeedSalaryRecord = {
  id: string
  staffId: string
  month: number
  year: number
  baseSalary: number
  regularHours: number
  overtimeHours: number
  overtimeMultiplier: number
  doubleShiftCount: number
  doubleShiftBonus: number
  bonuses: number
  deductions: number
  netPay: number
  status: string
  paidDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type ResultTemplate = {
  fileName: string
  filePath: string
  fileSize: number
}

function uuid() {
  return crypto.randomUUID()
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function chance(probability: number) {
  return Math.random() < probability
}

function randDate(from: Date, to: Date) {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 86_400_000)
}

function pad(value: number, width = 4) {
  return String(value).padStart(width, '0')
}

function arrayChunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

function makeVitals() {
  const systolic = rand(100, 145)
  const diastolic = rand(60, 95)
  return JSON.stringify({
    bp: `${systolic}/${diastolic}`,
    pulse: String(rand(60, 98)),
    o2sat: `${rand(96, 100)}%`,
  })
}

function makeDentalChart() {
  const conditions = ['caries', 'crown', 'missing', 'root_canal', 'filling', 'implant', 'fracture']
  const chart: Record<string, { conditions: string[]; note: string }> = {}
  const toothCount = rand(0, 5)
  for (let i = 0; i < toothCount; i++) {
    const tooth = String(rand(11, 48))
    chart[tooth] = {
      conditions: [pick(conditions)],
      note: pick(['Needs monitoring', 'Treatment planned', 'Sensitivity noted', 'Stable restoration'])
    }
  }
  return JSON.stringify(chart)
}

function normalizePayment(charged: number) {
  const roll = Math.random()
  if (roll < 0.60) return { amountPaid: charged, paymentStatus: 'paid', paymentMethod: pick(PAYMENT_METHODS) }
  if (roll < 0.82) return { amountPaid: randFloat(Math.max(10, charged * 0.2), charged * 0.9), paymentStatus: 'partial', paymentMethod: pick(PAYMENT_METHODS) }
  if (roll < 0.93) return { amountPaid: 0, paymentStatus: 'unpaid', paymentMethod: pick(PAYMENT_METHODS) }
  return { amountPaid: 0, paymentStatus: 'waived', paymentMethod: 'other' }
}

function salaryNetPay(staff: SeedStaff, params: { regularHours: number; overtimeHours: number; overtimeMultiplier: number; doubleShiftCount: number; doubleShiftBonus: number; bonuses: number; deductions: number }) {
  let basePay = 0
  if (staff.salaryType === 'monthly') {
    basePay = staff.baseSalary
  } else if (staff.salaryType === 'hourly') {
    basePay = params.regularHours * (staff.hourlyRate ?? 0)
  } else if (staff.salaryType === 'daily') {
    basePay = params.regularHours * staff.baseSalary
  } else {
    basePay = staff.baseSalary
  }

  const hourlyBase = staff.hourlyRate ?? (staff.baseSalary / 160)
  const overtimePay = params.overtimeHours * hourlyBase * params.overtimeMultiplier
  const doubleShiftPay = params.doubleShiftCount * params.doubleShiftBonus
  return Math.round(Math.max(0, basePay + overtimePay + doubleShiftPay + params.bonuses - params.deductions) * 100) / 100
}

function monthStart(monthOffset: number) {
  return new Date(NOW.getFullYear(), NOW.getMonth() - monthOffset, 1)
}

function writePdfTemplate(filePath: string) {
  const pdfBase64 = 'JVBERi0xLjMKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9Db3VudCAxIC9LaWRzIFszIDAgUl0gPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAzMDAgMTQ0XSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA1NSA+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDEwMCAxMDAgVGQgKEJpekZsb3cgQ2xpbmljIFJlc3VsdCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjIgMDAwMDAgbiAKMDAwMDAwMDExNyAwMDAwMCBuIAowMDAwMDAwMjQxIDAwMDAwIG4gCjAwMDAwMDAzNDYgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo0MTYKJSVFT0Y='
  const buffer = Buffer.from(pdfBase64, 'base64')
  fs.writeFileSync(filePath, buffer)
  return buffer.length
}

function prepareResultTemplates() {
  fs.rmSync(GENERATED_RESULTS_DIR, { recursive: true, force: true })
  fs.mkdirSync(GENERATED_RESULTS_DIR, { recursive: true })

  const templates: ResultTemplate[] = []
  for (let i = 0; i < CONFIG.sharedResultFiles; i++) {
    const fileName = RESULT_FILE_NAMES[i % RESULT_FILE_NAMES.length] || `result-${i + 1}.pdf`
    const filePath = path.join(GENERATED_RESULTS_DIR, `${pad(i + 1)}-${fileName}`)
    const fileSize = writePdfTemplate(filePath)
    templates.push({ fileName, filePath, fileSize })
  }
  return templates
}

function buildStaff() {
  const staff: SeedStaff[] = []
  for (let i = 0; i < CONFIG.staffCount; i++) {
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const profile = STAFF_PROFILES[i % STAFF_PROFILES.length]
    const name = profile.role === 'doctor'
      ? `Dr. ${firstName} ${lastName}`
      : `${firstName} ${lastName}`
    const hireDate = randDate(FOUR_YEARS_AGO, addDays(NOW, -30))
    staff.push({
      id: uuid(),
      name,
      role: profile.role,
      phone: `+961 ${rand(3, 9)}${rand(100_000, 999_999)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/gi, '')}.staff${i + 1}@bizflow.local`,
      employmentType: profile.employmentType,
      status: chance(0.92) ? 'active' : 'inactive',
      baseSalary: profile.baseSalary,
      salaryType: profile.salaryType,
      hourlyRate: profile.hourlyRate,
      overtimeRate: profile.overtimeRate,
      doubleShiftRate: profile.doubleShiftRate,
      hireDate,
      notes: chance(0.25) ? pick(['Orthodontics support', 'Implant surgery roster', 'Evening shift rotation', 'Weekend backup']) : null,
      employeeId: null,
      createdAt: hireDate,
      updatedAt: hireDate,
    })
  }
  return staff
}

function buildSalaryRecords(staff: SeedStaff[]) {
  const records: SeedSalaryRecord[] = []
  for (const member of staff) {
    for (let offset = 0; offset < CONFIG.salaryMonths; offset++) {
      const date = monthStart(offset)
      if (date < new Date(member.hireDate.getFullYear(), member.hireDate.getMonth(), 1)) continue
      const regularHours = member.salaryType === 'hourly' ? randFloat(70, 140) : member.salaryType === 'daily' ? rand(12, 24) : randFloat(150, 176)
      const overtimeHours = chance(0.55) ? randFloat(2, 18) : 0
      const doubleShiftCount = chance(0.35) ? rand(0, 5) : 0
      const bonuses = chance(0.22) ? randFloat(25, 250) : 0
      const deductions = chance(0.18) ? randFloat(10, 120) : 0
      const overtimeMultiplier = member.overtimeRate
      const doubleShiftBonus = member.doubleShiftRate
      const netPay = salaryNetPay(member, { regularHours, overtimeHours, overtimeMultiplier, doubleShiftCount, doubleShiftBonus, bonuses, deductions })
      const isPaid = offset > 0 || chance(0.55)
      const updatedAt = new Date(date.getFullYear(), date.getMonth(), rand(24, 28), 12, 0, 0)

      records.push({
        id: uuid(),
        staffId: member.id,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        baseSalary: member.baseSalary,
        regularHours,
        overtimeHours,
        overtimeMultiplier,
        doubleShiftCount,
        doubleShiftBonus,
        bonuses,
        deductions,
        netPay,
        status: isPaid ? 'paid' : 'pending',
        paidDate: isPaid ? new Date(date.getFullYear(), date.getMonth(), rand(25, 28), 15, 0, 0) : null,
        notes: chance(0.15) ? pick(['Included implant bonus', 'Holiday shift adjustment', 'Night rotation supplement']) : null,
        createdAt: updatedAt,
        updatedAt,
      })
    }
  }
  return records
}

function buildExpenses() {
  const expenses: SeedExpense[] = []
  for (let offset = CONFIG.expenseMonths - 1; offset >= 0; offset--) {
    const month = monthStart(offset)
    const fixedRows = [
      { category: 'rent', amount: randFloat(2200, 2800), description: 'Clinic rent', vendor: 'Property Management', recurrence: 'monthly' },
      { category: 'utilities', amount: randFloat(320, 620), description: 'Electricity and water', vendor: 'Utilities Board', recurrence: 'monthly' },
      { category: 'insurance', amount: randFloat(180, 300), description: 'Malpractice and property insurance', vendor: 'Clinic Shield', recurrence: 'monthly' },
      { category: 'cleaning', amount: randFloat(120, 220), description: 'Cleaning services', vendor: 'Sparkle Services', recurrence: 'monthly' },
      { category: 'marketing', amount: randFloat(80, 250), description: 'Digital ads and promotions', vendor: 'Meta Ads', recurrence: 'monthly' },
    ]

    for (const row of fixedRows) {
      const date = new Date(month.getFullYear(), month.getMonth(), rand(1, 5), 10, 0, 0)
      expenses.push({
        id: uuid(),
        date,
        category: row.category,
        description: row.description,
        amount: row.amount,
        vendor: row.vendor,
        paymentMethod: pick(PAYMENT_METHODS),
        recurrence: row.recurrence,
        notes: null,
        createdAt: date,
        updatedAt: date,
      })
    }

    const variableCount = rand(18, 42)
    for (let i = 0; i < variableCount; i++) {
      const category = pick(EXPENSE_CATEGORIES)
      const date = new Date(month.getFullYear(), month.getMonth(), rand(1, 28), rand(8, 18), 0, 0)
      const amountRange: Record<string, [number, number]> = {
        medical_supplies: [40, 460],
        medications: [25, 320],
        equipment: [120, 2200],
        maintenance: [50, 600],
        lab_fees: [30, 420],
        utilities: [40, 180],
        marketing: [25, 200],
        cleaning: [20, 120],
        insurance: [90, 220],
        rent: [2200, 2800],
        other: [20, 260],
      }
      const [min, max] = amountRange[category] ?? [20, 200]
      expenses.push({
        id: uuid(),
        date,
        category,
        description: `${category.replace(/_/g, ' ')} expense`,
        amount: randFloat(min, max),
        vendor: chance(0.75) ? pick(['DentalHub', 'MedSupply Co.', 'Lab Partners', 'SteriClean', 'TechDent']) : null,
        paymentMethod: pick(PAYMENT_METHODS),
        recurrence: 'one_time',
        notes: chance(0.18) ? pick(['Urgent restock', 'Monthly maintenance', 'Emergency replacement', 'Bulk order']) : null,
        createdAt: date,
        updatedAt: date,
      })
    }
  }
  return expenses
}

function buildPatient(index: number): SeedPatient {
  const firstName = pick(FIRST_NAMES)
  const lastName = pick(LAST_NAMES)
  const createdAt = randDate(FOUR_YEARS_AGO, NOW)
  return {
    id: uuid(),
    name: `${firstName} ${lastName}`,
    dateOfBirth: randDate(new Date('1950-01-01T00:00:00'), new Date('2010-12-31T00:00:00')),
    gender: pick(GENDERS),
    phone: `+961 ${rand(3, 9)}${pad(index + 100_000, 6)}`,
    email: chance(0.68) ? `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/gi, '')}${index + 1}@example.com` : null,
    address: chance(0.78) ? `${rand(1, 200)} ${pick(['Main St', 'Clinic Rd', 'Garden Ave', 'Seaside Blvd', 'Dental Center St'])}, ${pick(CLINIC_AREAS)}` : null,
    nationalId: `LB${pad(index + 1, 7)}`,
    folderNumber: `D${pad(index + 1, 5)}`,
    bloodType: chance(0.72) ? pick(BLOOD_TYPES) : null,
    allergies: chance(0.17) ? pick(ALLERGIES) : null,
    medicalNotes: chance(0.22) ? pick([
      'Diabetic – monitor healing post-extraction',
      'Hypertensive – review vasoconstrictor use',
      'Blood thinner medication – INR check before surgery',
      'Anxious patient – shorter appointments preferred',
      'Latex-free materials preferred'
    ]) : null,
    createdAt,
    updatedAt: createdAt,
  }
}

function buildSessionsForPatient(patient: SeedPatient, doctorNames: string[]) {
  const sessions: SeedSession[] = []
  const prescriptions: SeedPrescription[] = []
  const checkResults: SeedCheckResult[] = []
  const sessionCount = rand(1, 24)
  let previousVisit = new Date(Math.max(patient.createdAt.getTime(), FOUR_YEARS_AGO.getTime()))

  for (let i = 0; i < sessionCount; i++) {
    const gapDays = i === 0 ? rand(0, 14) : rand(12, 120)
    const visitDate = addDays(previousVisit, gapDays)
    if (visitDate > NOW) break
    previousVisit = visitDate

    const charged = randFloat(35, 780)
    const payment = normalizePayment(charged)
    const needsFollowUp = chance(0.34)
    const followUpMode = Math.random()
    const followUpDate = !needsFollowUp
      ? null
      : followUpMode < 0.58
        ? addDays(visitDate, rand(7, 75))
        : followUpMode < 0.82
          ? addDays(NOW, rand(1, 60))
          : addDays(NOW, -rand(1, 45))
    const status = visitDate > addDays(NOW, -14) && chance(0.12) ? 'active' : pick(SESSION_STATUSES)

    const session: SeedSession = {
      id: uuid(),
      patientId: patient.id,
      visitDate,
      visitType: i === 0 ? 'first_visit' : pick(VISIT_TYPES),
      doctorName: pick(doctorNames),
      chiefComplaint: pick(DENTAL_COMPLAINTS),
      vitals: chance(0.88) ? makeVitals() : null,
      diagnosis: chance(0.92) ? pick(DENTAL_DIAGNOSES) : null,
      notes: chance(0.72) ? pick(DENTAL_PROCEDURES) : null,
      followUpDate,
      status,
      amountCharged: charged,
      amountPaid: payment.amountPaid,
      paymentStatus: payment.paymentStatus,
      paymentMethod: payment.paymentMethod,
      dentalChart: chance(0.42) ? makeDentalChart() : null,
      createdAt: visitDate,
      updatedAt: visitDate,
    }
    sessions.push(session)

    const rxCount = chance(0.62) ? rand(1, 3) : 0
    const usedMedication = new Set<string>()
    for (let r = 0; r < rxCount; r++) {
      let med = pick(DENTAL_MEDICATIONS)
      while (usedMedication.has(med.name)) med = pick(DENTAL_MEDICATIONS)
      usedMedication.add(med.name)
      const active = chance(visitDate > addDays(NOW, -21) ? 0.65 : 0.12)
      prescriptions.push({
        id: uuid(),
        sessionId: session.id,
        medicineName: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity: med.quantity,
        instructions: chance(0.5) ? pick(['Take with food', 'Avoid smoking for 48h', 'Complete full course', 'Rinse gently only']) : null,
        isActive: active,
        startDate: visitDate,
        stoppedAt: active ? null : addDays(visitDate, rand(3, 14)),
        stopReason: active ? null : pick(['completed', 'side_effects', 'other']),
        createdAt: visitDate,
      })
    }

    if (chance(0.18)) {
      // Placeholder check results are added later once shared files are prepared.
    }
  }

  return { sessions, prescriptions, checkResults }
}

function buildAppointmentsForPatient(patient: SeedPatient, doctorNames: string[]) {
  const appointments: SeedAppointment[] = []
  const count = rand(5, 12)
  const pastCount = rand(3, Math.max(3, count - 2))

  for (let i = 0; i < count; i++) {
    const isFuture = i >= pastCount
    const appointmentDate = isFuture
      ? randDate(NOW, FUTURE_WINDOW_END)
      : randDate(patient.createdAt, NOW)
    appointmentDate.setHours(rand(7, 23), pick([0, 30]), 0, 0)

    appointments.push({
      id: uuid(),
      patientId: patient.id,
      appointmentDate,
      duration: pick([20, 30, 45, 60, 90]),
      type: pick(APPOINTMENT_TYPES),
      doctorName: pick(doctorNames),
      notes: chance(0.45) ? pick(DENTAL_PROCEDURES) : null,
      status: isFuture ? pick(FUTURE_APPOINTMENT_STATUSES) : pick(PAST_APPOINTMENT_STATUSES),
      reminderSent: !isFuture || chance(0.35),
      createdAt: isFuture ? NOW : appointmentDate,
      updatedAt: isFuture ? NOW : appointmentDate,
    })
  }

  return appointments.sort((a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime())
}

function buildCheckResults(patient: SeedPatient, templates: ResultTemplate[]) {
  const results: SeedCheckResult[] = []
  if (!chance(0.28)) return results

  const count = rand(1, 3)
  for (let i = 0; i < count; i++) {
    const template = pick(templates)
    const resultDate = randDate(patient.createdAt, NOW)
    results.push({
      id: uuid(),
      patientId: patient.id,
      title: pick(RESULT_TITLES),
      description: chance(0.55) ? pick(['Requested by implant planning', 'Pre-op imaging', 'Routine review attachment', 'Shared from external lab']) : null,
      fileName: template.fileName,
      filePath: template.filePath,
      fileSize: template.fileSize,
      resultDate,
      createdAt: resultDate,
    })
  }
  return results
}

async function clearClinicData() {
  console.log('🗑   Clearing existing clinic data...')
  await prisma.clinicSalaryRecord.deleteMany({})
  await prisma.clinicStaff.deleteMany({})
  await prisma.clinicExpense.deleteMany({})
  await prisma.clinicPrescription.deleteMany({})
  await prisma.clinicSession.deleteMany({})
  await prisma.clinicAppointment.deleteMany({})
  await prisma.clinicCheckResult.deleteMany({})
  await prisma.clinicPatient.deleteMany({})
  console.log('✅  Clinic tables cleared\n')
}

async function main() {
  console.log('🦷  Powerful Clinic Seed – starting...')
  console.log(`📊  Patients=${CONFIG.patientCount.toLocaleString()}  Staff=${CONFIG.staffCount}  SalaryMonths=${CONFIG.salaryMonths}  ExpenseMonths=${CONFIG.expenseMonths}`)

  const startedAt = Date.now()

  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
  await prisma.$queryRawUnsafe('PRAGMA cache_size = 20000;')
  await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')

  const resultTemplates = prepareResultTemplates()
  await clearClinicData()

  console.log('👥  Creating clinic staff, salaries, and expenses...')
  const staff = buildStaff()
  const salaryRecords = buildSalaryRecords(staff)
  const expenses = buildExpenses()
  await prisma.$transaction(async (tx) => {
    await tx.clinicStaff.createMany({ data: staff })
    if (salaryRecords.length) await tx.clinicSalaryRecord.createMany({ data: salaryRecords })
    if (expenses.length) await tx.clinicExpense.createMany({ data: expenses })
  }, { timeout: 60_000 })
  console.log(`✅  Staff=${staff.length}  Salaries=${salaryRecords.length}  Expenses=${expenses.length}\n`)

  const doctorNames = staff.filter((member) => member.role === 'doctor').map((member) => member.name)
  const batches = Math.ceil(CONFIG.patientCount / CONFIG.batchSize)

  let patientTotal = 0
  let sessionTotal = 0
  let prescriptionTotal = 0
  let appointmentTotal = 0
  let checkResultTotal = 0

  for (let batch = 0; batch < batches; batch++) {
    const start = batch * CONFIG.batchSize
    const end = Math.min(start + CONFIG.batchSize, CONFIG.patientCount)

    const patients: SeedPatient[] = []
    const sessions: SeedSession[] = []
    const prescriptions: SeedPrescription[] = []
    const appointments: SeedAppointment[] = []
    const checkResults: SeedCheckResult[] = []

    for (let i = start; i < end; i++) {
      const patient = buildPatient(i)
      patients.push(patient)

      const patientSessions = buildSessionsForPatient(patient, doctorNames)
      const patientAppointments = buildAppointmentsForPatient(patient, doctorNames)
      const patientResults = buildCheckResults(patient, resultTemplates)

      sessions.push(...patientSessions.sessions)
      prescriptions.push(...patientSessions.prescriptions)
      appointments.push(...patientAppointments)
      checkResults.push(...patientResults)
    }

    await prisma.$transaction(async (tx) => {
      await tx.clinicPatient.createMany({ data: patients })
      if (sessions.length) await tx.clinicSession.createMany({ data: sessions })
      if (prescriptions.length) await tx.clinicPrescription.createMany({ data: prescriptions })
      if (appointments.length) await tx.clinicAppointment.createMany({ data: appointments })
      if (checkResults.length) await tx.clinicCheckResult.createMany({ data: checkResults })
    }, { timeout: 60_000 })

    patientTotal += patients.length
    sessionTotal += sessions.length
    prescriptionTotal += prescriptions.length
    appointmentTotal += appointments.length
    checkResultTotal += checkResults.length

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
    const progress = Math.round(((batch + 1) / batches) * 100)
    process.stdout.write(
      `\r  Batch ${batch + 1}/${batches} [${progress}%] `
      + `patients=${patientTotal.toLocaleString()} `
      + `sessions=${sessionTotal.toLocaleString()} `
      + `appts=${appointmentTotal.toLocaleString()} `
      + `results=${checkResultTotal.toLocaleString()} `
      + `${elapsed}s      `
    )
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('\n\n✅  Powerful clinic seed complete\n')
  console.log(`  Patients       : ${patientTotal.toLocaleString()}`)
  console.log(`  Sessions       : ${sessionTotal.toLocaleString()}`)
  console.log(`  Prescriptions  : ${prescriptionTotal.toLocaleString()}`)
  console.log(`  Appointments   : ${appointmentTotal.toLocaleString()}`)
  console.log(`  Check Results  : ${checkResultTotal.toLocaleString()}`)
  console.log(`  Staff          : ${staff.length.toLocaleString()}`)
  console.log(`  Salary Records : ${salaryRecords.length.toLocaleString()}`)
  console.log(`  Expenses       : ${expenses.length.toLocaleString()}`)
  console.log(`  Files          : ${resultTemplates.length.toLocaleString()} generated PDFs`)
  console.log(`  Elapsed        : ${elapsed}s\n`)
}

main()
  .catch((error) => {
    console.error('\n❌  Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })