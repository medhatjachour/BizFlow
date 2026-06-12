/**
 * Vet Plugin – Development Seed
 *
 * Mirrors the quality / structure of prisma/seeds/clinic-dentist/seed.ts.
 * Generates:
 *   – VetOwner + VetPatient (pets)
 *   – VetSession + VetPrescription + VetCheckResult (per pet)
 *   – VetAppointment (per pet)
 *   – VetExpense  (clinic running costs)
 *   – VetStaff + VetSalaryRecord
 *
 * Usage:
 *   npm run prisma:seed:vet
 *
 * Environment overrides:
 *   VET_SEED_OWNERS=4000
 *   VET_SEED_BATCH=50
 *   VET_SEED_STAFF=12
 *   VET_SEED_SALARY_MONTHS=18
 *   VET_SEED_EXPENSE_MONTHS=18
 *   VET_SEED_FUTURE_APPT_DAYS=180
 *   VET_SEED_RESULT_FILES=8
 */

import { PrismaClient } from '../../../src/generated/prisma'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const CONFIG = {
  ownerCount:           Number(process.env.VET_SEED_OWNERS            ?? 4_000),
  batchSize:            Number(process.env.VET_SEED_BATCH              ?? 50),
  staffCount:           Number(process.env.VET_SEED_STAFF              ?? 12),
  salaryMonths:         Number(process.env.VET_SEED_SALARY_MONTHS      ?? 18),
  expenseMonths:        Number(process.env.VET_SEED_EXPENSE_MONTHS     ?? 18),
  futureAppointmentDays:Number(process.env.VET_SEED_FUTURE_APPT_DAYS  ?? 180),
  sharedResultFiles:    Number(process.env.VET_SEED_RESULT_FILES       ?? 8),
}

const NOW              = new Date()
const FOUR_YEARS_AGO   = new Date(NOW.getTime() - 4 * 365.25 * 24 * 3_600_000)
const FUTURE_WINDOW_END= new Date(NOW.getTime() + CONFIG.futureAppointmentDays * 86_400_000)
const GENERATED_RESULTS_DIR = path.resolve(__dirname, 'generated-check-results')

// ─── name pools ───────────────────────────────────────────────────────────────

const OWNER_FIRST = [
  'Ahmed','Mohammed','Ali','Omar','Hassan','Ibrahim','Khalid','Youssef',
  'Tariq','Samir','Nour','Lina','Sara','Hana','Rania','Dina','Maya',
  'Layla','Yasmin','Fatima','Zara','Adam','Karim','Bilal','Sami',
  'Walid','Faris','Mazen','Jad','Elie','Georges','Pierre','Mark',
  'David','Daniel','Joseph','Michael','James','Robert','John',
  'Carlos','Maria','Diego','Sofia','Luis','Emma','William','Isabella',
  'Benjamin','Sophia','Lucas','Mia','Henry','Charlotte','Alexander',
]

const OWNER_LAST = [
  'Al-Hassan','Al-Omar','Ibrahim','Khalil','Nasser','Mansour','Haddad',
  'Khoury','Salam','Farah','Nasr','Sabbagh','Tannous','Rizk','Gemayel',
  'Jaber','Assaf','Barakat','Moussa','Diab','Saad','Ghazal','Issa',
  'Akl','Chaaban','Daher','Fawaz','Ghanem','Hamdan','Jamal',
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Martinez','Anderson','Taylor','Thomas','Hernandez','Moore','Jackson',
]

const PET_NAMES = [
  'Max','Bella','Charlie','Lucy','Cooper','Molly','Buddy','Daisy','Rocky','Sadie',
  'Duke','Lily','Bear','Coco','Zeus','Lola','Bentley','Stella','Milo','Penny',
  'Leo','Rosie','Jack','Roxy','Toby','Maggie','Oliver','Ellie','Tucker','Sophie',
  'Simba','Luna','Oscar','Nala','Tiger','Missy','Sammy','Gracie','Thor','Abby',
  'Koda','Zoe','Buster','Ruby','Ace','Lady','Rex','Piper','Shadow','Chloe',
  'Gizmo','Honey','Harley','Dixie','Dexter','Lulu','Scout','Sasha','Bruno','Lexi',
]

const DOG_BREEDS  = ['Labrador Retriever','German Shepherd','Golden Retriever','Bulldog','Poodle',
  'Siberian Husky','Beagle','Boxer','Shih Tzu','Chihuahua','Rottweiler','Dachshund',
  'Doberman Pinscher','Maltese','Border Collie','Yorkshire Terrier','French Bulldog',]
const CAT_BREEDS  = ['Persian','Siamese','Maine Coon','Ragdoll','British Shorthair',
  'Abyssinian','Scottish Fold','Bengal','Sphynx','Burmese','American Shorthair',]
const BIRD_BREEDS = ['African Grey Parrot','Cockatiel','Budgerigar','Canary','Zebra Finch',
  'Lovebird','Macaw','Conure','Cockatoo','Eclectus Parrot',]
const PET_COLORS  = ['Black','White','Brown','Golden','Gray','Cream','Orange','Spotted',
  'Tricolor','Tabby','Calico','Brindle','Merle','Buff','Blue-Gray',]

const AREAS = ['Riyadh North','Riyadh South','Jeddah','Dammam','Khobar','Dubai','Abu Dhabi',
  'Sharjah','Cairo','Alexandria','Hamra','Achrafieh','Verdun','Jounieh','Zalka',]

// ─── clinical data pools ──────────────────────────────────────────────────────

const VET_COMPLAINTS = [
  'Routine annual wellness examination',
  'Vaccination due – rabies and DHPP',
  'Reduced appetite for 3 days',
  'Lethargy and weakness',
  'Skin irritation and scratching',
  'Limping – right front leg',
  'Vomiting after eating',
  'Diarrhea – loose stool 2 days',
  'Eye discharge – left eye',
  'Ear shaking and odor',
  'Dental pain – drooling',
  'Weight loss over 2 months',
  'Excessive thirst and urination',
  'Post-surgery follow-up – wound check',
  'Parasite treatment – flea infestation',
  'Wound care – laceration on paw',
  'Difficulty breathing',
  'Urinary straining',
  'Persistent sneezing',
  'Behavioral change – aggression',
  'Grooming – matted coat',
  'Pre-surgical consultation',
  'Nail trimming and ear cleaning',
  'Limping – rear leg after play',
  'Swollen lymph nodes',
]

const VET_DIAGNOSES = [
  'Healthy – no abnormalities detected',
  'Otitis externa – bacterial',
  'Dental disease Stage 2 – tartar accumulation',
  'Acute gastroenteritis',
  'Allergic dermatitis – environmental',
  'Obesity – dietary management initiated',
  'Hyperthyroidism – medication started',
  'Diabetes mellitus – insulin protocol',
  'Degenerative joint disease (arthritis)',
  'Urinary tract infection – E. coli',
  'Upper respiratory infection – viral',
  'Pyoderma – superficial bacterial skin infection',
  'Internal parasites – Toxocara spp.',
  'Conjunctivitis – secondary bacterial',
  'Fracture – radius/ulna – splint applied',
  'Post-operative recovery – healing well',
  'Anemia – iron-deficiency, supplementation started',
  'Heartworm disease – treatment protocol initiated',
  'Flea allergy dermatitis',
  'Chronic renal insufficiency – fluid therapy',
  'Pancreatitis – mild, dietary restriction',
  'Parvovirus – supportive care initiated',
  'Luxating patella – Grade II',
  'Corneal ulcer – antibiotic eye drops',
]

const VET_MEDICATIONS = [
  { name: 'Amoxicillin 500 mg',       dosage: '10 mg/kg',    frequency: '2× daily',   duration: '7 days',   quantity: 14 },
  { name: 'Metronidazole 250 mg',      dosage: '15 mg/kg',    frequency: '2× daily',   duration: '5 days',   quantity: 10 },
  { name: 'Meloxicam 1 mg/mL (oral)',  dosage: '0.1 mg/kg',   frequency: 'Once daily', duration: '5 days',   quantity: 1  },
  { name: 'Prednisone 5 mg',           dosage: '1 mg/kg',     frequency: 'Once daily', duration: '10 days',  quantity: 10 },
  { name: 'Enrofloxacin 68 mg',        dosage: '5 mg/kg',     frequency: 'Once daily', duration: '7 days',   quantity: 7  },
  { name: 'Otomax Ear Drops',          dosage: '4 drops/ear', frequency: '2× daily',   duration: '7 days',   quantity: 1  },
  { name: 'Frontline Plus (spot-on)',  dosage: '1 pipette',   frequency: 'Monthly',    duration: '3 months', quantity: 3  },
  { name: 'Heartgard Plus',            dosage: '1 tablet',    frequency: 'Monthly',    duration: '6 months', quantity: 6  },
  { name: 'Apoquel 16 mg',             dosage: '0.5 mg/kg',   frequency: '2× daily',   duration: '14 days',  quantity: 28 },
  { name: 'Clavamox 250 mg',           dosage: '12.5 mg/kg',  frequency: '2× daily',   duration: '10 days',  quantity: 20 },
  { name: 'Cerenia 24 mg',             dosage: '2 mg/kg',     frequency: 'Once daily', duration: '5 days',   quantity: 5  },
  { name: 'Famotidine 10 mg',          dosage: '0.5 mg/kg',   frequency: 'Once daily', duration: '7 days',   quantity: 7  },
]

const RESULT_TITLES = [
  'Radiograph – Thoracic',
  'Radiograph – Abdominal',
  'Ultrasound Report',
  'CBC Blood Panel',
  'Biochemistry Profile',
  'Urinalysis Report',
  'Cytology Report',
  'Heartworm Test Result',
]

const RESULT_FILE_NAMES = [
  'thoracic-xray.pdf',
  'abdominal-xray.pdf',
  'ultrasound-report.pdf',
  'cbc-panel.pdf',
  'biochemistry-profile.pdf',
  'urinalysis.pdf',
  'cytology-report.pdf',
  'heartworm-test.pdf',
]

const STAFF_PROFILES = [
  { role: 'veterinarian', employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 5200, hourlyRate: 45,   overtimeRate: 1.75 },
  { role: 'veterinarian', employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 4800, hourlyRate: 42,   overtimeRate: 1.5  },
  { role: 'veterinarian', employmentType: 'contract',   salaryType: 'monthly', baseSalary: 3500, hourlyRate: 30,   overtimeRate: 1.5  },
  { role: 'vet_tech',     employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 2200, hourlyRate: 15,   overtimeRate: 1.5  },
  { role: 'vet_tech',     employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 2000, hourlyRate: 14,   overtimeRate: 1.5  },
  { role: 'vet_tech',     employmentType: 'part_time',  salaryType: 'hourly',  baseSalary: 0,    hourlyRate: 18,   overtimeRate: 1.5  },
  { role: 'receptionist', employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 1600, hourlyRate: 11,   overtimeRate: 1.25 },
  { role: 'receptionist', employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 1500, hourlyRate: 10.5, overtimeRate: 1.25 },
  { role: 'groomer',      employmentType: 'part_time',  salaryType: 'hourly',  baseSalary: 0,    hourlyRate: 22,   overtimeRate: 1.5  },
  { role: 'groomer',      employmentType: 'contract',   salaryType: 'monthly', baseSalary: 1800, hourlyRate: 12,   overtimeRate: 1.25 },
  { role: 'other',        employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 1200, hourlyRate: 8,    overtimeRate: 1.25 },
  { role: 'other',        employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 1100, hourlyRate: 7.5,  overtimeRate: 1.25 },
]

const EXPENSE_CATEGORIES = [
  'rent','utilities','medical_supplies','medications','equipment',
  'maintenance','lab_fees','insurance','marketing','cleaning','salaries','other',
]

const PAYMENT_METHODS      = ['cash','card','insurance','other'] as const
const EXPENSE_PAY_METHODS  = ['cash','card','bank_transfer','other'] as const
const VISIT_TYPES          = ['wellness_exam','vaccination','surgery','emergency','follow_up','grooming'] as const
const SESSION_STATUSES     = ['completed','completed','completed','completed','active','cancelled'] as const
const APPOINTMENT_TYPES    = ['consultation','follow_up','vaccination','surgery','grooming','checkup'] as const
const PAST_APPT_STATUSES   = ['completed','completed','completed','cancelled','no_show'] as const
const FUTURE_APPT_STATUSES = ['scheduled','scheduled','scheduled','confirmed'] as const

// ─── Medicine catalogue ─────────────────────────────────────────────────────

const MEDICINE_CATALOGUE = [
  // Antibiotics
  { name: 'Amoxicillin 250mg',         category: 'antibiotic',    unit: 'tablet',  minimumStock: 100, description: 'Broad-spectrum penicillin antibiotic for bacterial infections', unitPrice: 0.45, costPerUnit: 0.20 },
  { name: 'Enrofloxacin 68mg',          category: 'antibiotic',    unit: 'tablet',  minimumStock:  50, description: 'Fluoroquinolone antibiotic for gram-negative bacteria',            unitPrice: 2.50, costPerUnit: 1.10 },
  { name: 'Metronidazole 250mg',        category: 'antibiotic',    unit: 'tablet',  minimumStock:  80, description: 'Antibiotic and antiprotozoal for GI infections',                   unitPrice: 0.60, costPerUnit: 0.25 },
  { name: 'Clavamox 250mg',             category: 'antibiotic',    unit: 'tablet',  minimumStock:  60, description: 'Amoxicillin-clavulanate combination antibiotic',                  unitPrice: 3.20, costPerUnit: 1.40 },
  { name: 'Doxycycline 100mg',          category: 'antibiotic',    unit: 'capsule', minimumStock:  60, description: 'Tetracycline antibiotic for tick-borne diseases',                 unitPrice: 1.80, costPerUnit: 0.75 },
  // Antiparasitics
  { name: 'Frontline Plus (S)',          category: 'antiparasitic', unit: 'vial',    minimumStock:  20, description: 'Flea & tick spot-on treatment for small dogs',                    unitPrice: 18.00, costPerUnit:  9.00 },
  { name: 'Heartgard Plus 26-50kg',     category: 'antiparasitic', unit: 'tablet',  minimumStock:  24, description: 'Heartworm prevention chewable tablet',                           unitPrice: 12.50, costPerUnit:  5.50 },
  { name: 'Revolution (cat)',           category: 'antiparasitic', unit: 'vial',    minimumStock:  18, description: 'Selamectin parasiticide for cats',                               unitPrice: 22.00, costPerUnit: 10.00 },
  { name: 'Panacur 250mg/5mL',          category: 'antiparasitic', unit: 'ml',      minimumStock: 200, description: 'Fenbendazole dewormer suspension',                               unitPrice:  0.40, costPerUnit:  0.15 },
  // Vaccines
  { name: 'Rabies Vaccine 1mL',         category: 'vaccine',       unit: 'vial',    minimumStock:  30, description: '3-year rabies vaccine for dogs and cats',                        unitPrice: 25.00, costPerUnit: 12.00 },
  { name: 'DHPP Combo Vaccine',         category: 'vaccine',       unit: 'vial',    minimumStock:  30, description: 'Distemper, Hepatitis, Parvovirus, Parainfluenza combo',           unitPrice: 22.00, costPerUnit: 10.50 },
  { name: 'FVRCP Vaccine',              category: 'vaccine',       unit: 'vial',    minimumStock:  25, description: 'Feline respiratory and panleukopenia combination',               unitPrice: 20.00, costPerUnit:  9.50 },
  { name: 'Bordetella Vaccine',         category: 'vaccine',       unit: 'vial',    minimumStock:  20, description: 'Kennel cough intranasal vaccine',                                unitPrice: 18.00, costPerUnit:  8.00 },
  // Anesthetics / Analgesics
  { name: 'Ketamine 10% 10mL',          category: 'anesthetic',    unit: 'vial',    minimumStock:   5, description: 'Dissociative anesthetic for short procedures',                   unitPrice: 45.00, costPerUnit: 20.00 },
  { name: 'Propofol 1% 20mL',           category: 'anesthetic',    unit: 'vial',    minimumStock:   5, description: 'IV induction agent for general anesthesia',                     unitPrice: 35.00, costPerUnit: 16.00 },
  { name: 'Meloxicam 1.5mg/mL',         category: 'anesthetic',    unit: 'ml',      minimumStock: 100, description: 'NSAID analgesic for pain and inflammation',                      unitPrice:  0.85, costPerUnit:  0.35 },
  // Supplements
  { name: 'Omega-3 Fish Oil 1000mg',    category: 'supplement',    unit: 'capsule', minimumStock:  60, description: 'Fatty acid supplement for skin and coat health',                 unitPrice:  0.75, costPerUnit:  0.30 },
  { name: 'Probiotic Paste 30g',        category: 'supplement',    unit: 'tube',    minimumStock:  15, description: 'Probiotic paste for gastrointestinal support',                   unitPrice: 18.00, costPerUnit:  8.00 },
  { name: 'Cosequin DS Chews',          category: 'supplement',    unit: 'tablet',  minimumStock:  60, description: 'Glucosamine-chondroitin joint supplement',                       unitPrice:  1.20, costPerUnit:  0.55 },
  { name: 'Vitamin B Complex 10mL',     category: 'supplement',    unit: 'vial',    minimumStock:  12, description: 'B-vitamin complex for metabolic support',                        unitPrice: 14.00, costPerUnit:  6.00 },
  // General
  { name: 'Normal Saline 500mL',        category: 'general',       unit: 'bottle',  minimumStock:  10, description: '0.9% NaCl IV solution for fluid therapy',                       unitPrice:  8.00, costPerUnit:  3.50 },
  { name: 'Cerenia 24mg',               category: 'general',       unit: 'tablet',  minimumStock:  30, description: 'Maropitant anti-emetic for nausea and vomiting',                 unitPrice:  6.50, costPerUnit:  2.80 },
  { name: 'Famotidine 10mg',            category: 'general',       unit: 'tablet',  minimumStock:  80, description: 'H2 blocker for gastric acid reduction',                          unitPrice:  0.55, costPerUnit:  0.20 },
  { name: 'Apoquel 16mg',              category: 'general',       unit: 'tablet',  minimumStock:  60, description: 'Oclacitinib for allergic itch relief',                           unitPrice:  4.80, costPerUnit:  2.10 },
  { name: 'Prednisone 5mg',             category: 'general',       unit: 'tablet',  minimumStock: 100, description: 'Corticosteroid for inflammation and immune suppression',          unitPrice:  0.50, costPerUnit:  0.18 },
] as const

const MED_SUPPLIERS = ['VetSupply Co.','MedVet Pharma','AnimalHealth Plus','VetPharm Direct','BioVet Solutions','GlobalVet Imports','PharmaVet Arabia','MedAnimal Supply']

// Unit-appropriate quantity ranges for realistic dispensing amounts
const UNIT_QTY: Record<string, [number, number]> = {
  tablet:  [5,  120],
  capsule: [5,   90],
  ml:      [10, 500],
  vial:    [1,    6],
  tube:    [1,    4],
  bottle:  [1,    3],
  sachet:  [5,   30],
  other:   [1,   20],
}

// Bulk purchase qty multiplier (for large orders)
const BULK_QTY_FACTOR = 4

// Discount tiers — 0% weighted 3× to be most common
const DISCOUNT_TIERS: Array<{ frac: number; note: string | null }> = [
  { frac: 0,    note: null },
  { frac: 0,    note: null },
  { frac: 0,    note: null },
  { frac: 0.05, note: 'Loyalty 5%' },
  { frac: 0.10, note: 'Regular 10%' },
  { frac: 0.15, note: 'Bulk 15%' },
  { frac: 0.20, note: 'Staff discount 20%' },
  { frac: 0.25, note: 'VIP client 25%' },
  { frac: 0.30, note: 'Clearance 30%' },
]

const SALE_NOTES = [
  'Dispensed per prescription',
  'Walk-in OTC purchase',
  'Emergency dispensing – after-hours',
  'Bulk order for boarding patients',
  'Owner requested extra supply for travel',
  'Partial fill – remainder on back-order',
  'Compounded dose per vet instructions',
  'Insurance pre-authorisation obtained',
  'VIP client – loyalty discount applied',
  'Donated to rescue organisation',
  'Repeat prescription refill',
  'Post-surgical dispensing',
]

const EMERGENCY_MARKUP = 1.25   // 25% mark-up for after-hours emergency sales
const LOYALTY_DISCOUNT  = 0.90  // 10% base loyalty for frequent customers

const SPECIES_WEIGHTS = [
  { species: 'dog',        weight: 35 },
  { species: 'cat',        weight: 30 },
  { species: 'bird',       weight: 12 },
  { species: 'rabbit',     weight: 8  },
  { species: 'guinea_pig', weight: 5  },
  { species: 'reptile',    weight: 5  },
  { species: 'fish',       weight: 3  },
  { species: 'other',      weight: 2  },
]

// ─── TypeScript types ─────────────────────────────────────────────────────────

type SeedOwner = {
  id: string; name: string; phone: string; email: string | null
  address: string | null; notes: string | null; createdAt: Date; updatedAt: Date
}

type SeedPatient = {
  id: string; ownerId: string; name: string; species: string; breed: string | null
  petColor: string | null; microchipId: string | null; dateOfBirth: Date | null
  gender: string | null; weight: number | null; allergies: string | null
  medicalNotes: string | null; createdAt: Date; updatedAt: Date
}

type SeedSession = {
  id: string; patientId: string; visitDate: Date; visitType: string
  vetName: string | null; chiefComplaint: string; vetVitals: string | null
  diagnosis: string | null; notes: string | null; followUpDate: Date | null
  status: string; amountCharged: number | null; amountPaid: number | null
  paymentStatus: string; paymentMethod: string | null; createdAt: Date; updatedAt: Date
}

type SeedPrescription = {
  id: string; sessionId: string; medicineName: string; dosage: string | null
  frequency: string | null; duration: string | null; quantity: number | null
  instructions: string | null; isActive: boolean; startDate: Date | null
  stoppedAt: Date | null; stopReason: string | null; createdAt: Date
}

type SeedAppointment = {
  id: string; patientId: string; appointmentDate: Date; duration: number
  type: string; vetName: string | null; notes: string | null; status: string
  reminderSent: boolean; createdAt: Date; updatedAt: Date
}

type SeedCheckResult = {
  id: string; patientId: string; title: string; description: string | null
  fileName: string; filePath: string; fileSize: number; resultDate: Date; createdAt: Date
}

type SeedExpense = {
  id: string; date: Date; category: string; description: string; amount: number
  vendor: string | null; paymentMethod: string; recurrence: string
  notes: string | null; createdAt: Date; updatedAt: Date
}

type SeedStaff = {
  id: string; name: string; role: string; phone: string; email: string | null
  employmentType: string; status: string; baseSalary: number; salaryType: string
  hourlyRate: number | null; overtimeRate: number | null; hireDate: Date
  createdAt: Date; updatedAt: Date
}

type SeedSalaryRecord = {
  id: string; staffId: string; month: number; year: number; baseSalary: number
  regularHours: number; overtimeHours: number; overtimeMultiplier: number
  doubleShiftCount: number; doubleShiftBonus: number; bonuses: number
  deductions: number; netPay: number; status: string; createdAt: Date; updatedAt: Date
}

type SeedMedicine = {
  id: string; name: string; category: string; unit: string
  description: string | null; minimumStock: number; createdAt: Date; updatedAt: Date
}

type SeedMedicineBatch = {
  id: string; medicineId: string; batchNumber: string | null; supplier: string | null
  expiryDate: Date; quantity: number; initialQty: number; costPerUnit: number
  receivedDate: Date; notes: string | null; createdAt: Date; updatedAt: Date
}

type SeedMedicineSale = {
  id: string; medicineId: string; batchId: string; quantity: number
  unitPrice: number; totalPrice: number; discount: number
  patientId: string | null; patientName: string | null
  paymentMethod: string | null; notes: string | null; saleDate: Date; createdAt: Date
}

type ResultTemplate = { fileName: string; filePath: string; fileSize: number }

// ─── helpers ──────────────────────────────────────────────────────────────────

function uuid()                     { return crypto.randomUUID() }
function pick<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)] }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function chance(p: number)          { return Math.random() < p }
function randDate(from: Date, to: Date) { return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime())) }
function addDays(d: Date, days: number) { return new Date(d.getTime() + days * 86_400_000) }
function pad(v: number, w = 4)      { return String(v).padStart(w, '0') }
function monthStart(offset: number) { return new Date(NOW.getFullYear(), NOW.getMonth() - offset, 1) }

function weightedSpecies(): string {
  const total = SPECIES_WEIGHTS.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const x of SPECIES_WEIGHTS) { r -= x.weight; if (r <= 0) return x.species }
  return 'other'
}

function breedFor(species: string): string | null {
  if (species === 'dog')  return pick(DOG_BREEDS)
  if (species === 'cat')  return pick(CAT_BREEDS)
  if (species === 'bird') return pick(BIRD_BREEDS)
  return null
}

function weightFor(species: string): number {
  if (species === 'fish')       return randFloat(0.01, 0.5)
  if (species === 'bird')       return randFloat(0.03, 1.2)
  if (species === 'guinea_pig') return randFloat(0.4, 1.2)
  if (species === 'rabbit')     return randFloat(0.8, 5.0)
  if (species === 'cat')        return randFloat(2.5, 8.0)
  if (species === 'reptile')    return randFloat(0.1, 6.0)
  if (species === 'dog')        return randFloat(3.0, 45.0)
  return randFloat(0.5, 10.0)
}

function makeVetVitals(species: string) {
  const isMammal = ['dog','cat','rabbit','guinea_pig'].includes(species)
  return JSON.stringify({
    weight_kg:        randFloat(0.5, species === 'dog' ? 40 : 8),
    temp_rectal_c:    isMammal ? randFloat(37.5, 39.5) : null,
    heart_rate:       isMammal ? rand(60, 180) : null,
    resp_rate:        isMammal ? rand(15, 40)  : null,
    crt:              isMammal ? pick(['< 2s','2s','> 2s']) : null,
    mucous_membranes: isMammal ? pick(['Pink','Pale','Tacky','Moist and pink']) : null,
  })
}

function normalizePayment(charged: number) {
  const roll = Math.random()
  if (roll < 0.60) return { amountPaid: charged,                                              paymentStatus: 'paid',    paymentMethod: pick(PAYMENT_METHODS) }
  if (roll < 0.82) return { amountPaid: randFloat(Math.max(10, charged * 0.2), charged * 0.9), paymentStatus: 'partial', paymentMethod: pick(PAYMENT_METHODS) }
  if (roll < 0.93) return { amountPaid: 0,                                                    paymentStatus: 'unpaid',  paymentMethod: null }
  return                   { amountPaid: 0,                                                    paymentStatus: 'waived',  paymentMethod: null }
}

function calcNetPay(staff: SeedStaff, p: { regularHours: number; overtimeHours: number; overtimeMultiplier: number; doubleShiftCount: number; doubleShiftBonus: number; bonuses: number; deductions: number }) {
  const hourlyBase = staff.hourlyRate ?? (staff.baseSalary / 160)
  const basePay    = staff.salaryType === 'monthly' ? staff.baseSalary
                   : staff.salaryType === 'hourly'  ? p.regularHours * hourlyBase
                   : staff.baseSalary
  const overtimePay    = p.overtimeHours    * hourlyBase * p.overtimeMultiplier
  const doubleShiftPay = p.doubleShiftCount * p.doubleShiftBonus
  return Math.round(Math.max(0, basePay + overtimePay + doubleShiftPay + p.bonuses - p.deductions) * 100) / 100
}

function writePdfTemplate(filePath: string) {
  // Minimal valid PDF
  const pdfBase64 = 'JVBERi0xLjMKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9Db3VudCAxIC9LaWRzIFszIDAgUl0gPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAzMDAgMTQ0XSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0OCA+PgpzdHJlYW0KQlQgL0YxIDE4IFRmIDgwIDgwIFRkIChCaXpGbG93IFZldCBDbGluaWMgUmVzdWx0KSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MiAwMDAwMCBuIAowMDAwMDAwMTE3IDAwMDAwIG4gCjAwMDAwMDAyNDEgMDAwMDAgbiAKMDAwMDAwMDMzOSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQwOQolJUVPRg=='
  const buf = Buffer.from(pdfBase64, 'base64')
  fs.writeFileSync(filePath, buf)
  return buf.length
}

function prepareResultTemplates(): ResultTemplate[] {
  fs.rmSync(GENERATED_RESULTS_DIR, { recursive: true, force: true })
  fs.mkdirSync(GENERATED_RESULTS_DIR, { recursive: true })
  return Array.from({ length: CONFIG.sharedResultFiles }, (_, i) => {
    const fileName = RESULT_FILE_NAMES[i % RESULT_FILE_NAMES.length] ?? `result-${i + 1}.pdf`
    const filePath = path.join(GENERATED_RESULTS_DIR, `${pad(i + 1)}-${fileName}`)
    const fileSize = writePdfTemplate(filePath)
    return { fileName, filePath, fileSize }
  })
}

// ─── builders ─────────────────────────────────────────────────────────────────

function buildStaff(): SeedStaff[] {
  return Array.from({ length: CONFIG.staffCount }, (_, i) => {
    const firstName = pick(OWNER_FIRST)
    const lastName  = pick(OWNER_LAST)
    const profile   = STAFF_PROFILES[i % STAFF_PROFILES.length]
    const name      = profile.role === 'veterinarian'
      ? `Dr. ${firstName} ${lastName}` : `${firstName} ${lastName}`
    const hireDate  = randDate(FOUR_YEARS_AGO, addDays(NOW, -30))
    return {
      id: uuid(), name,
      role: profile.role,
      phone: `+966-5${rand(0,9)}-${rand(1000000, 9999999)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}.staff${i + 1}@vetclinic.local`,
      employmentType: profile.employmentType,
      status: chance(0.92) ? 'active' : 'inactive',
      baseSalary: profile.baseSalary,
      salaryType: profile.salaryType,
      hourlyRate: profile.hourlyRate,
      overtimeRate: profile.overtimeRate,
      hireDate,
      createdAt: hireDate,
      updatedAt: hireDate,
    }
  })
}

function buildSalaryRecords(staff: SeedStaff[]): SeedSalaryRecord[] {
  const records: SeedSalaryRecord[] = []
  for (const member of staff) {
    for (let offset = 0; offset < CONFIG.salaryMonths; offset++) {
      const date = monthStart(offset)
      const hireMonth = new Date(member.hireDate.getFullYear(), member.hireDate.getMonth(), 1)
      if (date < hireMonth) continue

      const regularHours   = member.salaryType === 'hourly' ? randFloat(70, 140) : randFloat(150, 176)
      const overtimeHours  = chance(0.5)  ? randFloat(2, 18) : 0
      const doubleShiftCount = chance(0.3) ? rand(0, 4)      : 0
      const doubleShiftBonus = doubleShiftCount > 0 ? randFloat(80, 150) : 0
      const bonuses        = chance(0.2)  ? randFloat(100, 500) : 0
      const deductions     = chance(0.15) ? randFloat(20, 200)  : 0
      const overtimeMultiplier = member.overtimeRate ?? 1.5
      const netPay = calcNetPay(member, { regularHours, overtimeHours, overtimeMultiplier, doubleShiftCount, doubleShiftBonus, bonuses, deductions })
      const isPaid = offset > 0 || chance(0.55)
      const updatedAt = new Date(date.getFullYear(), date.getMonth(), rand(24, 28), 12, 0, 0)

      records.push({
        id: uuid(), staffId: member.id,
        month: date.getMonth() + 1, year: date.getFullYear(),
        baseSalary: member.baseSalary,
        regularHours, overtimeHours, overtimeMultiplier,
        doubleShiftCount, doubleShiftBonus,
        bonuses, deductions, netPay,
        status: isPaid ? 'paid' : 'draft',
        createdAt: updatedAt, updatedAt,
      })
    }
  }
  return records
}

function buildExpenses(): SeedExpense[] {
  const expenses: SeedExpense[] = []

  for (let offset = CONFIG.expenseMonths - 1; offset >= 0; offset--) {
    const month = monthStart(offset)

    // Fixed monthly costs
    const fixed = [
      { category: 'rent',             amount: randFloat(3500, 5500), description: 'Veterinary clinic rent',             vendor: 'Property Management',   recurrence: 'monthly' },
      { category: 'utilities',        amount: randFloat(400,  800),  description: 'Electricity, water and internet',    vendor: 'Utilities Authority',    recurrence: 'monthly' },
      { category: 'insurance',        amount: randFloat(250,  450),  description: 'Professional liability insurance',   vendor: 'Veterinary Shield',      recurrence: 'monthly' },
      { category: 'cleaning',         amount: randFloat(180,  320),  description: 'Cleaning and sanitation services',   vendor: 'CleanPro Services',      recurrence: 'monthly' },
      { category: 'marketing',        amount: randFloat(100,  350),  description: 'Digital ads and social media',       vendor: 'Meta Ads',               recurrence: 'monthly' },
    ]
    for (const row of fixed) {
      const date = new Date(month.getFullYear(), month.getMonth(), rand(1, 5), 10, 0, 0)
      expenses.push({
        id: uuid(), date,
        category: row.category, description: row.description,
        amount: row.amount, vendor: row.vendor,
        paymentMethod: pick(EXPENSE_PAY_METHODS),
        recurrence: row.recurrence, notes: null,
        createdAt: date, updatedAt: date,
      })
    }

    // Variable costs
    const variableCount = rand(20, 45)
    const amountRange: Record<string, [number, number]> = {
      medical_supplies: [50, 800],
      medications:      [80, 600],
      equipment:        [200, 3000],
      maintenance:      [60, 700],
      lab_fees:         [40, 500],
      utilities:        [50, 200],
      marketing:        [30, 250],
      cleaning:         [25, 150],
      insurance:        [100, 300],
      salaries:         [1500, 5000],
      other:            [20, 300],
      rent:             [3500, 5500],
    }
    for (let i = 0; i < variableCount; i++) {
      const category = pick(EXPENSE_CATEGORIES)
      const date = new Date(month.getFullYear(), month.getMonth(), rand(1, 28), rand(8, 18), 0, 0)
      const [min, max] = amountRange[category] ?? [20, 300]
      expenses.push({
        id: uuid(), date, category,
        description: `${category.replace(/_/g, ' ')} expense`,
        amount: randFloat(min, max),
        vendor: chance(0.7) ? pick(['VetSupply Co.','MedVet Pharma','Lab Direct','SaniClean','TechVet','AnimalHealth Plus']) : null,
        paymentMethod: pick(EXPENSE_PAY_METHODS),
        recurrence: 'one_time',
        notes: chance(0.15) ? pick(['Urgent restock','Bulk purchase','Emergency repair','Monthly contract']) : null,
        createdAt: date, updatedAt: date,
      })
    }
  }
  return expenses
}

function buildOwner(index: number): SeedOwner {
  const firstName = pick(OWNER_FIRST)
  const lastName  = pick(OWNER_LAST)
  const createdAt = randDate(FOUR_YEARS_AGO, NOW)
  return {
    id: uuid(),
    name: `${firstName} ${lastName}`,
    phone: `+966-5${rand(0,9)}-${pad(index + 1_000_000, 7)}`,
    email: chance(0.65) ? `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}${index + 1}@example.com` : null,
    address: chance(0.72) ? `${rand(1, 200)} ${pick(['King Fahd Rd','Prince Sultan St','Corniche Ave','Garden Blvd','Al-Nahda St'])}, ${pick(AREAS)}` : null,
    notes: chance(0.12) ? pick(['VIP client – multiple pets','Referred by veterinarian','Prefers morning appointments','Requires Arabic communication']) : null,
    createdAt, updatedAt: createdAt,
  }
}

function buildPetsForOwner(owner: SeedOwner, ownerIndex: number): SeedPatient[] {
  const petCount = rand(1, 3)
  return Array.from({ length: petCount }, (_, j) => {
    const species = weightedSpecies()
    return {
      id: uuid(), ownerId: owner.id,
      name: pick(PET_NAMES) + (chance(0.2) ? ` ${rand(1, 99)}` : ''),
      species,
      breed:       chance(0.7) ? breedFor(species) : null,
      petColor:    chance(0.8) ? pick(PET_COLORS) : null,
      // Index-based prefix guarantees uniqueness across batches
      microchipId: chance(0.55) ? `MC${pad(ownerIndex * 4 + j + 1, 8)}` : null,
      dateOfBirth: chance(0.75) ? randDate(new Date('2010-01-01'), addDays(NOW, -90)) : null,
      gender:      pick(['male','female','unknown']),
      weight:      chance(0.85) ? weightFor(species) : null,
      allergies:   chance(0.12) ? pick(['Penicillin','NSAIDs','Flea treatments','Latex','Chlorhexidine']) : null,
      medicalNotes:chance(0.2)  ? pick(['Neutered/spayed','Chronic ear issues','Diabetic – insulin required','Anxious – handle with care','History of seizures']) : null,
      createdAt: owner.createdAt, updatedAt: owner.createdAt,
    }
  })
}

function buildSessionsForPatient(patient: SeedPatient, vetNames: string[]) {
  const sessions:      SeedSession[]      = []
  const prescriptions: SeedPrescription[] = []

  const sessionCount = rand(1, 20)
  let prev = new Date(Math.max(patient.createdAt.getTime(), FOUR_YEARS_AGO.getTime()))

  for (let i = 0; i < sessionCount; i++) {
    const gapDays   = i === 0 ? rand(0, 14) : rand(14, 120)
    const visitDate = addDays(prev, gapDays)
    if (visitDate > NOW) break
    prev = visitDate

    const charged = randFloat(40, 850)
    const payment = normalizePayment(charged)
    const needsFollowUp = chance(0.35)
    const followUpDate  = !needsFollowUp ? null
      : Math.random() < 0.6 ? addDays(visitDate, rand(7, 60))
      : Math.random() < 0.7 ? addDays(NOW, rand(1, 45))
      : addDays(NOW, -rand(1, 30))
    const status = visitDate > addDays(NOW, -14) && chance(0.1) ? 'active' : pick(SESSION_STATUSES)

    const session: SeedSession = {
      id: uuid(), patientId: patient.id,
      visitDate,
      visitType:     i === 0 ? 'wellness_exam' : pick(VISIT_TYPES),
      vetName:       pick(vetNames),
      chiefComplaint:pick(VET_COMPLAINTS),
      vetVitals:     chance(0.88) ? makeVetVitals(patient.species) : null,
      diagnosis:     chance(0.90) ? pick(VET_DIAGNOSES) : null,
      notes:         chance(0.65) ? pick([
        'Owner instructed on home care. Follow-up as needed.',
        'Treatment tolerated well. Monitor for adverse reactions.',
        'Wound healing satisfactorily. Keep dry for 5 days.',
        'Dietary change recommended. Re-weigh in 4 weeks.',
        'Excellent response to treatment. Discharge advised.',
      ]) : null,
      followUpDate, status,
      amountCharged: charged, amountPaid: payment.amountPaid,
      paymentStatus: payment.paymentStatus, paymentMethod: payment.paymentMethod,
      createdAt: visitDate, updatedAt: visitDate,
    }
    sessions.push(session)

    // Prescriptions – 60% of sessions get 1-3
    if (chance(0.6)) {
      const rxCount = rand(1, 3)
      const used = new Set<string>()
      for (let r = 0; r < rxCount; r++) {
        let med = pick(VET_MEDICATIONS)
        while (used.has(med.name)) med = pick(VET_MEDICATIONS)
        used.add(med.name)
        const active = chance(visitDate > addDays(NOW, -21) ? 0.65 : 0.12)
        prescriptions.push({
          id: uuid(), sessionId: session.id,
          medicineName: med.name,
          dosage: med.dosage, frequency: med.frequency,
          duration: med.duration, quantity: med.quantity,
          instructions: chance(0.5) ? pick([
            'Administer with food','Complete full course',
            'Avoid direct sunlight after application',
            'Keep refrigerated','Monitor for vomiting or diarrhea',
          ]) : null,
          isActive: active, startDate: visitDate,
          stoppedAt:  active ? null : addDays(visitDate, rand(3, 14)),
          stopReason: active ? null : pick(['completed','side_effects','not_effective','other']),
          createdAt: visitDate,
        })
      }
    }
  }

  return { sessions, prescriptions }
}

function buildAppointmentsForPatient(patient: SeedPatient, vetNames: string[]): SeedAppointment[] {
  const count     = rand(3, 10)
  const pastCount = rand(2, Math.max(2, count - 1))
  return Array.from({ length: count }, (_, i) => {
    const isFuture       = i >= pastCount
    const appointmentDate = isFuture
      ? randDate(NOW, FUTURE_WINDOW_END)
      : randDate(patient.createdAt, NOW)
    appointmentDate.setHours(rand(8, 20), pick([0, 30]), 0, 0)
    return {
      id: uuid(), patientId: patient.id,
      appointmentDate,
      duration: pick([15, 20, 30, 45, 60, 90]),
      type: pick(APPOINTMENT_TYPES),
      vetName: pick(vetNames),
      notes: chance(0.4) ? pick(['Bring vaccination booklet','Fasting required 12h','Owner requested morning slot','Annual booster due']) : null,
      status: isFuture ? pick(FUTURE_APPT_STATUSES) : pick(PAST_APPT_STATUSES),
      reminderSent: !isFuture || chance(0.35),
      createdAt: isFuture ? NOW : appointmentDate,
      updatedAt: isFuture ? NOW : appointmentDate,
    }
  }).sort((a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime())
}

function buildCheckResults(patient: SeedPatient, templates: ResultTemplate[]): SeedCheckResult[] {
  if (!chance(0.28)) return []
  return Array.from({ length: rand(1, 3) }, () => {
    const tpl        = pick(templates)
    const resultDate = randDate(patient.createdAt, NOW)
    return {
      id: uuid(), patientId: patient.id,
      title: pick(RESULT_TITLES),
      description: chance(0.5) ? pick([
        'Pre-operative imaging','Routine annual bloodwork','Requested by specialist',
        'Shared from external lab','Monitoring chronic condition','Follow-up imaging',
      ]) : null,
      fileName: tpl.fileName, filePath: tpl.filePath, fileSize: tpl.fileSize,
      resultDate, createdAt: resultDate,
    }
  })
}

// ─── medicine builders ───────────────────────────────────────────────────────

function buildMedicines(): { medicines: SeedMedicine[]; batches: SeedMedicineBatch[] } {
  const medicines: SeedMedicine[] = []
  const batches:   SeedMedicineBatch[] = []
  const now = new Date()

  for (const med of MEDICINE_CATALOGUE) {
    const createdAt = randDate(new Date(now.getTime() - 24 * 30 * 86_400_000), now)
    const medicine: SeedMedicine = {
      id: uuid(), name: med.name, category: med.category, unit: med.unit,
      description: med.description, minimumStock: med.minimumStock,
      createdAt, updatedAt: createdAt,
    }
    medicines.push(medicine)

    // Guaranteed batch scenarios for full UI coverage:
    // slot 0 → expired  (tests the "expired" badge)
    // slot 1 → near-expiry ≤30d  (tests the "expiring soon" badge)
    // slot 2 → healthy stock
    // slot 3+ (optional) → additional healthy or critically low
    const extraBatches = rand(0, 2)
    const batchCount   = 3 + extraBatches

    for (let b = 0; b < batchCount; b++) {
      let expiryDate:  Date
      let batchNotes:  string | null = null
      let soldFrac:    number
      let receivedDate: Date

      if (b === 0) {
        // Expired batch — received well in the past
        expiryDate   = addDays(now, -rand(5, 180))
        soldFrac     = randFloat(0.70, 0.99)   // mostly dispensed before expiry
        receivedDate = randDate(
          new Date(now.getTime() - 36 * 30 * 86_400_000),
          new Date(now.getTime() -  8 * 30 * 86_400_000),
        )
        batchNotes = 'Expired – quarantined, do not dispense'
      } else if (b === 1) {
        // Near-expiry batch
        expiryDate   = addDays(now, rand(1, 29))
        soldFrac     = randFloat(0.40, 0.85)
        receivedDate = randDate(
          new Date(now.getTime() - 14 * 30 * 86_400_000),
          new Date(now.getTime() -  2 * 30 * 86_400_000),
        )
        batchNotes = chance(0.6) ? 'Near expiry – use FEFO priority' : null
      } else if (b === batchCount - 1 && chance(0.30)) {
        // Critically low stock — triggers low-stock alert
        expiryDate   = addDays(now, rand(90, 540))
        soldFrac     = randFloat(0.85, 0.97)
        receivedDate = randDate(new Date(now.getTime() - 12 * 30 * 86_400_000), now)
        batchNotes   = chance(0.4) ? 'Reorder pending' : null
      } else {
        // Healthy current stock
        expiryDate   = addDays(now, rand(90, 730))
        soldFrac     = chance(0.6) ? randFloat(0.05, 0.60) : 0
        receivedDate = randDate(new Date(now.getTime() - 18 * 30 * 86_400_000), now)
        batchNotes   = chance(0.12) ? pick([
          'Refrigerate after opening',
          'Store below 25 °C',
          'Keep away from direct light',
          'Cold chain maintained on delivery',
        ]) : null
      }

      const isCriticallyLow = b === batchCount - 1 && batchNotes === 'Reorder pending'
      const initialQty = isCriticallyLow
        ? rand(1, Math.max(2, Math.floor(med.minimumStock * 0.5)))
        : rand(med.minimumStock, med.minimumStock * 6)
      const remaining = Math.max(0, Math.round(initialQty * (1 - soldFrac)))

      batches.push({
        id: uuid(), medicineId: medicine.id,
        batchNumber:  chance(0.88) ? `LOT-${rand(10_000, 99_999)}` : null,
        supplier:     chance(0.85) ? pick(MED_SUPPLIERS) : null,
        expiryDate, quantity: remaining, initialQty,
        costPerUnit: med.costPerUnit,
        receivedDate, notes: batchNotes,
        createdAt: receivedDate, updatedAt: now,
      })
    }
  }

  return { medicines, batches }
}

function buildMedicineSales(
  medicines:  SeedMedicine[],
  batches:    SeedMedicineBatch[],
  patientMap: Map<string, string>,  // patientId → patientName
): SeedMedicineSale[] {
  const sales: SeedMedicineSale[] = []
  const SALE_MONTHS = 18
  const now = new Date()
  const patientIds = Array.from(patientMap.keys())

  // Group batches by medicine (non-expired only for normal sales)
  const batchByMed = new Map<string, SeedMedicineBatch[]>()
  for (const b of batches) {
    const list = batchByMed.get(b.medicineId) ?? []
    list.push(b)
    batchByMed.set(b.medicineId, list)
  }

  const priceMap = new Map<string, number>(
    MEDICINE_CATALOGUE.map(m => [m.name as string, m.unitPrice])
  )

  // Payment method weighted distribution: cash 40%, card 30%, insurance 20%, other 10%
  const PAYMENT_WEIGHTED = [
    ...Array(4).fill('cash'),
    ...Array(3).fill('card'),
    ...Array(2).fill('insurance'),
    'other',
  ] as const

  for (const medicine of medicines) {
    const medBatches = batchByMed.get(medicine.id) ?? []
    if (!medBatches.length) continue
    const baseUnitPrice = priceMap.get(medicine.name) ?? randFloat(1, 30)
    const [qtyMin, qtyMax] = UNIT_QTY[medicine.unit] ?? [1, 20]

    for (let mo = SALE_MONTHS - 1; mo >= 0; mo--) {
      const mStart = monthStart(mo)
      const mEnd   = new Date(Math.min(now.getTime(), mStart.getTime() + 30 * 86_400_000))
      // Higher volume in current + recent months, lower in older months
      const baseCount = mo < 3 ? rand(5, 15) : mo < 9 ? rand(3, 10) : rand(2, 6)

      for (let s = 0; s < baseCount; s++) {
        const saleDate = randDate(mStart, mEnd)
        if (saleDate > now) continue

        // FEFO: prefer batch expiring soonest that has not expired at sale time
        const valid = medBatches
          .filter(b => b.expiryDate > saleDate)
          .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
        const batch = valid.length > 0 ? valid[0] : pick(medBatches)

        // Sale type: 80% regular, 12% bulk, 8% emergency
        const saleTypeRoll = Math.random()
        const isBulk      = saleTypeRoll > 0.88
        const isEmergency = saleTypeRoll > 0.92

        const qty = isBulk
          ? rand(qtyMin * 2, qtyMax * BULK_QTY_FACTOR)
          : rand(1, Math.ceil(qtyMax / 3))

        // Price: emergency markup, loyalty discount, or standard
        let effectiveUnitPrice = baseUnitPrice
        if (isEmergency)        effectiveUnitPrice = Math.round(baseUnitPrice * EMERGENCY_MARKUP * 100) / 100
        else if (chance(0.12))  effectiveUnitPrice = Math.round(baseUnitPrice * LOYALTY_DISCOUNT * 100) / 100

        // Discount tier
        const tier    = pick(DISCOUNT_TIERS)
        const discAmt = tier.frac > 0
          ? Math.round(qty * effectiveUnitPrice * tier.frac * 100) / 100
          : 0
        const total   = Math.round(Math.max(0, qty * effectiveUnitPrice - discAmt) * 100) / 100

        // Patient link: 65% linked to a real patient, 20% walk-in with name, 15% anonymous
        let patientId:   string | null = null
        let patientName: string | null = null
        const patientRoll = Math.random()
        if (patientRoll < 0.65 && patientIds.length > 0) {
          patientId   = pick(patientIds)
          patientName = patientMap.get(patientId) ?? null
        } else if (patientRoll < 0.85) {
          patientName = `${pick(OWNER_FIRST)} ${pick(OWNER_LAST)}`
        }
        // else: anonymous (both null)

        // Notes: emergency always gets a note; others 25% chance
        let notes: string | null = null
        if (isEmergency)      notes = 'Emergency dispensing – after-hours'
        else if (isBulk)      notes = pick(['Bulk order for boarding patients', 'Owner requested extra supply for travel', 'Repeat prescription – 3-month supply'])
        else if (tier.note)   notes = tier.note
        else if (chance(0.20)) notes = pick(SALE_NOTES)

        sales.push({
          id: uuid(), medicineId: medicine.id, batchId: batch.id,
          quantity: qty,
          unitPrice: effectiveUnitPrice,
          totalPrice: total,
          discount: discAmt,
          patientId,
          patientName,
          paymentMethod: pick(PAYMENT_WEIGHTED),
          notes,
          saleDate, createdAt: saleDate,
        })
      }
    }
  }

  return sales
}

// ─── clear + main ─────────────────────────────────────────────────────────────

async function clearVetData() {
  console.log('🗑   Clearing existing vet data...')
  await prisma.vetMedicineSale.deleteMany({})
  await prisma.vetMedicineBatch.deleteMany({})
  await prisma.vetMedicine.deleteMany({})
  await prisma.vetSalaryRecord.deleteMany({})
  await prisma.vetStaff.deleteMany({})
  await prisma.vetExpense.deleteMany({})
  await prisma.vetCheckResult.deleteMany({})
  await prisma.vetPrescription.deleteMany({})
  await prisma.vetAppointment.deleteMany({})
  await prisma.vetSession.deleteMany({})
  await prisma.vetPatient.deleteMany({})
  await prisma.vetOwner.deleteMany({})
  console.log('✅  Vet tables cleared\n')
}

async function main() {
  console.log('🐾  Vet Clinic Seed – starting...')
  console.log(`📊  Owners=${CONFIG.ownerCount.toLocaleString()}  Staff=${CONFIG.staffCount}  SalaryMonths=${CONFIG.salaryMonths}  ExpenseMonths=${CONFIG.expenseMonths}`)

  const startedAt = Date.now()

  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
  await prisma.$queryRawUnsafe('PRAGMA cache_size = 20000;')
  await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')

  const resultTemplates = prepareResultTemplates()
  await clearVetData()

  // ── Staff + Salary + Expenses ─────────────────────────────────────────────
  console.log('👩‍⚕️  Creating staff, salary records, and expenses...')
  const staff          = buildStaff()
  const salaryRecords  = buildSalaryRecords(staff)
  const expenses       = buildExpenses()

  await prisma.$transaction(async (tx) => {
    await tx.vetStaff.createMany({ data: staff })
    if (salaryRecords.length) await tx.vetSalaryRecord.createMany({ data: salaryRecords })
    if (expenses.length)      await tx.vetExpense.createMany({ data: expenses })
  }, { timeout: 60_000 })
  console.log(`✅  Staff=${staff.length}  Salaries=${salaryRecords.length}  Expenses=${expenses.length}\n`)

  const vetNames = staff.filter(s => s.role === 'veterinarian').map(s => s.name)

  // ── Owners + Pets + Sessions + Appointments + Results ────────────────────
  const batches = Math.ceil(CONFIG.ownerCount / CONFIG.batchSize)

  let ownerTotal      = 0
  let patientTotal    = 0
  let sessionTotal    = 0
  let prescTotal      = 0
  let appointTotal    = 0
  let resultTotal     = 0

  for (let batch = 0; batch < batches; batch++) {
    const start = batch * CONFIG.batchSize
    const end   = Math.min(start + CONFIG.batchSize, CONFIG.ownerCount)

    const owners:       SeedOwner[]       = []
    const patients:     SeedPatient[]     = []
    const sessions:     SeedSession[]     = []
    const prescriptions:SeedPrescription[]= []
    const appointments: SeedAppointment[] = []
    const checkResults: SeedCheckResult[] = []

    for (let i = start; i < end; i++) {
      const owner = buildOwner(i)
      owners.push(owner)

      const pets = buildPetsForOwner(owner, i)
      for (const pet of pets) {
        patients.push(pet)
        const { sessions: s, prescriptions: p } = buildSessionsForPatient(pet, vetNames)
        sessions.push(...s)
        prescriptions.push(...p)
        appointments.push(...buildAppointmentsForPatient(pet, vetNames))
        checkResults.push(...buildCheckResults(pet, resultTemplates))
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.vetOwner.createMany({ data: owners })
      if (patients.length)     await tx.vetPatient.createMany({ data: patients })
      if (sessions.length)     await tx.vetSession.createMany({ data: sessions })
      if (prescriptions.length)await tx.vetPrescription.createMany({ data: prescriptions })
      if (appointments.length) await tx.vetAppointment.createMany({ data: appointments })
      if (checkResults.length) await tx.vetCheckResult.createMany({ data: checkResults })
    }, { timeout: 120_000 })

    ownerTotal   += owners.length
    patientTotal += patients.length
    sessionTotal += sessions.length
    prescTotal   += prescriptions.length
    appointTotal += appointments.length
    resultTotal  += checkResults.length

    const elapsed  = ((Date.now() - startedAt) / 1000).toFixed(1)
    const progress = Math.round(((batch + 1) / batches) * 100)
    process.stdout.write(
      `\r  Batch ${batch + 1}/${batches} [${progress}%] `
      + `owners=${ownerTotal.toLocaleString()} `
      + `pets=${patientTotal.toLocaleString()} `
      + `sessions=${sessionTotal.toLocaleString()} `
      + `appts=${appointTotal.toLocaleString()} `
      + `${elapsed}s      `
    )
  }

  // ── Medicines + Batches + Sales ──────────────────────────────────────────
  console.log('💊  Creating medicine catalogue, batches, and sales...')
  const { medicines, batches: medBatches } = buildMedicines()

  // Collect patient id+name pairs to link medicine sales to real patients
  const patientRows = await prisma.vetPatient.findMany({ select: { id: true, name: true }, take: 1000 })
  const patientMap  = new Map<string, string>(
    patientRows.map((r: { id: string; name: string }) => [r.id, r.name])
  )

  const medSales = buildMedicineSales(medicines, medBatches, patientMap)

  await prisma.$transaction(async (tx) => {
    await tx.vetMedicine.createMany({ data: medicines })
    if (medBatches.length) await tx.vetMedicineBatch.createMany({ data: medBatches })
    if (medSales.length)   await tx.vetMedicineSale.createMany({ data: medSales })
  }, { timeout: 120_000 })
  console.log(`✅  Medicines=${medicines.length}  Batches=${medBatches.length}  Sales=${medSales.length}\n`)

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('\n\n✅  Vet clinic seed complete\n')
  console.log(`  Owners         : ${ownerTotal.toLocaleString()}`)
  console.log(`  Pets           : ${patientTotal.toLocaleString()}`)
  console.log(`  Sessions       : ${sessionTotal.toLocaleString()}`)
  console.log(`  Prescriptions  : ${prescTotal.toLocaleString()}`)
  console.log(`  Appointments   : ${appointTotal.toLocaleString()}`)
  console.log(`  Check Results  : ${resultTotal.toLocaleString()}`)
  console.log(`  Staff          : ${staff.length}`)
  console.log(`  Salary Records : ${salaryRecords.length}`)
  console.log(`  Expenses       : ${expenses.length}`)
  console.log(`  Medicines      : ${medicines.length}`)
  console.log(`  Med Batches    : ${medBatches.length}`)
  console.log(`  Med Sales      : ${medSales.length}`)
  console.log(`  Result files   : ${resultTemplates.length} generated PDFs`)
  console.log(`  Elapsed        : ${elapsed}s\n`)
}

main()
  .catch((err) => { console.error('\n❌  Seed failed:', err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
